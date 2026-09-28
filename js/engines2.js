'use strict';
// Игровые механики, часть 2.
(function () {
  const E = G.engines, h = G.h, A = G.A;

  // ---------- Пирамидка ----------
  const RING = ['#ff5a5f', '#ff9f1c', '#ffd23f', '#5fd068', '#4d96ff', '#b86bff'];
  E.pyramid = async (ctx, cfg) => {
    const R = cfg.rounds;
    for (let ri = 0; ri < R.length; ri++) {
      const rd = R[ri], n = rd.n;
      ctx.progress(ri, R.length);
      ctx.clear();
      const wrap = h('div', { class: 'pyr' });
      const stand = h('div', { class: 'pyr-stand' }, h('div', { class: 'pyr-pole' }), h('div', { class: 'pyr-base' }));
      const stack = h('div', { class: 'pyr-stack' });
      stand.append(stack);
      stand.style.setProperty('--n', n);
      const tray = h('div', { class: 'pyr-tray' });
      wrap.append(stand, tray); ctx.area.append(wrap);
      const rings = [];
      for (let k = 0; k < n; k++) {
        const f = 1 - k * (0.55 / (n - 1));
        const el = h('div', { class: 'ring pop-in', style: { '--f': f, '--c': RING[k] } });
        el._k = k; rings.push(el);
      }
      G.shuffle(rings).forEach((el, i) => { el.style.animationDelay = i * 80 + 'ms'; tray.append(el); });
      let next = 0;
      const done = new Promise(resolve => {
        rings.forEach(el => G.draggable(el, {
          targets: () => [{ el: stand }],
          onDrop: async (t, _e, d) => {
            if (el._k !== next) { ctx.retry(cfg.no); G.pulse(rings[next]); return false; }
            el.classList.add('locked');
            const ph = h('div', { class: 'ring ph', style: { '--f': el.style.getPropertyValue('--f') } });
            stack.append(ph);
            await G.flyTo(el, ph, d.dx, d.dy, 1);
            G.keepSpot(el);
            el.style.transition = 'none'; el.style.transform = ''; el.classList.remove('pop-in');
            ph.replaceWith(el);
            G.sfx.note(next);
            next++;
            if (next === n) resolve(); else if (Math.random() < 0.35) ctx.praise();
            return true;
          }
        }));
      });
      ctx.idle(() => { ctx.say(rd.say); G.pulse(rings[next]); });
      ctx.say(rd.say);
      await ctx.guard(done);
      ctx.idle(null);
      const cap = h('div', { class: 'pyr-cap pop-in' }); stack.append(cap);
      for (let k = 0; k < n; k++) { rings[k].classList.add('sing'); G.sfx.note(k); await ctx.wait(160); rings[k].classList.remove('sing'); }
      G.fx.at(stand, 12);
      await ctx.cheer(rd.okSay);
      await ctx.wait(400);
    }
  };

  // ---------- Повтори мелодию ----------
  E.simon = async (ctx, cfg) => {
    ctx.clear();
    const wrap = h('div', { class: 'simon' });
    const frog = G.artEl(A.char('frog', 'happy'), 'simon-frog');
    const grid = h('div', { class: 'pads' });
    const COLS = ['#ff5a5f', '#4d96ff', '#ffd23f', '#5fd068'];
    const pads = COLS.map((c, i) => { const p = G.artEl(A.drum(c), 'pad'); p._i = i; grid.append(p); return p; });
    wrap.append(frog, grid); ctx.area.append(wrap);
    let onPad = null;
    const flash = i => {
      const p = pads[i];
      p.classList.remove('lit'); void p.offsetWidth; p.classList.add('lit');
      setTimeout(() => p.classList.remove('lit'), 380);
      G.sfx.pad(i);
      frog.classList.remove('hop'); void frog.offsetWidth; frog.classList.add('hop');
    };
    pads.forEach(p => p.addEventListener('pointerdown', e => { e.preventDefault(); flash(p._i); if (onPad) onPad(p._i); }));
    const S = cfg.seqs;
    for (let si = 0; si < S.length; si++) {
      const seq = S[si];
      ctx.progress(si, S.length);
      let ok = false, hint = false, nextPad = null;
      while (!ok) {
        onPad = null;
        await ctx.say(cfg.listen);
        await ctx.wait(300);
        for (const i of seq) { flash(i); await ctx.wait(720); }
        ctx.say(cfg.you);
        ok = await ctx.guard(new Promise(res => {
          let pos = 0;
          nextPad = pads[seq[0]];
          if (hint) G.pulse(nextPad);
          onPad = i => {
            if (i === seq[pos]) {
              pos++;
              if (pos === seq.length) { onPad = null; res(true); }
              else { nextPad = pads[seq[pos]]; if (hint) G.pulse(nextPad); }
            } else { onPad = null; res(false); }
          };
        }));
        if (!ok) { await ctx.wait(300); G.sfx.wrong(); await ctx.say(cfg.again); hint = true; }
      }
      ctx.idle(null);
      await ctx.wait(350);
      G.fx.at(frog, 8, ['🎵', '🎶', '⭐']);
      await (si === S.length - 1 ? ctx.cheer(cfg.okSay) : ctx.praise());
      await ctx.wait(300);
    }
  };

  // ---------- Танцуй — замри ----------
  E.freeze = async (ctx, cfg) => {
    ctx.clear();
    const stage = h('div', { class: 'freeze' });
    const lights = h('div', { class: 'lights' }, ...[0, 1, 2, 3, 4].map(i => h('i', { style: { '--i': i } })));
    const frog = G.artEl(A.char('frog', 'happy'), 'dancer');
    const hand = h('div', { class: 'tap-hint' }, '👆');
    stage.append(lights, frog, hand); ctx.area.append(stage);
    let state = 'idle', oops = 0;
    ctx.cleanup(() => G.music.stop());
    stage.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (state === 'dance') {
        frog.classList.remove('hop'); void frog.offsetWidth; frog.classList.add('hop');
        G.fx.burst(e.clientX, e.clientY, 5, ['🎵', '🎶', '⭐', '✨']);
        hand.classList.add('hide');
      } else if (state === 'freeze') {
        oops++;
        G.wiggle(frog);
        if (oops === 1) ctx.say(cfg.oops);
      }
    });
    const N = cfg.cycles || 4;
    for (let c = 0; c < N; c++) {
      ctx.progress(c, N);
      await ctx.say(cfg.dance);
      state = 'dance'; stage.classList.add('on'); frog.classList.add('dancing');
      G.music.play('dance');
      await ctx.wait(G.rand(4500, 7000));
      G.music.stop();
      state = 'freeze'; oops = 0;
      stage.classList.remove('on'); frog.classList.remove('dancing'); frog.classList.add('frozen');
      await ctx.say(cfg.freeze);
      await ctx.wait(2600);
      frog.classList.remove('frozen'); state = 'idle';
      if (!oops) { G.sfx.ok(); G.fx.at(frog, 8); await ctx.say(cfg.good); }
    }
    await ctx.cheer(cfg.okSay);
  };

  // ---------- Пристегни котят ----------
  const seatSvg = (scene, kit, on) => {
    const plane = scene === 'plane';
    const c1 = plane ? '#4d7fd6' : '#ff6b6b', c2 = plane ? '#3561a8' : '#c94a4f', c3 = plane ? '#3f6fc4' : '#e85a60';
    const belt = on
      ? `<path d="M14 126 Q70 158 126 126" fill="none" stroke="${plane ? '#ffd23f' : '#3b2f4a'}" stroke-width="12" stroke-linecap="round"/><rect x="58" y="134" width="24" height="16" rx="4" fill="#e3e8ef" stroke="#8a93a3" stroke-width="3"/>`
      : `<path d="M14 118 L20 158" stroke="#8a93a3" stroke-width="10" stroke-linecap="round"/><path d="M126 118 L120 158" stroke="#8a93a3" stroke-width="10" stroke-linecap="round"/><rect x="12" y="152" width="18" height="12" rx="3" fill="#e3e8ef" stroke="#8a93a3" stroke-width="3"/><rect x="110" y="152" width="18" height="12" rx="3" fill="#e3e8ef" stroke="#8a93a3" stroke-width="3"/>`;
    return A.svg('0 0 140 178', `<rect x="12" y="4" width="116" height="164" rx="28" fill="${c1}" stroke="${c2}" stroke-width="4"/>
      ${plane ? `<rect x="28" y="12" width="84" height="30" rx="12" fill="#e8f0ff"/>` : `<path d="M4 40 Q4 20 20 18 L20 120 Z" fill="${c3}"/><path d="M136 40 Q136 20 120 18 L120 120 Z" fill="${c3}"/>`}
      <g transform="translate(10 36) scale(.6)">${A.K[kit](on ? 'happy' : 'wow')}</g>
      <rect x="4" y="150" width="132" height="26" rx="12" fill="${c3}" stroke="${c2}" stroke-width="4"/>${belt}`);
  };
  E.buckle = async (ctx, cfg) => {
    const R = cfg.rounds;
    for (let ri = 0; ri < R.length; ri++) {
      const rd = R[ri];
      ctx.progress(ri, R.length);
      ctx.clear();
      const row = h('div', { class: 'seats ' + rd.scene });
      ctx.area.append(row);
      let n = 0;
      const seats = [];
      const done = new Promise(resolve => {
        ['bublik', 'iriska', 'ponchik'].forEach((k, i) => {
          const s = h('div', { class: 'seat pop-in', style: { animationDelay: i * 120 + 'ms' }, html: seatSvg(rd.scene, k, false) });
          s.append(h('div', { class: 'belt-hint' }));
          s.addEventListener('pointerdown', e => {
            e.preventDefault();
            if (s._on) return;
            s._on = true; s.innerHTML = seatSvg(rd.scene, k, true); s.classList.add('on');
            G.sfx.click(); G.fx.at(s, 6);
            n++;
            if (n === 3) resolve(); else ctx.praise();
          });
          seats.push(s); row.append(s);
        });
      });
      ctx.idle(() => { ctx.say(rd.say); G.pulse(seats.find(s => !s._on)); });
      ctx.say(rd.say);
      await ctx.guard(done);
      ctx.idle(null);
      await ctx.wait(400);
      await ctx.cheer(rd.okSay);
      await ctx.wait(400);
    }
  };

  // ---------- Лопай пузыри ----------
  E.bubbles = async (ctx, cfg) => {
    ctx.clear();
    ctx.progress(0, 1);
    const need = cfg.n || 12;
    const field = h('div', { class: 'bub-field' });
    const meter = h('div', { class: 'bub-meter' }, ...Array.from({ length: need }, () => h('i', null, '♪')));
    field.append(meter); ctx.area.append(field);
    let count = 0, k = 0, stop = false;
    const done = new Promise(resolve => {
      const spawn = () => {
        if (stop) return;
        const s = G.rand(15, 23);
        const b = h('div', { class: 'bubble', style: { '--s': s + 'vmin', left: G.rand(2, 98 - s * 0.9) + '%', '--dur': G.rand(5.5, 7.5) + 's', '--hue': Math.round(G.rand(0, 360)) } },
          h('span', null, G.pick(['🎵', '🎶', '⭐', '🐟', '🦋'])));
        b.addEventListener('pointerdown', e => {
          e.preventDefault();
          if (b._p) return; b._p = true;
          G.sfx.note(k++); G.fx.at(b, 6, ['✨', '💧', '⭐']);
          b.classList.add('popped'); setTimeout(() => b.remove(), 260);
          if (count < need) meter.children[count].classList.add('on');
          count++;
          if (count === need) resolve();
        });
        b.addEventListener('animationend', ev => { if (ev.target === b) b.remove(); });
        field.append(b);
      };
      spawn(); setTimeout(spawn, 350);
      const iv = ctx.interval(spawn, 700);
      ctx.cleanup(() => clearInterval(iv));
    });
    ctx.idle(() => { ctx.say(cfg.say); G.pulse(field.querySelector('.bubble:not(.popped)')); });
    ctx.say(cfg.say);
    await ctx.guard(done);
    stop = true; ctx.idle(null);
    G.$$('.bubble', field).forEach(b => b.classList.add('fade'));
    await ctx.wait(500);
    await ctx.cheer(cfg.okSay);
  };

  // ---------- Веди по дорожке ----------
  const VEH = {
    car: { g: () => A.carG('#ff5a5f'), s: 0.44, ox: -86, oy: -60 },
    boat: { g: () => A.boatG(), s: 0.55, ox: -62, oy: -70 },
    plane: { g: () => A.planeG('#ff6b6b'), s: 0.34, ox: -120, oy: -60 }
  };
  E.trace = async (ctx, cfg) => {
    const R = cfg.rounds;
    for (let ri = 0; ri < R.length; ri++) {
      const rd = R[ri];
      ctx.progress(ri, R.length);
      ctx.clear();
      const v = VEH[rd.vehicle];
      const road = rd.water ? '#5bb8ff' : '#d8c9b0', edge = rd.water ? '#3f9be6' : '#b9a78a';
      const deco = (rd.deco || []).map(d => A.emo(d[0], d[1], d[2], d[3])).join('');
      const wrap = h('div', {
        class: 'trace', html: `<svg viewBox="0 0 400 400" class="trace-svg" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" rx="30" fill="${rd.water ? '#a8e6a1' : '#bdf0a0'}"/>${deco}
        <path d="${rd.path}" fill="none" stroke="${edge}" stroke-width="62" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="road" d="${rd.path}" fill="none" stroke="${road}" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${rd.path}" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="12 16" stroke-linecap="round" opacity=".9"/>
        <path class="prog" d="${rd.path}" fill="none" stroke="#ffd23f" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
        <g class="goal">${A.emo(rd.goal, 0, 0, 70)}</g>
        <g class="veh"><g transform="scale(${v.s}) translate(${v.ox} ${v.oy})">${v.g()}</g></g>
        <g class="finger">${A.emo('👆', 0, 0, 50)}</g></svg>`
      });
      ctx.area.append(wrap);
      const svg = wrap.firstElementChild;
      const path = svg.querySelector('.road'), prog = svg.querySelector('.prog'), veh = svg.querySelector('.veh'), goal = svg.querySelector('.goal'), finger = svg.querySelector('.finger');
      const len = path.getTotalLength(), N = Math.ceil(len / 5);
      const pts = Array.from({ length: N + 1 }, (_, i) => path.getPointAtLength(i / N * len));
      const end = pts[N];
      goal.setAttribute('transform', `translate(${end.x + (rd.goalDx || 0)} ${end.y + (rd.goalDy || -30)})`);
      prog.style.strokeDasharray = len; prog.style.strokeDashoffset = len;
      let idx = 0, flip = 1, dragging = false;
      const place = () => {
        const p = pts[idx], q = pts[Math.min(N, idx + 4)];
        if (q.x - p.x < -1) flip = -1; else if (q.x - p.x > 1) flip = 1;
        veh.setAttribute('transform', `translate(${p.x} ${p.y}) scale(${flip} 1)`);
        prog.style.strokeDashoffset = len - idx / N * len;
        finger.setAttribute('transform', `translate(${p.x + 20} ${p.y + 40})`);
      };
      place();
      const toSvg = e => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
      const done = new Promise(resolve => {
        svg.addEventListener('pointerdown', e => {
          e.preventDefault();
          const p = toSvg(e);
          if (Math.hypot(p.x - pts[idx].x, p.y - pts[idx].y) < 80) { dragging = true; try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } G.sfx.pick(); }
          else G.pulse(finger);
        });
        svg.addEventListener('pointermove', e => {
          if (!dragging) return;
          const p = toSvg(e);
          let best = -1, bd = 60;
          for (let j = idx; j <= Math.min(N, idx + 24); j++) { const d = Math.hypot(p.x - pts[j].x, p.y - pts[j].y); if (d < bd) { bd = d; best = j; } }
          if (best > idx) {
            idx = best; place(); G.sfx.scrub();
            if (idx > 6) finger.classList.add('hide');
            if (idx >= N - 1) { dragging = false; resolve(); }
          }
        });
        const up = () => { dragging = false; };
        svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
      });
      ctx.idle(() => { ctx.say(rd.say); finger.classList.remove('hide'); });
      ctx.say(rd.say);
      await ctx.guard(done);
      ctx.idle(null);
      goal.classList.add('bounce');
      G.fx.at(goal, 14);
      await ctx.cheer(rd.okSay);
      await ctx.wait(500);
    }
  };

  // ---------- Держи кнопку: взлёт / дыхание ----------
  E.hold = async (ctx, cfg) => {
    if (cfg.mode === 'breathe') return breathe(ctx, cfg);
    const R = cfg.rounds;
    for (let ri = 0; ri < R.length; ri++) {
      const rd = R[ri], up = rd.dir === 'up';
      ctx.progress(ri, R.length);
      ctx.clear();
      const scene = h('div', { class: 'fly ' + rd.dir });
      const clouds = h('div', { class: 'fly-clouds', html: [0, 1, 2, 3].map(i => `<div class="fc" style="--i:${i}">${A.svg('0 0 130 80', A.cloud())}</div>`).join('') });
      const runway = h('div', { class: 'runway' });
      const plane = G.artEl(A.plane('#ff6b6b'), 'fly-plane');
      const btn = h('div', { class: 'hold-big' }, h('span', null, '👆'));
      scene.append(clouds, runway, plane, btn); ctx.area.append(scene);
      let p = 0, holding = false, last = performance.now(), raf = 0;
      const eng = G.sfx.engine();
      ctx.cleanup(() => { cancelAnimationFrame(raf); eng.stop(); });
      const place = () => {
        let x, y, rot;
        if (up) { const lift = Math.max(0, (p - 0.4) / 0.6); x = 4 + p * 64; y = 14 + Math.pow(lift, 1.4) * 58; rot = lift > 0 ? -12 : 0; }
        else { const d = Math.min(1, p / 0.7); x = 4 + p * 64; y = 14 + Math.pow(1 - d, 1.2) * 58; rot = d < 1 ? 8 : 0; }
        plane.style.left = x + '%'; plane.style.bottom = y + '%'; plane.style.transform = `rotate(${rot}deg)`;
        btn.style.setProperty('--p', p);
        scene.style.setProperty('--speed', holding ? 1 : 0.15);
      };
      place();
      const done = new Promise(resolve => {
        const loop = t => {
          const dt = Math.min(0.05, (t - last) / 1000); last = t;
          if (holding) p = Math.min(1, p + dt / 3.4);
          eng.set(p, holding);
          place();
          if (p >= 1) { holding = false; eng.set(p, false); resolve(); return; }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        scene.addEventListener('pointerdown', e => { e.preventDefault(); holding = true; scene.classList.add('holding'); try { scene.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } });
        const rel = () => { holding = false; scene.classList.remove('holding'); };
        scene.addEventListener('pointerup', rel); scene.addEventListener('pointercancel', rel);
      });
      ctx.idle(() => { ctx.say(rd.say); G.pulse(btn); });
      ctx.say(rd.say);
      await ctx.guard(done);
      ctx.idle(null);
      eng.stop();
      G.fx.at(plane, 12);
      await ctx.cheer(rd.okSay);
      if (rd.yawn) await yawn(ctx, cfg.yawnLines);
      await ctx.wait(400);
    }
  };

  async function yawn(ctx, L) {
    ctx.clear();
    const row = h('div', { class: 'yawn-row' });
    const ks = ['bublik', 'iriska', 'ponchik'].map(k => { const el = G.artEl(A.char(k, 'happy'), 'yk pop-in'); el._k = k; row.append(el); return el; });
    ctx.area.append(row);
    const set = (el, m) => G.setArt(el, A.char(el._k, m));
    set(ks[2], 'wow');
    await ctx.say(L[0]);
    set(ks[1], 'yawn'); ks[1].classList.add('yawning');
    await ctx.say(L[1]);
    ks.forEach(el => { set(el, 'yawn'); el.classList.add('yawning'); });
    G.tone({ f: 300, slide: 180, dur: 1, vol: 0.12, type: 'triangle' });
    await ctx.say(L[2]);
    await ctx.wait(2600);
    ks.forEach(el => { set(el, 'happy'); el.classList.remove('yawning'); });
    G.sfx.success(); G.fx.at(row, 10);
    await ctx.say(L[3]);
  }

  async function breathe(ctx, cfg) {
    ctx.clear();
    const N = cfg.cycles || 3;
    const scene = h('div', { class: 'breathe' });
    const ring = h('div', { class: 'br-ring' });
    const ball = G.artEl(A.svg('0 0 120 180', A.balloonG('#ff7eb6')), 'br-ball');
    const hedgehog = h('div', { class: 'br-hog' }, '🦔');
    const dots = h('div', { class: 'br-dots' }, ...Array.from({ length: N }, () => h('i')));
    scene.append(ring, ball, hedgehog, dots); ctx.area.append(scene);
    let p = 0, holding = false, c = 0, said = false, last = performance.now(), raf = 0;
    ctx.cleanup(() => cancelAnimationFrame(raf));
    ctx.progress(0, 1);
    await ctx.say(cfg.say);
    const done = new Promise(resolve => {
      const loop = t => {
        const dt = Math.min(0.05, (t - last) / 1000); last = t;
        p = holding ? Math.min(1, p + dt / 3) : Math.max(0, p - dt / 2.4);
        ball.style.transform = `scale(${0.45 + p * 0.75})`;
        ring.style.setProperty('--p', p);
        if (c >= N && p <= 0.02) { resolve(); return; }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      scene.addEventListener('pointerdown', e => {
        e.preventDefault(); if (c >= N) return;
        holding = true; scene.classList.add('holding');
        try { scene.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
        if (!said) { said = true; ctx.say(cfg.inhale); }
      });
      const rel = () => {
        if (!holding) return;
        holding = false; scene.classList.remove('holding');
        if (p >= 0.7) {
          dots.children[c].classList.add('on'); c++;
          G.sfx.whoosh(); G.fx.at(ball, 6, ['💨', '✨']);
          ctx.say(cfg.exhale).then(() => { said = false; });
        }
      };
      scene.addEventListener('pointerup', rel); scene.addEventListener('pointercancel', rel);
    });
    ctx.idle(() => { ctx.say(cfg.say); G.pulse(ball); });
    await ctx.guard(done);
    ctx.idle(null);
    await ctx.wait(600);
    await ctx.cheer(cfg.okSay);
  }

  // ---------- Колыбельная ----------
  E.lullaby = async (ctx, cfg) => {
    ctx.clear();
    ctx.progress(0, 1);
    const night = h('div', { class: 'night' });
    const stars = h('div', { class: 'stars' });
    const moon = G.artEl(A.svg('0 0 150 150', A.moonG()), 'moon');
    const bed = h('div', { class: 'bed', html: A.svg('0 0 300 150', `<g transform="translate(20 20) scale(2)">${A.cloud('#e8e4ff')}</g>
      <g transform="translate(40 20) scale(.42)">${A.K.bublik('sleep')}</g><g transform="translate(118 12) scale(.44)">${A.K.iriska('sleep')}</g><g transform="translate(196 30) scale(.38)">${A.K.ponchik('sleep')}</g>`) });
    const dim = h('div', { class: 'dim' });
    night.append(stars, moon, bed, dim); ctx.area.append(night);
    G.emit('night', true);
    ctx.cleanup(() => { G.music.stop(); G.store.s && G.audio.applySettings(); G.emit('night', false); });
    G.music.play('lullaby');
    let n = 0;
    const addStar = () => {
      if (n > 36) return; n++;
      const s = h('div', { class: 'star', style: { left: G.rand(4, 92) + '%', top: G.rand(3, 62) + '%', '--s': G.rand(4, 8) + 'vmin', '--d': G.rand(1.5, 4) + 's' } }, '⭐');
      s.addEventListener('pointerdown', e => { e.preventDefault(); s.classList.remove('tw'); void s.offsetWidth; s.classList.add('tw'); G.sfx.chime(); });
      stars.append(s);
    };
    for (let i = 0; i < 5; i++) addStar();
    const iv = ctx.interval(addStar, 1500);
    ctx.cleanup(() => clearInterval(iv));
    for (const id of cfg.lines) { await ctx.say(id); await ctx.wait(6500); }
    night.classList.add('sleepy');
    G.music.fadeOut(45);
    G.wake && G.wake.release();
    await ctx.wait(4000);
    return { quiet: true };
  };
})();
