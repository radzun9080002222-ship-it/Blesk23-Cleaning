export type Warehouse = 'adler' | 'sochi';
export type Item = { id: string; name: string; category: string; unit: string; note: string; adler: number | null; sochi: number | null; targetAdler: number | null; targetSochi: number | null };
export type Operation = { id: string; at: string; actor: string; kind: string; note: string; changes: { name: string; warehouse: Warehouse; before: number | null; after: number | null }[] };
export type Snapshot = { revision: number; items: Item[]; history: Operation[] };
export const warehouses = { adler: 'Адлер', sochi: 'Сочи' };
export const kinds = { receipt: 'Поступление', transfer: 'Перемещение', writeoff: 'Списание', inventory: 'Инвентаризация', item: 'Новая позиция', target: 'Изменение эталона' };
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
