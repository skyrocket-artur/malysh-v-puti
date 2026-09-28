// Сканирует audio/voice/ и обновляет js/voice-files.js (id → файл) и версию кэша в sw.js.
// Запуск после добавления записей: node tools/scan-voice.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'audio/voice');
const map = {};
for (const f of fs.readdirSync(dir).sort()) {
  const m = f.match(/^([a-z0-9_]+)\.(mp3|m4a|aac|ogg|wav)$/i);
  if (m) map[m[1]] = f;
}
fs.writeFileSync(path.join(root, 'js/voice-files.js'),
  `// Сгенерировано tools/scan-voice.js — список записанных реплик (id → файл в audio/voice/).\n(self.G = self.G || {}).VOICE_FILES = ${JSON.stringify(map, null, 1)};\n`);
const sw = path.join(root, 'sw.js');
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/const VERSION = '[^']+'/, `const VERSION = 'malysh-${Date.now()}'`));
console.log('Записанных реплик:', Object.keys(map).length);
