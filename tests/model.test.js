import { describe, it, expect } from 'vitest';
import { replay, forecast, buildWeek, horizon, initialRate, bucketOf } from '../src/core/model.js';
import { nextShoppingDay, isoWeekday, addDays } from '../src/core/dates.js';
import { DEFAULT_SETTINGS } from '../src/core/constants.js';

const settings = { ...DEFAULT_SETTINGS }; // неділя, запас 1 день
let seq = 0;
const ev = (productId, date, type, value) => ({ id: `e${++seq}`, productId, date, type, value });

const buckwheat = { id: 'b', name: 'Гречка', packType: 'pack', packSize: 1, unit: 'kg', daysPerPack: 14, storage: 'cupboard', shelfLifeDays: null };
const milk = { id: 'm', name: 'Молоко', packType: 'bottle', packSize: 1, unit: 'l', daysPerPack: 2.5, storage: 'fridge', shelfLifeDays: 7 };
const banana = { id: 'n', name: 'Банани', packType: 'piece', packSize: 1, unit: 'pcs', perWeek: 14, storage: 'cupboard', shelfLifeDays: 7 };

describe('дати', () => {
  it('рахує ISO-день тижня', () => {
    expect(isoWeekday('2026-11-29')).toBe(7); // неділя
    expect(isoWeekday('2026-11-30')).toBe(1);
  });
  it('найближча неділя: сьогодні в неділю, завтра в суботу', () => {
    expect(nextShoppingDay('2026-11-29', 7)).toBe('2026-11-29');
    expect(nextShoppingDay('2026-11-28', 7)).toBe('2026-11-29');
    expect(nextShoppingDay('2026-11-24', 7)).toBe('2026-11-29');
  });
});

describe('горизонт', () => {
  it('у неділю = 0 + 7 + 1', () => expect(horizon('2026-11-29', settings).H).toBe(8));
  it('у суботу (магазин у неділю зачинено) = 1 + 7 + 1', () => expect(horizon('2026-11-28', settings).H).toBe(9));
});

describe('швидкість і залишок', () => {
  it('початкова норма з майстра', () => {
    expect(initialRate(buckwheat)).toBeCloseTo(1 / 14);
    expect(initialRate(banana)).toBe(2);
  });

  it('новий товар має невідомий залишок і йде в перевірку', () => {
    const events = [ev('b', '2026-11-20', 'added')];
    const st = replay(buckwheat, events, '2026-11-29');
    expect(st.stock).toBeNull();
    const f = forecast(buckwheat, st, settings, '2026-11-29');
    expect(f.group).toBe('unknown');
    expect(f.checkReason).toBe('unknown');
  });

  it('залишок тане з часом і не йде нижче нуля', () => {
    const events = [ev('b', '2026-11-01', 'added'), ev('b', '2026-11-01', 'bought', 1)];
    expect(replay(buckwheat, events, '2026-11-08').stock).toBeCloseTo(0.5);
    expect(replay(buckwheat, events, '2026-12-31').stock).toBe(0);
  });

  it('«Скасувати» прибирає покупку', () => {
    const buy = ev('b', '2026-11-01', 'bought', 1);
    const events = [ev('b', '2026-11-01', 'added'), buy, ev('b', '2026-11-01', 'undone', buy.id)];
    expect(replay(buckwheat, events, '2026-11-02').stock).toBeNull();
  });
});

