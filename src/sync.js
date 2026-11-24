// Синхронізація з Google Sheets через Apps Script (apps-script/Code.gs).
// Телефон — робоча копія. Спершу відправляємо чергу змін, потім забираємо нове з таблиці.

import { readOutbox, clearOutbox, mergeRemote, getMeta, setMeta } from './db.js';

const NUM = (v) => (v === '' || v === null || v === undefined ? undefined : Number(String(v).replace(',', '.')));
const BOOL = (v) => v === true || String(v).toLowerCase() === 'true';

/** Рядок таблиці (усе текстом) → товар. */
export function parseProduct(r) {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    icon: r.icon || 'cart',
    packType: r.packType || 'package',
    packSize: NUM(r.packSize) ?? 1,
    unit: r.unit || 'pcs',
    daysPerPack: NUM(r.daysPerPack),
    perWeek: NUM(r.perWeek),
    storage: r.storage || 'cupboard',
    shelfLifeDays: NUM(r.shelfLifeDays) ?? null,
    archived: BOOL(r.archived),
    deleted: BOOL(r.deleted),
    updatedAt: String(r.updatedAt || ''),
  };
}

/** Рядок таблиці → подія. */
export function parseEvent(r) {
  return {
    id: String(r.id),
    date: String(r.date),
    productId: String(r.productId),
    type: String(r.type),
    value: r.value === '' || r.value === undefined ? null : String(r.value),
    createdAt: String(r.createdAt || ''),
    seq: NUM(r.seq) ?? 0,
  };
}

class SyncError extends Error {}

const MESSAGES = {
  key: 'Невірний ключ',
  setup: 'У таблиці не виконано setup',
  json: 'Таблиця не зрозуміла запит',
};

async function request(url, options) {
  let res;
  try {
    res = await fetch(url, { redirect: 'follow', ...options });
  } catch {
    throw new SyncError('Немає зв’язку з таблицею');
  }
  let body;
  try {
    body = await res.json();
  } catch {
    throw new SyncError('Таблиця відповіла не так, як очікувалось. Перевірте адресу і доступ «Усі»');
  }
  if (!body.ok) throw new SyncError(MESSAGES[body.error] ?? 'Помилка таблиці');
  return body;
}

const withParams = (url, params) => `${url}${url.includes('?') ? '&' : '?'}${new URLSearchParams(params)}`;

export async function ping(url, key) {
  await request(withParams(url, { action: 'ping', key }));
}

/**
 * Один цикл синхронізації. Повертає { pushed, pulledEvents, pulledProducts, eventsTotal }.
 * Кидає SyncError з повідомленням українською.
 */
export async function syncNow({ syncUrl, syncKey }) {
  if (!syncUrl || !syncKey) return null;

  // 1. Відправити чергу.
  const outbox = await readOutbox();
  let pushed = 0;
  if (outbox.length) {
    const events = outbox.filter((o) => o.kind === 'event').map((o) => o.data);
    const latest = new Map();
    for (const o of outbox) if (o.kind === 'product') latest.set(o.data.id, o.data);
    await request(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ key: syncKey, events, products: [...latest.values()] }),
    });
    await clearOutbox(outbox.map((o) => o.seq));
    pushed = outbox.length;
  }

  // 2. Забрати нове.
  const state = (await getMeta('syncState')) || { eventsCount: 0, productsSince: '' };
  const res = await request(withParams(syncUrl, {
    action: 'pull', key: syncKey, eventsFrom: state.eventsCount, productsSince: state.productsSince,
  }));
  const events = (res.events || []).filter((r) => r.id).map(parseEvent);
  const products = (res.products || []).filter((r) => r.id).map(parseProduct);
  const merged = await mergeRemote(events, products);

  const since = products.reduce((m, p) => (p.updatedAt > m ? p.updatedAt : m), state.productsSince);
  await setMeta('syncState', { eventsCount: res.eventsTotal ?? state.eventsCount, productsSince: since, lastSync: new Date().toISOString() });

  return { pushed, pulledEvents: merged.addedEvents, pulledProducts: merged.changedProducts, eventsTotal: res.eventsTotal };
}

/** Після підключення нової таблиці: забрати все з початку і відправити все своє. */
export async function resetSyncState() {
  await setMeta('syncState', { eventsCount: 0, productsSince: '', lastSync: null });
}
