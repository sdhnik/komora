/**
 * Komora — синхронізація з Google Sheets.
 *
 * Як встановити (детально — у README репозиторію):
 *  1. Створіть порожню таблицю Google, відкрийте Розширення → Apps Script.
 *  2. Замініть увесь код цим файлом і збережіть.
 *  3. Виберіть функцію `setup` і натисніть «Виконати». Дозвольте доступ.
 *     У журналі виконання з'явиться ключ — скопіюйте його.
 *  4. Розгортання → Нове розгортання → тип «Веб-додаток»:
 *     виконувати від імені «Я», доступ «Усі». Скопіюйте URL веб-додатка.
 *  5. У Komora: Налаштування → Синхронізація → вставте URL і ключ.
 */

const SHEETS = {
  products: ['id', 'name', 'icon', 'packType', 'packSize', 'unit', 'daysPerPack', 'perWeek', 'storage', 'shelfLifeDays', 'archived', 'deleted', 'updatedAt'],
  events: ['id', 'date', 'productId', 'type', 'value', 'createdAt', 'seq'],
};

/** Створює аркуші й ключ. Безпечно запускати повторно: дані не стираються, ключ не змінюється. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(function (name) {
    const cols = SHEETS[name];
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    sheet.getRange(1, 1, sheet.getMaxRows(), cols.length).setNumberFormat('@'); // усе як текст: дати не перетворюються
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
  const blank = ss.getSheetByName('Sheet1') || ss.getSheetByName('Аркуш1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 2) ss.deleteSheet(blank);

  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '').slice(0, 24);
    props.setProperty('KEY', key);
  }
  Logger.log('Ключ для Komora: ' + key);
}

/** Стирає всі товари й події (заголовки лишаються). Запускайте вручну з редактора. */
function clearData() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(function (name) {
    const sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
  });
  Logger.log('Таблицю очищено');
}

/** Коли ви правите товар у таблиці вручну, оновлюємо updatedAt, щоб правка дійшла до телефона. */
function onEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'products' || e.range.getRow() < 2) return;
  const col = SHEETS.products.indexOf('updatedAt') + 1;
  if (e.range.getColumn() === col) return;
  for (let r = e.range.getRow(); r <= e.range.getLastRow(); r++) {
    sheet.getRange(r, col).setValue(new Date().toISOString());
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function keyOk(key) {
  const real = PropertiesService.getScriptProperties().getProperty('KEY');
  return !!real && key === real;
}

function readRows(sheet, cols, fromRow) {
  const last = sheet.getLastRow();
  if (last < fromRow) return [];
  const values = sheet.getRange(fromRow, 1, last - fromRow + 1, cols.length).getDisplayValues();
  return values.map(function (r) {
    const o = {};
    cols.forEach(function (c, i) { o[c] = r[i]; });
    return o;
  });
}

/** GET: action=ping | action=pull&eventsFrom=N&productsSince=ISO */
function doGet(e) {
  const p = e.parameter || {};
  if (!keyOk(p.key)) return json({ ok: false, error: 'key' });
  if (p.action === 'ping') return json({ ok: true });

  const ss = SpreadsheetApp.getActive();
  const ev = ss.getSheetByName('events');
  const pr = ss.getSheetByName('products');
  if (!ev || !pr) return json({ ok: false, error: 'setup' });

  const from = Math.max(0, Number(p.eventsFrom || 0)) + 2;
  const since = String(p.productsSince || '');
  const events = readRows(ev, SHEETS.events, from);
  const products = readRows(pr, SHEETS.products, 2).filter(function (r) { return r.id && String(r.updatedAt) > since; });
  return json({ ok: true, events: events, eventsTotal: Math.max(0, ev.getLastRow() - 1), products: products });
}

/** POST (text/plain): { key, events: [...], products: [...] } */
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'json' }); }
  if (!keyOk(body.key)) return json({ ok: false, error: 'key' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActive();
    const ev = ss.getSheetByName('events');
    const pr = ss.getSheetByName('products');
    if (!ev || !pr) return json({ ok: false, error: 'setup' });
    const cell = function (v) { return v === null || v === undefined ? '' : String(v); };

    // Події: лише дописуємо, дублікати за id пропускаємо.
    const have = {};
    readRows(ev, ['id'], 2).forEach(function (r) { have[r.id] = true; });
    const evRows = (body.events || [])
      .filter(function (x) { return x && x.id && !have[x.id]; })
      .map(function (x) { have[x.id] = true; return SHEETS.events.map(function (c) { return cell(x[c]); }); });
    if (evRows.length) {
      ev.getRange(ev.getLastRow() + 1, 1, evRows.length, SHEETS.events.length).setNumberFormat('@').setValues(evRows);
    }

    // Товари: новіший updatedAt перемагає.
    const rows = readRows(pr, SHEETS.products, 2);
    const index = {};
    rows.forEach(function (r, i) { index[r.id] = { row: i + 2, updatedAt: String(r.updatedAt) }; });
    let upserted = 0;
    (body.products || []).forEach(function (p) {
      if (!p || !p.id) return;
      const values = [SHEETS.products.map(function (c) { return cell(p[c]); })];
      const hit = index[p.id];
      if (hit) {
        if (hit.updatedAt >= String(p.updatedAt)) return;
        pr.getRange(hit.row, 1, 1, SHEETS.products.length).setNumberFormat('@').setValues(values);
      } else {
        const row = pr.getLastRow() + 1;
        pr.getRange(row, 1, 1, SHEETS.products.length).setNumberFormat('@').setValues(values);
        index[p.id] = { row: row, updatedAt: String(p.updatedAt) };
      }
      upserted++;
    });

    return json({ ok: true, eventsAdded: evRows.length, productsUpserted: upserted });
  } finally {
    lock.releaseLock();
  }
}
