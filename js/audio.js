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
    play(name) { const [k, i] = String(name).split(':'); this[k] && this[k](+i || 0); }
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
    setTimeout(() => { this.stop(); A.applySettings(); }, sec * 1000 + 100);
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
