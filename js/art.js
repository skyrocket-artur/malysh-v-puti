'use strict';
// Рисунки: персонажи и предметы в SVG. Функции возвращают разметку <g>-содержимого;
// A.svg() оборачивает её в <svg>. Свои персонажи «в духе» любимых мультиков.
(function () {
  const A = G.A = {};
  const INK = '#3b2f4a';
  let uid = 0;
  const nid = p => p + (++uid);

  const shade = (hex, amt) => {
    let c = hex.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const n = parseInt(c, 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = amt < 0 ? 0 : 255, t = Math.abs(amt);
    r = Math.round((f - r) * t + r); g = Math.round((f - g) * t + g); b = Math.round((f - b) * t + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };
  A.shade = shade;
  A.svg = (vb, inner, cls = '') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" class="${cls}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
  const emo = (e, x, y, s) => `<text x="${x}" y="${y}" font-size="${s}" text-anchor="middle" dominant-baseline="central">${e}</text>`;
  A.emo = emo;

  // ---------- лица ----------
  function brow(x1, y1, x2, y2, w) { return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`; }
  function eyes(x, y, dx, r, mood) {
    let s = '';
    for (const sx of [-1, 1]) {
      const ex = x + sx * dx;
      if (mood === 'sleep' || mood === 'yawn') {
        s += `<path d="M${ex - r * 0.8} ${y} Q${ex} ${y + r * 0.75} ${ex + r * 0.8} ${y}" fill="none" stroke="${INK}" stroke-width="${r * 0.3}" stroke-linecap="round"/>`;
      } else {
        const big = mood === 'wow' || mood === 'scared' ? 1.12 : 1;
        const py = mood === 'sad' ? y + r * 0.3 : y + r * 0.08;
        const pr = mood === 'wow' || mood === 'scared' ? 0.45 : 0.58;
        s += `<ellipse cx="${ex}" cy="${y}" rx="${r * 0.84 * big}" ry="${r * big}" fill="#fff"/>`;
        s += `<ellipse cx="${ex + sx * r * 0.05}" cy="${py}" rx="${r * pr}" ry="${r * (pr + 0.07)}" fill="${INK}"/>`;
        s += `<circle cx="${ex + r * 0.2}" cy="${py - r * 0.25}" r="${r * 0.2}" fill="#fff"/>`;
      }
      const w = r * 0.22;
      if (mood === 'sad' || mood === 'cold' || mood === 'scared') s += brow(ex + sx * r * 0.9, y - r * 1.15, ex - sx * r * 0.55, y - r * 1.55, w);
      if (mood === 'angry') s += brow(ex + sx * r * 0.9, y - r * 1.55, ex - sx * r * 0.55, y - r * 1.12, w);
    }
    return s;
  }
  function mouth(x, y, w, mood) {
    const sw = Math.max(3, w * 0.22);
    switch (mood) {
      case 'sad': return `<path d="M${x - w * 0.8} ${y + w * 0.5} Q${x} ${y - w * 0.3} ${x + w * 0.8} ${y + w * 0.5}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round"/>`;
      case 'wow': case 'scared': return `<ellipse cx="${x}" cy="${y + w * 0.25}" rx="${w * 0.38}" ry="${w * 0.48}" fill="#6b2635"/>`;
      case 'yawn': return `<ellipse cx="${x}" cy="${y + w * 0.35}" rx="${w * 0.62}" ry="${w * 0.85}" fill="#6b2635"/><ellipse cx="${x}" cy="${y + w * 0.9}" rx="${w * 0.36}" ry="${w * 0.25}" fill="#ff8fa3"/>`;
      case 'angry': return `<path d="M${x - w * 0.6} ${y + w * 0.35} Q${x} ${y + w * 0.1} ${x + w * 0.6} ${y + w * 0.35}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round"/>`;
      case 'cold': return `<path d="M${x - w * 0.7} ${y + w * 0.3} l${w * 0.35} -${w * 0.25} l${w * 0.35} ${w * 0.25} l${w * 0.35} -${w * 0.25} l${w * 0.35} ${w * 0.25}" fill="none" stroke="${INK}" stroke-width="${sw * 0.8}" stroke-linecap="round" stroke-linejoin="round"/>`;
      case 'sleep': return `<path d="M${x - w * 0.35} ${y + w * 0.2} Q${x} ${y + w * 0.5} ${x + w * 0.35} ${y + w * 0.2}" fill="none" stroke="${INK}" stroke-width="${sw * 0.8}" stroke-linecap="round"/>`;
      default: return `<path d="M${x - w} ${y} Q${x} ${y + w * 1.25} ${x + w} ${y} Z" fill="#8a3441" stroke="${INK}" stroke-width="${sw * 0.7}" stroke-linejoin="round"/><ellipse cx="${x}" cy="${y + w * 0.62}" rx="${w * 0.42}" ry="${w * 0.2}" fill="#ff8fa3"/>`;
    }
  }
  const tear = (x, y, r) => `<path d="M${x} ${y} Q${x - r} ${y + r * 1.3} ${x} ${y + r * 1.7} Q${x + r} ${y + r * 1.3} ${x} ${y}Z" fill="#7cc8ff" stroke="#4aa8e8" stroke-width="1.5"/>`;
  const cheeks = (x, y, dx, rx) => `<ellipse cx="${x - dx}" cy="${y}" rx="${rx}" ry="${rx * 0.62}" fill="#ff8fa3" opacity=".55"/><ellipse cx="${x + dx}" cy="${y}" rx="${rx}" ry="${rx * 0.62}" fill="#ff8fa3" opacity=".55"/>`;
  const zzz = () => `<text x="170" y="40" font-size="28" font-weight="800" fill="#7b6cff" font-family="system-ui">z</text><text x="184" y="18" font-size="20" font-weight="800" fill="#7b6cff" font-family="system-ui">z</text>`;

  // ---------- котята ----------
  A.kitten = (o = {}) => {
    const c = Object.assign({ fur: '#ffa94d', stripe: '#e8802a', belly: '#ffe8c8', inner: '#ff9fb2', mood: 'happy', acc: '', accColor: '#4d96ff' }, o);
    const sh = shade(c.fur, -0.2), m = c.mood;
    const st = `stroke="${sh}" stroke-width="4" stroke-linejoin="round"`;
    let s = '';
    s += `<path d="M146 192 C190 188 198 140 172 116" fill="none" stroke="${sh}" stroke-width="24" stroke-linecap="round"/>`;
    s += `<path d="M146 192 C190 188 198 140 172 116" fill="none" stroke="${c.fur}" stroke-width="17" stroke-linecap="round"/>`;
    s += `<ellipse cx="100" cy="172" rx="52" ry="44" fill="${c.fur}" ${st}/>`;
    s += `<ellipse cx="100" cy="182" rx="31" ry="28" fill="${c.belly}"/>`;
    s += `<ellipse cx="74" cy="210" rx="19" ry="11" fill="${c.fur}" ${st}/><ellipse cx="126" cy="210" rx="19" ry="11" fill="${c.fur}" ${st}/>`;
    s += `<ellipse cx="60" cy="176" rx="12" ry="21" fill="${c.fur}" ${st} transform="rotate(18 60 176)"/><ellipse cx="140" cy="176" rx="12" ry="21" fill="${c.fur}" ${st} transform="rotate(-18 140 176)"/>`;
    s += `<path d="M40 74 L36 14 L86 46 Z" fill="${c.fur}" ${st}/><path d="M160 74 L164 14 L114 46 Z" fill="${c.fur}" ${st}/>`;
    s += `<path d="M49 62 L47 29 L74 48 Z" fill="${c.inner}"/><path d="M151 62 L153 29 L126 48 Z" fill="${c.inner}"/>`;
    s += `<ellipse cx="100" cy="92" rx="72" ry="60" fill="${c.fur}" ${st}/>`;
    s += `<path d="M86 36 Q90 46 87 56 M100 33 Q104 45 100 58 M114 36 Q118 46 115 56" fill="none" stroke="${c.stripe}" stroke-width="6" stroke-linecap="round"/>`;
    s += `<ellipse cx="100" cy="119" rx="27" ry="16" fill="${c.belly}"/>`;
    s += cheeks(100, 114, 43, 11);
    s += eyes(100, 90, 28, 17, m);
    s += `<path d="M92 107 Q100 102 108 107 Q100 116 92 107Z" fill="#ff6f91"/>`;
    if (m === 'happy' || m === 'sleep') s += `<path d="M89 116 Q94.5 124 100 116 Q105.5 124 111 116" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    else s += mouth(100, 118, 12, m);
    s += `<path d="M66 116 L30 110 M66 122 L32 127 M134 116 L170 110 M134 122 L168 127" stroke="${sh}" stroke-width="2.5" stroke-linecap="round"/>`;
    if (m === 'sad') s += tear(70, 104, 7);
    if (c.acc === 'scarf') {
      const a = c.accColor, as = shade(a, -0.2);
      s += `<path d="M54 140 Q100 164 146 140 L148 155 Q100 180 52 155Z" fill="${a}" stroke="${as}" stroke-width="3" stroke-linejoin="round"/>`;
      s += `<path d="M118 158 L130 196 L114 199 L106 162Z" fill="${a}" stroke="${as}" stroke-width="3" stroke-linejoin="round"/>`;
      s += `<path d="M70 150 L72 158 M90 155 L91 163 M110 155 L109 163 M130 150 L128 158" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
    }
    if (c.acc === 'bow') {
      const a = c.accColor, as = shade(a, -0.25);
      s += `<g transform="translate(142 42) rotate(22)"><path d="M0 0 L-24 -15 Q-30 0 -24 15Z" fill="${a}" stroke="${as}" stroke-width="3" stroke-linejoin="round"/><path d="M0 0 L24 -15 Q30 0 24 15Z" fill="${a}" stroke="${as}" stroke-width="3" stroke-linejoin="round"/><circle r="8" fill="${as}"/></g>`;
    }
    if (c.acc === 'tuft') s += `<path d="M96 36 Q90 14 106 12 Q118 14 110 26" fill="none" stroke="${sh}" stroke-width="10" stroke-linecap="round"/><path d="M96 36 Q90 14 106 12 Q118 14 110 26" fill="none" stroke="${c.fur}" stroke-width="5" stroke-linecap="round"/>`;
    if (m === 'sleep') s += zzz();
    return s;
  };
  A.K = {
    bublik: m => A.kitten({ fur: '#ffa94d', stripe: '#e8802a', belly: '#ffe8c8', acc: 'scarf', accColor: '#4d96ff', mood: m }),
    iriska: m => A.kitten({ fur: '#f9b8cf', stripe: '#e98bab', belly: '#fff1f6', acc: 'bow', accColor: '#ffcf3f', mood: m }),
    ponchik: m => A.kitten({ fur: '#a9cdf2', stripe: '#7fa9d8', belly: '#eef6ff', acc: 'tuft', mood: m })
  };

  // ---------- лягушонок Квак ----------
  A.frog = (m = 'happy') => {
    const f = '#6ccf5f', sh = '#3e9e45', lt = '#d9f7ae';
    const st = `stroke="${sh}" stroke-width="4" stroke-linejoin="round"`;
    let s = '';
    s += `<ellipse cx="52" cy="204" rx="28" ry="13" fill="${f}" ${st}/><ellipse cx="148" cy="204" rx="28" ry="13" fill="${f}" ${st}/>`;
    s += `<ellipse cx="100" cy="170" rx="50" ry="40" fill="${f}" ${st}/>`;
    s += `<ellipse cx="100" cy="178" rx="32" ry="26" fill="${lt}"/>`;
    s += `<ellipse cx="54" cy="170" rx="11" ry="20" fill="${f}" ${st} transform="rotate(25 54 170)"/><ellipse cx="146" cy="170" rx="11" ry="20" fill="${f}" ${st} transform="rotate(-25 146 170)"/>`;
    s += `<ellipse cx="100" cy="108" rx="80" ry="52" fill="${f}" ${st}/>`;
    s += `<circle cx="60" cy="66" r="30" fill="${f}" ${st}/><circle cx="140" cy="66" r="30" fill="${f}" ${st}/>`;
    s += `<ellipse cx="100" cy="112" rx="60" ry="30" fill="${f}"/>`;
    s += eyes(100, 66, 40, 19, m);
    s += cheeks(100, 122, 58, 12);
    if (m === 'happy' || m === 'dance') s += `<path d="M52 112 Q100 164 148 112 Q100 128 52 112Z" fill="#d9465f" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><ellipse cx="100" cy="135" rx="18" ry="7" fill="#ff8fa3"/>`;
    else s += mouth(100, 118, 18, m);
    s += `<path d="M36 100 Q30 20 100 14 Q170 20 164 100" fill="none" stroke="#e8375a" stroke-width="10" stroke-linecap="round"/>`;
    s += `<rect x="20" y="84" width="24" height="40" rx="10" fill="#ff4d6d" stroke="#c42a48" stroke-width="3"/><rect x="156" y="84" width="24" height="40" rx="10" fill="#ff4d6d" stroke="#c42a48" stroke-width="3"/>`;
    if (m === 'sleep') s += zzz();
    return s;
  };

  // ---------- мишка Топа ----------
  A.bear = (m = 'happy') => {
    const f = '#b27b4e', sh = '#8d5a33', lt = '#f1d2a8';
    const st = `stroke="${sh}" stroke-width="4" stroke-linejoin="round"`;
    let s = '';
    s += `<ellipse cx="100" cy="176" rx="54" ry="42" fill="${f}" ${st}/><ellipse cx="100" cy="184" rx="32" ry="28" fill="${lt}"/>`;
    s += `<ellipse cx="72" cy="212" rx="20" ry="11" fill="${f}" ${st}/><ellipse cx="128" cy="212" rx="20" ry="11" fill="${f}" ${st}/>`;
    s += `<ellipse cx="56" cy="176" rx="13" ry="22" fill="${f}" ${st} transform="rotate(20 56 176)"/><ellipse cx="144" cy="176" rx="13" ry="22" fill="${f}" ${st} transform="rotate(-20 144 176)"/>`;
    s += `<circle cx="46" cy="44" r="24" fill="${f}" ${st}/><circle cx="154" cy="44" r="24" fill="${f}" ${st}/><circle cx="46" cy="44" r="12" fill="${lt}"/><circle cx="154" cy="44" r="12" fill="${lt}"/>`;
    s += `<ellipse cx="100" cy="96" rx="70" ry="60" fill="${f}" ${st}/>`;
    s += `<ellipse cx="100" cy="124" rx="30" ry="22" fill="${lt}"/>`;
    s += cheeks(100, 116, 46, 10);
    s += eyes(100, 90, 28, 13, m);
    s += `<ellipse cx="100" cy="111" rx="11" ry="8" fill="#3b2a2a"/><ellipse cx="97" cy="108" rx="3.5" ry="2" fill="#fff" opacity=".7"/>`;
    if (m === 'happy' || m === 'sleep') s += `<path d="M88 124 Q100 136 112 124" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
    else s += mouth(100, 126, 11, m);
    if (m === 'sad' || m === 'scared') s += tear(74, 100, 6);
    if (m === 'sleep') s += zzz();
    return s;
  };

  // ---------- зайка Пуша ----------
  A.bunny = (m = 'happy') => {
    const f = '#ffffff', sh = '#d8c6e6', pink = '#ffb3c7', lt = '#ffe6ee';
    const st = `stroke="${sh}" stroke-width="4" stroke-linejoin="round"`;
    let s = '';
    s += `<ellipse cx="100" cy="182" rx="48" ry="38" fill="${f}" ${st}/><ellipse cx="100" cy="188" rx="28" ry="24" fill="${lt}"/>`;
    s += `<ellipse cx="74" cy="214" rx="20" ry="9" fill="${f}" ${st}/><ellipse cx="126" cy="214" rx="20" ry="9" fill="${f}" ${st}/>`;
    s += `<ellipse cx="60" cy="180" rx="11" ry="19" fill="${f}" ${st} transform="rotate(20 60 180)"/><ellipse cx="140" cy="180" rx="11" ry="19" fill="${f}" ${st} transform="rotate(-20 140 180)"/>`;
    s += `<ellipse cx="72" cy="52" rx="17" ry="46" fill="${f}" ${st} transform="rotate(-12 72 52)"/><ellipse cx="128" cy="52" rx="17" ry="46" fill="${f}" ${st} transform="rotate(12 128 52)"/>`;
    s += `<ellipse cx="72" cy="56" rx="8" ry="33" fill="${pink}" transform="rotate(-12 72 56)"/><ellipse cx="128" cy="56" rx="8" ry="33" fill="${pink}" transform="rotate(12 128 56)"/>`;
    s += `<ellipse cx="100" cy="116" rx="64" ry="54" fill="${f}" ${st}/>`;
    s += `<path d="M84 72 Q92 60 100 70 Q108 60 116 72" fill="${pink}" opacity=".7"/>`;
    s += cheeks(100, 128, 40, 11);
    s += eyes(100, 108, 25, 14, m);
    s += `<path d="M94 124 L106 124 L100 131Z" fill="#ff6f91" stroke="#ff6f91" stroke-width="3" stroke-linejoin="round"/>`;
    if (m === 'happy' || m === 'sleep') s += `<path d="M90 134 Q95 140 100 134 Q105 140 110 134" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><rect x="93" y="137" width="7" height="9" rx="2" fill="#fff" stroke="${sh}" stroke-width="2"/><rect x="100" y="137" width="7" height="9" rx="2" fill="#fff" stroke="${sh}" stroke-width="2"/>`;
    else s += mouth(100, 136, 11, m);
    if (m === 'sad') s += tear(72, 118, 7);
    if (m === 'cold') s += `<path d="M22 100 l8 6 -8 6 8 6 M178 100 l-8 6 8 6 -8 6" fill="none" stroke="#7cc8ff" stroke-width="3" stroke-linecap="round"/>`;
    if (m === 'sleep') s += zzz();
    return s;
  };

  // Готовые <svg> персонажей для аватаров
  const CH = { bublik: A.K.bublik, iriska: A.K.iriska, ponchik: A.K.ponchik, frog: A.frog, bear: A.bear, bunny: A.bunny };
  A.char = (who, mood = 'happy') => CH[who] ? A.svg('0 0 200 225', CH[who](mood), 'char') : '';
  A.hasChar = who => !!CH[who];

  // ---------- предметы ----------
  A.suitcase = (col) => {
    const sh = shade(col, -0.25), lt = shade(col, 0.35);
    return A.svg('0 0 120 110', `<path d="M42 28 V16 Q42 8 50 8 H70 Q78 8 78 16 V28" fill="none" stroke="${sh}" stroke-width="8" stroke-linecap="round"/>
    <rect x="10" y="26" width="100" height="70" rx="16" fill="${col}" stroke="${sh}" stroke-width="4"/>
    <rect x="32" y="26" width="10" height="70" fill="${lt}" opacity=".8"/><rect x="78" y="26" width="10" height="70" fill="${lt}" opacity=".8"/>
    <circle cx="28" cy="100" r="7" fill="${INK}"/><circle cx="92" cy="100" r="7" fill="${INK}"/>
    <path d="M18 40 Q20 34 26 33" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>`);
  };

  A.box = (col) => {
    const sh = shade(col, -0.25), lt = shade(col, 0.3);
    return A.svg('0 0 140 120', `<path d="M14 40 L126 40 L118 112 L22 112Z" fill="${col}" stroke="${sh}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M14 40 L2 20 L58 20 L70 40Z" fill="${lt}" stroke="${sh}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M126 40 L138 20 L82 20 L70 40Z" fill="${lt}" stroke="${sh}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M52 72 Q70 86 88 72" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8"/>`);
  };

  A.cloud = (fill = '#fff') => `<g fill="${fill}"><circle cx="40" cy="50" r="22"/><circle cx="68" cy="38" r="28"/><circle cx="96" cy="52" r="20"/><rect x="40" y="48" width="58" height="24" rx="12"/></g>`;
  A.sunG = (x, y, r) => {
    let rays = '';
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; rays += `<path d="M${x + Math.cos(a) * (r + 6)} ${y + Math.sin(a) * (r + 6)} L${x + Math.cos(a) * (r + 18)} ${y + Math.sin(a) * (r + 18)}" stroke="#ffb400" stroke-width="6" stroke-linecap="round"/>`; }
    return rays + `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffd23f" stroke="#ffb400" stroke-width="4"/>` + eyes(x, y - r * 0.1, r * 0.35, r * 0.2, 'sleep').replace(/stroke-width="[\d.]+"/g, 'stroke-width="3"') + `<path d="M${x - r * 0.3} ${y + r * 0.3} Q${x} ${y + r * 0.55} ${x + r * 0.3} ${y + r * 0.3}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  };

  A.planeG = (col = '#ff6b6b') => `
    <path d="M26 46 L12 6 L40 6 L66 42Z" fill="${col}" stroke="${shade(col, -0.25)}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M20 62 Q20 44 44 42 L180 40 Q222 42 234 62 Q222 82 180 84 L44 84 Q20 82 20 62Z" fill="#fff" stroke="#9bb3cc" stroke-width="3"/>
    <path d="M24 70 L230 70 Q226 78 212 80 L44 82 Q28 80 24 70Z" fill="#4d96ff"/>
    <path d="M30 58 L6 64 L12 72 L44 66Z" fill="${col}" stroke="${shade(col, -0.25)}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M202 48 Q220 50 228 60 L206 60Z" fill="#7cc8ff" stroke="#4aa8e8" stroke-width="2"/>
    ${[72, 98, 124, 150, 176].map(x => `<circle cx="${x}" cy="56" r="7.5" fill="#bfe6ff" stroke="#4aa8e8" stroke-width="2"/>`).join('')}
    <path d="M104 66 L152 66 L120 110 L96 110Z" fill="#dfe9f5" stroke="#9bb3cc" stroke-width="3" stroke-linejoin="round"/>`;
  A.plane = (col) => A.svg('0 0 240 115', A.planeG(col));

  A.carG = (col = '#ff5a5f') => {
    const sh = shade(col, -0.25);
    return `<path d="M10 62 Q10 46 26 44 L46 42 L64 18 Q68 12 76 12 L112 12 Q120 12 126 18 L144 42 Q160 44 162 58 L162 70 Q162 76 156 76 L16 76 Q10 76 10 70Z" fill="${col}" stroke="${sh}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M58 42 L72 22 L92 22 L92 42Z" fill="#bfe6ff" stroke="${sh}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M100 42 L100 22 L118 22 L132 42Z" fill="#bfe6ff" stroke="${sh}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="44" cy="78" r="15" fill="${INK}"/><circle cx="44" cy="78" r="6" fill="#ddd"/>
    <circle cx="128" cy="78" r="15" fill="${INK}"/><circle cx="128" cy="78" r="6" fill="#ddd"/>
    <rect x="150" y="52" width="10" height="8" rx="3" fill="#ffe14d"/>`;
  };
  A.boatG = () => `<path d="M60 10 L60 70" stroke="#8d5a33" stroke-width="5"/>
    <path d="M64 14 L108 66 L64 66Z" fill="#fff" stroke="#9bb3cc" stroke-width="3" stroke-linejoin="round"/>
    <path d="M56 22 L22 64 L56 64Z" fill="#ffd23f" stroke="#e0a800" stroke-width="3" stroke-linejoin="round"/>
    <path d="M8 72 L116 72 L100 96 Q62 104 24 96Z" fill="#ff5a5f" stroke="#c43c41" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="42" cy="84" r="5" fill="#fff"/><circle cx="62" cy="86" r="5" fill="#fff"/><circle cx="82" cy="84" r="5" fill="#fff"/>`;

  A.drum = (col) => {
    const sh = shade(col, -0.28);
    return A.svg('0 0 120 120', `<path d="M16 42 L16 90 Q60 116 104 90 L104 42Z" fill="${col}" stroke="${sh}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M16 50 L37 96 L60 52 L83 98 L104 50" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round" opacity=".85"/>
    <ellipse cx="60" cy="42" rx="44" ry="15" fill="#fff6e0" stroke="${sh}" stroke-width="4"/>
    <path d="M28 8 L58 36 M92 8 L62 36" stroke="#b27b4e" stroke-width="6" stroke-linecap="round"/>
    <circle cx="28" cy="8" r="7" fill="#ffd23f" stroke="#c89400" stroke-width="2"/><circle cx="92" cy="8" r="7" fill="#ffd23f" stroke="#c89400" stroke-width="2"/>`);
  };

  A.sock = (col, pat = 'plain') => {
    const id = nid('sk'), sh = shade(col, -0.25), lt = shade(col, 0.45), d = 'M30 12 L70 12 L70 70 L88 84 Q104 96 94 112 Q84 126 66 118 L32 98 Q18 90 26 76 L30 70 Z';
    let p = '';
    if (pat === 'stripes') for (let y = 28; y < 120; y += 16) p += `<rect x="0" y="${y}" width="120" height="7" fill="${lt}"/>`;
    if (pat === 'dots') for (let y = 28; y < 120; y += 18) for (let x = 30 + (y % 36 ? 9 : 0); x < 110; x += 18) p += `<circle cx="${x}" cy="${y}" r="4.5" fill="${lt}"/>`;
    if (pat === 'hearts') for (let y = 32; y < 120; y += 24) for (let x = 38 + (y % 48 ? 12 : 0); x < 110; x += 24) p += `<path transform="translate(${x} ${y}) scale(.18) translate(-50 -50)" d="M50 88 C10 60 6 34 22 22 C36 12 48 20 50 32 C52 20 64 12 78 22 C94 34 90 60 50 88Z" fill="${lt}"/>`;
    if (pat === 'star') p += `<path transform="translate(50 50) scale(.3) translate(-50 -53)" d="${starPath(50, 53, 44, 19)}" fill="#ffe14d"/>`;
    return A.svg('0 0 120 130', `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>
      <path d="${d}" fill="${col}"/><g clip-path="url(#${id})">${p}<circle cx="34" cy="92" r="15" fill="${sh}" opacity=".45"/><circle cx="92" cy="110" r="14" fill="${sh}" opacity=".45"/></g>
      <path d="${d}" fill="none" stroke="${sh}" stroke-width="4" stroke-linejoin="round"/>
      <rect x="27" y="6" width="46" height="16" rx="5" fill="${lt}" stroke="${sh}" stroke-width="4"/>`);
  };

  function starPath(cx, cy, R, r) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1) + ' ';
    }
    return d + 'Z';
  }
  A.starPath = starPath;
  const HEART = 'M50 88 C10 60 6 34 22 22 C36 12 48 20 50 32 C52 20 64 12 78 22 C94 34 90 60 50 88Z';

  A.shape = (kind, col) => {
    const st = `fill="${col}" stroke="${shade(col, -0.28)}" stroke-width="5" stroke-linejoin="round"`;
    const m = {
      circle: `<circle cx="50" cy="50" r="40" ${st}/>`,
      square: `<rect x="12" y="12" width="76" height="76" rx="8" ${st}/>`,
      triangle: `<path d="M50 10 L92 86 L8 86Z" ${st}/>`,
      star: `<path d="${starPath(50, 54, 46, 20)}" ${st}/>`,
      heart: `<path d="${HEART}" ${st}/>`
    };
    return A.svg('0 0 100 100', m[kind] + (kind !== 'star' && kind !== 'heart' ? `<ellipse cx="36" cy="34" rx="10" ry="6" fill="#fff" opacity=".45" transform="rotate(-30 36 34)"/>` : ''));
  };

  A.toy = (kind, col) => {
    const sh = shade(col, -0.28), lt = shade(col, 0.4);
    const st = `stroke="${sh}" stroke-width="4" stroke-linejoin="round"`;
    const m = {
      ball: `<circle cx="50" cy="50" r="40" fill="${col}" ${st}/><path d="M14 40 Q50 62 86 40" fill="none" stroke="#fff" stroke-width="8"/><path d="M50 10 Q34 50 50 90" fill="none" stroke="#fff" stroke-width="6" opacity=".7"/>`,
      cube: `<rect x="12" y="12" width="76" height="76" rx="12" fill="${col}" ${st}/><rect x="26" y="26" width="48" height="48" rx="8" fill="${lt}"/><path d="${starPath(50, 52, 18, 8)}" fill="${col}"/>`,
      car: `<g transform="translate(6 18) scale(.54)">${A.carG(col)}</g>`,
      star: `<path d="${starPath(50, 54, 44, 20)}" fill="${col}" ${st}/><circle cx="42" cy="50" r="4" fill="${INK}"/><circle cx="58" cy="50" r="4" fill="${INK}"/><path d="M43 60 Q50 66 57 60" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
      heart: `<path d="${HEART}" fill="${col}" ${st}/>`
    };
    return A.svg('0 0 100 100', m[kind]);
  };

  A.matryoshkaG = (col) => {
    const sh = shade(col, -0.28);
    return `<path d="M50 6 C28 6 22 28 26 46 C12 68 10 116 26 130 Q50 140 74 130 C90 116 88 68 74 46 C78 28 72 6 50 6Z" fill="${col}" stroke="${sh}" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="50" cy="38" rx="19" ry="17" fill="#ffe8d6" stroke="${sh}" stroke-width="2"/>
    <path d="M32 30 Q50 16 68 30 Q60 22 50 22 Q40 22 32 30Z" fill="#8d5a33"/>
    <circle cx="43" cy="38" r="2.8" fill="${INK}"/><circle cx="57" cy="38" r="2.8" fill="${INK}"/>
    <circle cx="39" cy="45" r="4" fill="#ff7a8a" opacity=".7"/><circle cx="61" cy="45" r="4" fill="#ff7a8a" opacity=".7"/>
    <path d="M45 48 Q50 52 55 48" fill="none" stroke="#c43c41" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="50" cy="96" rx="22" ry="26" fill="#fff6e0" stroke="${sh}" stroke-width="2"/>
    <circle cx="50" cy="92" r="8" fill="${col}"/><circle cx="50" cy="92" r="3.5" fill="#ffd23f"/>
    <path d="M50 100 L50 114 M50 106 Q42 102 40 108 M50 106 Q58 102 60 108" stroke="#41a85f" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  };
  A.matryoshka = (col) => A.svg('0 0 100 140', A.matryoshkaG(col));

  A.plate = (guest) => A.svg('0 0 140 170', `${guest ? `<g transform="translate(30 0) scale(.4)">${guest}</g>` : ''}
    <ellipse cx="70" cy="128" rx="62" ry="34" fill="#fff" stroke="#c9d8e6" stroke-width="4"/>
    <ellipse cx="70" cy="128" rx="42" ry="21" fill="none" stroke="#e3edf6" stroke-width="4"/>`);

  A.balloonG = (col = '#ff5a5f') => `<path d="M60 116 Q52 136 64 150 Q72 160 62 172" fill="none" stroke="#9aa3b0" stroke-width="3"/>
    <path d="M54 112 L66 112 L60 104Z" fill="${shade(col, -0.2)}"/>
    <ellipse cx="60" cy="58" rx="48" ry="54" fill="${col}" stroke="${shade(col, -0.2)}" stroke-width="4"/>
    <ellipse cx="40" cy="36" rx="10" ry="16" fill="#fff" opacity=".45" transform="rotate(25 40 36)"/>`;

  A.moonG = () => `<path d="M80 10 A56 56 0 1 0 136 96 A44 44 0 1 1 80 10Z" fill="#ffe99a" stroke="#f5c542" stroke-width="4"/>
    <path d="M58 70 Q66 76 74 70" fill="none" stroke="#b08a1e" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M64 92 Q72 98 80 92" fill="none" stroke="#b08a1e" stroke-width="3" stroke-linecap="round"/>
    <circle cx="54" cy="82" r="6" fill="#ffb3a0" opacity=".6"/>`;

  A.pyramidIcon = () => A.svg('0 0 100 100', `<rect x="46" y="12" width="8" height="74" rx="4" fill="#caa27a"/>
    <rect x="18" y="70" width="64" height="14" rx="7" fill="#ff5a5f"/><rect x="24" y="56" width="52" height="14" rx="7" fill="#ffb400"/>
    <rect x="30" y="42" width="40" height="14" rx="7" fill="#ffe14d"/><rect x="36" y="28" width="28" height="14" rx="7" fill="#41d17a"/>
    <circle cx="50" cy="20" r="9" fill="#3fa7ff"/><rect x="12" y="84" width="76" height="8" rx="4" fill="#b27b4e"/>`);

  // ---------- картинки для «протри» (класс dirty = где грязь) ----------
  A.rub = {
    win1() {
      const id = nid('w');
      const rb = ['#ff5a5f', '#ffb400', '#ffe14d', '#41d17a', '#3fa7ff', '#b774ff'];
      return A.svg('0 0 260 330', `<defs><clipPath id="${id}"><rect x="24" y="24" width="212" height="282" rx="96"/></clipPath></defs>
      <rect x="2" y="2" width="256" height="326" rx="118" fill="#eef2f7" stroke="#c9d3df" stroke-width="4"/>
      <rect class="dirty" x="24" y="24" width="212" height="282" rx="96" fill="#8fd3ff"/>
      <g clip-path="url(#${id})">
        ${rb.map((c, i) => `<circle cx="130" cy="300" r="${150 - i * 13}" fill="none" stroke="${c}" stroke-width="13"/>`).join('')}
        <circle cx="130" cy="300" r="70" fill="#8fd3ff"/>
        ${A.sunG(180, 90, 26)}
        <g transform="translate(20 120) scale(.8)">${A.cloud()}</g><g transform="translate(120 180) scale(.7)">${A.cloud()}</g>
        ${emo('🐦', 70, 70, 28)}
      </g>`);
    },
    win2() {
      const id = nid('w');
      return A.svg('0 0 320 260', `<defs><clipPath id="${id}"><rect x="20" y="20" width="280" height="220" rx="30"/></clipPath></defs>
      <rect x="2" y="2" width="316" height="256" rx="40" fill="#e0e6ee" stroke="#b9c4d2" stroke-width="4"/>
      <rect class="dirty" x="20" y="20" width="280" height="220" rx="30" fill="#bfe6ff"/>
      <g clip-path="url(#${id})">
        <path d="M0 150 Q80 120 160 140 T320 130 L320 260 L0 260Z" fill="#7ed957"/>
        <path d="M0 190 Q100 170 200 185 T320 180 L320 260 L0 260Z" fill="#5cc23b"/>
        ${A.sunG(250, 64, 22)}
        <g transform="translate(40 30) scale(.7)">${A.cloud()}</g>
        ${emo('🐄', 110, 170, 54)}${emo('🐄', 220, 200, 44)}${emo('🌳', 40, 140, 56)}${emo('🌻', 280, 222, 30)}${emo('🐑', 170, 212, 34)}
      </g>`);
    },
    paws() {
      const f = '#b27b4e', sh = '#8d5a33', lt = '#f1d2a8';
      const paw = (x, r) => `<g transform="translate(${x} 0) rotate(${r} 70 150)">
        <rect x="42" y="150" width="56" height="90" rx="20" fill="${f}" stroke="${sh}" stroke-width="4"/>
        <ellipse class="dirty" cx="70" cy="120" rx="58" ry="62" fill="${f}" stroke="${sh}" stroke-width="4"/>
        <ellipse cx="70" cy="136" rx="28" ry="22" fill="${lt}"/>
        <circle cx="36" cy="92" r="11" fill="${lt}"/><circle cx="58" cy="76" r="11" fill="${lt}"/><circle cx="82" cy="76" r="11" fill="${lt}"/><circle cx="104" cy="92" r="11" fill="${lt}"/></g>`;
      return A.svg('0 0 320 240', paw(10, -12) + paw(170, 12));
    },
    apple() {
      return A.svg('0 0 240 240', `<path d="M120 60 Q118 30 132 16" fill="none" stroke="#7a4a22" stroke-width="8" stroke-linecap="round"/>
      <path d="M126 36 Q158 12 184 30 Q160 54 126 36Z" fill="#41c46a" stroke="#2b9a4d" stroke-width="3"/>
      <path class="dirty" d="M120 66 C80 40 20 60 24 126 C28 190 80 230 120 212 C160 230 212 190 216 126 C220 60 160 40 120 66Z" fill="#ff4d4d" stroke="#c9302c" stroke-width="5"/>
      <ellipse cx="72" cy="104" rx="14" ry="26" fill="#fff" opacity=".45" transform="rotate(20 72 104)"/>`);
    },
    teeth() {
      const f = '#b27b4e', sh = '#8d5a33', lt = '#f1d2a8';
      let t = '';
      for (let i = 0; i < 6; i++) t += `<rect class="dirty" x="${62 + i * 33}" y="96" width="30" height="36" rx="9" fill="#fff" stroke="#d7cfc4" stroke-width="3"/>`;
      for (let i = 0; i < 5; i++) t += `<rect class="dirty" x="${78 + i * 33}" y="176" width="30" height="30" rx="9" fill="#fff" stroke="#d7cfc4" stroke-width="3"/>`;
      return A.svg('0 0 320 260', `<ellipse cx="160" cy="130" rx="158" ry="126" fill="${f}" stroke="${sh}" stroke-width="4"/>
      <ellipse cx="160" cy="150" rx="130" ry="96" fill="${lt}"/>
      <ellipse cx="160" cy="58" rx="22" ry="15" fill="#3b2a2a"/>
      <path d="M50 96 Q160 76 270 96 Q260 226 160 226 Q60 226 50 96Z" fill="#7a2233" stroke="${INK}" stroke-width="4"/>
      <ellipse cx="160" cy="196" rx="60" ry="22" fill="#ff8fa3"/>${t}`);
    },
    bunnyTeeth() {
      return A.svg('0 0 320 260', `<ellipse cx="160" cy="120" rx="156" ry="118" fill="#fff" stroke="#d8c6e6" stroke-width="4"/>
      <ellipse cx="90" cy="90" rx="28" ry="18" fill="#ff8fa3" opacity=".5"/><ellipse cx="230" cy="90" rx="28" ry="18" fill="#ff8fa3" opacity=".5"/>
      <path d="M140 50 L180 50 L160 72Z" fill="#ff6f91" stroke="#ff6f91" stroke-width="6" stroke-linejoin="round"/>
      <path d="M100 96 Q130 116 160 96 Q190 116 220 96 Q210 150 160 150 Q110 150 100 96Z" fill="#7a2233" stroke="${INK}" stroke-width="4"/>
      <rect class="dirty" x="116" y="96" width="42" height="70" rx="12" fill="#fff" stroke="#d7cfc4" stroke-width="4"/>
      <rect class="dirty" x="162" y="96" width="42" height="70" rx="12" fill="#fff" stroke="#d7cfc4" stroke-width="4"/>`);
    }
  };

  // ---------- картинки для пазлов (300×300) ----------
  A.pics = {
    pzPlane: () => `<rect width="300" height="300" fill="#9ddcff"/>${A.sunG(240, 60, 30)}
      <g transform="translate(10 40) scale(.9)">${A.cloud()}</g><g transform="translate(160 200) scale(1.1)">${A.cloud()}</g><g transform="translate(-10 210) scale(.8)">${A.cloud()}</g>
      <g transform="translate(30 110) scale(1)">${A.planeG('#ff6b6b')}</g>`,
    pzBeach: () => `<rect width="300" height="300" fill="#9ddcff"/><rect y="150" width="300" height="70" fill="#3fa7ff"/>
      <path d="M0 160 Q30 150 60 160 T120 160 T180 160 T240 160 T300 160" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/>
      <path d="M0 215 Q150 190 300 215 L300 300 L0 300Z" fill="#ffe0a3"/>${A.sunG(60, 60, 30)}
      <g transform="translate(150 130) scale(.62)">${A.K.bublik('happy')}</g>${emo('🪣', 70, 250, 50)}${emo('⭐', 260, 265, 34)}${emo('🐚', 40, 285, 26)}${emo('⛵', 230, 150, 40)}`,
    pzKittens: () => `<rect width="300" height="300" fill="#c7f0ff"/><path d="M0 220 Q150 196 300 220 L300 300 L0 300Z" fill="#7ed957"/>
      ${emo('🌼', 30, 270, 30)}${emo('🌷', 270, 260, 30)}${emo('🌼', 150, 285, 22)}
      <g transform="translate(2 110) scale(.52)">${A.K.bublik('happy')}</g><g transform="translate(96 96) scale(.56)">${A.K.iriska('happy')}</g><g transform="translate(196 124) scale(.46)">${A.K.ponchik('happy')}</g>
      <g transform="translate(90 10) scale(.9)">${A.cloud()}</g>`,
    pzFriends: () => `<rect width="300" height="300" fill="#fff4c7"/><path d="M0 230 Q150 206 300 230 L300 300 L0 300Z" fill="#8ee06a"/>
      ${A.sunG(250, 55, 26)}${emo('🌳', 50, 110, 90)}
      <g transform="translate(20 120) scale(.66)">${A.bear('happy')}</g><g transform="translate(160 124) scale(.64)">${A.bunny('happy')}</g>
      ${emo('🍯', 150, 270, 36)}${emo('🥕', 270, 275, 30)}`,
    pzHouse: () => A.coloredPic('house'),
    pzFrog: () => `<rect width="300" height="300" fill="#e7d9ff"/>${[0, 1, 2, 3, 4].map(i => `<path d="M${30 + i * 60} 0 L${60 + i * 60} 300" stroke="#fff" stroke-width="20" opacity=".35"/>`).join('')}
      <rect y="232" width="300" height="68" fill="#b774ff"/><g transform="translate(60 50) scale(.9)">${A.frog('happy')}</g>
      ${emo('🎵', 40, 60, 40)}${emo('🎶', 260, 80, 40)}${emo('🥁', 250, 250, 44)}${emo('🎸', 40, 250, 44)}`
  };

  // ---------- раскраски ----------
  // Каждая область: class="rg" data-g="имя группы". Всё, что с pointer-events none, — контур.
  const S = 'stroke="#3b2f4a" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
  const rg = (g, el) => el.replace(/^<(\w+)/, `<$1 class="rg" data-g="${g}" fill="#fff" ${S}`);
  A.COLORING = {
    plane: {
      vb: '0 0 400 320', title: 'Самолёт',
      body: () => [
        rg('sun', `<circle cx="70" cy="64" r="36"/>`),
        rg('cloud1', `<path d="M250 60 a22 22 0 0 1 36 -18 a28 28 0 0 1 50 10 a20 20 0 0 1 6 38 h-86 a18 18 0 0 1 -6 -30z"/>`),
        rg('cloud2', `<path d="M40 250 a20 20 0 0 1 32 -16 a26 26 0 0 1 46 8 a18 18 0 0 1 4 34 h-78 a16 16 0 0 1 -4 -26z"/>`),
        rg('tail', `<path d="M78 150 L56 82 L100 82 L140 148Z"/>`),
        rg('body', `<path d="M64 176 Q64 146 104 144 L300 140 Q356 144 372 176 Q356 206 300 210 L104 210 Q64 208 64 176Z"/>`),
        rg('back', `<path d="M86 172 L44 182 L54 198 L106 186Z"/>`),
        rg('wing', `<path d="M170 186 L250 186 L200 262 L160 262Z"/>`),
        rg('cockpit', `<path d="M320 152 Q350 156 362 172 L326 172Z"/>`),
        rg('win', `<circle cx="150" cy="168" r="13"/>`), rg('win', `<circle cx="190" cy="168" r="13"/>`), rg('win', `<circle cx="230" cy="168" r="13"/>`), rg('win', `<circle cx="270" cy="168" r="13"/>`)
      ].join(''),
      preset: { sun: '#ffd23f', cloud1: '#e8f6ff', cloud2: '#e8f6ff', tail: '#ff5a5f', body: '#fff', back: '#ff5a5f', wing: '#3fa7ff', cockpit: '#8fd3ff', win: '#8fd3ff' }
    },
    butterfly: {
      vb: '0 0 400 340', title: 'Бабочка',
      body: () => [
        rg('w1', `<path d="M196 150 C150 40 40 40 50 120 C58 170 130 176 196 160Z"/>`),
        rg('w2', `<path d="M204 150 C250 40 360 40 350 120 C342 170 270 176 204 160Z"/>`),
        rg('w3', `<path d="M196 170 C130 170 70 220 100 270 C130 310 180 260 196 190Z"/>`),
        rg('w4', `<path d="M204 170 C270 170 330 220 300 270 C270 310 220 260 204 190Z"/>`),
        rg('spots', `<circle cx="110" cy="110" r="20"/>`), rg('spots', `<circle cx="290" cy="110" r="20"/>`),
        rg('spots2', `<circle cx="136" cy="236" r="15"/>`), rg('spots2', `<circle cx="264" cy="236" r="15"/>`),
        `<path d="M194 88 Q176 50 160 40 M206 88 Q224 50 240 40" fill="none" ${S} style="pointer-events:none"/>`,
        rg('body', `<ellipse cx="200" cy="180" rx="16" ry="74"/>`),
        rg('head', `<circle cx="200" cy="96" r="22"/>`),
        rg('tips', `<circle cx="158" cy="38" r="10"/>`), rg('tips', `<circle cx="242" cy="38" r="10"/>`)
      ].join(''),
      preset: { w1: '#ff7eb6', w2: '#ff7eb6', w3: '#b774ff', w4: '#b774ff', spots: '#ffe14d', spots2: '#3fa7ff', body: '#8d5a3b', head: '#8d5a3b', tips: '#ff5a5f' }
    },
    house: {
      vb: '0 0 400 360', title: 'Домик',
      body: () => [
        rg('sun', `<circle cx="340" cy="56" r="32"/>`),
        rg('ground', `<path d="M0 318 Q200 290 400 318 L400 360 L0 360Z"/>`),
        rg('chimney', `<rect x="236" y="70" width="34" height="60"/>`),
        rg('wall', `<rect x="90" y="170" width="200" height="140"/>`),
        rg('roof', `<path d="M70 176 L190 70 L310 176Z"/>`),
        rg('door', `<path d="M165 310 L165 240 Q190 214 215 240 L215 310Z"/>`),
        rg('window', `<rect x="108" y="196" width="44" height="44" rx="4"/>`), rg('window', `<rect x="228" y="196" width="44" height="44" rx="4"/>`),
        rg('roofwin', `<circle cx="190" cy="132" r="18"/>`),
        rg('trunk', `<rect x="26" y="230" width="22" height="80"/>`),
        rg('tree', `<circle cx="37" cy="206" r="36"/>`),
        `<path d="M108 218 H152 M130 196 V240 M228 218 H272 M250 196 V240" fill="none" ${S} style="pointer-events:none"/>`
      ].join(''),
      preset: { sun: '#ffd23f', ground: '#7ed957', chimney: '#8d5a3b', wall: '#ffe0a3', roof: '#ff5a5f', door: '#b27b4e', window: '#8fd3ff', roofwin: '#8fd3ff', trunk: '#8d5a3b', tree: '#41c46a' }
    }
  };
  // Раскраска с готовыми цветами — для пазла и печати-образца
  A.coloredPic = (name) => {
    const c = A.COLORING[name];
    const body = c.body().replace(/class="rg" data-g="(\w+)" fill="#fff"/g, (m, g) => `data-g="${g}" fill="${c.preset[g] || '#fff'}"`);
    const [, , w, h] = c.vb.split(' ').map(Number);
    return `<rect width="300" height="300" fill="#fff8e7"/><g transform="translate(${(300 - w * 0.72) / 2} ${(300 - h * 0.72) / 2}) scale(.72)">${body}</g>`;
  };
})();
