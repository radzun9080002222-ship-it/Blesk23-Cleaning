import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowDownToLine, ArrowLeftRight, ClipboardCheck, Download, LogOut, Package, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { categories, kinds, quantity, shortage, targetKey, units, warehouses, type Item, type Snapshot, type Warehouse as WarehouseId } from '@/features/warehouse/types';
import { readStock, rpc, WarehouseError } from '@/features/warehouse/api';
import './Warehouse.css';

type Kind = keyof typeof kinds;
type Pending = { id: string; revision: number; command: Record<string, unknown> };
const getPending = (): Pending | null => { try { return JSON.parse(sessionStorage.getItem('sklad-pending') || 'null'); } catch { return null; } };
type Session = { token: string; actor: string };
const fmt = (n: number | null) => n === null ? 'Не посчитано' : n.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
const getSession = (): Session | null => { try { return JSON.parse(sessionStorage.getItem('sklad-session') || 'null'); } catch { return null; } };
function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Warehouse() {
  const [session, setSession] = useState<Session | null>(getSession);
  const [pin, setPin] = useState(''); const [actor, setActor] = useState('');
  const [data, setData] = useState<Snapshot | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [warehouse, setWarehouse] = useState<WarehouseId>('adler'); const [tab, setTab] = useState('stock');
  const [query, setQuery] = useState(''); const [category, setCategory] = useState(''); const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState<{ kind: Kind; item?: Item } | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({}); const [note, setNote] = useState('');
  const [newName, setNewName] = useState(''); const [newUnit, setNewUnit] = useState('шт'); const [newCategory, setNewCategory] = useState('Инвентарь');
  const [notice, setNotice] = useState(''); const [updated, setUpdated] = useState('');
  const pending = useRef<Pending | null>(getPending());
  const [retry, setRetry] = useState(false); const lock = useRef(false);
  function forget() { sessionStorage.removeItem('sklad-session'); setSession(null); setData(null); setModal(null); setRetry(false); }
  function fail(e: unknown) { setError(e instanceof Error ? e.message : 'Ошибка операции.'); if (e instanceof WarehouseError && e.code === 'AUTH') forget(); }
  async function refresh() {
    if (!session || lock.current) return;
    lock.current=true; setBusy(true); setError('');
    try { setData(await readStock(session.token)); setUpdated(new Date().toLocaleTimeString('ru-RU')); } catch(e) { fail(e); }
    finally { lock.current=false; setBusy(false); }
  }
  useEffect(() => {
    if (!session) return;
    let active=true;
    readStock(session.token).then(result => { if(active) { setData(result); setUpdated(new Date().toLocaleTimeString('ru-RU')); } }).catch(e => { if(active) fail(e); });
    return () => { active=false; };
    // Session changes are the only trigger; manual refresh never replaces an open document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  async function login(e: React.FormEvent) {
    e.preventDefault(); if(lock.current) return; lock.current=true; setBusy(true); setError('');
    try {
      const result = await rpc<{token?: string; error?: string}>('login', { p_pin: pin, p_actor: actor.trim() });
      if (!result.token) throw new Error(result.error);
      const s = { token: result.token, actor: actor.trim() }; sessionStorage.setItem('sklad-session',JSON.stringify(s)); setSession(s); setPin('');
    } catch(e) { fail(e); } finally { lock.current=false; setBusy(false); }
  }
  function open(kind: Kind, item?: Item) { if(pending.current) { setError('Сначала проверьте результат предыдущей операции.'); return; } setError(''); setNotice(''); setAmounts({}); setNote(''); setNewName(''); setModal({kind,item}); setRetry(false); }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!session || !data || !modal || lock.current) return;
    lock.current=true; setBusy(true); setError('');
    try {
      if (!pending.current) {
        let command: Record<string,unknown> = { kind: modal.kind, warehouse, note: note.trim() };
        if (note.trim().length < 2) throw new Error('Укажите основание операции.');
        if(modal.kind==='item') command = {...command,item:{name:newName.trim(),unit:newUnit,category:newCategory,note:''}};
        else {
          const lines = Object.entries(amounts).filter(([,v])=>v.trim()!=='').map(([id,v]) => ({id,quantity:quantity(v)}));
          if (!lines.length) throw new Error('Заполните хотя бы одно количество.');
          if (lines.some(l => data.items.find(i=>i.id===l.id)?.unit==='шт' && !Number.isInteger(l.quantity))) throw new Error('Количество в штуках должно быть целым.');
          command = {...command, lines};
        }
        pending.current = {id:crypto.randomUUID(),revision:data.revision,command};
        sessionStorage.setItem('sklad-pending',JSON.stringify(pending.current));
      }
      const p = pending.current;
      const result = await rpc<Snapshot>('command',{p_token:session.token,p_id:p.id,p_revision:p.revision,p_command:p.command});
      setData(result); setUpdated(new Date().toLocaleTimeString('ru-RU')); setModal(null); pending.current=null; sessionStorage.removeItem('sklad-pending'); setRetry(false); setNotice('Операция проведена. Остатки сохранены на сервере.');
    } catch(e) {
      fail(e);
      if(e instanceof WarehouseError && e.code && e.code!=='AUTH') { pending.current=null; sessionStorage.removeItem('sklad-pending'); setRetry(false); }
      else setRetry(!!pending.current);
    } finally { lock.current=false; setBusy(false); }
  }
  async function recover() {
    if (!session || !pending.current || lock.current) return;
    lock.current=true; setBusy(true); setError('');
    try {
      const p=pending.current;
      setData(await rpc<Snapshot>('command',{p_token:session.token,p_id:p.id,p_revision:p.revision,p_command:p.command}));
      pending.current=null; sessionStorage.removeItem('sklad-pending'); setRetry(false); setNotice('Результат предыдущей операции подтверждён. Остатки сохранены.');
    } catch(e) {
      fail(e);
      if(e instanceof WarehouseError && e.code && e.code!=='AUTH') { pending.current=null; sessionStorage.removeItem('sklad-pending'); setRetry(false); }
    } finally { lock.current=false; setBusy(false); }
  }
  const items = data?.items || [];
  const shown = items.filter(i=>(!category || i.category===category) && `${i.name} ${i.note}`.toLowerCase().includes(query.toLowerCase()) && (filter==='all' || (filter==='short' && (shortage(i,warehouse)||0)>0) || (filter==='unknown' && i[warehouse]===null) || (filter==='notes' && !!i.note)));
  const deficit = items.filter(i=>(shortage(i,warehouse)||0)>0);
  function exportCsv() {
    const cell = (v: unknown) => `"${String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')}"`;
    const rows = [['Наименование','Категория','Ед.','Адлер факт','Адлер эталон','Сочи факт','Сочи эталон','Примечание'],...items.map(i=>[i.name,i.category,i.unit,i.adler===null?'Не посчитано':i.adler,i.targetAdler,i.sochi===null?'Не посчитано':i.sochi,i.targetSochi,i.note])];
    download(`sklad-${new Date().toISOString().slice(0,10)}.csv`,'\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
  }
  const meta = <Helmet><title>Склад — Империя Блеска</title><meta name="robots" content="noindex, nofollow, noarchive"/><meta name="referrer" content="no-referrer"/></Helmet>;
  if (!session) return <main className="sklad login-page">{meta}<form className="login-card" onSubmit={login}><div className="sklad-logo"><Package size={26}/></div><p className="eyebrow">ИМПЕРИЯ БЛЕСКА · ДЛЯ СОТРУДНИКОВ</p><h1>Всё на своих местах.</h1><p className="muted">Остатки, техника и расходники двух складов.</p><label>Ваше имя<input required minLength={2} maxLength={80} value={actor} onChange={e=>setActor(e.target.value)} autoComplete="name" placeholder="Имя сотрудника"/></label><label>Код доступа<input required type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={e=>setPin(e.target.value)} autoComplete="current-password" placeholder="••••"/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'Проверяем…':'Открыть склад →'}</button><small>Данные доступны только после входа.</small></form></main>;
  return <main className="sklad">{meta}<header className="sklad-header"><div className="brand"><span className="sklad-logo"><Package/></span><div><b>Империя Блеска</b><small>Управление складами</small></div></div><div className="header-actions"><span>{session.actor}</span><button aria-label="Выйти" onClick={async()=>{ try { await rpc('logout',{p_token:session.token}); forget(); } catch(e){fail(e);} }}><LogOut size={18}/></button></div></header><div className="sklad-content"><div className="title-row"><div><p className="eyebrow">ПОРЯДОК В ДЕТАЛЯХ</p><h1>Склад</h1><p className="muted">Знаем, что есть. Видим, чего не хватает.</p></div><div className="tools"><button onClick={refresh} disabled={busy||!!modal}><RefreshCw size={16}/> Обновить</button><button onClick={exportCsv} disabled={!data}><Download size={16}/> CSV</button><button className="primary" disabled={!data} onClick={()=>open('item')}><Plus size={17}/> Позиция</button></div></div>
      {error && !modal && <div role="alert" className="error">{error}</div>}{notice&&<div className="success" role="status">{notice}</div>}
      {pending.current&&!modal&&<div className="info">Есть операция без подтверждённого результата. <button disabled={busy} onClick={recover}>Проверить предыдущую операцию</button></div>}
      {!data ? <div className="empty">{error?'Не удалось загрузить склад. Нажмите «Обновить».':'Загружаем остатки…'}</div> : <>
      <div className="location-row"><div className="segmented">{Object.entries(warehouses).map(([key,name])=><button key={key} className={warehouse===key?'active':''} onClick={()=>{setWarehouse(key as WarehouseId);setQuery('');}}>{name}</button>)}</div><span className="sync">Общие данные · обновлено {updated}</span></div>
      <div className="stats"><div><small>Позиций в каталоге</small><strong>{items.length}</strong><span>техника, химия и инвентарь</span></div><div><small>Ниже эталона</small><strong className={deficit.length?'orange':''}>{deficit.length}</strong><span>позиций для пополнения</span></div><div><small>Осталось посчитать</small><strong>{items.filter(i=>i[warehouse]===null).length}</strong><span>неизвестный остаток — не ноль</span></div></div>
      <nav className="tabs" aria-label="Разделы склада">{[['stock','Остатки'],['purchase','К пополнению'],['history','История']].map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</nav>
      {tab==='history'?<section className="history"><p className="muted">Последние 500 документов. Все операции хранятся на сервере. Исправления оформляйте новой операцией.</p>{data.history.length===0?<div className="empty">Операций пока нет. Начальные остатки загружены отдельно.</div>:data.history.map(o=><article key={o.id}><div className="history-title"><b>{kinds[o.kind as Kind]||o.kind}</b><small>{new Date(o.at).toLocaleString('ru-RU')} · {o.actor}</small></div><p>{o.note}</p>{o.changes.map((c,n)=><div className="change" key={n}><span>{c.name} · {warehouses[c.warehouse]}</span><b>{fmt(c.before)} → {fmt(c.after)}</b></div>)}</article>)}</section>:<>
      {tab==='purchase'&&<div className="info">Недостача считается только там, где известны факт и эталон. Непосчитанные позиции сюда не входят. Внесите закупку через «Поступление».</div>}
      <div className="stock-toolbar"><label className="search"><Search size={18}/><input aria-label="Поиск позиции" placeholder="Найти позицию…" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Категория" value={category} onChange={e=>setCategory(e.target.value)}><option value="">Все категории</option>{categories.map(c=><option key={c}>{c}</option>)}</select><select aria-label="Фильтр остатков" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Все остатки</option><option value="short">Ниже эталона</option><option value="unknown">Не посчитано</option><option value="notes">С примечанием</option></select><button onClick={()=>open('inventory')}><ClipboardCheck size={17}/> Инвентаризация</button></div>
      <section className="stock-table"><div className="table-head"><span>Наименование</span><span>Факт</span><span>Эталон</span><span>Не хватает</span><span>Операции</span></div>{shown.filter(i=>tab!=='purchase'||(shortage(i,warehouse)||0)>0).map(i=><article className="stock-row" key={i.id}><div className="item-name"><small>{i.category} · {i.unit}</small><h3>{i.name}</h3>{i.note&&<p>{i.note}</p>}</div><div className={`number ${i[warehouse]===null?'unknown':''}`}><span className="mobile-label">Факт</span>{fmt(i[warehouse])}</div><button className="target-value" title="Изменить эталон" aria-label={`Эталон: ${i.name}`} onClick={()=>open('target',i)}><span className="mobile-label">Эталон</span>{i[targetKey(warehouse)]===null?'—':fmt(i[targetKey(warehouse)])}<SlidersHorizontal size={12}/></button><div className="number"><span className="mobile-label">Не хватает</span>{shortage(i,warehouse)===null?'—':<span className={shortage(i,warehouse)!>0?'badge-short':'badge-ok'}>{fmt(shortage(i,warehouse))}</span>}</div><div className="row-actions"><button title="Поступление" aria-label={`Поступление: ${i.name}`} onClick={()=>open('receipt',i)}><ArrowDownToLine size={17}/></button><button title="Перемещение" aria-label={`Перемещение: ${i.name}`} onClick={()=>open('transfer',i)}><ArrowLeftRight size={17}/></button><button title="Списание" aria-label={`Списание: ${i.name}`} onClick={()=>open('writeoff',i)}><Trash2 size={17}/></button><button title="Посчитать" aria-label={`Посчитать: ${i.name}`} onClick={()=>open('inventory',i)}><ClipboardCheck size={17}/></button></div></article>)}{!shown.filter(i=>tab!=='purchase'||(shortage(i,warehouse)||0)>0).length&&<div className="empty">По выбранным условиям позиций нет.</div>}</section></>}
      <footer>Адлер и Сочи · Единый складской учёт <span>Нулевой остаток вводится явно при инвентаризации.</span></footer></>}
    </div>
    {modal&&<div className="modal-backdrop"><section className="sklad-modal" role="dialog" aria-modal="true" aria-labelledby="operation-title"><form onSubmit={submit}><div className="modal-title"><div><p className="eyebrow">{warehouses[warehouse]}{modal.kind==='transfer'?` → ${warehouses[warehouse==='adler'?'sochi':'adler']}`:''}</p><h2 id="operation-title">{kinds[modal.kind]}</h2></div><button type="button" aria-label="Закрыть" disabled={busy} onClick={()=>{setModal(null);setError('');}}><X/></button></div><fieldset disabled={busy||retry}>
    {modal.kind==='item'?<><label>Название<input autoFocus required maxLength={120} value={newName} onChange={e=>setNewName(e.target.value)}/></label><div className="form-grid"><label>Категория<select value={newCategory} onChange={e=>setNewCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Единица<select value={newUnit} onChange={e=>setNewUnit(e.target.value)}>{units.map(c=><option key={c}>{c}</option>)}</select></label></div><p className="info">Новая позиция появится с непосчитанными остатками. Укажите фактическое количество через инвентаризацию, затем оформляйте поступления.</p></>:<><p className="info">{modal.kind==='inventory'?'Введите фактический остаток. Пустые поля не меняются; 0 означает, что позиции нет.':modal.kind==='target'?'Эталон — желаемый остаток на этом складе. Фактическое количество не изменится.':'Укажите количество в единицах позиции. Для непосчитанных остатков сначала проведите инвентаризацию.'}</p><div className="inventory-lines">{(modal.item?[modal.item]:items).map(i=><label className="inventory-line" key={i.id}><span><b>{i.name}</b><small>Сейчас: {fmt(i[warehouse])} · {i.unit}{modal.kind==='transfer'?` / ${warehouses[warehouse==='adler'?'sochi':'adler']}: ${fmt(i[warehouse==='adler'?'sochi':'adler'])}`:''}</small></span><input aria-label={`Количество: ${i.name}`} inputMode="decimal" placeholder={modal.kind==='inventory'?'Факт':'Количество'} value={amounts[i.id]||''} onChange={e=>setAmounts({...amounts,[i.id]:e.target.value})}/></label>)}</div></>}
    <label>Основание / комментарий<textarea required minLength={2} maxLength={1000} placeholder="Например: закупка по чеку, передача бригаде, пересчёт склада" value={note} onChange={e=>setNote(e.target.value)}/></label></fieldset>{error&&<div className="error" role="alert">{error}{error.includes('Обновите данные')&&<button type="button" onClick={refresh}>Обновить данные</button>}</div>}{retry&&<p className="info">Результат отправки неизвестен. Повторите ту же операцию — сервер проверит, была ли она уже проведена.</p>}<div className="modal-footer"><button type="button" disabled={busy} onClick={()=>{setModal(null);setError('');}}>Закрыть</button><button className="primary" disabled={busy}>{busy?'Сохраняем…':retry?'Проверить / повторить':'Провести операцию'}</button></div></form></section></div>}
  </main>;
}
