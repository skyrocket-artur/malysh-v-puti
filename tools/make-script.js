// Собирает сценарий озвучки из реплик игры: VOICE_SCRIPT.md и script.html.
// Запуск: node tools/make-script.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const sandbox = { console, self: {}, window: {}, document: { addEventListener() {} }, navigator: {}, performance: { now: () => 0 }, setTimeout, clearTimeout, localStorage: { getItem: () => null, setItem() {} } };
sandbox.window = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
for (const f of ['js/core.js', 'js/audio.js', 'js/voice-files.js', 'js/art.js', 'js/levels.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
const G = sandbox.G, lines = G.voice.lines, rec = G.VOICE_FILES || {};
const WHO = { narrator: 'Рассказчик (мама/папа)', bublik: 'Бублик — рыжий котёнок, старший', iriska: 'Ириска — котёнок-девочка', ponchik: 'Пончик — самый маленький котёнок', frog: 'Лягушонок Квак — весёлый, бодрый', bear: 'Мишка Топа — низкий, добрый', bunny: 'Зайка Пуша — высокий, нежный' };

// порядок: общие реплики, затем по уровням
const used = new Set(), groups = [];
const commonIds = Object.keys(lines).filter(id => !/^[abc]\d\d_/.test(id));
groups.push({ title: 'Общие реплики (похвала, счёт, цвета, меню)', ids: commonIds });
commonIds.forEach(id => used.add(id));
for (const is of G.ISLANDS) for (const lv of is.levels) {
  const ids = Object.keys(lines).filter(id => id.startsWith(lv.id + '_'));
  ids.forEach(id => used.add(id));
  groups.push({ title: `${is.name} · ${lv.index + 1}. ${lv.title}`, ids });
}
const total = Object.keys(lines).length;

let md = `# Сценарий озвучки «Малыш в пути»\n\nВсего реплик: **${total}**. Записано: **${Object.keys(rec).length}**.\n\n`;
md += `## Как записывать\n\n- Каждая реплика — отдельный файл. Имя файла = ID из таблицы (например, \`a01_i.m4a\`). Подойдёт диктофон iPhone: переименуйте запись в ID.\n- Можно записать весь блок одним файлом: читайте реплики по порядку с паузой 2–3 секунды. Я разрежу его по паузам.\n- Говорите медленно, тепло и с улыбкой — как читаете сказку. Для героев можно менять голос (подсказка в колонке «Кто»).\n- Тихое помещение, телефон в 20–30 см ото рта.\n\n`;
for (const g of groups) {
  md += `## ${g.title}\n\n| ID | Кто | Текст |\n|---|---|---|\n`;
  for (const id of g.ids) md += `| \`${id}\` | ${WHO[lines[id].who] || lines[id].who} | ${lines[id].text}${rec[id] ? ' ✅' : ''} |\n`;
  md += '\n';
}
fs.writeFileSync(path.join(root, 'VOICE_SCRIPT.md'), md);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
let html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Сценарий озвучки</title>
<style>
:root{--ink:#2b2536;--muted:#6b5f7c;--bg:#f5f2ec;--card:#fff;--acc:#6d3fd8;--ok:#2b9a4d}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 ui-rounded,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding-block:16px 48px}
main{max-width:760px;margin:0 auto;padding:0 16px}
h1{font-size:26px;margin:8px 0}h2{font-size:18px;margin:28px 0 8px;color:var(--acc)}
.note{background:var(--card);border-radius:16px;padding:12px 18px;color:var(--muted)}
.row{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;background:var(--card);border-radius:12px;padding:10px 14px;margin-bottom:6px}
.id{font:600 13px ui-monospace,Menlo,monospace;color:var(--acc);grid-row:span 2;align-self:start;padding-top:3px}
.who{font-size:13px;color:var(--muted)}.txt{font-size:18px;font-weight:600}
.done{outline:2px solid var(--ok)}.done .id::after{content:" ✓";color:var(--ok)}
@media print{body{background:#fff}.row{break-inside:avoid;border:1px solid #ddd}}
</style></head><body><main><h1>🎙️ Сценарий озвучки</h1>
<div class="note"><p>Всего реплик: <b>${total}</b>, записано: <b>${Object.keys(rec).length}</b>. Каждая реплика — отдельный файл, имя файла = ID слева (например, <code>a01_i.m4a</code>). Или запишите целый раздел одним файлом, делая паузу 2–3 секунды между репликами.</p><p>Говорите медленно, тепло, с улыбкой. Героям можно давать свой голос: мишка — пониже, зайка и котята — повыше.</p></div>`;
for (const g of groups) {
  html += `<h2>${esc(g.title)}</h2>`;
  for (const id of g.ids) html += `<div class="row${rec[id] ? ' done' : ''}"><span class="id">${id}</span><span class="who">${esc(WHO[lines[id].who] || lines[id].who)}</span><span class="txt">${esc(lines[id].text)}</span></div>`;
}
html += `</main></body></html>`;
fs.writeFileSync(path.join(root, 'script.html'), html);
console.log(`Реплик: ${total}, уровней: ${G.LEVELS.length}, записано: ${Object.keys(rec).length}`);
const unused = Object.keys(lines).filter(id => !used.has(id));
if (unused.length) console.log('Без группы:', unused.join(', '));
