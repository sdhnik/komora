// Словник іконок (Microsoft Fluent Emoji 3D, MIT). Файли: public/icons/items/<id>.webp
// Ключові слова — основи слів у нижньому регістрі, пошук за підрядком.

export const CATEGORIES = [
  { id: 'dairy', name: 'Молочне', tint: '#E9F1FA' },
  { id: 'grain', name: 'Хліб і крупи', tint: '#F6EFE4' },
  { id: 'meat', name: 'М’ясо і риба', tint: '#FBE7E3' },
  { id: 'veg', name: 'Овочі', tint: '#E8F3E5' },
  { id: 'fruit', name: 'Фрукти', tint: '#FFF4DC' },
  { id: 'drink', name: 'Напої', tint: '#F3ECE6' },
  { id: 'sweet', name: 'Солодке', tint: '#FBEDE2' },
  { id: 'home', name: 'Побут і гігієна', tint: '#EAF0F6' },
  { id: 'other', name: 'Інше', tint: '#EEF0EC' },
];

export const ICONS = [
  ['milk', 'dairy', 'молок кефір йогурт ряжан вершк'],
  ['cheese', 'dairy', 'сир сирок бринз моцарел'],
  ['butter', 'dairy', 'масло вершков маргарин'],
  ['egg', 'dairy', 'яйц яйце'],
  ['bread', 'grain', 'хліб батон багет'],
  ['flatbread', 'grain', 'тортиль лаваш піта коржі'],
  ['croissant', 'grain', 'круасан випічк булк'],
  ['rice', 'grain', 'рис гречк круп пшон булгур вівсян пластівц борошн'],
  ['pasta', 'grain', 'макарон спагеті паст локшин'],
  ['meat', 'meat', 'м’яс м\'яс мяс фарш свинин яловичин баранин телятин'],
  ['poultry', 'meat', 'курк курят стегн крильц індич філе'],
  ['bacon', 'meat', 'бекон ковбас шинк сосиск'],
  ['fish', 'meat', 'риб лосос скумбр оселед тунец'],
  ['potato', 'veg', 'картопл картошк'],
  ['sweetpotato', 'veg', 'батат'],
  ['pepper', 'veg', 'перець солодк болгарськ перец'],
  ['mushroom', 'veg', 'печериц гриб'],
  ['broccoli', 'veg', 'броколі цвітн'],
  ['greens', 'veg', 'салат капуст шпинат рукол'],
  ['herb', 'veg', 'кріп петрушк зелень базилік кінз'],
  ['tomato', 'veg', 'помідор томат черрі'],
  ['cucumber', 'veg', 'огір кабач'],
  ['carrot', 'veg', 'морк'],
  ['onion', 'veg', 'цибул'],
  ['garlic', 'veg', 'часник'],
  ['apple', 'fruit', 'яблук груш'],
  ['banana', 'fruit', 'банан'],
  ['lemon', 'fruit', 'лимон лайм цитрус апельсин мандарин'],
  ['grapes', 'fruit', 'виноград ізюм'],
  ['berries', 'fruit', 'ягод чорниц полуниц малин лохин'],
  ['avocado', 'fruit', 'авокадо'],
  ['nuts', 'fruit', 'горіх арахіс мигдал кешью'],
  ['olive', 'fruit', 'олив маслин олія'],
  ['coffee', 'drink', 'кав какао'],
  ['tea', 'drink', 'чай'],
  ['juice', 'drink', 'сік соки нектар'],
  ['honey', 'sweet', 'мед варенн джем'],
  ['choco', 'sweet', 'шоколад цукерк'],
  ['cookie', 'sweet', 'печив крекер'],
  ['lotion', 'home', 'засіб ополіскувач порош гель шампун'],
  ['soap', 'home', 'мило'],
  ['sponge', 'home', 'губк'],
  ['paper', 'home', 'папір паперов серветк рушник'],
  ['bucket', 'home', 'відро прибиран'],
  ['canned', 'other', 'консерв тунець тушонк'],
  ['beans', 'other', 'нут квасол сочевиц горох боб'],
  ['jar', 'other', 'квашен соус пасата passata томатн банк'],
  ['salt', 'other', 'сіль спеці цукор кмин паприк орегано кориц лавр'],
  ['cart', 'other', ''],
].map(([id, category, kw]) => ({ id, category, keywords: kw.split(' ').filter(Boolean) }));

const byId = Object.fromEntries(ICONS.map((i) => [i.id, i]));
const tintOf = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.tint]));

export const FALLBACK_ICON = 'cart';

export const iconUrl = (id) => `${import.meta.env?.BASE_URL ?? '/'}icons/items/${byId[id] ? id : FALLBACK_ICON}.webp`;
export const iconTint = (id) => tintOf[byId[id]?.category] ?? tintOf.other;

/** Перша іконка, чиє ключове слово входить у назву. */
export function matchIcon(name) {
  const n = (name || '').toLowerCase();
  for (const icon of ICONS) if (icon.keywords.some((k) => n.includes(k))) return icon.id;
  return null;
}