describe('навчання', () => {
  it('гречка з макета: один цикл точно за прогнозом, потім перевірка «до тижня»', () => {
    const events = [
      ev('b', '2026-10-20', 'added'),
      ev('b', '2026-10-26', 'bought', 1),
      ev('b', '2026-11-09', 'ranOut'),        // пачки вистачило на 14 днів, як і очікували
      ev('b', '2026-11-10', 'bought', 1),
      ev('b', '2026-11-24', 'checked', 'week'), // за прогнозом мало закінчитись, а ще є
    ];
    const st = replay(buckwheat, events, '2026-11-24');
    expect(st.cycles).toBe(1);
    expect(st.status).toBe('learning');
    expect(st.rate).toBeLessThan(1 / 14);      // споживання повільніше, ніж думали
    expect(st.stock / st.rate).toBeCloseTo(4);       // одразу після перевірки — середина діапазону
  });

  it('два цикли переводять товар у «знаю»', () => {
    const events = [
      ev('b', '2026-10-01', 'added'),
      ev('b', '2026-10-01', 'bought', 1), ev('b', '2026-10-15', 'ranOut'),
      ev('b', '2026-10-15', 'bought', 1), ev('b', '2026-10-29', 'ranOut'),
    ];
    const st = replay(buckwheat, events, '2026-10-29');
    expect(st.status).toBe('known');
    expect(st.rate).toBeCloseTo(1 / 14);
  });

  it('цикл учить норму: пачки вистачає на 10 днів, а не на 14', () => {
    const events = [ev('b', '2026-10-01', 'bought', 1), ev('b', '2026-10-11', 'ranOut')];
    const st = replay(buckwheat, events, '2026-10-11');
    expect(st.rate).toBeCloseTo(0.5 / 14 + 0.5 / 10); // вага циклу в режимі «вчиться» = 0,5
  });

  it('два промахи поспіль повертають у «вчиться»', () => {
    const events = [
      ev('b', '2026-09-01', 'bought', 1), ev('b', '2026-09-15', 'ranOut'),
      ev('b', '2026-09-15', 'bought', 1), ev('b', '2026-09-29', 'ranOut'),   // знаю
      ev('b', '2026-09-29', 'bought', 1), ev('b', '2026-10-04', 'ranOut'),   // 5 днів замість 14
      ev('b', '2026-10-04', 'bought', 1), ev('b', '2026-10-09', 'ranOut'),   // знову 5
    ];
    const st = replay(buckwheat, events, '2026-10-09');
    expect(st.status).toBe('learning');
    expect(st.cycles).toBe(1); // лічильник скинуто, і цикл-промах уже зарахований як перший новий
  });

  it('повернення з архіву (нова подія added) починає навчання з нуля', () => {
    const events = [
      ev('b', '2026-10-01', 'bought', 1), ev('b', '2026-10-15', 'ranOut'),
      ev('b', '2026-10-15', 'bought', 1), ev('b', '2026-10-29', 'ranOut'),
      ev('b', '2026-11-20', 'added'),
    ];
    const st = replay(buckwheat, events, '2026-11-20');
    expect(st.status).toBe('learning');
    expect(st.stock).toBeNull();
  });

  it('проміжок коротший за 3 дні норму не змінює', () => {
    const events = [ev('b', '2026-10-01', 'bought', 1), ev('b', '2026-10-02', 'ranOut')];
    expect(replay(buckwheat, events, '2026-10-02').rate).toBeCloseTo(1 / 14);
  });

  it('відповідь «не знаю» нічого не змінює', () => {
    const events = [ev('b', '2026-11-01', 'added'), ev('b', '2026-11-29', 'checked', 'unknown')];
    const st = replay(buckwheat, events, '2026-11-29');
    expect(st.stock).toBeNull();
    // сьогодні вже питали — повторно не питаємо
    expect(forecast(buckwheat, st, settings, '2026-11-29').checkReason).toBeNull();
    // через тиждень спитаємо знову
    expect(forecast(buckwheat, replay(buckwheat, events, '2026-12-06'), settings, '2026-12-06').checkReason).toBe('unknown');
  });
});

