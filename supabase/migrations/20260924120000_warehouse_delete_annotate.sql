-- Delete a catalog row and edit an item note. Apply after 20260918120000_warehouse.sql.
-- Product path: /sklad calls sklad_command with kind delete or annotate. Do not edit sklad_private.state by hand.
-- delete:  { "kind":"delete", "note":"почему удаляем", "id":"<item uuid>" }
-- annotate: { "kind":"annotate", "note":"основание", "id":"<item uuid>", "itemNote":"В ремонте." }
--          or lines: [{ "id":"<item uuid>", "note":"новый текст примечания" }]
create or replace function public.sklad_command(p_token text, p_id uuid, p_revision integer, p_command jsonb) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_actor text; v_items jsonb; v_revision integer; v_kind text := p_command->>'kind';
  v_note text := trim(coalesce(p_command->>'note','')); v_wh text := p_command->>'warehouse';
  v_other text; v_index integer; v_item jsonb; v_line jsonb; v_lines jsonb;
  v_before numeric; v_after numeric; v_qty numeric; v_changes jsonb := '[]'; v_key text;
  v_target text; v_item_note text; v_old_note text; v_next jsonb;
begin
  v_actor := sklad_private.actor(p_token);
  select items, revision into v_items,v_revision from sklad_private.state where id for update;
  if exists(select 1 from sklad_private.operations where id=p_id) then return public.sklad_read(p_token); end if;
  if p_revision <> v_revision or p_revision is null then raise exception 'CONFLICT'; end if;
  if v_kind is null or v_kind not in ('receipt','transfer','writeoff','inventory','item','target','delete','annotate') then raise exception 'INVALID'; end if;
  if length(v_note) not between 2 and 1000 then raise exception 'NOTE'; end if;
  if v_kind = 'delete' then
    v_target := nullif(trim(coalesce(p_command->>'id','')), '');
    if v_target is null and jsonb_typeof(p_command->'lines') = 'array' then
      if jsonb_array_length(p_command->'lines') <> 1 then raise exception 'INVALID'; end if;
      v_target := nullif(trim(coalesce(p_command->'lines'->0->>'id','')), '');
    end if;
    if v_target is null then raise exception 'INVALID'; end if;
    select t.ordinality::integer - 1, t.value into v_index, v_item
      from jsonb_array_elements(v_items) with ordinality as t(value, ordinality)
     where t.value->>'id' = v_target;
    if v_item is null then raise exception 'MISSING'; end if;
    v_changes := jsonb_build_array(
      jsonb_build_object('name', v_item->>'name', 'warehouse', 'adler', 'before', v_item->'adler', 'after', null, 'removed', true),
      jsonb_build_object('name', v_item->>'name', 'warehouse', 'sochi', 'before', v_item->'sochi', 'after', null, 'removed', true)
    );
    select coalesce(jsonb_agg(t.value order by t.ordinality), '[]'::jsonb) into v_next
      from jsonb_array_elements(v_items) with ordinality as t(value, ordinality)
     where t.value->>'id' is distinct from v_target;
    v_items := v_next;
  elsif v_kind = 'annotate' then
    if p_command ? 'itemNote' then
      if jsonb_typeof(p_command->'itemNote') is distinct from 'string' then raise exception 'INVALID'; end if;
      v_item_note := p_command->>'itemNote';
      v_target := nullif(trim(coalesce(p_command->>'id','')), '');
    elsif jsonb_typeof(p_command->'lines') = 'array' then
      if jsonb_array_length(p_command->'lines') <> 1 then raise exception 'INVALID'; end if;
      v_line := p_command->'lines'->0;
      if v_line is null or jsonb_typeof(v_line->'note') is distinct from 'string' then raise exception 'INVALID'; end if;
      v_item_note := v_line->>'note';
      v_target := nullif(trim(coalesce(v_line->>'id','')), '');
    else
      raise exception 'INVALID';
    end if;
    if v_target is null or v_item_note is null then raise exception 'INVALID'; end if;
    v_item_note := trim(v_item_note);
    if length(v_item_note) > 1000 then raise exception 'INVALID'; end if;
    select t.ordinality::integer - 1, t.value into v_index, v_item
      from jsonb_array_elements(v_items) with ordinality as t(value, ordinality)
     where t.value->>'id' = v_target;
    if v_item is null then raise exception 'MISSING'; end if;
    v_old_note := coalesce(v_item->>'note', '');
    v_item := jsonb_set(v_item, '{note}', to_jsonb(v_item_note));
    v_changes := jsonb_build_array(jsonb_build_object('name', v_item->>'name', 'field', 'note', 'before', v_old_note, 'after', v_item_note));
    v_items := jsonb_set(v_items, array[v_index::text], v_item);
  elsif v_kind = 'item' then
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
