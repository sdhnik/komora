import { useState } from 'preact/hooks';
import { Head, Ico, Tile } from './components.jsx';
import { ProductForm, draftToProduct } from './ProductForm.jsx';
import { IconPicker } from './IconPicker.jsx';
import { guessProduct } from '../core/catalog.js';
import { iconUrl } from '../core/icons.js';
import { plural, packLabel, STORAGE_LABEL } from './format.js';

const LASTS_TEXT = { '2-3d': '2–3 дні', week: 'тиждень', '2w': '2 тижні', month: 'місяць', longer: 'довше' };

function parse(text, products) {
  const seen = new Set();
  const byName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p]));
  return text.split('\n').map((s) => s.trim()).filter((s) => {
    const k = s.toLowerCase();
    if (!s || seen.has(k)) return false;
    seen.add(k);
    return true;
  }).map((name) => {
    const existing = byName.get(name.toLowerCase());
    const status = existing ? (existing.archived ? 'archived' : 'exists') : 'new';
    return { name, status, guess: guessProduct(name) };
  });
}

export function AddScreen({ data, act, back }) {
  const [step, setStep] = useState('list');
  const [text, setText] = useState('');
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [picker, setPicker] = useState(false);
  const [saved, setSaved] = useState([]);

  const parsed = parse(text, data.products);
  const news = parsed.filter((x) => x.status === 'new');

  const start = () => {
    if (!news.length) return;
    setQueue(news.map((x) => ({ name: x.name, ...x.guess, skipped: false })));
    setIdx(0);
    setStep('card');
  };
  const cur = queue[idx];
  const setCur = (patch) => setQueue(queue.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  const finish = async (q) => {
    const keep = q.filter((d) => !d.skipped);
    await act.addProducts(keep.map(draftToProduct));
    setSaved(keep);
    setStep('done');
  };
  const go = (skipped) => {
    const q = queue.map((d, i) => (i === idx ? { ...d, skipped } : d));
    setQueue(q);
    if (idx < q.length - 1) { setIdx(idx + 1); window.scrollTo(0, 0); } else finish(q);
  };

  const close = <button class="round" aria-label="Закрити" onClick={back}><Ico name="close" size={20} width={2} /></button>;

  if (step === 'list') {
    return (
      <main class="screen no-tabs">
        <Head left={close} title="Нові товари" />
        <label for="add-list" class="field-label">Вставте або введіть товари, по одному на рядок</label>
        <textarea id="add-list" class="card add-text" value={text} onInput={(e) => setText(e.currentTarget.value)} placeholder={'Молоко\nХліб\nГречка\nЯйця'} autofocus />
        {parsed.length > 0 && (
          <>
            <div class="section-title"><h2>Розпізнано</h2><span>{news.length} {plural(news.length, ['новий', 'нових', 'нових'])} з {parsed.length}</span></div>
            <div class="chips-wrap">
              {parsed.map((x) => (
                <div key={x.name} class={`pchip ${x.status}`}>
                  <img src={iconUrl(x.guess.icon)} alt="" />
                  <span>{x.name}</span>
                  {x.status === 'exists' && <small>· вже є</small>}
                  {x.status === 'archived' && <small>· в архіві</small>}
                  {x.status === 'new' && !x.guess.known && <small>· перевірте</small>}
                </div>
              ))}
            </div>
            <p class="note">Товари, що вже є в Запасах чи в Архіві, не додаються вдруге. Архівний можна повернути з його картки.</p>
          </>
        )}
        <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
          <button class="btn-big" disabled={!news.length} style={{ background: news.length ? undefined : '#C9CDC8' }} onClick={start}>
            {news.length ? `Далі · ${news.length} ${plural(news.length, ['товар', 'товари', 'товарів'])}` : 'Додайте хоча б один товар'}
          </button>
        </div>
      </main>
    );
  }

  if (step === 'card' && cur) {
    return (
      <main class="screen no-tabs">
        <Head left={close} title="Новий товар" right={<div class="pill-count">{idx + 1} / {queue.length}</div>} />
        <div class="segs">{queue.map((d, k) => <i key={k} class={k < idx ? 'done' : k === idx ? 'cur' : ''} />)}</div>
        <ProductForm
          draft={cur}
          set={setCur}
          onPickIcon={() => setPicker(true)}
          hint={cur.known
            ? <small>Відповіді підставлено, перевірте</small>
            : <span class="reason">Не впізнав, перевірте відповіді</span>}
        />
        <div class="wizard-foot">
          <button class="btn-big" style={{ height: '52px', fontSize: '16px', borderRadius: '16px' }} onClick={() => go(false)}>
            {idx === queue.length - 1 ? 'Готово' : 'Далі'}
          </button>
          <div class="two">
            <button class="skip" disabled={idx === 0} style={{ color: idx === 0 ? 'rgba(20,20,20,.3)' : undefined }} onClick={() => setIdx(idx - 1)}>Назад</button>
            <button class="skip" onClick={() => go(true)}>Пропустити</button>
          </div>
        </div>
        {picker && <IconPicker name={cur.name} current={cur.icon} onClose={() => setPicker(false)} onPick={(icon) => { setCur({ icon }); setPicker(false); }} />}
      </main>
    );
  }

  return (
    <main class="screen no-tabs">
      <Head left={close} title="Готово" />
      <div class="done-hero">
        <div class="big-check"><Ico name="check" size={40} color="#fff" width={2.8} /></div>
        <b>Додано {saved.length} {plural(saved.length, ['товар', 'товари', 'товарів'])}</b>
        <small>Тепер пройдіть Перевірку: програма спитає, скільки їх є вдома, і складе список.</small>
      </div>
      {saved.length > 0 && (
        <div class="card list-rows">
          {saved.map((d) => {
            const p = draftToProduct(d);
            const [bold, grey] = packLabel(p, 1);
            const norm = d.packType === 'piece' ? `${d.perWeek} шт на тиждень` : LASTS_TEXT[d.lasts];
            return (
              <div key={d.name}>
                <img src={iconUrl(d.icon)} alt="" />
                <span class="n">{d.name}<small class="sub">{bold}{grey} · {norm} · {STORAGE_LABEL[d.storage].toLowerCase()}</small></span>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
        <button class="btn-big" onClick={back}>До списку</button>
      </div>
    </main>
  );
}
