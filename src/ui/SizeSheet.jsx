import { useState } from 'preact/hooks';
import { Ico } from './components.jsx';
import { amount, unitLabel } from './format.js';
import { parseBought } from '../core/model.js';

/** Шторка: розмір упаковки (або вага) саме цієї покупки. */
export function SizeSheet({ x, size, onPick, onMakeDefault, onClose }) {
  const p = x.product;
  const [custom, setCustom] = useState('');
  const sizes = [p.packSize];
  for (const e of [...x.state.history].reverse()) {
    if (e.type !== 'bought') continue;
    const s = parseBought(e.value, p).size;
    if (!sizes.includes(s)) sizes.push(s);
    if (sizes.length >= 5) break;
  }
  if (!sizes.includes(size)) sizes.push(size);
  const weight = p.packType === 'weight';
  const value = Number(String(custom).replace(',', '.'));
  const valid = value > 0;

  return (
    <div class="sheet-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet sheet-auto" role="dialog" aria-label="Розмір упаковки">
        <div class="sheet-handle" />
        <div class="sheet-head">
          <b>{weight ? `${p.name}: скільки берете?` : `${p.name}: розмір упаковки`}</b>
          <button class="round soft" aria-label="Закрити" onClick={onClose}><Ico name="close" size={16} width={2.2} /></button>
        </div>
        <p class="note" style={{ padding: '0 0 4px' }}>Лише для цієї покупки: програма врахує, скільки ви взяли насправді.</p>
        <div class="chips">
          {sizes.map((s) => (
            <button key={s} class={s === size ? 'on' : ''} aria-pressed={s === size} onClick={() => onPick(s)}>
              {amount(s, p.unit)}{s === p.packSize ? ' · звичайна' : ''}
            </button>
          ))}
        </div>
        <div class="content-row" style={{ borderTop: 0, paddingTop: '4px' }}>
          <label for="custom-size">Інший розмір</label>
          <input id="custom-size" inputmode="decimal" placeholder="—" value={custom} onInput={(e) => setCustom(e.currentTarget.value)} />
          <span style={{ fontSize: '14px', color: '#6E736F', minWidth: '24px' }}>{unitLabel(p.unit)}</span>
          <button class="btn" disabled={!valid} style={{ opacity: valid ? 1 : 0.4 }} onClick={() => onPick(value)}>OK</button>
        </div>
        {size !== p.packSize && (
          <button class="btn-ghost" style={{ color: '#E0532A' }} onClick={() => onMakeDefault(size)}>
            Зробити {amount(size, p.unit)} звичайним розміром
          </button>
        )}
      </div>
    </div>
  );
}
