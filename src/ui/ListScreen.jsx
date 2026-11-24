import { useRef, useState } from 'preact/hooks';
import { Head, Ico, SyncButton, Tile, Stepper } from './components.jsx';
import { addDays } from '../core/dates.js';
import { packLabel, daysLabel, isUrgent, boughtLabel, longDate, shortDate, plural } from './format.js';

function useLongPress(onLong, ms = 500) {
  const t = useRef(null);
  const fired = useRef(false);
  const clear = () => clearTimeout(t.current);
  return {
    fired,
    handlers: {
      onPointerDown: () => { fired.current = false; t.current = setTimeout(() => { fired.current = true; onLong(); }, ms); },
      onPointerUp: clear, onPointerLeave: clear, onPointerCancel: clear,
      onContextMenu: (e) => e.preventDefault(),
    },
  };
}

function ItemCard({ x, packs, setPacks, onBuy, onOpen }) {
  const p = x.product;
  const [leaving, setLeaving] = useState(false);
  const press = useLongPress(onOpen);
  const [bold, grey] = packLabel(p, packs);
  const buy = () => {
    if (press.fired.current || leaving) return;
    setLeaving(true);
    setTimeout(async () => { await onBuy(p, packs); setLeaving(false); }, 280);
  };
  return (
    <div class={`card item ${leaving ? 'leaving' : ''}`}>
      <button class="item-hit" aria-label={`Куплено: ${p.name}`} onClick={buy} {...press.handlers} />
      <Tile icon={p.icon} />
      <div class="item-main">
        <div>
          <div class="item-name"><b>{p.name}</b>{x.state.status === 'learning' && <span class="badge">приблизно</span>}</div>
          <div class={`days ${isUrgent(x.days) ? 'urgent' : ''}`}>{daysLabel(x.days)}</div>
        </div>
        <div class="pack"><b>{bold}</b><span>{grey}</span></div>
      </div>
      <div class="item-side">
        <button class={`circle ${leaving ? 'done' : ''}`} aria-label={`Куплено: ${p.name}`} onClick={buy}>
          <i>{leaving && <Ico name="check" size={14} color="#fff" width={3} />}</i>
        </button>
        <Stepper value={packs} onDec={() => setPacks(Math.max(1, packs - 1))} onInc={() => setPacks(packs + 1)} />
      </div>
    </div>
  );
}

export function ListScreen({ week, data, pending, sync, session, act, open }) {
  const [packsFor, setPacksFor] = useState({});
  const [showBought, setShowBought] = useState(false);
  const boughtIds = new Set(session.map((x) => x.product.id));
  const list = week.list.filter((x) => !boughtIds.has(x.product.id));
  const total = list.length + session.length;
  const empty = data.products.length === 0;

  return (
    <main class="screen shell">
      <Head
        left={<SyncButton pending={pending} connected={!!data.settings.syncUrl} status={sync.status} onClick={() => (data.settings.syncUrl ? act.syncNow() : open('settings'))} />}
        title="Список"
        sub={longDate(week.trip)}
        right={<button class="round" aria-label="Налаштування" onClick={() => open('settings')}><Ico name="gear" /></button>}
      />

      {week.check.length > 0 && (
        <div class="card banner">
          <div class="banner-ico"><Ico name="cabinet" color="#FF6A3D" width={2} /></div>
          <div class="banner-text">
            <b>Перевір у шафі</b>
            <small>{week.check.length} {plural(week.check.length, ['товар', 'товари', 'товарів'])}, відповідь одним дотиком</small>
          </div>
          <button class="btn" onClick={() => open('check')}>Почати</button>
        </div>
      )}

      {total > 0 && (
        <div class="card progress">
          <div class="progress-top"><b>Куплено {session.length} з {total}</b><span>ще {list.length}</span></div>
          <div class="track"><i style={{ width: `${Math.round((session.length / total) * 100)}%` }} /></div>
        </div>
      )}

      {!empty && (
        <div class="section-title">
          <h2>Купити цього тижня</h2>
          <span>до {shortDate(addDays(week.trip, 7))}</span>
        </div>
      )}

      <div class="scroll">
      {list.map((x) => (
        <ItemCard
          key={x.product.id}
          x={x}
          packs={packsFor[x.product.id] ?? x.packs}
          setPacks={(n) => setPacksFor({ ...packsFor, [x.product.id]: n })}
          onBuy={act.buy}
          onOpen={() => open('product', { id: x.product.id })}
        />
      ))}

      {empty && (
        <div class="card empty">
          Поки немає товарів.
          <div style={{ marginTop: '14px' }}><button class="btn" onClick={() => open('add')}>Додати товари</button></div>
        </div>
      )}
      {!empty && list.length === 0 && (
        <div class="card empty">{session.length ? 'Усе куплено. До наступної неділі!' : week.check.length ? 'Спершу пройдіть Перевірку: після неї тут з’явиться список.' : 'Цього тижня купувати нічого не треба.'}</div>
      )}

      {session.length > 0 && (
        <>
          <button class="collapse" aria-expanded={showBought} onClick={() => setShowBought(!showBought)}>
            <span>Куплено · {session.length}</span><small>{showBought ? 'згорнути' : 'показати'}</small>
          </button>
          {showBought && session.map((x) => (
            <div class="mini" key={x.product.id}>
              <Tile icon={x.product.icon} />
              <div class="mini-text"><b class="strike">{x.product.name}</b><small>{boughtLabel(x.product, Number(x.event.value) || 1)}</small></div>
              <button class="link-btn" onClick={() => act.undo(x.event)}>Повернути</button>
            </div>
          ))}
        </>
      )}
      </div>
    </main>
  );
}
