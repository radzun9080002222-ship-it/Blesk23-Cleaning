import type { Snapshot } from './types';
const url = import.meta.env.VITE_WAREHOUSE_SUPABASE_URL;
const key = import.meta.env.VITE_WAREHOUSE_SUPABASE_KEY;
export class WarehouseError extends Error { constructor(message: string, public code?: string) { super(message); } }
export async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${url}/rest/v1/rpc/sklad_${name}`, {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(20000),
    });
  } catch { throw new WarehouseError('Нет связи с сервером. Проверьте интернет. Если сохраняли операцию, повторите её: двойного проведения не будет.'); }
  if (response.ok && response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok) {
    const messages: Record<string, string> = { AUTH: 'Сессия завершилась. Войдите снова.', CONFLICT: 'Остатки уже изменились. Обновите данные и проверьте операцию.', UNKNOWN: 'Остаток ещё не посчитан. Сначала проведите инвентаризацию.', STOCK: 'Недостаточно остатка для этой операции.', INVALID: 'Проверьте поля операции.', NOTE: 'Укажите основание операции.', MISSING: 'Позиция не найдена.' };
    throw new WarehouseError(messages[result.message] || 'Склад пока недоступен. Попробуйте обновить страницу или обратитесь к администратору.', result.message);
  }
  return result as T;
}
export const readStock = (token: string) => rpc<Snapshot>('read', { p_token: token });
