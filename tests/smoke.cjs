// Headless smoke test: runs every chapter to its win screen against a mock canvas.
// Fails on any thrown error, NaN/negative radius passed to the canvas, or a chapter that cannot be won.
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, "..", "public", "game.js"), "utf8").replace(/^import[^\n]*\n/, "").replace("export class Component", "class Component");
const bad = (n) => typeof n !== 'number' || !isFinite(n);
function ctx() {
  const base = {
    arc(x, y, r) { assert(!bad(x) && !bad(y) && !bad(r) && r >= 0, 'arc ' + [x, y, r]); },
    ellipse(x, y, rx, ry) { assert(!bad(x) && !bad(y) && rx >= 0 && ry >= 0, 'ellipse ' + [x, y, rx, ry]); },
    drawImage(img, ...a) { assert(img && a.every((n) => !bad(n)), 'drawImage ' + a); },
    fillRect(...a) { assert(a.every((n) => !bad(n)), 'fillRect ' + a); },
    moveTo(...a) { assert(a.every((n) => !bad(n)), 'moveTo ' + a); },
    lineTo(...a) { assert(a.every((n) => !bad(n)), 'lineTo ' + a); },
    createRadialGradient(...a) { assert(a.every((n) => !bad(n)) && a[2] >= 0 && a[5] >= 0, 'radial ' + a); return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
  };
  return new Proxy(base, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { if (k === 'globalAlpha' || k === 'lineWidth') assert(!bad(v), k + ' ' + v); return true; } });
}
const canvas = () => ({ width: 0, height: 0, getContext: ctx, addEventListener() {}, removeEventListener() {}, focus() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) });
global.document = { createElement: canvas, querySelector: () => null };
global.requestAnimationFrame = () => 1; global.cancelAnimationFrame = () => {};

class DCLogic { constructor() { this.props = {}; this.state = null; } setState(s) { this.state = Object.assign({}, this.state, s); this.renderVals(); } }
const Component = new Function('DCLogic', src + '; return Component;')(DCLogic);

for (const difficulty of ['Story', 'Relentless']) {
  const g = new Component(); g.props = { difficulty };
  g.renderVals(); g.attach(canvas());
  let ts = 0; const step = (n) => { for (let i = 0; i < n; i++) { ts += 1000 / 60; g.frame(ts); } };
  step(120); // title scene
  for (let ch = 0; ch < 6; ch++) {
    g.startChapter(ch);
    while (g.mode === 'cut') { step(90); g.cutAdvance(); }
    assert.strictEqual(g.state.screen, 'brief'); step(30);
    g.beginPlay(); g.setPause(true); step(5); g.setPause(false);
    let frames = 0;
    while (g.state.screen === 'play' && frames < 60 * 400) {
      const G = g.G, h = G.H[G.act], f = frames++;
      // scripted player: walks in circles attacking, uses every ability, and "cheats" toward objectives
      g.keys = { d: f % 240 < 120, a: f % 240 >= 120, w: f % 180 < 60, s: f % 180 > 120, e: true };
      g.mouse = { x: 640 + Math.cos(f / 30) * 300, y: 360 + Math.sin(f / 30) * 200, down: true };
      if (f % 97 === 0) g.onTap('q'); if (f % 61 === 0) g.onTap(' '); if (f % 131 === 0) { G.ult = 100; g.onTap('f'); }
      if (f % 45 === 0) { const q = G.K.find((k) => !k.got), it = G.I.find((i) => i.on && !i.done); const t = q || it; if (t) { h.x = t.x; h.y = t.y; } }
      if (f % 20 === 0) for (const e of G.E) if (!e.dead) g.hit(G, e, 60, 10, 10);
      if (f % 300 === 150) g.hurt(G, G.H[1 - G.act], 400); // exercise fall and rebirth
      if (f % 7 === 0) for (const p of G.H) p.inv = Math.max(p.inv, 0.2); // keep the bot alive so the win path is reached
      step(1);
    }
    assert.strictEqual(g.state.screen, 'win', `chapter ${ch + 1} (${difficulty}) ended on "${g.state.screen}" after ${frames} frames: ${g.state.failWhy || ''}`);
    step(30); console.log(`ok  ${difficulty.padEnd(10)} chapter ${ch + 1}  ${g.state.statTime}  kills ${g.state.statKills}`);
  }
  g.nextChapter(); while (g.mode === 'cut') { step(90); g.cutAdvance(); }
  assert.strictEqual(g.state.screen, 'end'); g.toTitle(); step(30);
}
// fail paths
const g = new Component(); g.renderVals(); g.attach(canvas()); let ts = 0;
const run = (n) => { for (let i = 0; i < n; i++) { ts += 1000 / 60; g.frame(ts); } };
g.startMission(0, true); g.hurt(g.G, g.G.H[0], 999); g.hurt(g.G, g.G.H[1], 999); run(3); assert.strictEqual(g.state.screen, 'fail');
g.h.retry(); assert.strictEqual(g.state.screen, 'play');
g.startMission(4, true); g.G.t = 149.9; run(30); assert.strictEqual(g.state.screen, 'fail');
g.startMission(2, true); g.G.core.hp = 0; run(3); assert.strictEqual(g.state.screen, 'fail');
console.log('ok  fail paths');
