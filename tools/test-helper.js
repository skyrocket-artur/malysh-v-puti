// Только для проверки в браузере: имитация касаний и перетаскиваний. В игру не подключается.
window.T = {
  ev(type, el, x, y) { el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, clientX: x, clientY: y, isPrimary: true, pointerType: 'touch' })); },
  c(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; },
  tap(el) { const [x, y] = this.c(el); this.ev('pointerdown', el, x, y); this.ev('pointerup', el, x, y); el.dispatchEvent(new MouseEvent('click', { bubbles: true })); },
  sleep: ms => new Promise(r => setTimeout(r, ms)),
  async drag(el, to, steps = 8) {
    const [x0, y0] = this.c(el); const [x1, y1] = Array.isArray(to) ? to : this.c(to);
    this.ev('pointerdown', el, x0, y0);
    for (let i = 1; i <= steps; i++) { this.ev('pointermove', el, x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await this.sleep(16); }
    this.ev('pointerup', el, x1, y1); await this.sleep(450);
  },
  async until(fn, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { const v = fn(); if (v) return v; await this.sleep(100); } return null; },
  async go(id) {
    G.game.playLevel(G.LEVELS.find(l => l.id === id)); await this.sleep(300);
    await this.until(() => !document.querySelector('.host.big') && document.querySelector('.area')?.children.length);
    await this.sleep(700); return id;
  },
  async boot() {
    G.FAST = true; G.store.data.settings.unlockAll = true;
    const p = document.querySelector('.play-btn'); if (p) p.click();
    await this.sleep(500); return 'booted';
  }
};
