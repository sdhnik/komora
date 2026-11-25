// Українські підписи і форматування для інтерфейсу.

import { toDays } from '../core/dates.js';

export const plural = (n, forms) => {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? forms[2] : b === 1 ? forms[0] : b >= 2 && b <= 4 ? forms[1] : forms[2];
};

const PACK = {
  bottle: ['пляшка', 'пляшки', 'пляшок'],
  pack: ['пачка', 'пачки', 'пачок'],
  tray: ['лоток', 'лотки', 'лотків'],
  package: ['упаковка', 'упаковки', 'упаковок'],
  loaf: ['буханка', 'буханки', 'буханок'],
  chunk: ['шматок', 'шматки', 'шматків'],
  jar: ['банка', 'банки', 'банок'],
};
const UNIT = { g: 'г', kg: 'кг', ml: 'мл', l: 'л', pcs: 'шт' };
export const STORAGE_LABEL = { cupboard: 'Шафа', fridge: 'Холодильник', freezer: 'Морозилка' };

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const num = (n) => String(Math.round(n * 100) / 100).replace('.', ',');

export function amount(n, unit) {
  if (unit === 'g' && n >= 1000) return `${num(n / 1000)} кг`;
  if (unit === 'ml' && n >= 1000) return `${num(n / 1000)} л`;
  return `${num(n)} ${UNIT[unit] ?? unit}`;
}

/** Ліва частина картки: що саме береться. Повертає [жирне, сіре]. */
export function packLabel(p, packs = 1, size = p.packSize) {
  if (p.packType === 'piece') return ['Поштучно', ''];
  if (p.packType === 'weight') return ['На вагу', ` · ${amount(packs * size, p.unit)}`];
  const name = cap((PACK[p.packType] ?? PACK.package)[0]);
  if (p.packType === 'loaf' || (p.unit === 'pcs' && size === 1 && p.packSize === 1)) return [name, ''];
  return [name, ` · ${amount(size, p.unit)}`];
}

/** Чи можна для товару вибрати інший розмір упаковки при покупці. */
export const sizeEditable = (p) => p.packType !== 'piece' && p.packType !== 'loaf';
export const unitLabel = (u) => UNIT[u] ?? u;

/** «3 пляшки · 1 л», «6 шт», «На вагу 1 кг». */
export function boughtLabel(p, packs, size = p.packSize) {
  if (p.packType === 'piece') return `${packs} шт`;
  if (p.packType === 'weight') return `на вагу ${amount(packs * size, p.unit)}`;
  const forms = PACK[p.packType] ?? PACK.package;
  const tail = p.packType === 'loaf' || (p.unit === 'pcs' && size === 1) ? '' : ` · ${amount(size, p.unit)}`;
  return `${packs} ${plural(packs, forms)}${tail}`;
}

/** «вистачить ~5 днів», «закінчиться завтра». */
export function daysLabel(days) {
  if (days === null || days === undefined) return 'залишок невідомий';
  if (days < 1) return days <= 0.05 ? 'закінчилось' : 'закінчиться сьогодні';
  if (days < 2) return 'закінчиться завтра';
  const d = Math.round(days);
  if (d >= 60) {
    const m = Math.round(d / 30);
    return `вистачить ~${m} ${plural(m, ['місяць', 'місяці', 'місяців'])}`;
  }
  return `вистачить ~${d} ${plural(d, ['день', 'дні', 'днів'])}`;
}

export const isUrgent = (days) => days !== null && days < 2;

/** Скільки вистачає однієї упаковки, з поточної швидкості. */
export function rateLabel(p, rate) {
  if (p.packType === 'piece') return `~${num(Math.round(rate * 7 * 10) / 10)} шт на тиждень`;
  const days = p.packSize / rate;
  const what = p.packType === 'weight' ? amount(p.packSize, p.unit) : `1 ${(PACK[p.packType] ?? PACK.package)[0]}`;
  if (days >= 13 && days < 60) {
    const w = Math.round(days / 7);
    return `${what} ≈ на ${w} ${plural(w, ['тиждень', 'тижні', 'тижнів'])}`;
  }
  if (days >= 60) return `${what} ≈ на ${Math.round(days / 30)} міс.`;
  const d = Math.max(1, Math.round(days));
  return `${what} ≈ на ${d} ${plural(d, ['день', 'дні', 'днів'])}`;
}

const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
const WEEKDAYS = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота'];
const WD_SHORT = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

const parts = (iso) => {
  const d = new Date(toDays(iso) * 86400000);
  return { day: d.getUTCDate(), month: d.getUTCMonth(), wd: d.getUTCDay() };
};
export const dayMonth = (iso) => { const p = parts(iso); return `${p.day} ${MONTHS[p.month]}`; };
export const longDate = (iso) => { const p = parts(iso); return `${WEEKDAYS[p.wd]}, ${p.day} ${MONTHS[p.month]}`; };
export const shortDate = (iso) => { const p = parts(iso); return `${WD_SHORT[p.wd]}, ${p.day} ${MONTHS[p.month]}`; };
export const shortDay = (iso) => { const p = parts(iso); return `${p.day} ${MONTHS[p.month].slice(0, 3)}`; };

export const CHECK_OPTIONS = [
  { id: 'none', label: 'Вже нема', hint: 'додам у список' },
  { id: 'week', label: 'До тижня', hint: 'додам у список' },
  { id: 'twoWeeks', label: '1–2 тижні', hint: 'наступної неділі' },
  { id: 'more', label: 'Більше двох тижнів', hint: 'поки не потрібно' },
];
export const CHECK_LABEL = { none: '«Вже нема»', week: '«До тижня»', twoWeeks: '«1–2 тижні»', more: '«Більше двох тижнів»', unknown: '«Не знаю»' };
