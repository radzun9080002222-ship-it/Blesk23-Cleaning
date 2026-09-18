-- Warehouse data is private. The PIN is provisioned separately, never in Git or the JS bundle.
create schema if not exists sklad_private;
revoke all on schema sklad_private from public, anon, authenticated;
create table sklad_private.config (id boolean primary key default true check (id), pin_hash text not null);
create table sklad_private.login_window (id boolean primary key default true check(id), since timestamptz not null, attempts integer not null);
create table sklad_private.sessions (token_hash text primary key, actor text not null, expires_at timestamptz not null);
create table sklad_private.state (id boolean primary key default true check(id), revision integer not null default 0, items jsonb not null default '[]');
insert into sklad_private.state default values;
create table sklad_private.operations (id uuid primary key, at timestamptz not null default now(), actor text not null, kind text not null, note text not null, changes jsonb not null);

create or replace function public.sklad_login(p_pin text, p_actor text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, extensions as $$
declare v_hash text; v_attempts integer; v_token text;
begin
  if p_actor is null or p_pin is null or length(trim(p_actor)) not between 2 and 80 or p_pin !~ '^[0-9]{4}$' then return jsonb_build_object('error','Укажите имя и четырёхзначный код.'); end if;
  insert into sklad_private.login_window values(true, now(), 1)
  on conflict(id) do update set
    attempts = case when sklad_private.login_window.since < now()-interval '1 minute' then 1 else sklad_private.login_window.attempts+1 end,
    since = case when sklad_private.login_window.since < now()-interval '1 minute' then now() else sklad_private.login_window.since end
  returning attempts into v_attempts;
  if v_attempts > 10 then return jsonb_build_object('error','Слишком много попыток. Подождите минуту.'); end if;
  select pin_hash into v_hash from sklad_private.config where id;
  if v_hash is null or crypt(p_pin,v_hash) <> v_hash then return jsonb_build_object('error','Неверный код доступа.'); end if;
  v_token := encode(gen_random_bytes(32),'hex');
  insert into sklad_private.sessions values(encode(digest(v_token,'sha256'),'hex'),trim(p_actor),now()+interval '12 hours');
  return jsonb_build_object('token',v_token);
end $$;

create or replace function sklad_private.actor(p_token text) returns text
language plpgsql security definer set search_path = pg_catalog, extensions as $$
declare v_actor text;
begin
  select actor into v_actor from sklad_private.sessions where token_hash=encode(digest(p_token,'sha256'),'hex') and expires_at > now();
  if v_actor is null then raise exception 'AUTH'; end if;
  return v_actor;
end $$;

create or replace function public.sklad_read(p_token text) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare v_result jsonb;
begin
  perform sklad_private.actor(p_token);
  select jsonb_build_object('revision',revision,'items',items,'history',coalesce((select jsonb_agg(to_jsonb(o) order by at desc) from (select * from sklad_private.operations order by at desc limit 500) o),'[]')) into v_result from sklad_private.state where id;
  return v_result;
end $$;

create or replace function public.sklad_logout(p_token text) returns void
language sql security definer set search_path = pg_catalog, extensions as $$
  update sklad_private.sessions set expires_at=now() where token_hash=encode(digest(p_token,'sha256'),'hex');
$$;

create or replace function public.sklad_command(p_token text, p_id uuid, p_revision integer, p_command jsonb) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_actor text; v_items jsonb; v_revision integer; v_kind text := p_command->>'kind';
  v_note text := trim(coalesce(p_command->>'note','')); v_wh text := p_command->>'warehouse';
  v_other text; v_index integer; v_item jsonb; v_line jsonb; v_lines jsonb;
  v_before numeric; v_after numeric; v_qty numeric; v_changes jsonb := '[]'; v_key text;
begin
  v_actor := sklad_private.actor(p_token);
  select items, revision into v_items,v_revision from sklad_private.state where id for update;
  if exists(select 1 from sklad_private.operations where id=p_id) then return public.sklad_read(p_token); end if;
  if p_revision <> v_revision or p_revision is null then raise exception 'CONFLICT'; end if;
  if v_kind is null or v_kind not in ('receipt','transfer','writeoff','inventory','item','target') then raise exception 'INVALID'; end if;
  if length(v_note) not between 2 and 1000 then raise exception 'NOTE'; end if;
  if v_kind = 'item' then
    v_item := p_command->'item';
    if v_item is null or length(trim(coalesce(v_item->>'name',''))) not between 1 and 120
      or coalesce(v_item->>'category','') not in ('Инвентарь','Техника','Химия','Расходники')
      or coalesce(v_item->>'unit','') not in ('шт','л','мл','кг','г','уп','не уточнено') then raise exception 'INVALID'; end if;
    if exists(select 1 from jsonb_array_elements(v_items) i where lower(trim(i->>'name'))=lower(trim(v_item->>'name')) and i->>'unit'=v_item->>'unit') then raise exception 'INVALID'; end if;
    v_item := jsonb_build_object('id',p_id::text,'name',trim(v_item->>'name'),'category',v_item->>'category','unit',v_item->>'unit','note',left(coalesce(v_item->>'note',''),1000),'adler',null,'sochi',null,'targetAdler',null,'targetSochi',null);
    v_items := v_items || jsonb_build_array(v_item);
    v_changes := jsonb_build_array(jsonb_build_object('name',v_item->>'name','warehouse','adler','before',null,'after',null));
  else
    if v_wh is null or v_wh not in ('adler','sochi') then raise exception 'INVALID'; end if;
    v_other := case when v_wh='adler' then 'sochi' else 'adler' end;
    v_lines := p_command->'lines';
    if jsonb_typeof(v_lines) is distinct from 'array' then raise exception 'INVALID'; end if;
    if jsonb_array_length(v_lines) not between 1 and 500 then raise exception 'INVALID'; end if;
    if (select count(*) <> count(distinct l->>'id') from jsonb_array_elements(v_lines) l) then raise exception 'INVALID'; end if;
    for v_line in select value from jsonb_array_elements(v_lines) loop
      select ordinality::integer-1, value into v_index,v_item from jsonb_array_elements(v_items) with ordinality where value->>'id'=v_line->>'id';
      if v_item is null then raise exception 'MISSING'; end if;
      if jsonb_typeof(v_line->'quantity') is distinct from 'number' then raise exception 'INVALID'; end if;
      v_qty := (v_line->>'quantity')::numeric;
      if v_qty < 0 or v_qty > 1000000 or v_qty <> round(v_qty,3) then raise exception 'INVALID'; end if;
      if v_item->>'unit'='шт' and v_qty <> trunc(v_qty) then raise exception 'INVALID'; end if;
      v_key := case when v_kind='target' then case when v_wh='adler' then 'targetAdler' else 'targetSochi' end else v_wh end;
      v_before := (v_item->>v_key)::numeric;
      if v_kind in ('receipt','transfer','writeoff') then
        if v_qty <= 0 then raise exception 'INVALID'; end if;
        if v_before is null then raise exception 'UNKNOWN'; end if;
        v_after := v_before + case when v_kind='receipt' then v_qty else -v_qty end;
      else v_after := v_qty;
      end if;
      if v_after < 0 then raise exception 'STOCK'; end if;
      if v_after > 1000000 then raise exception 'INVALID'; end if;
      v_item := jsonb_set(v_item,array[v_key],to_jsonb(v_after));
      v_changes := v_changes || jsonb_build_array(jsonb_build_object('name',v_item->>'name','warehouse',v_wh,'before',v_before,'after',v_after));
      if v_kind='transfer' then
        v_before := (v_item->>v_other)::numeric;
        if v_before is null then raise exception 'UNKNOWN'; end if;
        v_after := v_before+v_qty;
        if v_after > 1000000 then raise exception 'INVALID'; end if;
        v_item := jsonb_set(v_item,array[v_other],to_jsonb(v_after));
        v_changes := v_changes || jsonb_build_array(jsonb_build_object('name',v_item->>'name','warehouse',v_other,'before',v_before,'after',v_after));
      end if;
      v_items := jsonb_set(v_items,array[v_index::text],v_item);
    end loop;
  end if;
  update sklad_private.state set items=v_items, revision=revision+1 where id;
  insert into sklad_private.operations(id,actor,kind,note,changes) values(p_id,v_actor,v_kind,v_note,v_changes);
  return public.sklad_read(p_token);
end $$;

revoke all on all tables in schema sklad_private from public, anon, authenticated;
revoke all on all functions in schema sklad_private from public, anon, authenticated;
revoke all on function public.sklad_login(text,text), public.sklad_read(text), public.sklad_logout(text), public.sklad_command(text,uuid,integer,jsonb) from public;
grant execute on function public.sklad_login(text,text), public.sklad_read(text), public.sklad_logout(text), public.sklad_command(text,uuid,integer,jsonb) to anon;