describe('групи і кількість', () => {
  const sunday = '2026-11-29'; // H = 8
  const withStock = (days) => [ev('b', addDays(sunday, -1), 'checked', 'none'), ev('b', addDays(sunday, -1), 'bought', 1), ev('b', sunday, 'checked', days)];

  it('розкладає за днями запасу', () => {
    const g = (answer) => forecast(buckwheat, replay(buckwheat, withStock(answer), sunday), settings, sunday).group;
    expect(g('week')).toBe('now');      // 4 < 8
    expect(g('twoWeeks')).toBe('next'); // 8 ≤ 10 < 15
    expect(g('more')).toBe('stock');    // 21 ≥ 15
  });

  it('кількість: молоко на 8 днів, але не більше, ніж за термін зберігання', () => {
    const events = [ev('m', '2026-11-28', 'bought', 1)]; // за добу випили 0,4 л
    const st = replay(milk, events, sunday);
    expect(st.stock).toBeCloseTo(0.6);
    const f = forecast(milk, st, settings, sunday);
    // потреба 0,4 × 8 − 0,6 = 2,6 → 3 пляшки, але за 7 днів зберігання встигнемо лише 2,8 → 2
    expect(f.packs).toBe(2);
  });

  it('поштучно: банани рахуються штуками', () => {
    const events = [ev('n', sunday, 'ranOut')];
    const f = forecast(banana, replay(banana, events, sunday), settings, sunday);
    expect(f.group).toBe('now');
    expect(f.packs).toBe(14); // 2 на день × 7 днів зберігання
  });

  it('bucketOf відповідає діапазонам перевірки', () => {
    expect([0, 3, 9, 30].map(bucketOf)).toEqual(['none', 'week', 'twoWeeks', 'more']);
  });
});

describe('тиждень цілком', () => {
  it('збирає список і перевірку, перевірка впорядкована за місцем зберігання', () => {
    const sunday = '2026-11-29';
    const products = [milk, buckwheat, { ...banana, archived: true }];
    const events = [
      ev('m', '2026-11-28', 'bought', 1),
      ev('b', '2026-11-20', 'added'),
    ];
    const w = buildWeek(products, events, settings, sunday);
    expect(w.total).toBe(2);                         // архівний не враховується
    expect(w.list.map((x) => x.product.id)).toEqual(['m']);
    expect(w.check.map((x) => x.product.id)).toEqual(['b', 'm']); // шафа раніше за холодильник
    expect(w.known).toBe(0);
  });
});

import { guessProduct } from '../src/core/catalog.js';
import { matchIcon } from '../src/core/icons.js';

describe('словник', () => {
  it('впізнає типові товари', () => {
    expect(guessProduct('Кефір 2,5%')).toMatchObject({ known: true, icon: 'milk', packType: 'bottle', storage: 'fridge' });
    expect(guessProduct('Хліб цільнозерновий')).toMatchObject({ icon: 'bread', packType: 'loaf' });
    expect(guessProduct('Фарш баранячий')).toMatchObject({ packType: 'weight', packSize: 500, unit: 'g', storage: 'freezer', shelfLifeDays: 90 });
    expect(guessProduct('Банани')).toMatchObject({ packType: 'piece', perWeek: 7 });
    expect(guessProduct('Олія соняшникова')).toMatchObject({ icon: 'olive', packType: 'bottle' });
    expect(guessProduct('Перець солодкий')).toMatchObject({ icon: 'pepper', packType: 'piece' });
    expect(guessProduct('Тортильї цільнозернові')).toMatchObject({ icon: 'flatbread' });
    expect(guessProduct('Ополіскувач для білизни')).toMatchObject({ known: true, icon: 'lotion' });
  });
  it('невідомий товар отримує запасні відповіді', () => {
    expect(guessProduct('Корм для кота')).toMatchObject({ known: false, icon: 'cart', packType: 'package' });
  });
  it('іконка шукається за ключовими словами', () => {
    expect(matchIcon('Помідори черрі')).toBe('tomato');
    expect(matchIcon('щось')).toBeNull();
  });
});

import { parseBought, boughtValue } from '../src/core/model.js';
describe('розмір упаковки при покупці', () => {
  const pasta = { id: 'p', packType: 'pack', packSize: 500, unit: 'g', daysPerPack: 10, storage: 'cupboard' };
  it('зберігає розмір лише якщо він відрізняється', () => {
    expect(boughtValue(2, 500, pasta)).toBe(2);
    expect(boughtValue(2, 700, pasta)).toBe('2@700');
    expect(parseBought('2@700', pasta)).toEqual({ packs: 2, size: 700 });
    expect(parseBought(3, pasta)).toEqual({ packs: 3, size: 500 });
  });
  it('залишок рахується з фактичного розміру', () => {
    const events = [{ id: 'a', productId: 'p', date: '2026-11-01', type: 'bought', value: '1@700' }];
    expect(replay(pasta, events, '2026-11-01').stock).toBe(700);
  });
});
