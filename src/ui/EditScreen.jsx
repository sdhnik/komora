import { useState } from 'preact/hooks';
import { Head, Ico } from './components.jsx';
import { ProductForm, draftToProduct, productToDraft } from './ProductForm.jsx';
import { IconPicker } from './IconPicker.jsx';

export function EditScreen({ item, act, back }) {
  const [draft, setDraft] = useState(() => item && productToDraft(item.product));
  const [picker, setPicker] = useState(false);
  if (!item) return null;
  const set = (patch) => setDraft({ ...draft, ...patch });
  const valid = draft.name.trim().length > 0;

  return (
    <main class="screen no-tabs">
      <Head left={<button class="round" aria-label="Скасувати" onClick={back}><Ico name="close" size={20} width={2} /></button>} title="Редагувати" />
      <ProductForm draft={draft} set={set} editName onPickIcon={() => setPicker(true)} />
      <p class="note">Зміна норми не стирає навчання: програма й далі уточнює її з ваших покупок.</p>
      <div class="two" style={{ marginTop: 'auto', paddingTop: '8px' }}>
        <button class="btn-soft" onClick={back}>Скасувати</button>
        <button class="btn-big" style={{ height: '52px', fontSize: '16px', borderRadius: '16px' }} disabled={!valid} onClick={async () => { await act.saveEdit(item.product, draftToProduct(draft)); back(); }}>Зберегти</button>
      </div>
      {picker && <IconPicker name={draft.name} current={draft.icon} onClose={() => setPicker(false)} onPick={(icon) => { set({ icon }); setPicker(false); }} />}
    </main>
  );
}
