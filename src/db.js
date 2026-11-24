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

export async function loadAll() {
  const db = await openKomora();
  const [products, events, settings] = await Promise.all([
    db.getAll('products'),
    db.getAll('events'),
    db.get('meta', 'settings'),
  ]);
  events.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  return { products, events, settings: { ...DEFAULT_SETTINGS, ...settings } };
}

/** Записує подію і ставить її в чергу на синхронізацію. Повертає подію. */
export async function addEvent(productId, type, value = null, date = todayISO()) {
  const db = await openKomora();
  const event = { id: uid(), productId, date, type, value, createdAt: now() };
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

export async function deleteProduct(id) {
  const db = await openKomora();
  await db.delete('products', id);
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
  const tx = db.transaction(['products', 'events', 'meta'], 'readwrite');
  await tx.objectStore('products').clear();
  await tx.objectStore('events').clear();
  for (const p of data.products) await tx.objectStore('products').put(p);
  for (const e of data.events) await tx.objectStore('events').put(e);
  await tx.objectStore('meta').put({ ...DEFAULT_SETTINGS, ...data.settings, syncKey: current.syncKey || '' }, 'settings');
  await tx.done;
}

/** Просимо браузер не видаляти дані самостійно. */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* не критично */ }
}
