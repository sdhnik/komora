import { iconUrl, iconTint } from '../core/icons.js';

const P = {
  cloud: <><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5H7z" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></>,
  box: <><path d="M4 7l8-4 8 4v10l-8 4-8-4z" /><path d="M4 7l8 4 8-4M12 11v10" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  back: <path d="M15 5l-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  archive: <><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10h14V9M10 13h4" /></>,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  download: <path d="M12 4v11M8 11l4 4 4-4M5 20h14" />,
  upload: <path d="M12 20V9M8 13l4-4 4 4M5 4h14" />,
  cabinet: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M5 10h14M9 6.5h1.5M9 13.5v3" /></>,
};

export function Ico({ name, size = 22, color = 'currentColor', width = 1.9, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width={width} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...rest}>
      {P[name]}
    </svg>
  );
}

export function Tile({ icon, class: cls = '' }) {
  return (
    <div class={`tile ${cls}`} style={{ background: iconTint(icon) }}>
      <img src={iconUrl(icon)} alt="" loading="lazy" />
    </div>
  );
}

export function Head({ left, title, sub, right }) {
  return (
    <header class="head">
      {left ?? <span />}
      <div class="head-title"><b>{title}</b>{sub && <small>{sub}</small>}</div>
      {right ?? <span />}
    </header>
  );
}

export function SyncButton({ pending, connected, status, onClick }) {
  const error = connected && status === 'error';
  const label = !connected ? 'Синхронізацію не підключено' : error ? 'Помилка синхронізації' : status === 'syncing' ? 'Синхронізую…' : pending ? `${pending} змін чекають` : 'Синхронізовано';
  const stroke = !connected ? '#A4A9A5' : error ? '#D2401F' : '#141414';
  return (
    <button class={`round ${status === 'syncing' ? 'pulse' : ''}`} aria-label={label} title={label} onClick={onClick}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5H7z" stroke={stroke} />
        {connected && !error && !pending && status !== 'syncing' && <path d="M9.5 13.5l2 2 3.5-3.5" stroke="#2E9C6A" />}
        {error && <path d="M12 10.5v3M12 15.8v.01" stroke="#D2401F" stroke-width="2" />}
        {connected && !error && pending > 0 && <text x="12" y="15.5" text-anchor="middle" font-size="7" font-weight="700" fill="#FF6A3D" stroke="none">{pending > 9 ? '9+' : pending}</text>}
      </svg>
    </button>
  );
}

export function TabBar({ tab, onTab }) {
  return (
    <nav class="tabs">
      <div class="tabs-in">
        <button aria-current={tab === 'list' ? 'page' : undefined} onClick={() => onTab('list')}>
          <Ico name="list" size={24} width={tab === 'list' ? 2 : 1.8} />Список
        </button>
        <button aria-current={tab === 'stock' ? 'page' : undefined} onClick={() => onTab('stock')}>
          <Ico name="box" size={24} width={tab === 'stock' ? 2 : 1.8} />Запаси
        </button>
      </div>
    </nav>
  );
}

export function Toast({ toast, low }) {
  if (!toast) return null;
  return (
    <div class={`toast ${low ? 'low' : ''}`} role="status">
      <span>{toast.text}</span>
      {toast.undo && <button onClick={toast.undo}>Скасувати</button>}
    </div>
  );
}

export function Stepper({ value, onDec, onInc }) {
  return (
    <div class="stepper">
      <button aria-label="Менше" onClick={onDec}><Ico name="minus" size={12} width={2.6} /></button>
      <span>{value}</span>
      <button class="plus" aria-label="Більше" onClick={onInc}><Ico name="plus" size={12} color="#fff" width={2.6} /></button>
    </div>
  );
}
