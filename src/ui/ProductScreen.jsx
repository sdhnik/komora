import { useState } from 'preact/hooks';
import { Head, Ico, Tile } from './components.jsx';
import { daysLabel, isUrgent, packLabel, rateLabel, boughtLabel, STORAGE_LABEL, CHECK_OPTIONS, CHECK_LABEL, shortDay } from './format.js';

const DOT = { added: '#C9CDC8', bought: '#FF6A3D', checked: '#EDA82F', ranOut: '#141414' };
const GROUP_COLOR = { now: '#FF6A3D', next: '#EDA82F', stock: '#3FA374', unknown: '#C9CDC8' };

function describe(e, p, today) {
  const date = e.date === today ? 'сьогодні' : shortDay(e.date);
  if (e.type === 'added') return { date, title: 'Додано', note: '' };
  if (e.type === 'bought') return { date, title: 'Купили', note: boughtLabel(p, Number(e.value) || 1) };
  if (e.type === 'ranOut') return { date, title: 'Закінчилось', note: '' };
  if (e.type === 'checked') return { date, title: 'Перевірка', note: CHECK_LABEL[e.value] ?? '' };
  return { date, title: e.type, note: '' };
}

export function ProductScreen({ item, today, act, back, open }) {
  const [menu, setMenu] = useState(false);
  const [refine, setRefine] = useState(false);
  const [sure, setSure] = useState(false);
  if (!item) {
    return (
      <main class="screen no-tabs">
        <Head left={<button class="round" aria-label="Назад" onClick={back}><Ico name="back" size={20} width={2} /></button>} title="Товар" />
        <div class="card empty">Товар не знайдено</div>
      </main>
    );
  }
  const p = item.product;
  const st = item.state;
  const [bold, grey] = packLabel(p, 1);
  const width = item.days === null ? 0 : Math.max(3, Math.min(100, Math.round((item.days / 30) * 100)));
  const events = [...st.history].reverse().slice(0, 6);

  return (
    <main class="screen no-tabs">
      <div style={{ position: 'relative' }}>
        <Head
          left={<button class="round" aria-label="Назад" onClick={back}><Ico name="back" size={20} width={2} /></button>}
          title="Товар"
          right={
            <button class="round" aria-label="Інші дії" aria-expanded={menu} onClick={() => { setMenu(!menu); setSure(false); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" fill="#141414" /><circle cx="12" cy="12" r="1.8" fill="#141414" /><circle cx="19" cy="12" r="1.8" fill="#141414" /></svg>
            </button>
          }
        />
        {menu && (
          <div class="menu">
            <button onClick={() => { setMenu(false); open('edit', { id: p.id }); }}><Ico name="edit" size={18} width={1.8} />Редагувати</button>
            {!p.archived && <button onClick={() => { setMenu(false); act.archive(p, true); }}><Ico name="archive" size={18} width={1.8} />В архів</button>}
            {p.archived && <button onClick={() => { setMenu(false); act.archive(p, false); }}><Ico name="archive" size={18} width={1.8} />Повернути з архіву</button>}
            {p.archived && (
              <button class="danger" onClick={() => (sure ? act.remove(p) : setSure(true))}>
                <Ico name="trash" size={18} width={1.8} />{sure ? 'Точно видалити?' : 'Видалити назавжди'}
              </button>
            )}
          </div>
        )}
      </div>

      <div class="card hero">
        <Tile icon={p.icon} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1>{p.name}</h1>
          {p.archived ? <span class="badge">в архіві</span> : st.status === 'learning' && <span class="badge">вчиться</span>}
        </div>
        <div style={{ fontSize: '17px', fontWeight: 600, color: isUrgent(item.days) ? '#D2401F' : undefined }}>
          {daysLabel(item.days).replace(/^./, (c) => c.toUpperCase())}
        </div>
        <div class="track"><i style={{ width: `${width}%`, background: GROUP_COLOR[item.group] }} /></div>
      </div>

      {!p.archived && (
        <div class="two">
          <button class="btn-big" style={{ height: '52px', fontSize: '15px', borderRadius: '16px' }} onClick={() => act.ranOut(p)}>Закінчилось</button>
          <button class="btn-soft" aria-expanded={refine} onClick={() => setRefine(!refine)}>Уточнити залишок</button>
        </div>
      )}

      {refine && (
        <div class="refine">
          <p>На скільки ще вистачить?</p>
          {CHECK_OPTIONS.map((o) => (
            <button key={o.id} onClick={() => { setRefine(false); act.refine(p, o.id); }}>
              <span>{o.label}</span><span class="radio" />
            </button>
          ))}
        </div>
      )}

      <div class="card params">
        <div><span>Упаковка</span><b>{bold}{grey}</b></div>
        <div><span>Вистачає</span><b>{rateLabel(p, st.rate)}</b></div>
        <div><span>Зберігання</span><b>{STORAGE_LABEL[p.storage] ?? '—'}{p.shelfLifeDays ? ` · до ${p.shelfLifeDays} дн.` : ''}</b></div>
        <div>
          <span>Навчання</span>
          <b>
            {st.status === 'known' ? 'знаю' : (
              <>
                <span class="cycles" aria-hidden="true"><i class={st.cycles >= 1 ? 'on' : ''} /><i class={st.cycles >= 2 ? 'on' : ''} /></span>
                {st.cycles} з 2 циклів
              </>
            )}
          </b>
        </div>
      </div>

      <div class="section-title"><h2>Історія</h2></div>
      <div class="card history">
        {events.length === 0 && <small>Подій ще немає</small>}
        {events.map((e) => {
          const d = describe(e, p, today);
          return (
            <div key={e.id}>
              <span class="d">{d.date}</span>
              <span class="dot" style={{ background: DOT[e.type] ?? '#C9CDC8' }} />
              <div><b>{d.title}</b>{d.note && <small>{d.note}</small>}</div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
