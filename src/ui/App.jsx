import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { migrateIcons, loadAll, addEvent, undoEvent, saveProduct, deleteProduct, pendingCount, importBackup, exportBackup, saveSettings, enqueueAll, getMeta } from '../db.js';
import { syncNow, ping, resetSyncState } from '../sync.js';
import { buildWeek, replay, forecast } from '../core/model.js';
import { todayISO, addDays } from '../core/dates.js';
import { TabBar, Toast } from './components.jsx';
import { ListScreen } from './ListScreen.jsx';
import { CheckScreen } from './CheckScreen.jsx';
import { StockScreen } from './StockScreen.jsx';
import { ProductScreen } from './ProductScreen.jsx';
import { SettingsScreen } from './SettingsScreen.jsx';
import { AddScreen } from './AddScreen.jsx';
import { EditScreen } from './EditScreen.jsx';
import { WelcomeScreen } from './WelcomeScreen.jsx';

// Маршрут: вкладка (list | stock) + необов'язковий екран поверх неї.
// Екрани поверх кладуться в history, тож системна кнопка «назад» на Android працює.
const initialRoute = () => history.state?.route ?? { tab: 'list' };

export function App() {
  const [data, setData] = useState(null);
  const [pending, setPending] = useState(0);
  const [route, setRoute] = useState(initialRoute);
  const [toast, setToast] = useState(null);
  const [today, setToday] = useState(todayISO());
  const timer = useRef(null);
  const [sync, setSync] = useState({ status: 'idle', error: null, lastSync: null, eventsTotal: null });
  const syncing = useRef(false);
  const settingsRef = useRef(null);
  settingsRef.current = data?.settings ?? null;

  const reload = async () => {
    const [d, n] = await Promise.all([loadAll(), pendingCount()]);
    setData(d);
    setPending(n);
    setToday(todayISO());
  };

  // Синхронізація: тиха у фоні; при ручному запуску — з повідомленням.
  const runSync = async (manual = false) => {
    const st = settingsRef.current ?? (await loadAll()).settings;
    if (!st?.syncUrl || syncing.current) return;
    syncing.current = true;
    setSync((x) => ({ ...x, status: 'syncing' }));
    try {
      const r = await syncNow(st);
      const meta = await getMeta('syncState');
      setSync({ status: 'ok', error: null, lastSync: meta?.lastSync ?? null, eventsTotal: r?.eventsTotal ?? null });
      if (r && (r.pulledEvents || r.pulledProducts)) await reload();
      else setPending(await pendingCount());
      if (manual) showToast('Синхронізовано');
    } catch (err) {
      setSync((x) => ({ ...x, status: 'error', error: err.message }));
      if (manual) showToast(err.message);
    } finally {
      syncing.current = false;
    }
  };

  useEffect(() => {
    migrateIcons([
      { from: 'milk', to: 'bowl', match: ['йогурт'] },
      { from: 'rice', to: 'bowl', match: ['вівсян', 'пластівц', 'гранол', 'мюслі'] },
      { from: 'rice', to: 'grain', match: ['кус', 'кіноа', 'булгур', 'пшон', 'борошн'] },
      { from: 'honey', to: 'maple', match: ['сироп'] },
      { from: 'jar', to: 'tomato', match: ['пасата', 'passata'] },
    ]).catch(() => {}).then(() => reload()).then(() => runSync());
    getMeta('syncState').then((m) => m?.lastSync && setSync((x) => ({ ...x, lastSync: m.lastSync, eventsTotal: m.eventsCount })));
    const onPop = (e) => setRoute(e.state?.route ?? { tab: 'list' });
    const onVisible = () => document.visibilityState === 'visible' && reload().then(() => runSync());
    const onOnline = () => runSync();
    window.addEventListener('popstate', onPop);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Є нові зміни — відправляємо за кілька секунд (кілька дотиків поспіль підуть разом).
  useEffect(() => {
    if (!pending || !data?.settings.syncUrl) return;
    const t = setTimeout(() => runSync(), 2500);
    return () => clearTimeout(t);
  }, [pending, data?.settings.syncUrl]);

  const week = useMemo(() => data && buildWeek(data.products, data.events, data.settings, today), [data, today]);

  // Що куплено в цей похід: з суботи перед днем покупок, а посеред тижня — за сьогодні.
  const session = useMemo(() => {
    if (!week) return [];
    const eve = addDays(week.trip, -1);
    const start = today < eve ? today : eve;
    const out = [];
    for (const x of week.items) {
      const buys = x.state.history.filter((e) => e.type === 'bought' && e.date >= start);
      if (buys.length) out.push({ ...x, event: buys[buys.length - 1] });
    }
    return out;
  }, [week, today]);

  const navigate = (next) => {
    history.pushState({ route: next }, '');
    setRoute(next);
    window.scrollTo(0, 0);
  };
  const open = (screen, extra = {}) => navigate({ tab: route.tab, screen, ...extra });
  const back = () => (history.state?.route?.screen ? history.back() : setRoute({ tab: route.tab }));
  const setTab = (tab) => {
    history.replaceState({ route: { tab } }, '');
    setRoute({ tab });
    window.scrollTo(0, 0);
  };

  const showToast = (text, undo) => {
    clearTimeout(timer.current);
    setToast({ text, undo });
    timer.current = setTimeout(() => setToast(null), 6000);
  };
  const withUndo = (text, ev) =>
    showToast(text, async () => {
      clearTimeout(timer.current);
      setToast(null);
      await undoEvent(ev);
      reload();
    });

  const act = {
    buy: async (p, packs) => {
      const ev = await addEvent(p.id, 'bought', packs);
      await reload();
      withUndo(`Куплено: ${p.name}`, ev);
    },
    undo: async (ev) => { await undoEvent(ev); reload(); },
    answer: async (p, value) => { await addEvent(p.id, 'checked', value); await reload(); },
    ranOut: async (p) => {
      const ev = await addEvent(p.id, 'ranOut');
      await reload();
      withUndo(`${p.name}: додано в список`, ev);
    },
    refine: async (p, value) => {
      const ev = await addEvent(p.id, 'checked', value);
      await reload();
      withUndo('Залишок уточнено', ev);
    },
    archive: async (p, archived) => {
      await saveProduct({ ...p, archived });
      if (!archived) await addEvent(p.id, 'added'); // повернений товар вчиться заново
      await reload();
      showToast(archived ? `${p.name}: в архіві` : `${p.name}: повернуто`);
    },
    remove: async (p) => {
      await deleteProduct(p.id);
      back();
      await reload();
      showToast(`${p.name}: видалено`);
    },
    later: (what) => showToast(what),
    syncNow: () => runSync(true),
    connect: async (url, key, { restore = false } = {}) => {
      url = url.trim(); key = key.trim();
      await ping(url, key);
      const current = (await loadAll()).settings;
      await saveSettings({ ...current, syncUrl: url, syncKey: key, ...(restore ? { welcomed: true } : {}) });
      await resetSyncState();
      if (!restore) await enqueueAll();
      await reload();
      settingsRef.current = { ...current, syncUrl: url, syncKey: key };
      await runSync(true);
    },
    disconnect: async () => {
      await saveSettings({ ...data.settings, syncUrl: '', syncKey: '' });
      setSync({ status: 'idle', error: null, lastSync: null, eventsTotal: null });
      await reload();
      showToast('Таблицю відключено');
    },
    saveSettings: async (patch) => {
      await saveSettings({ ...data.settings, ...patch });
      await reload();
    },
    backup: async () => {
      const copy = await exportBackup();
      const blob = new Blob([JSON.stringify(copy, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `komora-${today}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      await saveSettings({ ...data.settings, lastBackupAt: new Date().toISOString() });
      await reload();
      showToast('Копію збережено');
    },
    addProducts: async (list) => {
      for (const fields of list) await saveProduct(fields);
      await reload();
    },
    saveEdit: async (p, fields) => {
      await saveProduct({ ...p, ...fields });
      await reload();
      showToast('Збережено');
    },
    startFresh: async () => {
      await saveSettings({ ...data.settings, welcomed: true });
      await reload();
      navigate({ tab: 'list', screen: 'add' });
    },
    restoreFile: async (backup) => {
      await importBackup(backup);
      const restored = (await loadAll()).settings;
      await saveSettings({ ...restored, welcomed: true });
      if (restored.syncUrl) await enqueueAll(); // відновлене має дійти й до таблиці
      await reload();
      showToast('Дані відновлено');
      runSync();
    },
    wipe: async () => {
      await importBackup({ app: 'komora', products: [], events: [], settings: { ...data.settings, welcomed: false } });
      setRoute({ tab: 'list' });
      await reload();
    },
  };

  if (!data || !week) return null;

  const itemFor = (id) => {
    const found = week.items.find((x) => x.product.id === id);
    if (found) return found;
    const p = data.products.find((x) => x.id === id);
    if (!p) return null;
    const state = replay(p, data.events, today);
    return { product: p, state, ...forecast(p, state, data.settings, today) };
  };

  const common = { week, data, today, pending, sync, act, open, back };
  let screen;
  if (!data.settings.welcomed && data.products.length === 0 && route.screen !== 'add') {
    return (
      <>
        <WelcomeScreen act={act} />
        <Toast toast={toast} low />
      </>
    );
  }
  if (route.screen === 'add') screen = <AddScreen {...common} />;
  else if (route.screen === 'edit') screen = <EditScreen {...common} key={route.id} item={itemFor(route.id)} />;
  else if (route.screen === 'check') screen = <CheckScreen {...common} />;
  else if (route.screen === 'product') screen = <ProductScreen {...common} item={itemFor(route.id)} />;
  else if (route.screen === 'settings') screen = <SettingsScreen {...common} />;
  else if (route.tab === 'stock') screen = <StockScreen {...common} />;
  else screen = <ListScreen {...common} session={session} />;

  const tabs = !route.screen;
  return (
    <>
      {screen}
      {tabs && <TabBar tab={route.tab} onTab={setTab} />}
      <Toast toast={toast} low={!tabs} />
    </>
  );
}
