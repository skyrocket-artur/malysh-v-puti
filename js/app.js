'use strict';
// Экраны игры и сценарий уровня.
(function () {
  const h = G.h, A = G.A;
  const S = () => G.store.data;
  const save = () => G.store.save();
  const app = () => G.$('#app');

  // ---------- не гасить экран во время игры ----------
  G.wake = {
    lock: null,
    async request() { try { if ('wakeLock' in navigator && !this.lock) { this.lock = await navigator.wakeLock.request('screen'); this.lock.addEventListener('release', () => { this.lock = null; }); } } catch (e) { /* ok */ } },
    release() { try { this.lock && this.lock.release(); } catch (e) { /* ok */ } this.lock = null; }
  };

  // ---------- таймер сессии для напоминания об отдыхе ----------
  G.session = {
    ms: 0, t: 0, active: false,
    start() { if (!this.active) { this.active = true; this.t = performance.now(); } },
    stop() { if (this.active) { this.ms += performance.now() - this.t; this.active = false; } },
    get total() { return this.ms + (this.active ? performance.now() - this.t : 0); },
    reset() { this.ms = 0; if (this.active) this.t = performance.now(); }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { G.session.stop(); G.voice.stop(); }
    else {
      if (G.cur === 'level' && !G.nightMode) { G.session.start(); G.wake.request(); }
      if (G.audio.ctx && G.audio.ctx.state !== 'running') G.audio.ctx.resume();
    }
  });

  // ---------- смена экранов ----------
  let curEl = null, curCleanup = null;
  function show(name, el, cleanup) {
    if (curCleanup) { try { curCleanup(); } catch (e) { console.error(e); } }
    G.voice.stop();
    const old = curEl;
    curEl = el; curCleanup = cleanup || null; G.cur = name;
    el.classList.add('screen', 'enter');
    app().append(el);
    void el.offsetWidth; setTimeout(() => el.classList.remove('enter'), 20);
    if (old) { old.classList.add('leave'); setTimeout(() => old.remove(), 320); }
  }

  const isDone = lv => !!S().done[lv.id];
  const unlocked = lv => S().settings.unlockAll || lv.index === 0 || isDone(lv) || isDone(lv.island.levels[lv.index - 1]);
  const nextLevel = is => is.levels.find(l => !isDone(l));
  const markDone = lv => { S().done[lv.id] = Date.now(); save(); };

  // ---------- заставка ----------
  function splash() {
    const el = h('div', { class: 'splash' });
    const clouds = h('div', { class: 'deco-clouds', html: [0, 1, 2].map(i => `<div class="dc" style="--i:${i}">${A.svg('0 0 130 80', A.cloud())}</div>`).join('') });
    const logo = h('h1', { class: 'logo' }, h('span', null, 'Малыш'), h('span', null, 'в пути'));
    const gang = h('div', { class: 'gang' },
      ...['bublik', 'iriska', 'ponchik', 'frog', 'bear', 'bunny'].map((k, i) => G.artEl(A.char(k), 'gang-' + k + ' pop-in')).map((e, i) => { e.style.animationDelay = 200 + i * 110 + 'ms'; return e; }));
    const play = h('button', { class: 'play-btn', 'aria-label': 'Играть' }, h('span'));
    play.addEventListener('click', start);
    el.append(clouds, logo, gang, play);
    show('splash', el);
  }

  function start() {
    G.audio.unlock();
    // iOS: первая реплика синтезатора должна прозвучать прямо в обработчике нажатия
    try { if (window.speechSynthesis) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) { /* ok */ }
    try { const d = document.documentElement; if (d.requestFullscreen && matchMedia('(pointer:coarse)').matches) d.requestFullscreen().catch(() => { }); } catch (e) { /* ok */ }
    G.wake.request();
    const jump = (location.hash || '').slice(1);
    const lv = G.LEVELS.find(l => l.id === jump);
    if (lv) { playLevel(lv); return; }
    islands();
    G.voice.say('hello').then(() => { if (G.cur === 'islands') G.voice.say('choose'); });
  }

  // ---------- острова ----------
  function topButtons(extra = []) {
    const top = h('div', { class: 'topbar' });
    const album = h('button', { class: 'ibtn', 'aria-label': 'Наклейки' }, '📒');
    album.addEventListener('click', () => { G.sfx.pop(); albumScreen(); });
    const moon = h('button', { class: 'ibtn', 'aria-label': 'Колыбельная' }, '🌙');
    moon.addEventListener('click', () => { G.sfx.pop(); playLevel(G.LEVELS.find(l => l.type === 'lullaby')); });
    const gear = h('button', { class: 'ibtn hold', 'aria-label': 'Для родителей — удерживайте' }, '⚙️');
    G.holdButton(gear, 2200, parentScreen);
    top.append(...extra, album, h('div', { class: 'grow' }), moon, gear);
    return top;
  }

  function islands() {
    G.music.play('map');
    const el = h('div', { class: 'islands t-sky' });
    const list = h('div', { class: 'isl-list' });
    G.ISLANDS.forEach((is, i) => {
      const card = h('button', { class: 'isl-card t-' + is.theme + ' pop-in', style: { animationDelay: i * 120 + 'ms' } },
        h('div', { class: 'isl-art', html: is.art() }),
        h('div', { class: 'isl-info' },
          h('div', { class: 'isl-name' }, is.name),
          h('div', { class: 'isl-stars' }, ...is.levels.map(l => h('i', { class: isDone(l) ? 'on' : '' })))));
      card.addEventListener('click', () => { G.sfx.pop(); island(is); G.voice.say(is.say); });
      list.append(card);
    });
    el.append(topButtons(), list);
    show('islands', el);
  }

  // ---------- карта острова ----------
  function island(is, justDone) {
    G.music.play('map');
    const el = h('div', { class: 'island t-' + is.theme });
    const back = h('button', { class: 'ibtn', 'aria-label': 'Назад' }, '⬅️');
    back.addEventListener('click', () => { G.sfx.pop(); islands(); });
    const path = h('div', { class: 'path' });
    const line = h('div', { class: 'path-line' });
    path.append(line);
    const next = nextLevel(is);
    const stones = is.levels.map((lv, i) => {
      const st = h('button', { class: 'stone pop-in' + (isDone(lv) ? ' done' : '') + (lv === next ? ' next' : '') + (!unlocked(lv) ? ' locked' : ''), style: { animationDelay: i * 50 + 'ms' }, 'aria-label': lv.title });
      st.append(G.artEl(lv.icon, 'stone-icon'), h('span', { class: 'stone-num' }, String(i + 1)));
      if (isDone(lv)) st.append(h('span', { class: 'stone-star' }, '⭐'));
      st.addEventListener('click', () => {
        if (!unlocked(lv)) { G.sfx.wrong(); G.wiggle(st); G.voice.say('locked'); if (next) G.pulse(stones[next.index]); return; }
        G.sfx.pop(); playLevel(lv);
      });
      path.append(st);
      return st;
    });
    const hostEl = G.artEl(A.char(is.host), 'isl-host');
    el.append(topButtons([back]), path, hostEl);
    const layout = () => {
      const r = path.getBoundingClientRect();
      if (!r.width) return;
      const ar = r.width / r.height;
      const cols = ar >= 1.35 ? 5 : ar >= 0.8 ? 4 : 2;
      path.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      stones.forEach((st, i) => {
        const row = Math.floor(i / cols), c = i % cols;
        st.style.gridRow = row + 1;
        st.style.gridColumn = (row % 2 ? cols - c : c + 1);
      });
      requestAnimationFrame(() => {
        const pr = path.getBoundingClientRect();
        const pts = stones.map(s => { const c = G.center(s); return [c.x - pr.left, c.y - pr.top]; });
        let d = `M${pts[0][0]} ${pts[0][1]}`;
        for (let i = 1; i < pts.length; i++) {
          const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
          const my = (y0 + y1) / 2;
          d += y0 === y1 ? ` L${x1} ${y1}` : ` C${x0} ${my} ${x1} ${my} ${x1} ${y1}`;
        }
        line.innerHTML = `<svg width="${pr.width}" height="${pr.height}"><path d="${d}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 18" opacity=".9"/></svg>`;
      });
    };
    const ro = new ResizeObserver(layout);
    show('island', el, () => ro.disconnect());
    ro.observe(path);
    if (justDone) {
      const allDone = is.levels.every(isDone);
      setTimeout(() => {
        if (G.cur !== 'island') return;
        if (allDone && justDone.index === is.levels.length - 1) {
          G.fx.confetti(90); G.sfx.fanfare();
          const everything = G.LEVELS.every(isDone);
          G.voice.say(everything ? 'all_done' : 'island_done');
        } else if (next) {
          G.pulse(stones[next.index], 4000);
          G.voice.say(G.pick(['next1', 'next2']));
        }
      }, 700);
    }
  }

  // ---------- сценарий уровня ----------
  function makeCtx(lv, el, area, dots, hostEl) {
    let alive = true, idleFn = null, idleT = 0, idleN = 0;
    const cleanups = [];
    const guard = p => new Promise((res, rej) => Promise.resolve(p).then(v => { if (alive) res(v); }, e => { if (alive) rej(e); }));
    hostEl._who = lv.host;
    const offSpeak = G.on('speak', ({ on, who }) => {
      hostEl.classList.toggle('talking', on);
      if (on && who && A.hasChar(who) && who !== hostEl._who) { G.setArt(hostEl, A.char(who)); hostEl._who = who; }
    });
    const offNight = G.on('night', on => { el.classList.toggle('night-mode', on); G.nightMode = on; });
    const resetIdle = () => { clearTimeout(idleT); if (idleFn && alive) idleT = setTimeout(fireIdle, idleN ? 14000 : 9000); };
    const fireIdle = () => {
      if (!alive || !idleFn) return;
      if (G.voice.speaking) { idleT = setTimeout(fireIdle, 2500); return; }
      idleN++; idleFn(); resetIdle();
    };
    el.addEventListener('pointerdown', () => { idleN = 0; resetIdle(); }, true);
    hostEl.addEventListener('pointerdown', e => { e.stopPropagation(); if (idleFn && !hostEl.classList.contains('big')) idleFn(); else G.wiggle(hostEl); });
    const ctx = {
      level: lv, area,
      get alive() { return alive; },
      guard,
      say: id => guard(G.voice.say(id)),
      wait: ms => guard(G.sleep(ms)),
      praise: () => guard(G.voice.say(G.pick(G.SMALL))),
      cheer: id => { G.sfx.success(); return guard(G.voice.say(id || G.pick(G.PRAISE))); },
      retry: id => { G.sfx.wrong(); return guard(G.voice.say(id || G.pick(G.RETRY))); },
      progress(i, n) {
        dots.innerHTML = '';
        if (n > 1) for (let k = 0; k < n; k++) dots.append(h('i', { class: k < i ? 'on' : k === i ? 'cur' : '' }));
      },
      idle(fn) { idleFn = fn; idleN = 0; resetIdle(); },
      clear() { area.innerHTML = ''; },
      cleanup(fn) { cleanups.push(fn); },
      interval(fn, ms) { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); return id; },
      exit() {
        if (!alive) return;
        alive = false; clearTimeout(idleT); offSpeak(); offNight();
        cleanups.forEach(f => { try { f(); } catch (e) { console.error(e); } });
        G.voice.stop(); G.music.stop(); G.session.stop(); G.nightMode = false;
      }
    };
    return ctx;
  }

  function levelLines(lv) {
    const ids = new Set();
    const walk = o => {
      if (!o) return;
      if (typeof o === 'string') { if (G.voice.lines[o]) ids.add(o); return; }
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (typeof o === 'object' && o !== lv.island) for (const k in o) if (k !== 'island') walk(o[k]);
    };
    walk(lv);
    return [...ids];
  }

  async function playLevel(lv) {
    const bm = S().settings.breakMin;
    if (bm && lv.type !== 'lullaby' && G.session.total >= bm * 60000) { breakScreen(() => playLevel(lv)); return; }
    G.music.stop();
    const is = lv.island;
    const el = h('div', { class: 'level t-' + is.theme + ' lv-' + lv.type });
    const home = h('button', { class: 'ibtn hold', 'aria-label': 'Выйти — удерживайте' }, '🏠');
    const dots = h('div', { class: 'dots' });
    const hostEl = G.artEl(A.char(lv.host), 'host big');
    const area = h('div', { class: 'area' });
    const top = h('div', { class: 'topbar' }, home, dots, h('div', { class: 'host-space' }));
    el.append(top, area, hostEl);
    const ctx = makeCtx(lv, el, area, dots, hostEl);
    G.holdButton(home, 800, () => { ctx.exit(); island(is); });
    show('level', el, () => ctx.exit());
    G.session.start();
    G.wake.request();
    G.voice.preload(levelLines(lv));
    try {
      await ctx.wait(450);
      for (const id of lv.intro) await ctx.say(id);
      hostEl.classList.remove('big');
      await ctx.wait(500);
      const res = await ctx.guard(G.engines[lv.type](ctx, lv));
      ctx.idle(null);
      markDone(lv);
      if (res && res.quiet) { G.session.stop(); return; }
      await celebrate(ctx, lv);
      await moralCard(ctx, lv);
      await realTask(ctx, lv);
      ctx.exit();
      island(is, lv);
    } catch (e) {
      console.error(e);
      if (ctx.alive) { ctx.exit(); island(is); }
    }
  }

  async function celebrate(ctx, lv) {
    ctx.clear(); ctx.progress(0, 0);
    ctx.area.append(h('div', { class: 'celebrate' }, h('div', { class: 'rays' }), G.artEl(lv.sticker, 'sticker-big pop-in')));
    G.sfx.fanfare(); G.fx.confetti();
    await ctx.say('sticker');
    await ctx.wait(600);
  }

  async function moralCard(ctx, lv) {
    ctx.clear();
    const line = G.voice.lines[lv.moral];
    const who = A.hasChar(line.who) ? line.who : lv.host;
    ctx.area.append(h('div', { class: 'moral pop-in' },
      G.artEl(A.char(who, 'happy'), 'moral-char'),
      G.artEl(lv.moralIcon, 'moral-icon'),
      h('p', { class: 'caption' }, line.text)));
    await ctx.say(lv.moral);
    await ctx.wait(700);
  }

  async function realTask(ctx, lv) {
    ctx.clear();
    const yes = h('button', { class: 'btn-yes', 'aria-label': 'Сделано' }, '✓');
    const skip = h('button', { class: 'btn-skip', 'aria-label': 'Дальше' }, '➜');
    ctx.area.append(h('div', { class: 'real pop-in' },
      h('div', { class: 'real-badge' }, '🌟'),
      G.artEl(lv.realIcon, 'real-icon'),
      h('p', { class: 'caption' }, G.voice.lines[lv.real].text),
      h('div', { class: 'real-btns' }, yes, skip)));
    ctx.say('real_intro').then(() => ctx.say(lv.real));
    ctx.idle(() => { G.pulse(yes); });
    const done = await ctx.guard(new Promise(res => {
      yes.addEventListener('click', () => res(true));
      skip.addEventListener('click', () => res(false));
    }));
    ctx.idle(null);
    if (done) {
      S().real[lv.id] = Date.now(); save();
      G.sfx.fanfare(); G.fx.confetti(40); G.fx.at(yes, 12);
      await ctx.say('real_yes');
      await ctx.wait(300);
    } else G.sfx.pop();
  }

  // ---------- альбом наклеек ----------
  function albumScreen() {
    const el = h('div', { class: 'album t-sky' });
    const back = h('button', { class: 'ibtn', 'aria-label': 'Назад' }, '⬅️');
    back.addEventListener('click', () => { G.sfx.pop(); islands(); });
    const body = h('div', { class: 'al-body' });
    G.ISLANDS.forEach(is => {
      const grid = h('div', { class: 'al-grid' });
      is.levels.forEach(lv => {
        const got = isDone(lv);
        const slot = h('button', { class: 'al-slot' + (got ? '' : ' empty') + (S().real[lv.id] ? ' real' : ''), 'aria-label': lv.title }, G.artEl(lv.sticker));
        slot.addEventListener('click', () => { if (!got) return; G.sfx.pop(); G.wiggle(slot); G.fx.at(slot, 6); });
        grid.append(slot);
      });
      body.append(h('div', { class: 'al-isl t-' + is.theme }, h('div', { class: 'al-head' }, G.artEl(A.char(is.host), 'al-host'), h('span', null, is.name)), grid));
    });
    const top = h('div', { class: 'topbar' }, back, h('div', { class: 'al-title' }, 'Мои наклейки'));
    el.append(top, body);
    show('album', el);
    G.voice.say('album');
  }

  // ---------- перерыв ----------
  function breakScreen(cont) {
    G.session.stop(); G.music.stop();
    const el = h('div', { class: 'break' });
    const btn = h('button', { class: 'hold-cont' }, 'Продолжить — удерживайте');
    G.holdButton(btn, 2000, () => { G.session.reset(); cont(); });
    const home = h('button', { class: 'plain-link' }, 'На главный экран');
    home.addEventListener('click', () => { G.session.reset(); islands(); });
    el.append(
      G.artEl(A.char('ponchik', 'sleep'), 'break-art pop-in'),
      h('div', { class: 'break-emo' }, '🪟 👀 🙆'),
      h('p', null, `Малыш играет уже ${S().settings.breakMin} минут. Пора отдохнуть: посмотрите в окно, потянитесь, попейте воды.`),
      btn, home);
    show('break', el);
    G.voice.say(G.pick(['break1', 'break2']));
  }

  // ---------- для родителей ----------
  function parentScreen() {
    G.voice.stop(); G.music.stop();
    const s = S().settings;
    const el = h('div', { class: 'parent' });
    const close = h('button', { class: 'p-close', 'aria-label': 'Закрыть' }, '✕');
    close.addEventListener('click', islands);
    const body = h('div', { class: 'pbody' });
    const done = G.LEVELS.filter(isDone).length, real = Object.keys(S().real).length;
    const nLines = Object.keys(G.voice.lines).length, nRec = Object.keys(G.VOICE_FILES || {}).length;

    const range = (id, label, key) => {
      const inp = h('input', { type: 'range', id, min: 0, max: 1, step: 0.05, value: s[key] });
      inp.addEventListener('input', () => { s[key] = +inp.value; save(); G.audio.applySettings(); if (key === 'sfx') G.sfx.ok(); });
      return h('label', { class: 'p-row', for: id }, h('span', null, label), inp);
    };
    const breakSel = h('select', { id: 'p-break' }, ...[0, 10, 15, 20, 30, 45].map(m => h('option', { value: m, selected: s.breakMin === m ? 'selected' : null }, m ? m + ' минут' : 'Выключено')));
    breakSel.addEventListener('change', () => { s.breakMin = +breakSel.value; save(); });
    const voiceSel = h('select', { id: 'p-voice' },
      h('option', { value: 'auto', selected: s.voiceMode === 'auto' ? 'selected' : null }, 'Ваша запись, если есть'),
      h('option', { value: 'tts', selected: s.voiceMode === 'tts' ? 'selected' : null }, 'Только синтезатор'));
    voiceSel.addEventListener('change', () => { s.voiceMode = voiceSel.value; save(); });
    const test = h('button', { class: 'p-btn' }, '▶ Проверить звук');
    test.addEventListener('click', () => { G.audio.unlock(); G.sfx.success(); G.voice.say('hello'); });
    const unlock = h('input', { type: 'checkbox', id: 'p-unlock', checked: s.unlockAll ? 'checked' : null });
    unlock.addEventListener('change', () => { s.unlockAll = unlock.checked; save(); });
    const reset = h('button', { class: 'p-btn danger' }, 'Сбросить прогресс');
    const confirmRow = h('div', { class: 'p-confirm', hidden: 'hidden' },
      h('span', null, 'Все наклейки пропадут. Сбросить?'),
      h('button', { class: 'p-btn danger', onclick: () => { S().done = {}; S().real = {}; save(); parentScreen(); } }, 'Да, сбросить'),
      h('button', { class: 'p-btn', onclick: () => { confirmRow.hidden = true; } }, 'Отмена'));
    reset.addEventListener('click', () => { confirmRow.hidden = false; });

    const sec = (title, ...kids) => h('section', { class: 'p-card' }, h('h2', null, title), ...kids);

    body.append(
      h('div', { class: 'p-head' }, h('h1', null, 'Для родителей'), close),
      h('div', { class: 'p-stats' },
        h('div', null, h('b', null, `${done}/${G.LEVELS.length}`), h('span', null, 'уровней')),
        h('div', null, h('b', null, String(real)), h('span', null, 'заданий в жизни')),
        h('div', null, h('b', null, `${nRec}/${nLines}`), h('span', null, 'реплик вашим голосом'))),
      sec('Как устроена игра',
        h('p', null, 'Три острова по 10 уровней — около часа игры. Каждый уровень заканчивается выводом (правило поведения) и заданием «по-настоящему»: найти, нарисовать, собрать в реальной жизни. Задание можно отметить галочкой — тогда наклейка в альбоме получит золотую рамку.'),
        h('p', null, 'Проиграть нельзя: при ошибке герой подсказывает. Если малыш долго не нажимает, игра сама подсветит нужный предмет. Нажатие на героя в углу повторяет задание. Выйти из уровня — удерживать домик.')),
      sec('Настройки',
        range('p-music', 'Музыка', 'music'), range('p-sfx', 'Звуки', 'sfx'),
        h('label', { class: 'p-row', for: 'p-break' }, h('span', null, 'Напоминание об отдыхе'), breakSel),
        h('label', { class: 'p-row', for: 'p-voice' }, h('span', null, 'Голос'), voiceSel),
        h('label', { class: 'p-row', for: 'p-unlock' }, h('span', null, 'Открыть все уровни'), unlock),
        h('div', { class: 'p-row' }, test, reset), confirmRow),
      sec('Перед поездкой',
        h('ol', { class: 'p-list' },
          h('li', null, 'Откройте игру дома с интернетом и нажмите «Поделиться → На экран „Домой“». После этого она работает в авиарежиме.'),
          h('li', null, 'iPhone: включите «Гид-доступ» (Настройки → Универсальный доступ). Тройное нажатие боковой кнопки — и ребёнок не выйдет из игры.'),
          h('li', null, 'Нет звука? Проверьте переключатель беззвучного режима сбоку телефона.'),
          h('li', null, 'Используйте детские наушники с ограничением громкости.')),
        h('h3', null, 'Что взять с собой'),
        h('div', { class: 'p-pack' }, ...G.PACK.map(([k, t, why]) => {
          const cb = h('input', { type: 'checkbox', id: 'pk-' + k, checked: S().pack[k] ? 'checked' : null });
          cb.addEventListener('change', () => { S().pack[k] = cb.checked; save(); });
          return h('label', { class: 'p-check', for: 'pk-' + k }, cb, h('span', null, h('b', null, t), h('small', null, why)));
        })),
        h('a', { class: 'p-btn wide', href: 'print.html', target: '_blank' }, '🖍️ Раскраски на бумаге — распечатать')),
      sec('Уровни и выводы', ...G.ISLANDS.map(is => h('div', { class: 'p-isl' },
        h('h3', null, is.name),
        ...is.levels.map(lv => {
          const go = h('button', { class: 'p-btn small' }, 'Играть');
          go.addEventListener('click', () => { G.audio.unlock(); playLevel(lv); });
          return h('details', { class: 'p-lv' },
            h('summary', null, h('span', { class: 'p-lv-n' }, String(lv.index + 1)), h('span', null, lv.title), isDone(lv) ? h('span', { class: 'p-ok' }, '✓') : null),
            h('p', null, h('b', null, 'Вывод: '), G.voice.lines[lv.moral].text),
            h('p', null, h('b', null, 'Задание в жизни: '), G.voice.lines[lv.real].text),
            h('p', { class: 'p-tip' }, lv.tip), go);
        })))),
      sec('Озвучка вашим голосом',
        h('p', null, `Сейчас записано ${nRec} из ${nLines} реплик. Остальные звучат синтезатором речи. Сценарий для записи — со списком всех фраз и именами файлов:`),
        h('a', { class: 'p-btn wide', href: 'script.html', target: '_blank' }, '🎙️ Открыть сценарий озвучки'))
    );
    el.append(body);
    show('parent', el);
  }

  // ---------- запуск ----------
  G.game = { playLevel, islands, island };
  function init() {
    document.addEventListener('contextmenu', e => { if (!e.target.closest('.parent')) e.preventDefault(); });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
    splash();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
