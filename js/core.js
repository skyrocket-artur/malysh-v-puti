'use strict';
// Ядро: утилиты, события, сохранение, перетаскивание, эффекты.
const G = window.G = {};

G.$ = (s, r = document) => r.querySelector(s);
G.$$ = (s, r = document) => [...r.querySelectorAll(s)];
G.h = function (tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') { for (const p in v) { if (p.startsWith('--')) el.style.setProperty(p, v[p]); else el.style[p] = v[p]; } }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};
G.sleep = ms => new Promise(r => setTimeout(r, ms));
G.rand = (a, b) => a + Math.random() * (b - a);
G.pick = arr => arr[Math.floor(Math.random() * arr.length)];
G.shuffle = arr => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
G.center = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };

// --- события ---
const handlers = {};
G.on = (ev, fn) => { (handlers[ev] ||= []).push(fn); return () => { handlers[ev] = handlers[ev].filter(f => f !== fn); }; };
G.emit = (ev, data) => { (handlers[ev] || []).slice().forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); };

// --- сохранение ---
G.store = {
  key: 'malysh.v1',
  data: null,
  load() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { d = {}; }
    d.done ||= {}; d.real ||= {}; d.pack ||= {};
    d.settings = Object.assign({ music: 0.35, sfx: 0.8, breakMin: 20, unlockAll: false, voiceMode: 'auto' }, d.settings || {});
    this.data = d;
    return d;
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* приватный режим */ } },
  get s() { return this.data.settings; }
};
G.store.load();

// --- картинки: эмодзи или svg-строка ---
G.artEl = (art, cls = '') => {
  const d = G.h('div', { class: 'art ' + cls });
  G.setArt(d, art);
  return d;
};
G.setArt = (d, art) => {
  art = String(art);
  if (art.trim().startsWith('<')) { d.classList.remove('emo'); d.innerHTML = art; }
  else { d.classList.add('emo'); d.innerHTML = ''; d.append(G.h('span', null, art)); }
};

// --- подсказка-пульсация ---
G.pulse = (el, ms = 2400) => {
  if (!el || !el.isConnected) return;
  el.classList.remove('hint'); void el.offsetWidth; el.classList.add('hint');
  clearTimeout(el._hintT); el._hintT = setTimeout(() => el.classList.remove('hint'), ms);
};
G.wiggle = el => { el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); setTimeout(() => el.classList.remove('wiggle'), 520); };

// --- перетаскивание ---
// opts: targets() -> [{el, data}], onDrop(target, el, {dx,dy}) -> bool|Promise<bool>, canDrag()
G.draggable = function (el, opts) {
  let id = null, sx = 0, sy = 0, dx = 0, dy = 0;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => {
    if (id !== null || el.classList.contains('locked') || (opts.canDrag && !opts.canDrag())) return;
    e.preventDefault();
    id = e.pointerId;
    try { el.setPointerCapture(id); } catch (err) { /* ok */ }
    sx = e.clientX; sy = e.clientY; dx = dy = 0;
    el.classList.remove('hint', 'wiggle', 'pop-in');
    el.classList.add('dragging');
    el.style.transition = 'none';
    el.style.transform = 'scale(1.12)';
    G.sfx.pick();
    opts.onStart && opts.onStart(el);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    el.style.transform = `translate(${dx}px,${dy}px) scale(1.12)`;
  });
  const end = async e => {
    if (e.pointerId !== id) return;
    id = null;
    el.classList.remove('dragging');
    const c = G.center(el);
    let best = null, bestD = Infinity;
    for (const t of opts.targets()) {
      const tr = t.el.getBoundingClientRect();
      const pad = Math.max(24, Math.min(tr.width, tr.height) * 0.3);
      if (c.x > tr.left - pad && c.x < tr.right + pad && c.y > tr.top - pad && c.y < tr.bottom + pad) {
        const d = Math.hypot(c.x - (tr.left + tr.width / 2), c.y - (tr.top + tr.height / 2));
        if (d < bestD) { bestD = d; best = t; }
      }
    }
    let ok = false;
    if (best) ok = await opts.onDrop(best, el, { dx, dy });
    else if (opts.onMiss) opts.onMiss(el, { dx, dy });
    if (!ok && el.isConnected) {
      el.style.transition = 'transform .4s cubic-bezier(.3,1.5,.5,1)';
      el.style.transform = '';
    }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
};

// Оставить на месте предмета невидимую заглушку, чтобы остальные не «прыгали».
G.keepSpot = el => {
  const ph = G.h('div', { class: 'spot', style: { width: el.offsetWidth + 'px', height: el.offsetHeight + 'px' } });
  el.before(ph);
  return ph;
};

// Анимировать перетаскиваемый элемент в центр цели.
G.flyTo = (el, to, dx, dy, scale = 1, ms = 280) => new Promise(res => {
  const a = G.center(el), b = G.center(to);
  el.style.transition = `transform ${ms}ms ease-out`;
  el.style.transform = `translate(${dx + b.x - a.x}px,${dy + b.y - a.y}px) scale(${scale})`;
  setTimeout(res, ms + 20);
});

// --- кнопка «удерживай» (для родителей и выхода) ---
G.holdButton = (el, ms, onDone) => {
  let t0 = 0, raf = 0, pid = null;
  el.style.touchAction = 'none';
  const tick = () => {
    const p = Math.min(1, (performance.now() - t0) / ms);
    el.style.setProperty('--p', p);
    if (p >= 1) { stop(); G.sfx.ok(); onDone(); return; }
    raf = requestAnimationFrame(tick);
  };
  const stop = () => { cancelAnimationFrame(raf); pid = null; el.classList.remove('holding'); el.style.setProperty('--p', 0); };
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    pid = e.pointerId; t0 = performance.now(); el.classList.add('holding');
    try { el.setPointerCapture(pid); } catch (err) { /* ok */ }
    raf = requestAnimationFrame(tick);
  });
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointercancel', stop);
  el.addEventListener('contextmenu', e => e.preventDefault());
};

// --- эффекты ---
G.fx = {
  layer() { return G.$('#fx'); },
  burst(x, y, n = 10, items = ['⭐', '✨', '💫', '🌟']) {
    const L = this.layer(); if (!L) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = G.rand(50, 130);
      const p = G.h('div', { class: 'pt' }, G.pick(items));
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.setProperty('--dx', Math.cos(a) * d + 'px');
      p.style.setProperty('--dy', Math.sin(a) * d + 'px');
      p.style.setProperty('--r', G.rand(-200, 200) + 'deg');
      p.style.fontSize = G.rand(18, 34) + 'px';
      L.append(p);
      setTimeout(() => p.remove(), 900);
    }
  },
  at(el, n, items) { if (!el || !el.isConnected) return; const c = G.center(el); this.burst(c.x, c.y, n, items); },
  confetti(n = 70) {
    const L = this.layer(); if (!L) return;
    const cols = ['#ff5a5f', '#ffb400', '#ffe14d', '#41d17a', '#3fa7ff', '#b774ff', '#ff7eb6'];
    for (let i = 0; i < n; i++) {
      const p = G.h('div', { class: 'cf' });
      p.style.left = G.rand(0, 100) + 'vw';
      p.style.background = G.pick(cols);
      p.style.setProperty('--dx', G.rand(-80, 80) + 'px');
      p.style.animationDelay = G.rand(0, 0.6) + 's';
      p.style.animationDuration = G.rand(1.8, 3) + 's';
      p.style.width = G.rand(8, 14) + 'px'; p.style.height = G.rand(10, 18) + 'px';
      L.append(p);
      setTimeout(() => p.remove(), 3800);
    }
  }
};
