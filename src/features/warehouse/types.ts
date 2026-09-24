export type Warehouse = 'adler' | 'sochi';
export type Item = { id: string; name: string; category: string; unit: string; note: string; adler: number | null; sochi: number | null; targetAdler: number | null; targetSochi: number | null };
export type StockChange = { name: string; warehouse: Warehouse; before: number | null; after: number | null; removed?: boolean };
export type NoteChange = { name: string; field: 'note'; before: string | null; after: string | null };
export type Operation = { id: string; at: string; actor: string; kind: string; note: string; changes: (StockChange | NoteChange)[] };
export type Snapshot = { revision: number; items: Item[]; history: Operation[] };
export const warehouses = { adler: 'Адлер', sochi: 'Сочи' };
export const kinds = { receipt: 'Поступление', transfer: 'Перемещение', writeoff: 'Списание', inventory: 'Инвентаризация', item: 'Новая позиция', target: 'Изменение эталона', delete: 'Удаление', annotate: 'Примечание' };
export const categories = ['Инвентарь', 'Техника', 'Химия', 'Расходники'];
export const units = ['шт', 'л', 'мл', 'кг', 'г', 'уп', 'не уточнено'];
export const targetKey = (w: Warehouse) => w === 'adler' ? 'targetAdler' : 'targetSochi';
export function shortage(item: Item, w: Warehouse): number | null {
  const actual = item[w], target = item[targetKey(w)];
  return actual === null || target === null ? null : Math.max(0, target - actual);
}
export function quantity(value: string): number {
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(value.trim())) throw new Error('Укажите число от 0, не более трёх знаков после запятой.');
  const number = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(number) || number > 1000000) throw new Error('Количество должно быть не больше 1 000 000.');
  return number;
}
export function inRepair(note: string): boolean {
  return /ремонт/i.test(note || '');
}
export type RowStatus = 'не посчитано' | 'В ремонте' | 'ниже эталона';
export function rowStatuses(item: Item, w: Warehouse): RowStatus[] {
  const list: RowStatus[] = [];
  if (item[w] === null) list.push('не посчитано');
  if (inRepair(item.note)) list.push('В ремонте');
  if ((shortage(item, w) || 0) > 0) list.push('ниже эталона');
  return list;
}
export function isNoteChange(change: StockChange | NoteChange): change is NoteChange {
  return 'field' in change && change.field === 'note';
}
function operationNote(note: string): string {
  const trimmed = note.trim();
  if (trimmed.length < 2 || trimmed.length > 1000) throw new Error('Укажите основание операции.');
  return trimmed;
}
export function deleteCommand(id: string, note: string) {
  if (!id) throw new Error('Позиция не найдена.');
  return { kind: 'delete' as const, id, note: operationNote(note) };
}
export function annotateCommand(id: string, note: string, itemNote: string) {
  if (!id) throw new Error('Позиция не найдена.');
  const next = itemNote.trim();
  if (next.length > 1000) throw new Error('Примечание не длиннее 1000 символов.');
  return { kind: 'annotate' as const, id, note: operationNote(note), itemNote: next };
}
export function withRepairNote(note: string): string {
  const trimmed = (note || '').trim();
  if (inRepair(trimmed)) return trimmed.slice(0, 1000);
  return (trimmed ? `${trimmed} В ремонте.` : 'В ремонте.').slice(0, 1000);
}
