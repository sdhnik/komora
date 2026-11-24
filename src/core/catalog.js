// Словник товарів: за назвою підставляє відповіді майстра.
// k — основи слів у нижньому регістрі (пошук за підрядком, перший збіг виграє, тому конкретніші вище).
// lasts — на скільки вистачає однієї упаковки: '2-3d' | 'week' | '2w' | 'month' | 'longer'.
// Для piece замість lasts — perWeek (штук на тиждень). shelf — термін зберігання, днів (null = без обмежень).

import { matchIcon, FALLBACK_ICON } from './icons.js';
import { STORAGE_SHELF } from './constants.js';

const C = (k, icon, packType, packSize, unit, lasts, storage, shelf = undefined, perWeek = undefined) =>
  ({ k: k.split(' '), icon, packType, packSize, unit, lasts, storage, shelf, perWeek });

export const CATALOG = [
  // молочне
  C('кефір ряжан йогурт', 'milk', 'bottle', 1, 'l', '2-3d', 'fridge', 7),
  C('молок', 'milk', 'bottle', 1, 'l', '2-3d', 'fridge', 7),
  C('вершк', 'milk', 'package', 200, 'ml', 'week', 'fridge', 7),
  C('сметан', 'milk', 'jar', 350, 'g', 'week', 'fridge', 10),
  C('кисломол творог', 'cheese', 'package', 400, 'g', 'week', 'fridge', 5),
  C('моцарел', 'cheese', 'package', 125, 'g', 'week', 'fridge', 7),
  C('сир сирок бринз', 'cheese', 'chunk', 250, 'g', 'week', 'fridge', 14),
  C('масло вершков вершкове', 'butter', 'pack', 200, 'g', '2w', 'fridge', 30),
  C('маргарин', 'butter', 'pack', 250, 'g', '2w', 'fridge', 30),
  C('яйц яйце', 'egg', 'tray', 10, 'pcs', '2w', 'fridge', 28),
  // хліб і крупи
  C('лаваш', 'bread', 'package', 1, 'pcs', '2-3d', 'cupboard', 4),
  C('хліб батон багет', 'bread', 'loaf', 1, 'pcs', '2-3d', 'cupboard', 4),
  C('круасан булк випічк', 'croissant', 'package', 4, 'pcs', '2-3d', 'cupboard', 4),
  C('гречк', 'rice', 'pack', 1, 'kg', '2w', 'cupboard', null),
  C('рис', 'rice', 'pack', 1, 'kg', '2w', 'cupboard', null),
  C('булгур кус пшон перлов кукурудзян', 'rice', 'pack', 500, 'g', '2w', 'cupboard', null),
  C('вівсян пластівц гранол мюслі', 'rice', 'pack', 500, 'g', '2w', 'cupboard', null),
  C('борошн', 'rice', 'pack', 1, 'kg', 'month', 'cupboard', null),
  C('макарон спагеті паст локшин', 'pasta', 'pack', 500, 'g', '2w', 'cupboard', null),
  // м'ясо і риба
  C('фарш', 'meat', 'weight', 500, 'g', 'week', 'freezer', 90),
  C('свинин яловичин телятин баранин м’яс м\'яс мяс', 'meat', 'weight', 500, 'g', 'week', 'freezer', 90),
  C('курк курят стегн крильц філе індич', 'poultry', 'weight', 1, 'kg', 'week', 'freezer', 90),
  C('бекон шинк', 'bacon', 'package', 200, 'g', 'week', 'fridge', 10),
  C('ковбас сосиск сардельк', 'bacon', 'package', 400, 'g', 'week', 'fridge', 10),
  C('лосос сьомг форел', 'fish', 'weight', 300, 'g', 'week', 'freezer', 90),
  C('риб скумбр оселед хек минтай тунец', 'fish', 'weight', 500, 'g', 'week', 'freezer', 90),
  // овочі
  C('картопл картошк', 'potato', 'weight', 1, 'kg', 'week', 'cupboard', 30),
  C('помідор томат черрі', 'tomato', 'weight', 500, 'g', 'week', 'fridge', 7),
  C('огір кабач', 'cucumber', 'weight', 500, 'g', 'week', 'fridge', 7),
  C('морк', 'carrot', 'weight', 1, 'kg', '2w', 'fridge', 21),
  C('цибул', 'onion', 'weight', 1, 'kg', '2w', 'cupboard', 30),
  C('часник', 'garlic', 'piece', 1, 'pcs', undefined, 'cupboard', 60, 1),
  C('капуст буряк', 'carrot', 'weight', 1, 'kg', '2w', 'fridge', 21),
  C('перец болгар', 'tomato', 'weight', 500, 'g', 'week', 'fridge', 10),
  C('салат зелен кріп петрушк шпинат', 'cucumber', 'package', 1, 'pcs', 'week', 'fridge', 5),
  // фрукти
  C('банан', 'banana', 'piece', 1, 'pcs', undefined, 'cupboard', 7, 7),
  C('яблук груш', 'apple', 'weight', 1, 'kg', 'week', 'fridge', 21),
  C('лимон лайм', 'lemon', 'piece', 1, 'pcs', undefined, 'fridge', 21, 2),
  C('апельсин мандарин грейпфрут', 'lemon', 'weight', 1, 'kg', 'week', 'cupboard', 14),
  C('виноград ягод полуниц', 'grapes', 'package', 500, 'g', '2-3d', 'fridge', 5),
  C('олив маслин', 'olive', 'jar', 300, 'g', 'month', 'cupboard', null),
  // напої
  C('кав', 'coffee', 'pack', 250, 'g', '2w', 'cupboard', null),
  C('какао', 'coffee', 'pack', 250, 'g', 'month', 'cupboard', null),
  C('чай', 'tea', 'pack', 100, 'g', 'month', 'cupboard', null),
  C('сік соки нектар', 'juice', 'package', 1, 'l', 'week', 'cupboard', null),
  C('вода мінерал', 'juice', 'bottle', 1.5, 'l', '2-3d', 'cupboard', null),
  // солодке і бакалія
  C('мед', 'honey', 'jar', 400, 'g', 'month', 'cupboard', null),
  C('варенн джем', 'honey', 'jar', 300, 'g', 'month', 'fridge', 60),
  C('шоколад цукерк', 'choco', 'pack', 100, 'g', 'week', 'cupboard', null),
  C('печив крекер', 'cookie', 'pack', 200, 'g', 'week', 'cupboard', null),
  C('олія', 'olive', 'bottle', 1, 'l', 'month', 'cupboard', null),
  C('цукор', 'salt', 'pack', 1, 'kg', 'month', 'cupboard', null),
  C('сіль', 'salt', 'pack', 1, 'kg', 'longer', 'cupboard', null),
  C('спеці перец приправ', 'salt', 'pack', 50, 'g', 'longer', 'cupboard', null),
  // побут і гігієна
  C('туалетн папір', 'paper', 'package', 8, 'pcs', 'month', 'cupboard', null),
  C('серветк рушник паперов', 'paper', 'package', 1, 'pcs', 'month', 'cupboard', null),
  C('губк', 'sponge', 'package', 5, 'pcs', 'month', 'cupboard', null),
  C('мило', 'soap', 'package', 1, 'pcs', 'month', 'cupboard', null),
  C('шампун гель душ', 'lotion', 'bottle', 400, 'ml', 'month', 'cupboard', null),
  C('порош пральн ополіскувач кондиціонер', 'lotion', 'bottle', 1.5, 'l', 'month', 'cupboard', null),
  C('посуд засіб миюч чистящ', 'lotion', 'bottle', 500, 'ml', 'month', 'cupboard', null),
  C('пакет смітт', 'bucket', 'package', 30, 'pcs', 'month', 'cupboard', null),
];

/** Відповіді майстра за назвою. `known: false` — словник товар не впізнав. */
export function guessProduct(name) {
  const n = (name || '').toLowerCase();
  const hit = CATALOG.find((c) => c.k.some((k) => k && n.includes(k)));
  if (hit) {
    const shelf = hit.shelf === undefined ? STORAGE_SHELF[hit.storage] : hit.shelf;
    return {
      known: true, icon: hit.icon, packType: hit.packType, packSize: hit.packSize, unit: hit.unit,
      lasts: hit.lasts ?? 'week', perWeek: hit.perWeek ?? 7, storage: hit.storage, shelfLifeDays: shelf,
    };
  }
  return {
    known: false, icon: matchIcon(name) ?? FALLBACK_ICON, packType: 'package', packSize: 1, unit: 'pcs',
    lasts: 'week', perWeek: 7, storage: 'cupboard', shelfLifeDays: null,
  };
}
