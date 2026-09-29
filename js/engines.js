'use strict';
// Игровые механики, часть 1. Каждая — async (ctx, cfg), завершается, когда уровень пройден.
(function () {
  const E = G.engines = {};
  const h = G.h;

  // ---------- Выбери правильное ----------
  E.pick = async (ctx, cfg) => {
    const R = cfg.rounds;
    for (let ri = 0; ri < R.length; ri++) {
      const rd = R[ri];
      ctx.progress(ri, R.length);
      ctx.clear();
      const wrap = h('div', { class: 'pick ' + (cfg.scene || '') });
      let showEl = null;
      if (rd.show) { showEl = G.artEl(rd.show, 'pick-show pop-in' + (rd.showCls ? ' ' + rd.showCls : '')); wrap.append(showEl); }
      const opts = h('div', { class: 'pick-opts n' + rd.options.length });
      wrap.append(opts); ctx.area.append(wrap);
      let wrongs = 0, solved = false, correctEl = null;
      const done = new Promise(resolve => {
        G.shuffle(rd.options).forEach((o, i) => {
          const el = G.artEl(o.art, 'pick-opt pop-in');
          el.style.animationDelay = i * 90 + 'ms';
          if (o.ok) correctEl = el;
          el.addEventListener('pointerdown', async e => {
            e.preventDefault();
            if (solved) return;
            if (o.sound) G.sfx.play(o.sound);
            if (o.ok) {
              solved = true; ctx.idle(null);
              el.classList.add('right'); G.fx.at(el);
              if (showEl && rd.showOk) { G.setArt(showEl, rd.showOk); showEl.classList.remove('shiver', 'dark'); }
              await ctx.cheer(rd.okSay);
              resolve();
            } else {
              wrongs++; G.wiggle(el);
              ctx.retry(o.no || rd.no);
              if (wrongs >= 2) G.pulse(correctEl);
            }
          });
          opts.append(el);
        });
      });
      ctx.idle(() => { ctx.say(rd.say); G.pulse(correctEl); });
      ctx.say(rd.say);
      await ctx.guard(done);
      await ctx.wait(350);
    }
  };

  // ---------- Перетащи в нужное место ----------
  // bins: [{id, art, style:'box'|'sil'|'plate', accepts:[tag], cap, k}], items: [{art, tag, extra, no, say, k}]
  E.sort = async (ctx, cfg) => {
    const R = cfg.rounds;
    for (let ri = 0; ri < R.length; ri++) {
      const rd = R[ri];
      ctx.progress(ri, R.length);
      ctx.clear();
      const wrap = h('div', { class: 'sort ' + (rd.layout || cfg.layout || '') });
      const binsEl = h('div', { class: 'sort-bins n' + rd.bins.length });
      const tray = h('div', { class: 'sort-tray' });
      wrap.append(binsEl, tray); ctx.area.append(wrap);
      const bins = rd.bins.map(b => {
        const style = b.style || 'box';
        const el = h('div', { class: 'bin bin-' + style });
        if (b.k) el.style.setProperty('--k', b.k);
        el.append(G.artEl(b.art, style === 'sil' ? 'sil' : 'bin-art'));
        const slot = h('div', { class: 'bin-slot' });
        el.append(slot); binsEl.append(el);
        return { el, slot, b, count: 0 };
      });
      const required = rd.items.filter(i => !i.extra).length;
      let placed = 0;
      const items = [];
      const done = new Promise(resolve => {
        G.shuffle(rd.items).forEach((it, i) => {
          const el = G.artEl(it.art, 'item pop-in');
          el.style.animationDelay = i * 70 + 'ms';
          if (it.k) el.style.setProperty('--k', it.k);
          el._it = it; items.push(el); tray.append(el);
          G.draggable(el, {
            targets: () => bins.map(b => ({ el: b.el, data: b })),
            onStart: () => { if (it.sound) G.sfx.play(it.sound); },
            onDrop: async (t, el2, d) => {
              const bin = t.data;
              const tag = it.tag || it.id;
              const ok = !it.extra && (bin.b.accepts || [bin.b.id]).includes(tag) && bin.count < (bin.b.cap || 99);
              if (!ok) { G.wiggle(bin.el); ctx.retry(it.no || rd.no || cfg.no); return false; }
              bin.count++; placed++;
              el.classList.add('locked');
              const st = bin.b.style || 'box';
              if (st === 'sil' || st === 'plate') {
                await G.flyTo(el, bin.slot, d.dx, d.dy, 1);
                G.keepSpot(el);
                el.style.transition = 'none'; el.style.transform = '';
                el.classList.add('placed'); el.classList.remove('pop-in');
                bin.slot.append(el);
              } else {
                await G.flyTo(el, bin.el, d.dx, d.dy, 0.3);
                G.keepSpot(el);
                el.remove();
                bin.slot.append(G.artEl(it.art, 'mini'));
                bin.el.classList.remove('gulp'); void bin.el.offsetWidth; bin.el.classList.add('gulp');
              }
              if (it.sound) {
                // инструмент на своём месте звучит и дальше — по нажатию
                G.sfx.play(it.sound); G.fx.at(bin.el, 6, ['🎵', '🎶', '✨']);
                bin.el.addEventListener('pointerdown', () => { G.sfx.play(it.sound); G.wiggle(bin.el); });
              } else { G.sfx.ok(); G.fx.at(bin.el, 6); }
              if (placed >= required) resolve();
              else if (it.say) ctx.say(it.say);
              else if (Math.random() < 0.4) ctx.praise();
              return true;
            }
          });
        });
      });
      ctx.idle(() => {
        ctx.say(rd.say);
        const next = items.find(el => el.isConnected && !el.classList.contains('locked') && !el._it.extra);
        G.pulse(next);
      });
      ctx.say(rd.say);
      await ctx.guard(done);
      ctx.idle(null);
      await ctx.wait(600);
      const sounds = rd.items.filter(i => i.sound).map(i => i.sound.replace('inst:', ''));
      if (rd.finale === 'band' && sounds.length) {
        // весь оркестр играет вместе
        const bg = G.music.cur;
        if (bg) G.music.stop();
        binsEl.classList.add('playing');
        const len = G.inst.band(sounds);
        G.fx.at(binsEl, 16, ['🎵', '🎶', '⭐']);
        await ctx.wait(len * 1000 + 300);
        binsEl.classList.remove('playing');
        if (bg) G.music.play(bg);
      }
      await ctx.cheer(rd.okSay);
      await ctx.wait(300);
    }
  };

  // ---------- Посчитай ----------
  function scatter(n) {
    const cols = n <= 3 ? n : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ r, c });
    return G.shuffle(cells).slice(0, n).map(({ r, c }) => ({
      x: (c + 0.5) / cols * 100 + G.rand(-6, 6) / cols,
      y: (r + 0.5) / rows * 100 + G.rand(-8, 8) / rows
    }));
  }
  E.count = async (ctx, cfg) => {
    const R = cfg.rounds;
    for (let ri = 0; ri < R.length; ri++) {
      const rd = R[ri];
      ctx.progress(ri, R.length);
      ctx.clear();
      const field = h('div', { class: 'count-field ' + (rd.bg || '') });
      ctx.area.append(field);
      let c = 0;
      const els = [];
      const done = new Promise(resolve => {
        scatter(rd.n).forEach((p, i) => {
          const el = G.artEl(rd.art, 'count-item pop-in');
          el.style.left = p.x + '%'; el.style.top = p.y + '%';
          el.style.animationDelay = i * 110 + 'ms';
          el.addEventListener('pointerdown', e => {
            e.preventDefault();
            if (el.dataset.n) return;
            c++; el.dataset.n = c;
            el.append(h('b', { class: 'num' }, String(c)));
            el.classList.add('counted');
            G.sfx.note(c - 1); G.fx.at(el, 5);
            ctx.say('n' + c);
            if (c === rd.n) resolve();
          });
          els.push(el); field.append(el);
        });
      });
      ctx.idle(() => { ctx.say(rd.say); G.pulse(els.find(e => !e.dataset.n)); });
      ctx.say(rd.say);
      await ctx.guard(done);
      ctx.idle(null);
      await ctx.wait(900);
      const big = h('div', { class: 'count-big pop-in' }, String(rd.n));
      field.append(big);
      G.sfx.success();
      await ctx.say(rd.total);
      await ctx.wait(500);
    }
  };

  // ---------- Пазл ----------
  const GRID = { 2: [2, 1], 3: [3, 1], 4: [2, 2], 6: [3, 2] };
  E.puzzle = async (ctx, cfg) => {
    const R = cfg.rounds;
    for (let ri = 0; ri < R.length; ri++) {
      const rd = R[ri];
      ctx.progress(ri, R.length);
      ctx.clear();
      const [cols, rows] = GRID[rd.n];
      const inner = G.A.pics[rd.pic]();
      const wrap = h('div', { class: 'puzzle' });
      const frame = h('div', { class: 'pz-frame' });
      frame.append(G.artEl(G.A.svg('0 0 300 300', inner), 'pz-guide'));
      const tray = h('div', { class: 'pz-tray' });
      wrap.append(frame, tray); ctx.area.append(wrap);
      const pw = 300 / cols, ph = 300 / rows;
      const slots = [], pieces = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const s = h('div', { class: 'pz-slot' });
        Object.assign(s.style, { left: c / cols * 100 + '%', top: r / rows * 100 + '%', width: 100 / cols + '%', height: 100 / rows + '%' });
        s._i = slots.length; slots.push(s); frame.append(s);
        const p = G.artEl(`<svg viewBox="${c * pw} ${r * ph} ${pw} ${ph}" preserveAspectRatio="none">${inner}</svg>`, 'pz-piece');
        p._i = pieces.length; pieces.push(p);
      }
      const sizeTray = () => {
        const fw = frame.getBoundingClientRect().width;
        if (!fw) return;
        pieces.forEach(p => { if (!p.classList.contains('placed')) { p.style.width = fw / cols * 0.84 + 'px'; p.style.height = fw / rows * 0.84 + 'px'; } });
      };
      G.shuffle(pieces).forEach((p, i) => { p.classList.add('pop-in'); p.style.animationDelay = i * 90 + 'ms'; tray.append(p); });
      sizeTray();
      const ro = new ResizeObserver(sizeTray); ro.observe(frame); ctx.cleanup(() => ro.disconnect());
      let placed = 0;
      const done = new Promise(resolve => {
        pieces.forEach(p => G.draggable(p, {
          targets: () => slots.filter(s => !s.firstChild).map(s => ({ el: s, data: s })),
          onDrop: async (t, el, d) => {
            if (t.data._i !== p._i) { ctx.retry(cfg.no); return false; }
            p.classList.add('locked');
            await G.flyTo(p, t.el, d.dx, d.dy, 1 / 0.84);
            G.keepSpot(p);
            p.style.transition = 'none'; p.style.transform = ''; p.style.width = ''; p.style.height = '';
            p.classList.add('placed'); p.classList.remove('pop-in');
            t.el.append(p);
            G.sfx.ok(); G.fx.at(t.el, 5);
            placed++;
            if (placed === pieces.length) resolve(); else if (Math.random() < 0.4) ctx.praise();
            return true;
          }
        }));
      });
      ctx.idle(() => {
        ctx.say(rd.say);
        const p = pieces.find(x => !x.classList.contains('placed'));
        if (p) { G.pulse(p); G.pulse(slots[p._i]); }
      });
      ctx.say(rd.say);
      await ctx.guard(done);
      ctx.idle(null);
      frame.classList.add('complete');
      await ctx.wait(400);
      await ctx.cheer(rd.okSay);
      await ctx.wait(500);
    }
  };

  // ---------- Раскраска ----------
  const PALETTE = [['#ff4d4d', 'col_red'], ['#ff9f1c', 'col_orange'], ['#ffd23f', 'col_yellow'], ['#5fd068', 'col_green'], ['#4d96ff', 'col_blue'], ['#b86bff', 'col_purple'], ['#ff7eb6', 'col_pink'], ['#9a6b45', 'col_brown']];
  E.color = async (ctx, cfg) => {
    const R = cfg.rounds;
    for (let ri = 0; ri < R.length; ri++) {
      const rd = R[ri];
      ctx.progress(ri, R.length);
      ctx.clear();
      const pic = G.A.COLORING[rd.pic];
      const wrap = h('div', { class: 'coloring' });
      const [, , vw, vh] = pic.vb.split(' ').map(Number);
      const paper = h('div', { class: 'paper', html: G.A.svg(pic.vb, pic.body()), style: { '--ar': (vw / vh).toFixed(3) } });
      const pal = h('div', { class: 'palette' });
      wrap.append(paper, pal); ctx.area.append(wrap);
      let cur = PALETTE[0][0];
      const btns = PALETTE.map(([col, line], i) => {
        const b = h('button', { class: 'crayon' + (i === 0 ? ' sel' : ''), style: { '--c': col }, 'aria-label': 'цвет' });
        b.addEventListener('pointerdown', e => {
          e.preventDefault(); cur = col;
          btns.forEach(x => x.classList.remove('sel')); b.classList.add('sel');
          G.sfx.pick(); ctx.say(line);
        });
        pal.append(b); return b;
      });
      const groups = new Set(G.$$('.rg', paper).map(e => e.dataset.g));
      const filled = new Set();
      const done = new Promise(resolve => {
        G.$$('.rg', paper).forEach(r => r.addEventListener('pointerdown', e => {
          e.preventDefault();
          const g = r.dataset.g;
          G.$$(`.rg[data-g="${g}"]`, paper).forEach(x => x.setAttribute('fill', cur));
          G.sfx.pop(); G.fx.burst(e.clientX, e.clientY, 5, ['✨', '⭐']);
          filled.add(g);
          if (filled.size === groups.size) resolve();
        }));
      });
      ctx.idle(() => {
        ctx.say(rd.say);
        const g = [...groups].find(x => !filled.has(x));
        if (g) G.$$(`.rg[data-g="${g}"]`, paper).forEach(x => { x.classList.remove('hint-svg'); void x.getBoundingClientRect(); x.classList.add('hint-svg'); setTimeout(() => x.classList.remove('hint-svg'), 2400); });
      });
      await ctx.say(rd.say);
      await ctx.guard(done);
      ctx.idle(null);
      await ctx.wait(700);
      paper.classList.add('complete');
      await ctx.cheer(rd.okSay);
      await ctx.wait(800);
    }
  };

  // ---------- Протри / помой ----------
  E.rub = async (ctx, cfg) => {
    const R = cfg.rounds;
    for (let ri = 0; ri < R.length; ri++) {
      const rd = R[ri];
      ctx.progress(ri, R.length);
      ctx.clear();
      const wrap = h('div', { class: 'rub' });
      const stage = h('div', { class: 'rub-stage', html: G.A.rub[rd.under]() });
      const cv = h('canvas', { class: 'rub-cv' });
      stage.append(cv); wrap.append(stage); ctx.area.append(wrap);
      await ctx.wait(60);
      const sr = stage.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(sr.width * dpr); cv.height = Math.round(sr.height * dpr);
      const c2 = cv.getContext('2d');
      c2.scale(dpr, dpr);
      const areas = G.$$('.dirty', stage).map(el => { const r = el.getBoundingClientRect(); return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height }; });
      // рисуем грязь
      if (rd.layer === 'fog') {
        c2.fillStyle = 'rgba(232,240,248,.97)';
        areas.forEach(a => { c2.beginPath(); c2.roundRect ? c2.roundRect(a.x, a.y, a.w, a.h, Math.min(a.w, a.h) * 0.3) : c2.rect(a.x, a.y, a.w, a.h); c2.fill(); });
        for (let i = 0; i < 40; i++) {
          const a = G.pick(areas);
          c2.fillStyle = `rgba(200,215,230,${G.rand(0.3, 0.7)})`;
          c2.beginPath(); c2.arc(a.x + G.rand(0.1, 0.9) * a.w, a.y + G.rand(0.1, 0.9) * a.h, G.rand(3, 9), 0, 7); c2.fill();
        }
      } else {
        const cols = rd.layer === 'mud' ? ['#7a4b22', '#8b5a2b', '#6b3f1a'] : ['#e3c24a', '#d9b63a', '#ecd26b'];
        areas.forEach(a => {
          const n = Math.max(3, Math.round(a.w * a.h / 1400));
          for (let i = 0; i < n; i++) {
            c2.fillStyle = G.pick(cols);
            c2.globalAlpha = G.rand(0.85, 1);
            c2.beginPath();
            c2.ellipse(a.x + G.rand(0.15, 0.85) * a.w, a.y + G.rand(0.15, 0.85) * a.h, G.rand(0.12, 0.3) * a.w, G.rand(0.12, 0.3) * a.h, G.rand(0, 3), 0, 7);
            c2.fill();
          }
        });
        c2.globalAlpha = 1;
      }
      // сетка покрытия
      const CS = 10, gw = Math.ceil(sr.width / CS), gh = Math.ceil(sr.height / CS);
      const img = c2.getImageData(0, 0, cv.width, cv.height).data;
      const dirty = new Set();
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        const px = Math.min(cv.width - 1, Math.round((x * CS + CS / 2) * dpr)), py = Math.min(cv.height - 1, Math.round((y * CS + CS / 2) * dpr));
        if (img[(py * cv.width + px) * 4 + 3] > 60) dirty.add(y * gw + x);
      }
      const total = dirty.size || 1;
      const R0 = rd.layer === 'fog' ? 30 : 26;
      let last = null, moves = 0, finished = false;
      const done = new Promise(resolve => {
        const erase = (x, y) => {
          c2.globalCompositeOperation = 'destination-out';
          c2.lineCap = 'round'; c2.lineWidth = R0 * 2;
          c2.beginPath();
          if (last) { c2.moveTo(last.x, last.y); c2.lineTo(x, y); c2.stroke(); }
          c2.arc(x, y, R0, 0, 7); c2.fill();
          c2.globalCompositeOperation = 'source-over';
          const pts = last ? [last, { x: (last.x + x) / 2, y: (last.y + y) / 2 }, { x, y }] : [{ x, y }];
          for (const p of pts) {
            const r = Math.ceil(R0 / CS);
            const cx = Math.floor(p.x / CS), cy = Math.floor(p.y / CS);
            for (let yy = cy - r; yy <= cy + r; yy++) for (let xx = cx - r; xx <= cx + r; xx++) {
              if (Math.hypot((xx + 0.5) * CS - p.x, (yy + 0.5) * CS - p.y) <= R0) dirty.delete(yy * gw + xx);
            }
          }
          last = { x, y };
          G.sfx.scrub();
          if (rd.layer !== 'fog' && Math.random() < 0.25) {
            const b = h('div', { class: 'foam' }); b.style.left = x + 'px'; b.style.top = y + 'px';
            b.style.setProperty('--dx', G.rand(-30, 30) + 'px'); stage.append(b); setTimeout(() => b.remove(), 900);
          }
          if (++moves % 6 === 0 && !finished && dirty.size / total < 0.1) { finished = true; resolve(); }
        };
        const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (sr.width / r.width), y: (e.clientY - r.top) * (sr.height / r.height) }; };
        let down = false;
        cv.addEventListener('pointerdown', e => { e.preventDefault(); down = true; last = null; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } const p = pos(e); erase(p.x, p.y); });
        cv.addEventListener('pointermove', e => { if (!down) return; const p = pos(e); erase(p.x, p.y); });
        const up = () => { down = false; last = null; };
        cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      });
      ctx.idle(() => { ctx.say(rd.say); G.pulse(stage); });
      ctx.say(rd.say);
      await ctx.guard(done);
      ctx.idle(null);
      cv.classList.add('gone');
      G.fx.at(stage, 14);
      await ctx.wait(500);
      await ctx.cheer(rd.okSay);
      await ctx.wait(500);
    }
  };

  // ---------- Найди пару (мемори) ----------
  E.memory = async (ctx, cfg) => {
    const R = cfg.rounds;
    for (let ri = 0; ri < R.length; ri++) {
      const rd = R[ri];
      ctx.progress(ri, R.length);
      ctx.clear();
      const cards = G.shuffle(rd.pairs.flatMap((a, i) => [{ a, i }, { a, i }]));
      const grid = h('div', { class: 'memory n' + cards.length });
      ctx.area.append(grid);
      const els = cards.map((cd, k) => {
        const el = h('div', { class: 'card open pop-in', style: { animationDelay: k * 60 + 'ms' } },
          h('div', { class: 'card-in' }, G.artEl(cd.a, 'face front'), h('div', { class: 'face back' })));
        el._c = cd; grid.append(el); return el;
      });
      await ctx.say(rd.say);
      await ctx.wait(1200);
      els.forEach(e => e.classList.remove('open')); G.sfx.flip();
      let open = [], lock = false, matched = 0;
      const done = new Promise(resolve => {
        els.forEach(el => el.addEventListener('pointerdown', async e => {
          e.preventDefault();
          if (lock || el.classList.contains('open')) return;
          el.classList.add('open'); G.sfx.flip(); open.push(el);
          if (open.length < 2) return;
          lock = true;
          const [a, b] = open; open = [];
          if (a._c.i === b._c.i) {
            await G.sleep(350);
            a.classList.add('matched'); b.classList.add('matched');
            G.sfx.ok(); G.fx.at(a, 5); G.fx.at(b, 5);
            matched++; lock = false;
            if (matched === rd.pairs.length) resolve(); else ctx.praise();
          } else {
            await G.sleep(1100);
            a.classList.remove('open'); b.classList.remove('open'); G.sfx.flip();
            lock = false;
          }
        }));
      });
      ctx.idle(() => { ctx.say(rd.say); const c = els.find(e => !e.classList.contains('matched')); G.pulse(c); });
      await ctx.guard(done);
      ctx.idle(null);
      await ctx.wait(400);
      await ctx.cheer(rd.okSay);
      await ctx.wait(400);
    }
  };
})();
