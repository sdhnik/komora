import { useState } from 'preact/hooks';
import { Head, Ico, SyncButton, Tile } from './components.jsx';
import { daysLabel, isUrgent, plural, dayMonth } from './format.js';

const GROUPS = [
  ['now', 'Цього тижня', '#FF6A3D'],
  ['next', 'Наступного тижня', '#EDA82F'],
  ['stock', 'Є запас', '#3FA374'],
  ['unknown', 'Залишок невідомий', '#A4A9A5'],
];

function Row({ x, color, onBuy, onOpen }) {
  const p = x.product;
  const [done, setDone] = useState(false);
  const width = x.days === null ? 0 : Math.max(4, Math.min(100, Math.round((x.days / 30) * 100)));
  return (
    <div class="row">
      <button class="row-hit" aria-label={`Відкрити: ${p.name}`} onClick={onOpen} />
      <Tile icon={p.icon} />
      <div class="row-main">
        <div class="item-name"><b>{p.name}</b>{x.state.status === 'learning' && <span class="badge">вчиться</span>}</div>
        <div class={`days ${isUrgent(x.days) ? 'urgent' : ''}`}>{daysLabel(x.days)}</div>
        <div class="bar"><i style={{ width: `${width}%`, background: color }} /></div>
      </div>
      <button
        class={`circle ${done ? 'done' : ''}`}
        aria-label={`Купив: ${p.name}`}
        onClick={() => { setDone(true); setTimeout(() => { setDone(false); onBuy(p, 1); }, 250); }}
      >
        <i>{done && <Ico name="check" size={14} color="#fff" width={3} />}</i>
      </button>
    </div>
  );
}

export function StockScreen({ week, data, pending, act, open }) {
  const [q, setQ] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const query = q.trim().toLowerCase();
  const match = (x) => !query || x.product.name.toLowerCase().includes(query);
  const learning = week.items.filter((x) => x.state.status === 'learning').length;
  const archived = data.products.filter((p) => p.archived);
  const groups = GROUPS.map(([id, title, color]) => ({ id, title, color, rows: week.groups[id].filter(match) })).filter((g) => g.rows.length);

  return (
    <main class="screen shell">
      <Head
        left={<SyncButton pending={pending} connected={!!data.settings.syncUrl} onClick={() => act.later('Синхронізація з таблицею з’явиться на етапі 5')} />}
        title="Запаси"
        sub={`${week.total} ${plural(week.total, ['товар', 'товари', 'товарів'])}`}
        right={<button class="round" aria-label="Налаштування" onClick={() => open('settings')}><Ico name="gear" /></button>}
      />

      <div class="search">
        <label>
          <span style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Пошук товару</span>
          <Ico name="search" size={18} color="#6E736F" width={2} />
          <input type="search" placeholder="Пошук" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
        </label>
        <button class="round dark" aria-label="Додати товари" onClick={() => act.later('Додавання товарів з’явиться на етапі 3')}>
          <Ico name="plus" size={18} color="#fff" width={2.2} />
        </button>
      </div>

      {!query && learning > 0 && (
        <div class="card learn">
          <div class="progress-top">
            <b>Програма знає {week.known} з {week.total}</b>
            <span>{learning} {plural(learning, ['вчиться', 'вчаться', 'вчаться'])}</span>
          </div>
          <div class="learn-dots">{week.items.map((x, i) => <i key={i} class={i < week.known ? 'on' : ''} />)}</div>
        </div>
      )}

      <div class="scroll">

      {groups.map((g) => (
        <section key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div class="group-title"><i style={{ background: g.color }} /><h2>{g.title}</h2><span>{g.rows.length}</span></div>
          {g.rows.map((x) => (
            <Row key={x.product.id} x={x} color={g.color} onBuy={act.buy} onOpen={() => open('product', { id: x.product.id })} />
          ))}
        </section>
      ))}

      {week.total === 0 && !query && (
        <div class="card empty">
          Поки немає товарів.
          <div style={{ marginTop: '14px' }}><button class="btn" onClick={act.seed}>Додати приклад</button></div>
        </div>
      )}
      {query && groups.length === 0 && <div class="card empty">Нічого не знайдено</div>}

      {!query && archived.length > 0 && (
        <>
          <button class="collapse" style={{ marginTop: '14px' }} aria-expanded={showArchive} onClick={() => setShowArchive(!showArchive)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Ico name="archive" size={18} width={1.8} />Архів · {archived.length}</span>
            <small>{showArchive ? 'згорнути' : 'показати'}</small>
          </button>
          {showArchive && archived.map((p) => (
            <div class="mini" key={p.id}>
              <button class="row-hit" style={{ position: 'static', width: 'auto', height: 'auto', padding: 0 }} aria-label={`Відкрити: ${p.name}`} onClick={() => open('product', { id: p.id })}>
                <Tile icon={p.icon} />
              </button>
              <div class="mini-text"><b>{p.name}</b><small>в архіві з {dayMonth(p.updatedAt.slice(0, 10))}</small></div>
              <button class="link-btn" onClick={() => act.archive(p, false)}>Повернути</button>
            </div>
          ))}
        </>
      )}
      </div>
    </main>
  );
}
