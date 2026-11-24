// Спільна форма товару: картка майстра і редагування.

import { LASTS_DAYS, STORAGE_SHELF } from '../core/constants.js';
import { amount } from './format.js';
import { Ico, Stepper } from './components.jsx';
import { iconUrl, iconTint } from '../core/icons.js';

const PACKS = [
  ['piece', 'Поштучно'], ['weight', 'На вагу'], ['bottle', 'Пляшка'], ['pack', 'Пачка'], ['tray', 'Лоток'],
  ['package', 'Упаковка'], ['loaf', 'Буханка'], ['chunk', 'Шматок'], ['jar', 'Банка'],
];
const GEN = { bottle: 'пляшки', pack: 'пачки', tray: 'лотка', package: 'упаковки', loaf: 'буханки', chunk: 'шматка', jar: 'банки' };
const CONTENT = { bottle: 'В одній пляшці', pack: 'В одній пачці', tray: 'В одному лотку', package: 'В одній упаковці', chunk: 'Один шматок', jar: 'В одній банці', weight: 'Беру за раз' };
const LASTS = [['2-3d', '2–3 дні'], ['week', 'тиждень'], ['2w', '2 тижні'], ['month', 'місяць'], ['longer', 'довше']];
const STORAGES = [['cupboard', 'Шафа'], ['fridge', 'Холодильник'], ['freezer', 'Морозилка']];
const UNIT_LABEL = { g: 'г', kg: 'кг', ml: 'мл', l: 'л', pcs: 'шт' };

/** Чернетка → поля товару для збереження. */
export function draftToProduct(d) {
  const base = { name: d.name.trim(), icon: d.icon, packType: d.packType, storage: d.storage, shelfLifeDays: d.shelfLifeDays ?? null };
  if (d.packType === 'piece') return { ...base, packSize: 1, unit: 'pcs', perWeek: Math.max(1, d.perWeek), daysPerPack: undefined };
  if (d.packType === 'loaf') return { ...base, packSize: 1, unit: 'pcs', daysPerPack: LASTS_DAYS[d.lasts] };
  return { ...base, packSize: Math.max(0.01, Number(String(d.packSize).replace(',', '.')) || 1), unit: d.unit, daysPerPack: LASTS_DAYS[d.lasts] };
}

/** Товар → чернетка (для редагування). */
export function productToDraft(p) {
  let lasts = 'week';
  if (p.daysPerPack) {
    lasts = Object.entries(LASTS_DAYS).reduce((best, [k, v]) => (Math.abs(v - p.daysPerPack) < Math.abs(LASTS_DAYS[best] - p.daysPerPack) ? k : best), 'week');
  }
  return { name: p.name, icon: p.icon, packType: p.packType, packSize: p.packSize, unit: p.unit, lasts, perWeek: p.perWeek ?? 7, storage: p.storage, shelfLifeDays: p.shelfLifeDays ?? null, known: true };
}

function Chips({ items, value, onPick, grid }) {
  return (
    <div class={grid ? 'chips grid3' : 'chips'}>
      {items.map(([id, label]) => (
        <button key={id} class={value === id ? 'on' : ''} aria-pressed={value === id} onClick={() => onPick(id)}>{label}</button>
      ))}
    </div>
  );
}

export function ProductForm({ draft, set, onPickIcon, editName, hint }) {
  const d = draft;
  const isPiece = d.packType === 'piece';
  const isWeight = d.packType === 'weight';
  const needsContent = !isPiece && d.packType !== 'loaf';
  const units = isWeight ? ['g', 'kg'] : ['g', 'kg', 'ml', 'l', 'pcs'];

  const pickPack = (packType) => {
    const patch = { packType };
    if (packType === 'weight' && !['g', 'kg'].includes(d.unit)) Object.assign(patch, { unit: 'g', packSize: 500 });
    if (packType === 'piece' || packType === 'loaf') Object.assign(patch, { unit: 'pcs', packSize: 1 });
    set(patch);
  };
  const lastsLabel = isPiece
    ? 'Скільки йде за тиждень?'
    : isWeight
      ? `На скільки вистачає ${amount(Number(String(d.packSize).replace(',', '.')) || 0, d.unit)}?`
      : `На скільки вистачає однієї ${GEN[d.packType] ?? 'упаковки'}?`;

  return (
    <>
      <div class="card qcard">
        <button class="tile tile-edit" style={{ background: iconTint(d.icon) }} aria-label="Змінити іконку" onClick={onPickIcon}>
          <img src={iconUrl(d.icon)} alt="" />
          <span class="pen"><Ico name="edit" size={12} color="#fff" width={2.4} /></span>
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          {editName ? (
            <label class="name-field">
              <span>Назва</span>
              <input value={d.name} onInput={(e) => set({ name: e.currentTarget.value })} />
            </label>
          ) : (
            <h1>{d.name}</h1>
          )}
          {hint}
        </div>
      </div>

      <div class="card qblock">
        <b>У чому продається?</b>
        <Chips items={PACKS} value={d.packType} onPick={pickPack} />
        {needsContent && (
          <div class="content-row">
            <label for="pack-size">{CONTENT[d.packType] ?? 'В одній упаковці'}</label>
            <input id="pack-size" inputmode="decimal" value={String(d.packSize).replace('.', ',')} onInput={(e) => set({ packSize: e.currentTarget.value })} />
            <div class="units">
              {units.map((u) => (
                <button key={u} class={d.unit === u ? 'on' : ''} aria-pressed={d.unit === u} onClick={() => set({ unit: u })}>{UNIT_LABEL[u]}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div class="card qblock">
        <b>{lastsLabel}</b>
        {isPiece ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Stepper value={d.perWeek} onDec={() => set({ perWeek: Math.max(1, d.perWeek - 1) })} onInc={() => set({ perWeek: d.perWeek + 1 })} />
            <span style={{ fontSize: '14px', color: '#6E736F' }}>шт на тиждень</span>
          </div>
        ) : (
          <Chips items={LASTS} value={d.lasts} onPick={(lasts) => set({ lasts })} />
        )}
      </div>

      <div class="card qblock">
        <b>Де зберігаєте?</b>
        <Chips items={STORAGES} value={d.storage} onPick={(storage) => set({ storage, shelfLifeDays: d.storage === storage ? d.shelfLifeDays : STORAGE_SHELF[storage] })} grid />
        {editName && (
          <div class="content-row">
            <label for="shelf">Зберігається, днів</label>
            <input id="shelf" inputmode="numeric" placeholder="довго" value={d.shelfLifeDays ?? ''} onInput={(e) => { const v = parseInt(e.currentTarget.value, 10); set({ shelfLifeDays: v > 0 ? v : null }); }} />
          </div>
        )}
      </div>
    </>
  );
}
