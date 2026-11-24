// Локальне сховище: IndexedDB. Це робоча копія даних; Google Sheets лише синхронізується з нею.

import { openDB } from 'idb';
import { DEFAULT_SETTINGS } from './core/constants.js';
import { todayISO } from './core/dates.js';

const DB_NAME = 'komora';
const VERSION = 1;

let dbPromise = null;

export function openKomora(name = DB_NAME) {
  if (!dbPromise) {
    dbPromise = openDB(name, VERSION, {
      upgrade(db) {
        db.createObjectStore('products', { keyPath: 'id' });
        const events = db.createObjectStore('events', { keyPath: 'id' });
        events.createIndex('productId', 'productId');
        db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
        db.createObjectStore('meta');
      },
    });
  }
  return dbPromise;
}

/** Тільки для тестів: закрити й забути з'єднання. */
export async function _reset() {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
const now = () => new Date().toISOString();
// Монотонний порядок запису: події в межах однієї мілісекунди не плутаються.
let lastSeq = 0;
const nextSeq = () => { let n = Date.now() * 1000; if (n <= lastSeq) n = lastSeq + 1; lastSeq = n; return n; };

export async function loadAll() {
  const db = await openKomora();
  const [products, events, settings] = await Promise.all([
    db.getAll('products'),
    db.getAll('events'),
    db.get('meta', 'settings'),
  ]);
  const live = products.filter((p) => !p.deleted);
  events.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  return { products: live, events, settings: { ...DEFAULT_SETTINGS, ...settings } };
}

/** Записує подію і ставить її в чергу на синхронізацію. Повертає подію. */
export async function addEvent(productId, type, value = null, date = todayISO()) {
  const db = await openKomora();
  const event = { id: uid(), productId, date, type, value, createdAt: now(), seq: nextSeq() };
  const tx = db.transaction(['events', 'outbox'], 'readwrite');
  await Promise.all([
    tx.objectStore('events').put(event),
    tx.objectStore('outbox').add({ kind: 'event', data: event }),
    tx.done,
  ]);
  return event;
}

/** Скасування — це теж подія: журнал лише дописується. */
export const undoEvent = (event) => addEvent(event.productId, 'undone', event.id);

/** Створює або оновлює товар. Новий товар отримує подію `added`. */
export async function saveProduct(fields, { addedDate } = {}) {
  const db = await openKomora();
  const isNew = !fields.id;
  const product = { archived: false, ...fields, id: fields.id || uid(), updatedAt: now() };
  const tx = db.transaction(['products', 'outbox'], 'readwrite');
  await Promise.all([
    tx.objectStore('products').put(product),
    tx.objectStore('outbox').add({ kind: 'product', data: product }),
    tx.done,
  ]);
  if (isNew) await addEvent(product.id, 'added', null, addedDate);
  return product;
}

/** Видалення назавжди: позначка deleted, щоб видалення дійшло і до таблиці. */
export async function deleteProduct(id) {
  const db = await openKomora();
  const p = await db.get('products', id);
  if (p) await saveProduct({ ...p, deleted: true });
}

export async function getMeta(key) {
  const db = await openKomora();
  return db.get('meta', key);
}

export async function setMeta(key, value) {
  const db = await openKomora();
  await db.put('meta', value, key);
}

/** Поставити в чергу все локальне (при підключенні нової таблиці). */
export async function enqueueAll() {
  const db = await openKomora();
  const [products, events] = await Promise.all([db.getAll('products'), db.getAll('events')]);
  const tx = db.transaction('outbox', 'readwrite');
  for (const p of products) tx.store.add({ kind: 'product', data: p });
  for (const e of events) tx.store.add({ kind: 'event', data: e });
  await tx.done;
}

/**
 * Одноразове оновлення іконок після розширення словника: міняємо лише ті,
 * що досі стоять на старій автоматичній іконці.
 */
export async function migrateIcons(rules) {
  const db = await openKomora();
  if (await db.get('meta', 'migr-icons-1')) return 0;
  let n = 0;
  for (const p of await db.getAll('products')) {
    const rule = rules.find((r) => r.from === p.icon && r.match.some((k) => p.name.toLowerCase().includes(k)));
    if (rule && !p.deleted) { await saveProduct({ ...p, icon: rule.to }); n++; }
  }
  await db.put('meta', true, 'migr-icons-1');
  return n;
}

/** Черга синхронізації. */
export async function readOutbox() {
  const db = await openKomora();
  return db.getAll('outbox');
}

export async function clearOutbox(seqs) {
  const db = await openKomora();
  const tx = db.transaction('outbox', 'readwrite');
  for (const s of seqs) tx.store.delete(s);
  await tx.done;
}

/** Зливає дані з таблиці: нові події додаються, товар оновлюється, якщо віддалений новіший. */
export async function mergeRemote(events, products) {
  const db = await openKomora();
  const tx = db.transaction(['events', 'products'], 'readwrite');
  let addedEvents = 0;
  let changedProducts = 0;
  for (const e of events) {
    if (!(await tx.objectStore('events').get(e.id))) {
      await tx.objectStore('events').put(e);
      addedEvents++;
    }
  }
  for (const p of products) {
    const local = await tx.objectStore('products').get(p.id);
    if (!local || String(p.updatedAt) > String(local.updatedAt)) {
      await tx.objectStore('products').put(p);
      changedProducts++;
    }
  }
  await tx.done;
  return { addedEvents, changedProducts };
}

export async function saveSettings(settings) {
  const db = await openKomora();
  await db.put('meta', settings, 'settings');
}

export async function pendingCount() {
  const db = await openKomora();
  return db.count('outbox');
}

/** Резервна копія: усе, крім ключа синхронізації. */
export async function exportBackup() {
  const { products, events, settings } = await loadAll();
  const { syncKey, ...safe } = settings;
  return { app: 'komora', version: 1, exportedAt: now(), products, events, settings: safe };
}

export async function importBackup(data) {
  if (!data || data.app !== 'komora' || !Array.isArray(data.products) || !Array.isArray(data.events)) {
    throw new Error('Це не резервна копія Komora');
  }
  const db = await openKomora();
  const current = (await db.get('meta', 'settings')) || {};
  const tx = db.transaction(['products', 'events', 'meta', 'outbox'], 'readwrite');
  await tx.objectStore('products').clear();
  await tx.objectStore('events').clear();
  await tx.objectStore('outbox').clear(); // стара черга не повинна піти в таблицю
  await tx.objectStore('meta').delete('syncState');
  for (const p of data.products) await tx.objectStore('products').put(p);
  for (const e of data.events) await tx.objectStore('events').put(e);
  // підключення до таблиці лишається тим, що є на цьому телефоні
  await tx.objectStore('meta').put({ ...DEFAULT_SETTINGS, ...data.settings, syncUrl: current.syncUrl || '', syncKey: current.syncKey || '' }, 'settings');
  await tx.done;
}

/** Просимо браузер не видаляти дані самостійно. */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* не критично */ }
}
