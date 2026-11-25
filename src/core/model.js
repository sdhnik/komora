// Ядро Komora: з журналу подій виводить залишок, норму і статус навчання,
// а з них — групу товару, кількість до купівлі і потребу в перевірці.
// Усі функції чисті: на вході товар, події, налаштування і дата, на виході дані.

import { CHECK_DAYS, LEARN, OVERDUE_DAYS } from './constants.js';
import { daysBetween, nextShoppingDay, addDays } from './dates.js';

/** Початкова швидкість споживання r, одиниць `unit` на день. */
export function initialRate(p) {
  if (p.packType === 'piece') return (p.perWeek || 7) / 7;
  return p.packSize / (p.daysPerPack || 7);
}

/**
 * Значення події bought: «2» (дві звичайні упаковки) або «2@700» (дві упаковки по 700 цієї покупки).
 */
export function parseBought(value, product) {
  const [n, size] = String(value ?? '1').split('@');
  return { packs: Number(n) || 1, size: Number(size) || product.packSize };
}
export const boughtValue = (packs, size, product) => (size && size !== product.packSize ? `${packs}@${size}` : packs);

/** Відповідь перевірки, що відповідає прогнозу днів запасу. */
export function bucketOf(days) {
  if (days <= 0.5) return 'none';
  if (days < 7) return 'week';
  if (days < 14) return 'twoWeeks';
  return 'more';
}

/** Події товару без скасованих, у хронологічному порядку (стабільно за порядком запису). */
export function activeEvents(events, productId) {
  const own = events.filter((e) => e.productId === productId);
  const undone = new Set(own.filter((e) => e.type === 'undone').map((e) => e.value));
  return own
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.type !== 'undone' && !undone.has(e.id))
    .sort((a, b) => (a.e.date < b.e.date ? -1 : a.e.date > b.e.date ? 1 : a.i - b.i))
    .map(({ e }) => e);
}

/**
 * Проходить журнал і повертає стан товару на дату `today`.
 * S = null означає, що залишок невідомий.
 */
export function replay(product, events, today) {
  const evs = activeEvents(events, product.id);
  let r = initialRate(product);
  let S = null;        // залишок, одиниць
  let t = null;        // дата, на яку відомий S
  let anchor = null;   // остання точка з відомим S: { S, date }
  let cycle = null;    // початок циклу: { S, date } після покупки
  let status = 'learning';
  let cycles = 0;
  let misses = 0;
  let lastType = null;
  let lastCheck = null;
  const history = [];

  const decay = (to) => {
    if (S !== null && t !== null) S = Math.max(0, S - r * daysBetween(t, to));
    t = to;
  };
  const clampObs = (obs) => Math.min(r * LEARN.clamp[1], Math.max(r * LEARN.clamp[0], obs));
  const learn = (obs, kind) => {
    const w = LEARN.weights[status][kind];
    r = (1 - w) * r + w * clampObs(obs);
  };
  const registerMiss = (miss) => {
    misses = miss ? misses + 1 : 0;
    if (status === 'known' && misses >= LEARN.missesToRelearn) {
      status = 'learning';
      cycles = 0;
      misses = 0;
    }
  };

  for (const e of evs) {
    lastType = e.type;
    if (e.type === 'added') {
      // новий товар або повернений з архіву: залишок невідомий, навчання з нуля (норма лишається)
      S = null; t = e.date; anchor = null; cycle = null;
      status = 'learning'; cycles = 0; misses = 0;
    } else if (e.type === 'bought') {
      decay(e.date);
      const b = parseBought(e.value, product);
      S = (S ?? 0) + b.packs * b.size;
      cycle = { S, date: e.date };
      anchor = { S, date: e.date };
    } else if (e.type === 'ranOut' || (e.type === 'checked' && e.value === 'none')) {
      decay(e.date);
      if (e.type === 'checked') lastCheck = e.date;
      if (cycle) {
        const days = daysBetween(cycle.date, e.date);
        if (days >= LEARN.minDays) {
          const predicted = cycle.S / r;
          registerMiss(Math.abs(days - predicted) / predicted > LEARN.missRatio);
          learn(cycle.S / days, 'cycle');
          cycles += 1;
          if (status === 'learning' && cycles >= LEARN.cyclesToKnow) status = 'known';
        }
        cycle = null;
      }
      S = 0;
      anchor = { S: 0, date: e.date };
    } else if (e.type === 'checked') {
      lastCheck = e.date;
      if (e.value === 'unknown') continue;
      decay(e.date);
      const observed = r * CHECK_DAYS[e.value];
      if (S !== null) registerMiss(bucketOf(S / r) !== e.value);
      if (anchor && daysBetween(anchor.date, e.date) >= LEARN.minDays && anchor.S > observed) {
        learn((anchor.S - observed) / daysBetween(anchor.date, e.date), 'check');
      }
      S = r * CHECK_DAYS[e.value];
      anchor = { S, date: e.date };
    }
    history.push(e);
  }

  if (t !== null) decay(today);

  // Коли залишок досяг нуля сам собою (без події «закінчилось»)
  let zeroAt = null;
  if (S === 0 && anchor && anchor.S > 0) zeroAt = addDays(anchor.date, Math.ceil(anchor.S / r));

  return { rate: r, stock: S, status, cycles, misses, lastType, lastCheck, zeroAt, history };
}

