// Константи моделі. Значення узгоджені в специфікації.

/** Середини діапазонів відповіді «На скільки ще вистачить?», у днях. */
export const CHECK_DAYS = { none: 0, week: 4, twoWeeks: 10, more: 21 };

/** Відповіді майстра «На скільки вистачає однієї?», у днях. */
export const LASTS_DAYS = { '2-3d': 2.5, week: 7, '2w': 14, month: 30, longer: 60 };

/** Терміни зберігання за замовчуванням, днів (null = без обмежень). */
export const STORAGE_SHELF = { cupboard: null, fridge: 7, freezer: 90 };

export const PACK_TYPES = ['piece', 'weight', 'bottle', 'pack', 'tray', 'package', 'loaf', 'chunk', 'jar'];
export const UNITS = ['g', 'kg', 'ml', 'l', 'pcs'];
export const STORAGES = ['cupboard', 'fridge', 'freezer'];
export const EVENT_TYPES = ['added', 'bought', 'checked', 'ranOut', 'undone'];

export const DEFAULT_SETTINGS = { shoppingDay: 7, bufferDays: 1, syncUrl: '', syncKey: '', lastBackupAt: null, welcomed: false };

/** Навчання. */
export const LEARN = {
  cyclesToKnow: 2,        // повних циклів до статусу «знаю»
  missRatio: 0.3,         // розбіжність з прогнозом, що вважається промахом
  missesToRelearn: 2,     // промахів поспіль до повернення в «вчиться»
  minDays: 3,             // коротші проміжки не змінюють норму
  weights: {              // частка нового спостереження
    learning: { cycle: 0.5, check: 0.3 },
    known: { cycle: 0.2, check: 0.1 },
  },
  clamp: [0.25, 4],       // спостережена швидкість обмежується r×0.25 … r×4
};

/** Скільки днів після прогнозованого нуля товар «знаю» вважається підозрілим. */
export const OVERDUE_DAYS = 7;
