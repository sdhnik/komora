import { useRef, useState } from 'preact/hooks';
import { Ico } from './components.jsx';
import { iconUrl, iconTint } from '../core/icons.js';
import { SyncForm } from './SyncForm.jsx';

const Float = ({ icon, style, size }) => (
  <div class="float" style={{ ...style, width: `${size}px`, height: `${size}px`, background: iconTint(icon) }}>
    <img src={iconUrl(icon)} alt="" style={{ width: `${size * 0.7}px`, height: `${size * 0.7}px` }} />
  </div>
);

export function WelcomeScreen({ act }) {
  const [restore, setRestore] = useState(false);
  const [fromSheet, setFromSheet] = useState(false);
  const [error, setError] = useState('');
  const file = useRef(null);

  const onFile = async (e) => {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    try {
      await act.restoreFile(JSON.parse(await f.text()));
    } catch (err) {
      setError(err.message || 'Не вдалося прочитати файл');
    }
  };

  return (
    <main class="screen no-tabs welcome">
      <div class="welcome-art" aria-hidden="true">
        <div class="ring" />
        <div class="core"><img src={`${import.meta.env.BASE_URL}icons/icon-512.png`} alt="" /></div>
        <Float icon="milk" size={76} style={{ left: '6%', top: '14%', transform: 'rotate(-8deg)' }} />
        <Float icon="bread" size={70} style={{ right: '6%', top: '10%', transform: 'rotate(7deg)' }} />
        <Float icon="cheese" size={64} style={{ left: '9%', bottom: '6%', transform: 'rotate(6deg)' }} />
        <Float icon="apple" size={72} style={{ right: '8%', bottom: '8%', transform: 'rotate(-6deg)' }} />
      </div>

      <h1 class="welcome-title">Komora</h1>
      <p class="welcome-sub">Список на неділю, який складається сам.</p>

      <div class="welcome-points">
        <div><span><Ico name="plus" size={20} color="#FF6A3D" width={2} /></span>Додайте товари, які купуєте регулярно</div>
        <div><span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6A3D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></svg></span>Щонеділі програма скаже, що купити</div>
        <div><span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6A3D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 17l5-5 4 4 7-8" /><path d="M15 8h5v5" /></svg></span>З кожним тижнем вона помиляється рідше</div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '16px' }}>
        <button class="btn-big" style={{ boxShadow: '0 10px 24px rgba(255,106,61,.28)' }} onClick={act.startFresh}>Почати</button>
        <button class="btn-ghost" style={{ height: '48px', color: '#3C423E' }} onClick={() => setRestore(true)}>Відновити дані</button>
      </div>

      {restore && (
        <div class="sheet-wrap" onClick={(e) => e.target === e.currentTarget && setRestore(false)}>
          <div class="sheet sheet-auto" role="dialog" aria-label="Відновити дані">
            <div class="sheet-handle" />
            <div class="sheet-head"><b>Відновити дані</b></div>
            <p class="note" style={{ textAlign: 'left', padding: '0 0 8px' }}>Якщо ви вже користувались програмою на іншому телефоні</p>
            <button class="restore-opt" onClick={() => setFromSheet(!fromSheet)}>
              <span style={{ background: '#E3F2E8' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E7D57" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 9h16M4 15h16M10 3v18" /></svg></span>
              <div><b>З таблиці Google</b><small>Вставте адресу скрипту й ключ</small></div>
            </button>
            {fromSheet && <SyncForm cta="Відновити з таблиці" onConnect={(url, key) => act.connect(url, key, { restore: true })} />}
            <button class="restore-opt" onClick={() => file.current?.click()}>
              <span style={{ background: '#E9F1FA' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2C5E93" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M12 18v-6M9 15l3 3 3-3" /></svg></span>
              <div><b>З файлу резервної копії</b><small>Файл .json, збережений раніше</small></div>
            </button>
            <input ref={file} type="file" accept=".json,application/json" hidden onChange={onFile} />
            {error && <p class="note" style={{ color: '#D2401F' }}>{error}</p>}
            <button class="btn-ghost" style={{ color: '#6E736F' }} onClick={() => setRestore(false)}>Скасувати</button>
          </div>
        </div>
      )}
    </main>
  );
}