/** Горизонт: днів до найближчого дня покупок + 7 + запас. */
export function horizon(today, settings) {
  const trip = nextShoppingDay(today, settings.shoppingDay);
  return { trip, H: daysBetween(today, trip) + 7 + settings.bufferDays };
}

/** Прогноз для одного товару. */
export function forecast(product, state, settings, today) {
  const { H } = horizon(today, settings);
  const r = state.rate;
  const S = state.stock;
  const days = S === null ? null : S / r;

  let group = 'unknown';
  if (days !== null) group = days < H ? 'now' : days < H + 7 ? 'next' : 'stock';

  let packs = 1;
  if (S !== null || group === 'unknown') {
    const need = r * H - (S ?? 0);
    packs = Math.max(1, Math.ceil(need / product.packSize - 1e-9));
    if (product.shelfLifeDays) {
      packs = Math.min(packs, Math.max(1, Math.floor((r * product.shelfLifeDays) / product.packSize)));
    }
  }

  const checkedToday = state.lastCheck === today;
  let checkReason = null;
  if (!checkedToday) {
    if (S === null) checkReason = 'unknown';
    else if (state.status === 'learning' && days < H + 7) checkReason = 'learning';
    else if (state.status === 'known' && state.zeroAt && daysBetween(state.zeroAt, today) > OVERDUE_DAYS) checkReason = 'overdue';
  }

  const need = S === null ? null : Math.max(0, r * H - S);
  return { days, group, packs, need, checkReason };
}

const STORAGE_ORDER = { cupboard: 0, fridge: 1, freezer: 2 };

/**
 * Усе, що потрібно головним екранам: стан кожного товару, список на тиждень і перевірка.
 */
export function buildWeek(products, events, settings, today) {
  const { trip, H } = horizon(today, settings);
  const items = products
    .filter((p) => !p.archived)
    .map((p) => {
      const state = replay(p, events, today);
      return { product: p, state, ...forecast(p, state, settings, today) };
    });

  const byDays = (a, b) => (a.days ?? -1) - (b.days ?? -1);
  const list = items.filter((x) => x.group === 'now').sort(byDays);
  const check = items
    .filter((x) => x.checkReason)
    .sort((a, b) => STORAGE_ORDER[a.product.storage] - STORAGE_ORDER[b.product.storage] || byDays(a, b));
  const groups = {
    now: list,
    next: items.filter((x) => x.group === 'next').sort(byDays),
    stock: items.filter((x) => x.group === 'stock').sort(byDays),
    unknown: items.filter((x) => x.group === 'unknown'),
  };
  const known = items.filter((x) => x.state.status === 'known').length;

  return { today, trip, H, items, list, check, groups, known, total: items.length };
}
