// Тимчасовий екран етапу 1: показує, що ядро і сховище працюють.
// На етапі 2 його замінять справжні екрани з макетів.

import { useEffect, useState } from 'preact/hooks';
import { loadAll, saveProduct, addEvent, importBackup } from '../db.js';
import { buildWeek } from '../core/model.js';
import { todayISO, addDays } from '../core/dates.js';

const REASON = { unknown: 'залишок невідомий', learning: 'ще вчиться', overdue: 'давно не купували' };
const GROUP = { now: 'Цього тижня', next: 'Наступного тижня', stock: 'Є запас' };
const fmtDays = (d) => (d === null ? '?' : `${Math.round(d)} дн.`);

async function seedDemo() {
  const t = todayISO();
  const demo = [
    [{ name: 'Гречка', icon: 'rice', packType: 'pack', packSize: 1, unit: 'kg', daysPerPack: 14, storage: 'cupboard', shelfLifeDays: null }, [[-30, 'bought', 1], [-16, 'ranOut'], [-15, 'bought', 1]]],
    [{ name: 'Молоко', icon: 'milk', packType: 'bottle', packSize: 1, unit: 'l', daysPerPack: 2.5, storage: 'fridge', shelfLifeDays: 7 }, [[-6, 'bought', 3]]],
    [{ name: 'Кава мелена', icon: 'coffee', packType: 'pack', packSize: 250, unit: 'g', daysPerPack: 14, storage: 'cupboard', shelfLifeDays: null }, [[-4, 'bought', 1]]],
    [{ name: 'Банани', icon: 'banana', packType: 'piece', packSize: 1, unit: 'pcs', perWeek: 10, storage: 'cupboard', shelfLifeDays: 7 }, [[-3, 'bought', 6]]],
    [{ name: 'Фарш баранячий', icon: 'meat', packType: 'weight', packSize: 500, unit: 'g', daysPerPack: 7, storage: 'freezer', shelfLifeDays: 90 }, []],
  ];
  for (const [fields, evs] of demo) {
    const p = await saveProduct(fields, { addedDate: addDays(t, -31) });
    for (const [shift, type, value] of evs) await addEvent(p.id, type, value ?? null, addDays(t, shift));
  }
}

export function App() {
  const [data, setData] = useState(null);
  const reload = () => loadAll().then(setData);
  useEffect(() => { reload(); }, []);

  if (!data) return <main class="dev"><p class="sub">Завантаження…</p></main>;

  const w = buildWeek(data.products, data.events, data.settings, todayISO());

  return (
    <main class="dev">
      <h1>Komora</h1>
      <p class="sub">Етап 1: ядро працює. Покупка {w.trip}, горизонт {w.H} дн. Програма знає {w.known} з {w.total}.</p>

      <div class="actions">
        <button class="btn" onClick={async () => { await seedDemo(); reload(); }}>Додати приклад</button>
        <button class="btn alt" onClick={async () => { await importBackup({ app: 'komora', products: [], events: [], settings: data.settings }); reload(); }}>Очистити</button>
      </div>

      <h2>Перевірка · {w.check.length}</h2>
      <div class="card">
        {w.check.length === 0 && <small>Нічого перевіряти</small>}
        {w.check.map((x) => (
          <div class="row" key={x.product.id}>
            <span>{x.product.name}</span>
            <small>{REASON[x.checkReason]}</small>
          </div>
        ))}
      </div>

      {['now', 'next', 'stock'].map((g) => (
        <section key={g}>
          <h2>{GROUP[g]} · {w.groups[g].length}</h2>
          <div class="card">
            {w.groups[g].length === 0 && <small>Порожньо</small>}
            {w.groups[g].map((x) => (
              <div class="row" key={x.product.id}>
                <span>{x.product.name} <small>{x.state.status === 'learning' ? '· вчиться' : ''}</small></span>
                <span>
                  <small>{fmtDays(x.days)}</small>{' '}
                  {g === 'now' && <button class="btn" style="height:32px;padding:0 10px" onClick={async () => { await addEvent(x.product.id, 'bought', x.packs); reload(); }}>Купив ×{x.packs}</button>}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
