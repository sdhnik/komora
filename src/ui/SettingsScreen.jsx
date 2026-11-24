import { useState } from 'preact/hooks';
import { Head, Ico } from './components.jsx';

// Тимчасовий екран: повні налаштування з'являться на етапі 4.
export function SettingsScreen({ act, back }) {
  const [sure, setSure] = useState(false);
  return (
    <main class="screen no-tabs">
      <Head left={<button class="round" aria-label="Назад" onClick={back}><Ico name="back" size={20} width={2} /></button>} title="Налаштування" />
      <div class="card empty">День покупок, синхронізація й резервна копія з’являться на етапах 4–5. Поки день покупок — неділя, запас — 1 день.</div>
      <div class="section-title"><h2>Для тестування</h2></div>
      <div class="two">
        <button class="btn-soft" onClick={act.seed}>Додати приклад</button>
        <button class="btn-soft" style={{ color: '#D2401F' }} onClick={() => (sure ? (act.wipe(), setSure(false)) : setSure(true))}>{sure ? 'Точно очистити?' : 'Очистити все'}</button>
      </div>
    </main>
  );
}
