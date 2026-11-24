import { useEffect, useState } from 'preact/hooks';
import { ICONS, CATEGORIES, iconUrl, iconTint } from '../core/icons.js';
import { Ico } from './components.jsx';

/** Іконки, схожі на назву: збіг ключових слів, потім та сама категорія. */
function similar(name, current) {
  const words = (name || '').toLowerCase().split(/[\s,.;-]+/).filter((w) => w.length > 2);
  const hits = ICONS.filter((i) => i.keywords.some((k) => words.some((w) => w.includes(k) || k.includes(w))));
  const cat = ICONS.find((i) => i.id === current)?.category;
  const same = ICONS.filter((i) => i.category === cat);
  const out = [];
  for (const i of [...hits, ...same]) if (!out.includes(i) && i.id !== 'cart') out.push(i);
  return out.slice(0, 5);
}

export function IconPicker({ name, current, onPick, onClose }) {
  const [q, setQ] = useState('');
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const query = q.trim().toLowerCase();
  const found = query ? ICONS.filter((i) => i.keywords.some((k) => k.includes(query) || query.includes(k))) : [];
  const sim = similar(name, current);

  const Cell = ({ icon, white }) => (
    <button
      class={`icon-cell ${icon.id === current ? 'sel' : ''}`}
      style={{ background: white ? '#fff' : iconTint(icon.id) }}
      aria-label={icon.keywords[0] || icon.id}
      onClick={() => onPick(icon.id)}
    >
      <img src={iconUrl(icon.id)} alt="" loading="lazy" />
    </button>
  );

  return (
    <div class="sheet-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet" role="dialog" aria-label="Вибір іконки">
        <div class="sheet-handle" />
        <div class="sheet-head">
          <b>Іконка</b>
          <button class="round soft" aria-label="Закрити" onClick={onClose}><Ico name="close" size={16} width={2.2} /></button>
        </div>
        <div class="search" style={{ padding: '10px 0 0' }}>
          <label>
            <Ico name="search" size={18} color="#6E736F" width={2} />
            <input type="search" placeholder="Пошук: сир, риба, губка…" value={q} onInput={(e) => setQ(e.currentTarget.value)} style={{ background: '#F3F4F1', boxShadow: 'none' }} />
          </label>
        </div>
        <div class="sheet-body">
          {query ? (
            <>
              <p class="sheet-label">Знайдено: {found.length}</p>
              <div class="icon-grid">{found.map((i) => <Cell key={i.id} icon={i} />)}</div>
              {found.length === 0 && <p class="empty">Нічого не знайдено. Спробуйте інше слово або виберіть з категорій.</p>}
            </>
          ) : (
            <>
              {sim.length > 0 && (
                <div class="similar">
                  <p class="sheet-label" style={{ color: '#B8401C' }}>Схожі на «{name}»</p>
                  <div class="icon-grid">{sim.map((i) => <Cell key={i.id} icon={i} white />)}</div>
                </div>
              )}
              {CATEGORIES.map((c) => (
                <div key={c.id}>
                  <p class="sheet-label">{c.name}</p>
                  <div class="icon-grid">{ICONS.filter((i) => i.category === c.id).map((i) => <Cell key={i.id} icon={i} />)}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
