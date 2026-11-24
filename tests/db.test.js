import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { loadAll, saveProduct, addEvent, undoEvent, pendingCount, exportBackup, importBackup, saveSettings, _reset } from '../src/db.js';
import { buildWeek } from '../src/core/model.js';

beforeEach(async () => {
  await _reset();
  indexedDB.deleteDatabase('komora');
});

describe('сховище', () => {
  it('новий товар отримує подію added і потрапляє в чергу синхронізації', async () => {
    const p = await saveProduct({ name: 'Гречка', icon: 'rice', packType: 'pack', packSize: 1, unit: 'kg', daysPerPack: 14, storage: 'cupboard', shelfLifeDays: null });
    const { products, events } = await loadAll();
    expect(products).toHaveLength(1);
    expect(events.map((e) => e.type)).toEqual(['added']);
    expect(events[0].productId).toBe(p.id);
    expect(await pendingCount()).toBe(2); // товар + подія
  });

  it('скасування записується окремою подією', async () => {
    const p = await saveProduct({ name: 'Молоко', packType: 'bottle', packSize: 1, unit: 'l', daysPerPack: 3, storage: 'fridge' });
    const buy = await addEvent(p.id, 'bought', 2, '2026-11-29');
    await undoEvent(buy);
    const { products, events, settings } = await loadAll();
    expect(events.map((e) => e.type)).toEqual(['added', 'bought', 'undone']);
    const w = buildWeek(products, events, settings, '2026-11-29');
    expect(w.items[0].state.stock).toBeNull();
  });

  it('резервна копія без ключа, відновлення зберігає поточний ключ', async () => {
    await saveSettings({ shoppingDay: 7, bufferDays: 2, syncUrl: 'https://x', syncKey: 'secret' });
    await saveProduct({ name: 'Сіль', packType: 'pack', packSize: 1, unit: 'kg', daysPerPack: 180, storage: 'cupboard' });
    const backup = await exportBackup();
    expect(backup.settings.syncKey).toBeUndefined();
    expect(backup.products).toHaveLength(1);

    await importBackup({ ...backup, products: [], events: [] });
    const after = await loadAll();
    expect(after.products).toHaveLength(0);
    expect(after.settings.syncKey).toBe('secret');
    expect(after.settings.bufferDays).toBe(2);
  });

  it('чужий файл не відновлюється', async () => {
    await expect(importBackup({ foo: 1 })).rejects.toThrow('Komora');
  });
});

describe('видалення всіх даних', () => {
  it('очищає і чергу синхронізації', async () => {
    await saveProduct({ name: 'Гречка', packType: 'pack', packSize: 1, unit: 'kg', daysPerPack: 14, storage: 'cupboard' });
    const { pendingCount } = await import('../src/db.js');
    expect(await pendingCount()).toBe(2);
    await importBackup({ app: 'komora', products: [], events: [], settings: {} });
    expect(await pendingCount()).toBe(0);
  });
});
