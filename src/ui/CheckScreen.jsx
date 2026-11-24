import { useRef, useState } from 'preact/hooks';
import { Head, Ico, Tile } from './components.jsx';
import { iconUrl } from '../core/icons.js';
import { CHECK_OPTIONS, dayMonth, boughtLabel } from './format.js';

const PLACES = [['cupboard', 'Шафа'], ['fridge', 'Холодильник'], ['freezer', 'Морозилка']];
const REASON = { unknown: 'Залишок невідомий', learning: 'Ще вчиться', overdue: 'Давно не купували' };
const RESULT = {
  none: ['у список', '#D2401F'], week: ['у список', '#D2401F'],
  twoWeeks: ['ще є', '#2E7D57'], more: ['ще є', '#2E7D57'], unknown: ['пропущено', '#6E736F'],
};

function lastBought(x) {
  const b = [...x.state.history].reverse().find((e) => e.type === 'bought');
  return b ? `Купили ${dayMonth(b.date)} · ${boughtLabel(x.product, Number(b.value) || 1)}` : 'Ще не купували';
}

export function CheckScreen({ week, act, back }) {
  // Черга фіксується на вході: відповіді змінюють прогноз, але не порядок питань.
  const [queue] = useState(() => week.check.map((x) => ({ ...x })));
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [picked, setPicked] = useState(null);
  const busy = useRef(false);

  const n = queue.length;
  const done = idx >= n;
  const cur = queue[Math.min(idx, n - 1)];

  const answer = (value) => {
    if (busy.current || !cur) return;
    busy.current = true;
    setPicked(value);
    setTimeout(async () => {
      await act.answer(cur.product, value);
      setAnswers((a) => ({ ...a, [cur.product.id]: value }));
      setPicked(null);
      setIdx((i) => i + 1);
      busy.current = false;
    }, value === 'unknown' ? 0 : 380);
  };

  const places = PLACES.map(([id, name]) => {
    const inPlace = queue.filter((x) => x.product.storage === id);
    const isCur = !done && cur?.product.storage === id;
    const isDone = inPlace.length > 0 && inPlace.every((x) => answers[x.product.id]);
    return { id, name, count: inPlace.length, isCur, isDone };
  }).filter((p) => p.count > 0);

  return (
    <main class="screen no-tabs">
      <Head
        left={<button class="round" aria-label="Закрити перевірку" onClick={back}><Ico name="close" size={20} width={2} /></button>}
        title="Перевірка"
        right={<div class="pill-count">{Math.min(idx + 1, n)} / {n}</div>}
      />

      {n === 0 && <div class="card empty">Перевіряти нічого не треба.</div>}

      {n > 0 && (
        <>
          <div class="places">
            {places.map((p) => (
              <div key={p.id} class={p.isCur ? 'cur' : p.isDone ? 'done' : ''}>
                {p.isDone && !p.isCur && <Ico name="check" size={14} color="#2E9C6A" width={3} />}
                {p.name} · {p.count}
              </div>
            ))}
          </div>
          <div class="segs">
            {queue.map((x, k) => <i key={x.product.id} class={k < idx ? 'done' : k === idx ? 'cur' : ''} />)}
          </div>
        </>
      )}

      {!done && cur && (
        <>
          <div class="card qcard">
            <Tile icon={cur.product.icon} />
            <div style={{ minWidth: 0 }}>
              <h1>{cur.product.name}</h1>
              <small>{lastBought(cur)}</small>
              <span class="reason">{REASON[cur.checkReason]}</span>
            </div>
          </div>
          <p class="question">На скільки ще вистачить?</p>
          <div role="radiogroup" aria-label="На скільки ще вистачить" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {CHECK_OPTIONS.map((o) => (
              <button key={o.id} role="radio" aria-checked={picked === o.id} class={`opt ${picked === o.id ? 'sel' : ''}`} onClick={() => answer(o.id)}>
                <div class="opt-text"><b>{o.label}</b><small>{o.hint}</small></div>
                <span class="radio">{picked === o.id && <Ico name="check" size={14} color="#fff" width={3.2} />}</span>
              </button>
            ))}
          </div>
          <div class="qfoot">
            <button class="btn-ghost" disabled={idx === 0} style={{ color: idx === 0 ? 'rgba(20,20,20,.3)' : undefined }} onClick={() => setIdx(idx - 1)}>Назад</button>
            <button class="skip" onClick={() => answer('unknown')}>Не знаю, пропустити</button>
          </div>
        </>
      )}

      {done && n > 0 && (
        <>
          <div class="done-hero">
            <div class="big-check"><Ico name="check" size={40} color="#fff" width={2.8} /></div>
            <b>Перевірено</b>
            <small>Список оновлено з урахуванням відповідей</small>
          </div>
          <div class="card list-rows">
            {queue.map((x) => {
              const [text, color] = RESULT[answers[x.product.id] ?? 'unknown'];
              return (
                <div key={x.product.id}>
                  <img src={iconUrl(x.product.icon)} alt="" />
                  <span class="n">{x.product.name}</span>
                  <span class="r" style={{ color }}>{text}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <button class="btn-big" onClick={back}>До списку</button>
          </div>
        </>
      )}
    </main>
  );
}
