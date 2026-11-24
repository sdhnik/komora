import { useState } from 'preact/hooks';

export const GUIDE_URL = 'https://github.com/sdhnik/komora#синхронізація-з-google-sheets';

/** Форма підключення таблиці: адреса веб-додатка Apps Script і ключ. */
export function SyncForm({ onConnect, cta = 'Підключити таблицю' }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = /^https:\/\/script\.google(usercontent)?\.com\//.test(url.trim()) && key.trim().length >= 8;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onConnect(url, key);
    } catch (err) {
      setError(err.message || 'Не вдалося підключитись');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="sync-form">
      <label>
        <span>Адреса веб-додатка</span>
        <input type="url" inputmode="url" placeholder="https://script.google.com/macros/s/…/exec" value={url} onInput={(e) => setUrl(e.currentTarget.value)} autocomplete="off" />
      </label>
      <label>
        <span>Ключ</span>
        <input type="text" placeholder="ключ із журналу виконання setup" value={key} onInput={(e) => setKey(e.currentTarget.value)} autocomplete="off" autocapitalize="off" spellcheck={false} />
      </label>
      {error && <p class="note" style={{ color: '#D2401F', padding: 0 }}>{error}</p>}
      <button class="btn-dark" disabled={!valid || busy} style={{ opacity: !valid || busy ? 0.45 : 1 }} onClick={submit}>{busy ? 'Підключаю…' : cta}</button>
      <a class="guide" href={GUIDE_URL} target="_blank" rel="noopener">Як створити таблицю і отримати ключ</a>
    </div>
  );
}
