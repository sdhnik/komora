// Дати зберігаються як рядки 'YYYY-MM-DD' (локальний день користувача).
// Усі обчислення — в UTC, щоб не залежати від переходу на літній час.

const DAY = 86400000;

export const toDays = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
};

export const fromDays = (n) => new Date(n * DAY).toISOString().slice(0, 10);

export const daysBetween = (a, b) => toDays(b) - toDays(a);

export const addDays = (iso, n) => fromDays(toDays(iso) + n);

/** Сьогодні за локальним часом пристрою. */
export const todayISO = (now = new Date()) => {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** День тижня за ISO: 1 = понеділок … 7 = неділя. */
export const isoWeekday = (iso) => {
  const wd = new Date(toDays(iso) * DAY).getUTCDay();
  return wd === 0 ? 7 : wd;
};

/** Найближчий день покупок, сьогодні включно (у суботу — завтрашня неділя). */
export const nextShoppingDay = (today, shoppingDay) => {
  const diff = (shoppingDay - isoWeekday(today) + 7) % 7;
  return addDays(today, diff);
};
