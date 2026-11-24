import { useEffect, useRef, useState } from 'preact/hooks';
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

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Анімація покупки (специфікація, «Дизайн і анімації»):
 * 0–150 мс галочка, 150–400 мс пауза з перекресленою назвою, 400–650 мс картка виїжджає, решта підтягується.
 */
function ItemCard({ x, packs, setPacks, onBuy, onOpen, entering }) {
  const p = x.product;
  const [phase, setPhase] = useState(null); // null | 'check' | 'fade' | 'out'
  const press = useLongPress(onOpen);
  const [bold, grey] = packLabel(p, packs);
  const buy = () => {
    if (press.fired.current || phase) return;
    if (navigator.vibrate) navigator.vibrate(15);
    if (reduced()) { onBuy(p, packs); return; }
    setPhase('check');
    setTimeout(() => setPhase('fade'), 150);
    setTimeout(() => setPhase('out'), 400);
    setTimeout(async () => { await onBuy(p, packs); setPhase(null); }, 650);
  };
  return (
    <div class={`slot ${phase === 'out' ? 'gone' : ''} ${entering ? 'enter' : ''}`}>
      <div class={`card item ${phase ? `buy-${phase}` : ''}`}>
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
          <button class={`circle ${phase ? 'done' : ''}`} aria-label={`Куплено: ${p.name}`} onClick={buy}>
            <i><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="tick" d="M5 12.5l4.5 4.5L19 7.5" /></svg></i>
          </button>
          <Stepper value={packs} onDec={() => setPacks(Math.max(1, packs - 1))} onInc={() => setPacks(packs + 1)} />
        </div>
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
  // Картки, що з'явились після першого показу (наприклад, після «Скасувати»), в'їжджають назад.
  const seen = useRef(null);
  const ids = list.map((x) => x.product.id);
  const fresh = seen.current ? new Set(ids.filter((id) => !seen.current.has(id))) : new Set();
  useEffect(() => { seen.current = new Set(ids); });

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
          entering={fresh.has(x.product.id)}
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
