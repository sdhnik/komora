import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadAll, saveProduct, addEvent, pendingCount, _reset, deleteProduct } from '../src/db.js';
import { syncNow, ping, resetSyncState } from '../src/sync.js';

// Імітація Apps Script з тією ж логікою, що й apps-script/Code.gs (усе зберігається текстом).
const P_COLS = ['id', 'name', 'icon', 'packType', 'packSize', 'unit', 'daysPerPack', 'perWeek', 'storage', 'shelfLifeDays', 'archived', 'deleted', 'updatedAt'];
const E_COLS = ['id', 'date', 'productId', 'type', 'value', 'createdAt', 'seq'];
const cell = (v) => (v === null || v === undefined ? '' : String(v));
function fakeServer(key = 'k1') {
  const s = { products: [], events: [] };
  const json = (o) => ({ json: async () => o });
  s.fetch = vi.fn(async (url, opts = {}) => {
    if (opts.method === 'POST') {
      const body = JSON.parse(opts.body);
      if (body.key !== key) return json({ ok: false, error: 'key' });
      const have = new Set(s.events.map((e) => e.id));
      for (const e of body.events) if (!have.has(e.id)) { s.events.push(Object.fromEntries(E_COLS.map((c) => [c, cell(e[c])]))); have.add(e.id); }
      for (const p of body.products) {
        const row = Object.fromEntries(P_COLS.map((c) => [c, cell(p[c])]));
        const i = s.products.findIndex((x) => x.id === p.id);
        if (i < 0) s.products.push(row); else if (s.products[i].updatedAt < row.updatedAt) s.products[i] = row;
      }
      return json({ ok: true });
    }
    const q = new URL(url).searchParams;
    if (q.get('key') !== key) return json({ ok: false, error: 'key' });
    if (q.get('action') === 'ping') return json({ ok: true });
    const from = Number(q.get('eventsFrom') || 0);
    const since = q.get('productsSince') || '';
    return json({ ok: true, events: s.events.slice(from), eventsTotal: s.events.length, products: s.products.filter((p) => p.updatedAt > since) });
  });
  return s;
}

const settings = { syncUrl: 'https://script.google.com/macros/s/X/exec', syncKey: 'k1' };

beforeEach(async () => {
  await _reset();
  indexedDB.deleteDatabase('komora');
});

describe('синхронізація', () => {
  it('відправляє чергу і очищає її', async () => {
    const server = fakeServer();
    globalThis.fetch = server.fetch;
    const p = await saveProduct({ name: 'Гречка', icon: 'rice', packType: 'pack', packSize: 1, unit: 'kg', daysPerPack: 14, storage: 'cupboard', shelfLifeDays: null });
    await addEvent(p.id, 'bought', 2, '2026-11-29');
    expect(await pendingCount()).toBe(3);

    const r = await syncNow(settings);
    expect(r.pushed).toBe(3);
    expect(await pendingCount()).toBe(0);
    expect(server.products).toHaveLength(1);
    expect(server.events.map((e) => e.type)).toEqual(['added', 'bought']);
    expect(server.events[1].value).toBe('2');
  });

  it('забирає з таблиці нове і правки, зроблені на комп’ютері', async () => {
    const server = fakeServer();
    globalThis.fetch = server.fetch;
    const p = await saveProduct({ name: 'Молоко', icon: 'milk', packType: 'bottle', packSize: 1, unit: 'l', daysPerPack: 3, storage: 'fridge', shelfLifeDays: 7 });
    await syncNow(settings);

    // На комп'ютері перейменували товар і додали подію
    server.products[0] = { ...server.products[0], name: 'Молоко 2,5%', updatedAt: '2999-01-01T00:00:00.000Z' };
    server.events.push({ id: 'remote1', date: '2026-11-29', productId: p.id, type: 'bought', value: '3', createdAt: '', seq: '9' });

    const r = await syncNow(settings);
    expect(r.pulledEvents).toBe(1);
    expect(r.pulledProducts).toBe(1);
    const { products, events } = await loadAll();
    expect(products[0].name).toBe('Молоко 2,5%');
    expect(products[0].shelfLifeDays).toBe(7);
    expect(products[0].archived).toBe(false);
    expect(events.find((e) => e.id === 'remote1').value).toBe('3');

    // Повторна синхронізація нічого не дублює
    const again = await syncNow(settings);
    expect(again.pulledEvents).toBe(0);
    expect(server.events).toHaveLength(2);
  });

  it('відновлення на новому телефоні: усе з таблиці', async () => {
    const server = fakeServer();
    server.products.push({ id: 'p1', name: 'Кава', icon: 'coffee', packType: 'pack', packSize: '250', unit: 'g', daysPerPack: '14', perWeek: '', storage: 'cupboard', shelfLifeDays: '', archived: 'false', deleted: '', updatedAt: '2026-11-01T10:00:00.000Z' });
    server.events.push({ id: 'e1', date: '2026-11-01', productId: 'p1', type: 'added', value: '', createdAt: '', seq: '1' });
    globalThis.fetch = server.fetch;
    await resetSyncState();
    await syncNow(settings);
    const { products, events } = await loadAll();
    expect(products[0]).toMatchObject({ name: 'Кава', packSize: 250, daysPerPack: 14, shelfLifeDays: null, perWeek: undefined });
    expect(events[0]).toMatchObject({ type: 'added', value: null });
  });

  it('видалення доходить до таблиці', async () => {
    const server = fakeServer();
    globalThis.fetch = server.fetch;
    const p = await saveProduct({ name: 'Сіль', packType: 'pack', packSize: 1, unit: 'kg', daysPerPack: 180, storage: 'cupboard' });
    await syncNow(settings);
    await new Promise((r) => setTimeout(r, 5));
    await deleteProduct(p.id);
    await syncNow(settings);
    expect(server.products[0].deleted).toBe('true');
    expect((await loadAll()).products).toHaveLength(0);
  });

  it('невірний ключ — зрозуміла помилка, черга лишається', async () => {
    globalThis.fetch = fakeServer('other').fetch;
    await saveProduct({ name: 'Хліб', packType: 'loaf', packSize: 1, unit: 'pcs', daysPerPack: 3, storage: 'cupboard' });
    await expect(syncNow(settings)).rejects.toThrow('Невірний ключ');
    await expect(ping(settings.syncUrl, 'bad')).rejects.toThrow('Невірний ключ');
    expect(await pendingCount()).toBe(2);
  });
});
