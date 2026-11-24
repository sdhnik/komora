import { useRef, useState } from 'preact/hooks';
import { Head, Ico, Stepper } from './components.jsx';
import { dayMonth, plural } from './format.js';

const DAYS = [[1, 'Пн', 'Понеділок'], [2, 'Вт', 'Вівторок'], [3, 'Ср', 'Середа'], [4, 'Чт', 'Четвер'], [5, 'Пт', 'Пʼятниця'], [6, 'Сб', 'Субота'], [7, 'Нд', 'Неділя']];

export function SettingsScreen({ data, pending, act, back }) {
  const s = data.settings;
  const [sureRestore, setSureRestore] = useState(null);
  const [sureWipe, setSureWipe] = useState(false);
  const [error, setError] = useState('');
  const file = useRef(null);

  const onFile = async (e) => {
    const f = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!f) return;
    try {
      setError('');
      setSureRestore(JSON.parse(await f.text()));
    } catch {
      setError('Не вдалося прочитати файл');
    }
  };
  const restore = async () => {
    try {
      await act.restoreFile(sureRestore);
      setSureRestore(null);
    } catch (err) {
      setError(err.message);
      setSureRestore(null);
    }
  };

  return (
    <main class="screen no-tabs">
      <Head left={<button class="round" aria-label="Назад" onClick={back}><Ico name="back" size={20} width={2} /></button>} title="Налаштування" />

      <h2 class="set-title">Покупки</h2>
      <div class="card set-card">
        <div>
          <b>День покупок</b>
          <small>Якщо магазин зачинено, ідіть напередодні: список той самий</small>
        </div>
        <div class="days7">
          {DAYS.map(([n, short, full]) => (
            <button key={n} class={s.shoppingDay === n ? 'on' : ''} aria-pressed={s.shoppingDay === n} aria-label={full} onClick={() => act.saveSettings({ shoppingDay: n })}>{short}</button>
          ))}
        </div>
        <div class="set-row">
          <div><b>Запас днів</b><small>Брати понад тиждень, на випадок затримки</small></div>
          <Stepper value={s.bufferDays} onDec={() => act.saveSettings({ bufferDays: Math.max(0, s.bufferDays - 1) })} onInc={() => act.saveSettings({ bufferDays: Math.min(3, s.bufferDays + 1) })} />
        </div>
      </div>

      <h2 class="set-title">Синхронізація з Google Sheets</h2>
      <div class="card set-card">
        <div class="set-row" style={{ border: 0, paddingTop: 0 }}>
          <div class="set-ico" style={{ background: '#EEF0EC' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A4A9A5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5H7z" /></svg>
          </div>
          <div style={{ flex: 1 }}><b>Не підключено</b><small>{pending} {plural(pending, ['зміна чекає', 'зміни чекають', 'змін чекають'])} на відправку</small></div>
        </div>
        <button class="btn-dark" onClick={() => act.later('Підключення таблиці з’явиться на етапі 5')}>Підключити таблицю</button>
      </div>

      <h2 class="set-title">Резервна копія</h2>
      <div class="card set-list">
        <button onClick={act.backup}>
          <Ico name="download" size={22} width={1.8} />
          <span><b>Зберегти копію у файл</b><small>{s.lastBackupAt ? `Остання: ${dayMonth(s.lastBackupAt.slice(0, 10))}` : 'Ще не зберігали'}</small></span>
        </button>
        <button onClick={() => file.current?.click()}>
          <Ico name="upload" size={22} width={1.8} />
          <span><b>Відновити з файлу</b><small>Замінить поточні дані</small></span>
        </button>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={onFile} />
      </div>
      {sureRestore && (
        <div class="card confirm">
          <p>Замінити всі поточні дані копією {sureRestore.exportedAt ? `від ${dayMonth(sureRestore.exportedAt.slice(0, 10))}` : ''}? Товарів у копії: {sureRestore.products?.length ?? 0}.</p>
          <div class="two">
            <button class="btn-soft" onClick={() => setSureRestore(null)}>Скасувати</button>
            <button class="btn-big" style={{ height: '52px', fontSize: '15px', borderRadius: '16px' }} onClick={restore}>Відновити</button>
          </div>
        </div>
      )}
      {error && <p class="note" style={{ color: '#D2401F' }}>{error}</p>}

      <h2 class="set-title">Інше</h2>
      <div class="card set-list">
        <button class="danger" onClick={() => (sureWipe ? (act.wipe(), setSureWipe(false)) : setSureWipe(true))}>
          <Ico name="trash" size={22} width={1.8} />
          <span><b>{sureWipe ? 'Точно видалити все?' : 'Видалити всі дані'}</b><small>{sureWipe ? 'Натисніть ще раз. Спершу краще зберегти копію' : 'Товари, історію і налаштування'}</small></span>
        </button>
      </div>

      <p class="note" style={{ textAlign: 'center', paddingTop: '10px' }}>Komora · версія {__APP_VERSION__}</p>
    </main>
  );
}
