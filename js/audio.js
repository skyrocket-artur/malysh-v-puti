'use strict';
// Звук: Web Audio (эффекты и музыка синтезируются, файлов не нужно) + озвучка.
(function () {
  const A = G.audio = {
    ctx: null, master: null, sfxGain: null, musicGain: null, voiceGain: null,
    unlock() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ok */ }
      if (!this.ctx) {
        const c = this.ctx = new AC();
        this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(c.destination);
        this.sfxGain = c.createGain(); this.sfxGain.connect(this.master);
        this.musicGain = c.createGain(); this.musicGain.connect(this.master);
        this.voiceGain = c.createGain(); this.voiceGain.gain.value = 1; this.voiceGain.connect(this.master);
        this.applySettings();
      }
      if (this.ctx.state !== 'running') this.ctx.resume();
      const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource();
      s.buffer = b; s.connect(this.ctx.destination); s.start(0);
    },
    applySettings() {
      if (!this.ctx) return;
      const s = G.store.s;
      this.sfxGain.gain.value = s.sfx;
      const g = this.musicGain.gain, t = this.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.setTargetAtTime(s.music * (G.voice && G.voice.speaking ? 0.35 : 1), t, 0.1);
    }
  };

  function tone({ f = 440, type = 'sine', t = 0, dur = 0.2, vol = 0.3, attack = 0.006, slide = 0, dest }) {
    const c = A.ctx; if (!c) return;
    const t0 = c.currentTime + t;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || A.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  let noiseBuf = null;
  function noise({ t = 0, dur = 0.1, vol = 0.3, freq = 1200, q = 0.8, kind = 'lowpass', dest, sweep = 0 }) {
    const c = A.ctx; if (!c) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = c.currentTime + t;
    const s = c.createBufferSource(); s.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = kind; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest || A.sfxGain);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }
  G.tone = tone; G.noise = noise;

  const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
  const PADS = [392, 523.25, 659.25, 783.99];
  let lastScrub = 0;

  G.sfx = {
    pick() { tone({ f: 520, slide: 760, type: 'triangle', dur: 0.08, vol: 0.12 }); },
    pop() { tone({ f: 500, slide: 1300, dur: 0.09, vol: 0.3 }); noise({ dur: 0.05, vol: 0.12, freq: 3000, kind: 'highpass' }); },
    ok() { tone({ f: 660, type: 'triangle', dur: 0.12, vol: 0.22 }); tone({ f: 990, type: 'triangle', t: 0.08, dur: 0.18, vol: 0.2 }); },
    success() { [523, 659, 784, 1046].forEach((f, i) => tone({ f, type: 'triangle', t: i * 0.09, dur: 0.25, vol: 0.2 })); },
    fanfare() {
      [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone({ f, type: 'triangle', t: i * 0.11, dur: 0.3, vol: 0.2 }));
      for (let i = 0; i < 8; i++) tone({ f: G.rand(1800, 3200), t: 0.7 + i * 0.05, dur: 0.12, vol: 0.05 });
    },
    wrong() { tone({ f: 330, slide: 290, dur: 0.16, vol: 0.18 }); tone({ f: 290, slide: 250, t: 0.17, dur: 0.2, vol: 0.16 }); },
    click() { noise({ dur: 0.03, vol: 0.35, freq: 2500, kind: 'highpass' }); tone({ f: 1800, t: 0.05, dur: 0.04, vol: 0.12, type: 'square' }); },
    flip() { noise({ dur: 0.08, vol: 0.12, freq: 900, sweep: 3000, kind: 'bandpass' }); },
    whoosh() { noise({ dur: 0.4, vol: 0.18, freq: 400, sweep: 2500, kind: 'bandpass', q: 1.5 }); },
    bubble() { tone({ f: 300, slide: 900, dur: 0.1, vol: 0.2 }); },
    note(i, vol = 0.28) {
      const f = SCALE[((i % SCALE.length) + SCALE.length) % SCALE.length];
      tone({ f, dur: 0.7, vol }); tone({ f: f * 2, type: 'triangle', dur: 0.25, vol: vol * 0.25 });
    },
    pad(i) { const f = PADS[i % 4]; tone({ f, type: 'triangle', dur: 0.5, vol: 0.3 }); tone({ f: f * 2, dur: 0.3, vol: 0.08 }); },
    drum(i = 0) {
      const base = [170, 120, 220, 95][i % 4];
      tone({ f: base, slide: base * 0.45, dur: 0.35, vol: 0.55 });
      noise({ dur: 0.12, vol: 0.25, freq: 1800 });
    },
    chime() { const f = G.pick(SCALE.slice(3)); tone({ f, dur: 1.4, vol: 0.12 }); tone({ f: f * 1.5, dur: 1, vol: 0.04 }); },
    scrub() {
      const n = performance.now(); if (n - lastScrub < 90) return; lastScrub = n;
      noise({ dur: 0.07, vol: 0.08, freq: G.rand(1500, 3500), kind: 'bandpass', q: 2 });
    },
    // Громко — тихо: звуки, которые сами показывают разницу
    roar() { tone({ f: 95, slide: 70, type: 'sawtooth', dur: 1.1, vol: 0.45, attack: 0.05 }); noise({ dur: 1, vol: 0.4, freq: 500, sweep: 250 }); },
    squeak() { [0, 0.16, 0.32].forEach(t => tone({ f: 2300, slide: 2900, t, dur: 0.1, vol: 0.05 })); },
    feather() { noise({ dur: 0.9, vol: 0.03, freq: 2500, sweep: 5000, kind: 'bandpass', q: 0.6 }); },
    shh() { noise({ dur: 1.1, vol: 0.05, freq: 3500, kind: 'highpass' }); },
    horn() { [220, 277, 330].forEach(f => tone({ f, type: 'sawtooth', dur: 0.7, vol: 0.14, attack: 0.03 })); },
    elephant() { tone({ f: 330, slide: 620, type: 'sawtooth', dur: 0.9, vol: 0.35, attack: 0.04 }); tone({ f: 335, slide: 630, type: 'square', dur: 0.9, vol: 0.12 }); },
    play(name) {
      const [k, a] = String(name).split(':');
      if (k === 'inst') return G.inst.play(a);
      if (this[k]) this[k](+a || 0);
    }
  };

  // --- Инструменты оркестра (синтез, без файлов) ---
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  function voice(n, t, dur, o = {}) {
    const c = A.ctx; if (!c) return;
    const f = midi(n), t0 = c.currentTime + t;
    const g = c.createGain(), flt = c.createBiquadFilter();
    flt.type = 'lowpass'; flt.Q.value = o.q || 0.8;
    flt.frequency.setValueAtTime(o.cutoff || 3000, t0);
    if (o.pluck) flt.frequency.exponentialRampToValueAtTime((o.cutoff || 3000) * 0.15, t0 + dur);
    const oscs = (o.detune ? [-o.detune, o.detune] : [0]).map(dt => {
      const osc = c.createOscillator(); osc.type = o.type || 'sawtooth'; osc.detune.value = dt;
      osc.frequency.setValueAtTime(o.slide ? f * o.slide : f, t0);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(f, t0 + 0.09);
      osc.connect(flt); return osc;
    });
    if (o.vib) {
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = o.vibRate || 5.5; lg.gain.value = f * o.vib;
      lfo.connect(lg); oscs.forEach(osc => lg.connect(osc.frequency));
      lfo.start(t0); lfo.stop(t0 + dur + 0.1);
    }
    const a = o.attack || 0.01, v = o.vol || 0.12;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + a);
    if (o.pluck) g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    else { g.gain.setValueAtTime(v, t0 + Math.max(a, dur * 0.7)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }
    flt.connect(g); g.connect(o.dest || A.sfxGain);
    oscs.forEach(osc => { osc.start(t0); osc.stop(t0 + dur + 0.05); });
  }
  const TIMBRE = {
    guitar: { type: 'sawtooth', pluck: true, cutoff: 3200, vol: 0.13 },
    trumpet: { type: 'sawtooth', cutoff: 2400, attack: 0.04, vib: 0.006, vol: 0.17, slide: 0.97 },
    piano: { type: 'triangle', pluck: true, cutoff: 5000, vol: 0.2 },
    violin: { type: 'sawtooth', cutoff: 2800, attack: 0.12, vib: 0.012, vibRate: 6, vol: 0.15 },
    accordion: { type: 'square', cutoff: 1900, detune: 12, attack: 0.05, vol: 0.06 },
    sax: { type: 'square', cutoff: 1300, q: 2, attack: 0.05, vib: 0.01, vol: 0.1, slide: 0.94 }
  };
  const drumHit = (t, low) => { tone({ f: low ? 130 : 200, slide: low ? 55 : 90, t, dur: 0.3, vol: 0.5 }); noise({ t, dur: low ? 0.08 : 0.14, vol: low ? 0.15 : 0.3, freq: low ? 900 : 2500 }); };
  // Фраза каждого инструмента: [нота, начало, длительность]
  const PHRASE = {
    guitar: [[48, 0, 1.2], [52, 0.03, 1.2], [55, 0.06, 1.2], [60, 0.09, 1.2], [64, 0.12, 1.2], [48, 0.55, 1.2], [52, 0.58, 1.2], [55, 0.61, 1.2], [60, 0.64, 1.2], [64, 0.67, 1.2]],
    trumpet: [[67, 0, 0.14], [67, 0.16, 0.14], [67, 0.32, 0.14], [72, 0.48, 0.6]],
    piano: [[72, 0, 0.6], [76, 0.14, 0.6], [79, 0.28, 0.6], [84, 0.42, 0.9]],
    violin: [[76, 0, 0.55], [79, 0.5, 0.55], [84, 1, 0.9]],
    accordion: [[72, 0, 0.25], [74, 0.25, 0.25], [76, 0.5, 0.25], [72, 0.75, 0.25], [79, 1, 0.5]],
    sax: [[67, 0, 0.3], [70, 0.3, 0.3], [72, 0.6, 0.7]]
  };
  G.inst = {
    play(name) {
      if (name === 'drum' || name === 'longdrum') { [0, 0.25, 0.5, 0.62].forEach((t, i) => drumHit(t, name === 'longdrum' ? i % 2 === 0 : i === 0)); return; }
      (PHRASE[name] || []).forEach(([n, t, d]) => voice(n, t, d, TIMBRE[name]));
    },
    // Общий номер оркестра: мелодию ведёт духовой/скрипка, аккорды — гитара/пианино, ритм — барабаны
    band(names) {
      const step = 0.24;
      const mel = [72, 76, 79, 76, 77, 81, 79, null, 76, 79, 84, 79, 77, 74, 72, null];
      const lead = names.filter(n => ['trumpet', 'violin', 'sax', 'accordion'].includes(n));
      const chordI = names.filter(n => ['guitar', 'piano', 'accordion'].includes(n));
      const hasDrum = names.some(n => n === 'drum' || n === 'longdrum');
      mel.forEach((n, i) => { if (n != null) lead.forEach(l => voice(n, i * step, step * 1.6, TIMBRE[l])); });
      [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]].forEach((ch, k) => chordI.forEach(ci => ch.forEach((n, j) => voice(n + 12, k * step * 4 + j * 0.02, step * 3.8, TIMBRE[ci]))));
      if (hasDrum || !lead.length) for (let i = 0; i < 16; i += 2) drumHit(i * step, i % 4 === 0);
      return mel.length * step;
    }
  };

  // Гул двигателя для взлёта
  G.sfx.engine = () => {
    const c = A.ctx; if (!c) return { set() { }, stop() { } };
    if (!noiseBuf) noise({ vol: 0.0001 });
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
    const g = c.createGain(); g.gain.value = 0.0001;
    s.connect(f); f.connect(g); g.connect(A.sfxGain); s.start();
    return {
      set(p, on) {
        f.frequency.setTargetAtTime(250 + p * 1400, c.currentTime, 0.1);
        g.gain.setTargetAtTime(on ? 0.12 + p * 0.1 : 0.0001, c.currentTime, 0.12);
      },
      stop() { g.gain.setTargetAtTime(0.0001, c.currentTime, 0.1); setTimeout(() => { try { s.stop(); } catch (e) { /* ok */ } }, 400); }
    };
  };

  // --- Музыка: маленький секвенсор ---
  const M = G.music = { cur: null, timer: null, step: 0, next: 0 };
  const nf = semi => 523.25 * Math.pow(2, semi / 12); // от до 5-й октавы
  const TR = {
    map: {
      bpm: 104, len: 32, per: 2, // восьмые
      mel: [0, 4, 7, 4, 9, 7, 4, 2, 0, 2, 4, 7, 4, 2, 0, null, 5, 9, 12, 9, 7, 4, 2, 4, 0, 4, 2, -1, 0, null, null, null],
      bass: { 0: -24, 8: -24, 16: -19, 24: -17, 28: -24 },
      play(i, t) {
        const m = this.mel[i];
        if (m != null) { tone({ f: nf(m), type: 'triangle', t, dur: 0.28, vol: 0.13, dest: A.musicGain }); tone({ f: nf(m + 12), t, dur: 0.12, vol: 0.03, dest: A.musicGain }); }
        const b = this.bass[i]; if (b != null) tone({ f: nf(b), t, dur: 0.6, vol: 0.16, dest: A.musicGain });
        if (i % 4 === 2) noise({ t, dur: 0.03, vol: 0.02, freq: 6000, kind: 'highpass', dest: A.musicGain });
      }
    },
    dance: {
      bpm: 126, len: 32, per: 4, // шестнадцатые
      lead: [12, null, 12, 15, null, 12, 10, null, 7, null, 7, 10, 12, null, null, null, 12, null, 12, 15, null, 17, 15, null, 12, null, 10, null, 12, null, null, null],
      bassN: [0, 0, 12, 0, 0, 12, 0, 12, -4, -4, 8, -4, -2, -2, 10, -2],
      play(i, t) {
        const A2 = A.musicGain;
        if (i % 4 === 0) tone({ f: 150, slide: 45, t, dur: 0.22, vol: 0.5, dest: A2 });
        if (i % 4 === 2) noise({ t, dur: 0.04, vol: 0.06, freq: 7000, kind: 'highpass', dest: A2 });
        if (i % 8 === 4) noise({ t, dur: 0.12, vol: 0.12, freq: 1800, kind: 'bandpass', dest: A2 });
        if (i % 2 === 0) { const b = this.bassN[(i / 2) % 16]; tone({ f: nf(b - 24), type: 'square', t, dur: 0.14, vol: 0.06, dest: A2 }); }
        const l = this.lead[i]; if (l != null) tone({ f: nf(l), slide: nf(l) * 1.02, type: 'sawtooth', t, dur: 0.12, vol: 0.05, dest: A2 });
      }
    },
    // Фон для острова «Музыка»: мягкий грув C–Am–F–G без ведущей мелодии,
    // чтобы ноты пузырей, барабаны и голос звучали поверх и не спорили с ним.
    groove: {
      bpm: 100, len: 32, per: 2,
      chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]],
      bass: [-24, -27, -31, -29],
      bell: { 6: 7, 14: 4, 22: 12, 30: 11 },
      play(i, t) {
        const G2 = A.musicGain, bar = Math.floor(i / 8), ch = this.chords[bar], b = this.bass[bar];
        if (i % 8 === 0) tone({ f: nf(b), t, dur: 0.5, vol: 0.2, dest: G2 });
        if (i % 8 === 3) tone({ f: nf(b + 7), t, dur: 0.3, vol: 0.12, dest: G2 });
        if (i % 8 === 4) tone({ f: nf(b + 12), t, dur: 0.35, vol: 0.13, dest: G2 });
        if (i % 4 === 0) tone({ f: 120, slide: 50, t, dur: 0.18, vol: i % 8 === 0 ? 0.28 : 0.16, dest: G2 });
        if (i % 2 === 1) noise({ t, dur: 0.035, vol: 0.035, freq: 7000, kind: 'highpass', dest: G2 });
        if (i % 8 === 2 || i % 8 === 6) ch.forEach(s => tone({ f: nf(s - 12), type: 'triangle', t, dur: 0.22, vol: 0.05, dest: G2 }));
        const bl = this.bell[i]; if (bl != null) tone({ f: nf(bl), t, dur: 0.6, vol: 0.05, dest: G2 });
      }
    },
    lullaby: {
      bpm: 66, len: 24, per: 2,
      mel: [4, null, 7, null, 9, 7, 4, null, null, null, 2, null, 4, null, 7, 4, 2, null, 0, null, 2, 4, 2, null],
      bass: { 0: -12, 6: -15, 12: -17, 18: -12 },
      play(i, t) {
        const m = this.mel[i];
        if (m != null) { tone({ f: nf(m + 12), t, dur: 1.6, vol: 0.09, dest: A.musicGain }); tone({ f: nf(m + 24), t, dur: 0.5, vol: 0.02, dest: A.musicGain }); }
        const b = this.bass[i]; if (b != null) tone({ f: nf(b - 12), t, dur: 2.6, vol: 0.08, dest: A.musicGain, attack: 0.3 });
      }
    }
  };
  M.play = function (name) {
    if (!A.ctx) return;
    if (this.cur === name) return;
    this.stop();
    const tr = TR[name]; if (!tr) return;
    this.cur = name; this.step = 0; this.next = A.ctx.currentTime + 0.1;
    A.musicGain.gain.cancelScheduledValues(A.ctx.currentTime);
    A.musicGain.gain.setValueAtTime(G.store.s.music * (G.voice.speaking ? 0.35 : 1), A.ctx.currentTime);
    const dt = 60 / tr.bpm / tr.per;
    this.timer = setInterval(() => {
      while (this.next < A.ctx.currentTime + 0.2) {
        tr.play(this.step, this.next - A.ctx.currentTime);
        this.step = (this.step + 1) % tr.len; this.next += dt;
      }
    }, 40);
  };
  M.stop = function () { clearInterval(this.timer); this.timer = null; this.cur = null; };
  M.fadeOut = function (sec) {
    if (!A.ctx) return;
    const g = A.musicGain.gain; g.cancelScheduledValues(A.ctx.currentTime);
    g.setValueAtTime(g.value, A.ctx.currentTime); g.linearRampToValueAtTime(0.0001, A.ctx.currentTime + sec);
    const cur = this.cur;
    setTimeout(() => { if (this.cur === cur) this.stop(); A.applySettings(); }, sec * 1000 + 100);
  };

  // --- Озвучка ---
  // Каждая реплика имеет id. Если есть записанный файл (G.VOICE_FILES) — играем его,
  // иначе — синтезатор речи браузера с «голосом» персонажа (высота/темп).
  const V = G.voice = {
    lines: {}, buffers: {}, ruVoice: null, token: null, speaking: false,
    who: {
      narrator: { pitch: 1.05, rate: 0.92 },
      bublik: { pitch: 1.3, rate: 0.98 },
      iriska: { pitch: 1.55, rate: 0.98 },
      ponchik: { pitch: 1.8, rate: 1.02 },
      frog: { pitch: 1.2, rate: 1.04 },
      bear: { pitch: 0.75, rate: 0.9 },
      bunny: { pitch: 1.65, rate: 1 }
    },
    init() {
      const ss = window.speechSynthesis; if (!ss) return;
      const pickV = () => {
        const vs = ss.getVoices().filter(v => /^ru/i.test(v.lang));
        if (!vs.length) return;
        const score = v => (v.localService ? 10 : 0) + (/enhanced|premium|улучш/i.test(v.name) ? 5 : 0) + (/milena|милена|katya|alena|алёна|yandex|google|irina|svetlana|anna/i.test(v.name) ? 3 : 0);
        vs.sort((a, b) => score(b) - score(a));
        this.ruVoice = vs[0];
      };
      pickV();
      ss.addEventListener && ss.addEventListener('voiceschanged', pickV);
    },
    hasFile(id) { return !!(G.VOICE_FILES && G.VOICE_FILES[id]); },
    async preload(ids) {
      if (!A.ctx || G.store.s.voiceMode === 'tts') return;
      for (const id of ids) {
        if (!this.hasFile(id) || this.buffers[id]) continue;
        try { await this.load(id); } catch (e) { /* ok */ }
      }
    },
    async load(id) {
      const r = await fetch('audio/voice/' + G.VOICE_FILES[id]);
      const ab = await r.arrayBuffer();
      this.buffers[id] = await new Promise((res, rej) => A.ctx.decodeAudioData(ab, res, rej));
      return this.buffers[id];
    },
    say(id, opt = {}) {
      const line = this.lines[id];
      if (!line) { console.warn('Нет реплики', id); return Promise.resolve(); }
      this.stop();
      const token = { id };
      this.token = token;
      this.setSpeaking(true, line);
      const fin = () => { if (this.token === token) { this.token = null; this.setSpeaking(false, line); } };
      const useFile = G.store.s.voiceMode !== 'tts' && this.hasFile(id) && A.ctx;
      const p = useFile ? this.playFile(id, token).catch(() => this.tts(line, token)) : this.tts(line, token);
      return p.then(fin, fin);
    },
    setSpeaking(on, line) {
      this.speaking = on;
      if (A.ctx) A.musicGain.gain.setTargetAtTime(G.store.s.music * (on ? 0.35 : 1), A.ctx.currentTime, 0.15);
      G.emit('speak', { on, who: line.who, text: line.text });
    },
    async playFile(id, token) {
      const buf = this.buffers[id] || await this.load(id);
      if (this.token !== token) return;
      return new Promise(res => {
        const s = A.ctx.createBufferSource(); s.buffer = buf; s.connect(A.voiceGain);
        let done = false; const end = () => { if (!done) { done = true; res(); } };
        s.onended = end;
        token.stop = () => { try { s.stop(); } catch (e) { /* ok */ } end(); };
        s.start();
      });
    },
    tts(line, token) {
      return new Promise(res => {
        const ss = window.speechSynthesis;
        const est = 900 + line.text.length * 75;
        if (G.FAST) { const t = setTimeout(res, 120); token.stop = () => { clearTimeout(t); res(); }; return; } // режим автотеста
        if (!ss || !window.SpeechSynthesisUtterance) { const t = setTimeout(res, est); token.stop = () => { clearTimeout(t); res(); }; return; }
        const u = new SpeechSynthesisUtterance(line.text.replace(/[«»]/g, ''));
        u.lang = 'ru-RU';
        if (this.ruVoice) u.voice = this.ruVoice;
        const p = this.who[line.who] || this.who.narrator;
        u.pitch = line.soft ? 1 : p.pitch;
        u.rate = p.rate * (line.soft ? 0.82 : 1);
        u.volume = line.soft ? 0.75 : 1;
        let done = false;
        const end = () => { if (done) return; done = true; clearTimeout(guard); res(); };
        const guard = setTimeout(end, est * 1.6 + 1500);
        u.onend = end; u.onerror = end;
        token.stop = () => { end(); try { ss.cancel(); } catch (e) { /* ok */ } };
        this._u = u; // держим ссылку, иначе Chrome теряет onend
        setTimeout(() => { if (!done) ss.speak(u); }, 40);
      });
    },
    stop() {
      const t = this.token; this.token = null;
      if (t && t.stop) t.stop();
      else if (window.speechSynthesis && this.speaking) { try { speechSynthesis.cancel(); } catch (e) { /* ok */ } }
      if (this.speaking) { this.speaking = false; if (A.ctx) A.musicGain.gain.setTargetAtTime(G.store.s.music, A.ctx.currentTime, 0.15); G.emit('speak', { on: false }); }
    }
  };

  // Регистрация реплики: G.L(id, персонаж, текст, {soft})
  G.L = (id, who, text, opt) => { V.lines[id] = Object.assign({ id, who, text }, opt || {}); return id; };
  V.init();
})();
