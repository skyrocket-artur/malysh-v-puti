// Собирает игру в один файл для публикации ссылкой (dist/): CSS и JS встроены.
// Офлайн-режим (service worker) там не работает — он нужен только на своём хостинге.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = ['js/core.js', 'js/audio.js', 'js/voice-files.js', 'js/art.js', 'js/engines.js', 'js/engines2.js', 'js/levels.js', 'js/app.js']
  .map(f => `// ${f}\n${read(f)}`).join('\n').replace(/<\/script/gi, '<\\/script');
fs.writeFileSync(path.join(dist, 'index.html'),
  `<title>Малыш в пути</title>\n<meta name="theme-color" content="#7fd0ff">\n<style>\n${read('css/style.css')}\n</style>\n<div id="app"></div>\n<div id="fx"></div>\n<script>\n${js}\n</script>\n`);
const print = read('print.html').replace('<script src="js/core.js"></script>', `<script>\n${read('js/core.js')}\n</script>`).replace('<script src="js/art.js"></script>', `<script>\n${read('js/art.js')}\n</script>`);
fs.writeFileSync(path.join(dist, 'print.html'), print);
fs.copyFileSync(path.join(root, 'script.html'), path.join(dist, 'script.html'));
console.log('dist/index.html', Math.round(fs.statSync(path.join(dist, 'index.html')).size / 1024) + ' КБ');
