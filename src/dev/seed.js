// Приклад даних, поки немає майстра додавання (етап 3).
// Кожен товар отримує історію відносно сьогодні, щоб групи виглядали як у макетах.

import { saveProduct, addEvent } from '../db.js';
import { todayISO, addDays } from '../core/dates.js';

// [назва, іконка, упаковка, вміст, одиниця, днів на упаковку | шт на тиждень, зберігання, термін, знає?, днів від покупки, упаковок, архів?]
const DEMO = [
  ['Хліб', 'bread', 'loaf', 1, 'pcs', 3, 'cupboard', 4, true, 3, 1],
  ['Молоко', 'milk', 'bottle', 1, 'l', 2.5, 'fridge', 7, true, 6, 3],
  ['Банани', 'banana', 'piece', 1, 'pcs', 12, 'cupboard', 7, false, 2, 6],
  ['Яйця', 'egg', 'tray', 10, 'pcs', 12, 'fridge', 28, true, 8, 1],
  ['Туалетний папір', 'paper', 'package', 8, 'pcs', 28, 'cupboard', null, true, 23, 1],
  ['Сир твердий', 'cheese', 'chunk', 250, 'g', 9, 'fridge', 14, false, 4, 1],
  ['Гречка', 'rice', 'pack', 1, 'kg', 14, 'cupboard', null, false, 8, 1],
  ['Кава мелена', 'coffee', 'pack', 250, 'g', 14, 'cupboard', null, true, 8, 1],
  ['Помідори', 'tomato', 'weight', 500, 'g', 5, 'fridge', 7, true, 1, 2],
  ['Чай зелений', 'tea', 'pack', 100, 'g', 40, 'cupboard', null, true, 29, 1],
  ['Мило', 'soap', 'package', 1, 'pcs', 30, 'cupboard', null, true, 17, 1],
  ['Картопля', 'potato', 'weight', 1, 'kg', 10, 'cupboard', 30, false, 4, 2],
  ['Масло вершкове', 'butter', 'pack', 200, 'g', 14, 'fridge', 30, true, 10, 2],
  ['Олія оливкова', 'olive', 'bottle', 1, 'l', 30, 'cupboard', null, true, 9, 1],
  ['Макарони', 'pasta', 'pack', 500, 'g', 12, 'cupboard', null, true, 0, 2],
  ['Пральний засіб', 'lotion', 'bottle', 1.5, 'l', 45, 'cupboard', null, true, 10, 1],
  ['Фарш баранячий', 'meat', 'weight', 500, 'g', 7, 'freezer', 90, true, 2, 6],
  ['Сіль', 'salt', 'pack', 1, 'kg', 180, 'cupboard', null, true, 60, 1],
  ['Огірки', 'cucumber', 'weight', 1, 'kg', 7, 'fridge', 7, null, 0, 0],
  ['Чай чорний', 'tea', 'pack', 100, 'g', 40, 'cupboard', null, true, 50, 1, true],
];

export async function seedDemo() {
  const t = todayISO();
  for (const [name, icon, packType, packSize, unit, norm, storage, shelf, known, since, packs, archived] of DEMO) {
    const fields = {
      name, icon, packType, packSize, unit, storage, shelfLifeDays: shelf, archived: !!archived,
      ...(packType === 'piece' ? { perWeek: norm } : { daysPerPack: norm }),
    };
    const pd = packType === 'piece' ? 7 / norm : norm; // днів на одну упаковку (штуку)
    const cycle = Math.round(pd * (packs || 1));
    const start = since + (known ? 2 * cycle : 0) + 1;
    const p = await saveProduct(fields, { addedDate: addDays(t, -start) });
    if (known === null) continue; // залишок невідомий
    if (known) {
      await addEvent(p.id, 'bought', packs, addDays(t, -(since + 2 * cycle)));
      await addEvent(p.id, 'ranOut', null, addDays(t, -(since + cycle)));
      await addEvent(p.id, 'bought', packs, addDays(t, -(since + cycle)));
      await addEvent(p.id, 'ranOut', null, addDays(t, -since));
    }
    await addEvent(p.id, 'bought', packs, addDays(t, -since));
  }
}
