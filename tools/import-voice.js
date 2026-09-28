// Подключение записанной озвучки.
//
// 1) Отдельные файлы, названные по ID (a01_i.m4a, hello.mp3 …):
//      node tools/import-voice.js ~/Downloads/записи
// 2) Один длинный файл на уровень (реплики по порядку сценария, пауза 2–3 с между ними):
//      node tools/import-voice.js --split ~/Downloads/a01.m4a --level a01
//    Для общих реплик: --level common
//
// Каждая запись чистится (обрезка тишины, выравнивание громкости) и сохраняется
// в audio/voice/<id>.mp3, затем обновляется список js/voice-files.js.
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const out = path.join(root, 'audio/voice');

function loadLines() {
  const sb = { console, document: { addEventListener() {} }, navigator: {}, performance: { now: () => 0 }, setTimeout, clearTimeout, localStorage: { getItem: () => null, setItem() {} } };
  sb.window = sb; sb.self = sb; vm.createContext(sb);
  for (const f of ['js/core.js', 'js/audio.js', 'js/voice-files.js', 'js/art.js', 'js/levels.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sb);
  return sb.G.voice.lines;
}
const clean = (src, dst) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src,
  '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1,areverse,loudnorm=I=-16:TP=-1.5,afade=t=in:d=0.02',
  '-ac', '1', '-ar', '44100', '-b:a', '80k', dst]);

const args = process.argv.slice(2);
const lines = loadLines();
if (args[0] === '--split') {
  const file = args[1], level = args[args.indexOf('--level') + 1];
  const ids = Object.keys(lines).filter(id => level === 'common' ? !/^[abc]\d\d_/.test(id) : id.startsWith(level + '_'));
  // ffmpeg пишет результаты silencedetect в stderr
  const text = require('child_process').spawnSync('ffmpeg', ['-i', file, '-af', 'silencedetect=noise=-38dB:d=1.2', '-f', 'null', '-']).stderr.toString();
  const starts = [...text.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]);
  const ends = [...text.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
  const segs = []; let t = 0;
  for (let i = 0; i < starts.length; i++) { if (starts[i] - t > 0.3) segs.push([t, starts[i]]); t = ends[i] ?? t; }
  const dur = +(/Duration: (\d+):(\d+):([\d.]+)/.exec(text) || [0, 0, 0, 0]).slice(1).reduce((a, v, i) => a + v * [3600, 60, 1][i], 0);
  if (dur - t > 0.3) segs.push([t, dur]);
  if (segs.length !== ids.length) { console.error(`Нашёл ${segs.length} фраз, а в сценарии ${ids.length} (${ids.join(', ')}). Сделайте паузы подлиннее или запишите фразы отдельно.`); process.exit(1); }
  segs.forEach(([a, b], i) => {
    const tmp = path.join(out, '.tmp.wav');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-ss', String(Math.max(0, a - 0.15)), '-to', String(b + 0.15), tmp]);
    clean(tmp, path.join(out, ids[i] + '.mp3')); fs.unlinkSync(tmp);
    console.log('✓', ids[i], '—', lines[ids[i]].text);
  });
} else {
  const dir = args[0];
  if (!dir) { console.log('Укажите папку с записями. Подробности — в начале файла.'); process.exit(1); }
  for (const f of fs.readdirSync(dir)) {
    const id = path.parse(f).name.trim();
    if (!lines[id]) { if (!f.startsWith('.')) console.log('пропуск (нет такого ID):', f); continue; }
    clean(path.join(dir, f), path.join(out, id + '.mp3'));
    console.log('✓', id, '—', lines[id].text);
  }
}
require('./scan-voice.js');
