import { DCLogic } from "./runtime.js";

export class Component extends DCLogic {
  renderVals() {
    if (!this.ready) this.boot();
    const s = this.state || { }, scr = s.screen || 'title', ci = s.chapter || 0, ch = this.CH[ci], hud = s.hud || { }, h = this.h;
    const R = ['I', 'II', 'III', 'IV', 'V', 'VI'];
    const pct = (v) => (v == null ? 100 : Math.max(0, Math.min(100, v))) + '%';
    const ult = hud.ult || 0;
    return {
      cvRef: this.cvRef,
      isTitle: scr === 'title', isChapters: scr === 'chapters', isCut: scr === 'cut', isBrief: scr === 'brief', isPlay: scr === 'play', isPause: scr === 'pause', isFail: scr === 'fail', isWin: scr === 'win', isEnd: scr === 'end',
      begin: h.begin, openChapters: h.openChapters, backTitle: h.backTitle, cutNext: h.cutNext, cutSkip: h.cutSkip, deploy: h.deploy, pause: h.pause, resume: h.resume, retry: h.retry, next: h.next,
      chapters: this.CH.map((c, i) => ({ num: R[i], name: c.name, place: c.place, pick: this.picks[i] })),
      chNum: 'Chapter ' + R[ci], chName: ch.name, chPlace: ch.place, chBrief: ch.brief, chOutro: ch.outro,
      goals: ch.goals.map((g) => ({ text: g })),
      nextLabel: ci < 5 ? 'Next chapter' : 'Epilogue',
      cutTitle: s.cutTitle || '', cutText: s.cutText || '', cutCount: s.cutCount || '',
      failWhy: s.failWhy || '', statTime: s.statTime || '0:00', statKills: s.statKills || '0', statReborn: s.statReborn || '0',
      obj: hud.obj || '', sub: hud.sub || '', timer: hud.timer || '', hasTimer: !!hud.timer,
      hasBar: hud.bar != null, barW: pct(hud.bar), barLabel: hud.barLabel || '',
      hasBoss: hud.boss != null, bossW: pct(hud.boss),
      aW: pct(hud.a), bW: pct(hud.b),
      aTag: hud.da ? 'Reborn in ' + hud.da : hud.act === 1 ? 'At your side' : 'You',
      bTag: hud.db ? 'Reborn in ' + hud.db : hud.act === 1 ? 'You' : 'At your side',
      aOp: hud.act === 1 ? '0.7' : '1', bOp: hud.act === 1 ? '1' : '0.7',
      ultW: pct(ult), ultTag: hud.sealed ? 'Suppressed' : ult >= 100 ? 'Ready · press F' : 'Gathering',
      hasToast: !!hud.toast, toast: hud.toast || '', hasHint: !!hud.hint, hint: hud.hint || ''
    };
  }

  componentDidMount() {
    if (!this.cv && typeof document !== 'undefined') { const el = document.querySelector('canvas[data-im-stage]'); if (el) this.attach(el); }
  }

  componentWillUnmount() { this.stop(); if (this.off) this.off(); this.off = null; this.cv = null; }

  // ---------------------------------------------------------------- setup
  boot() {
    this.ready = true;
    this.keys = { }; this.mouse = { x: 640, y: 360, down: false };
    this.P = []; this.L = []; this.Wt = []; this.spr = { }; this.tiles = { }; this.time = 0; this.dt = 0.016;
    this.mode = 'title'; this.scene = 'title'; this.sceneT = 0; this.lineT = 0; this.G = null; this.cut = null; this.chapter = 0;
    this.shake = 0; this.flash = 0; this.flashCol = '255,255,255'; this.slow = 0; this.lb = 0; this.bolt = 0; this.boltAt = -6;
    this.cvRef = (el) => this.attach(el);
    this.picks = [0, 1, 2, 3, 4, 5].map((i) => () => this.startChapter(i));
    this.h = {
      begin: this.picks[0], openChapters: () => this.setState({ screen: 'chapters' }), backTitle: () => this.toTitle(),
      cutNext: () => this.cutAdvance(), cutSkip: () => this.cutEnd(), deploy: () => this.beginPlay(),
      pause: () => this.setPause(true), resume: () => this.setPause(false),
      retry: () => this.startMission(this.chapter, true), next: () => this.nextChapter()
    };
    this.data();
  }

  data() {
    this.ET = {
      shade: { hp: 36, spd: 120, r: 14, h: 16, top: 42, dmg: 8, rng: 30, cd: 0.9, glow: '255,70,50' },
      brute: { hp: 170, spd: 76, r: 24, h: 28, top: 72, dmg: 17, rng: 44, cd: 1.4, glow: '255,110,40' },
      wraith: { hp: 44, spd: 168, r: 14, h: 18, top: 46, dmg: 9, rng: 30, cd: 0.8, glow: '190,110,255' },
      raider: { hp: 58, spd: 130, r: 14, h: 24, top: 56, dmg: 10, rng: 36, cd: 0.9 },
      archer: { hp: 40, spd: 106, r: 14, h: 24, top: 56, dmg: 8, rng: 400, cd: 1.9, shot: 400, keep: 310 },
      engine: { hp: 290, spd: 46, r: 30, h: 22, top: 66, dmg: 20, rng: 480, cd: 3.3, shell: 1, keep: 400 },
      soldier: { hp: 50, spd: 114, r: 14, h: 24, top: 56, dmg: 6, rng: 440, cd: 1.6, shot: 640, burst: 3, keep: 340 },
      drone: { hp: 32, spd: 190, r: 13, h: 46, top: 64, dmg: 5, rng: 310, cd: 1.2, shot: 520, keep: 240, fly: 1, glow: '255,60,60' },
      tank: { hp: 420, spd: 40, r: 34, h: 24, top: 64, dmg: 24, rng: 580, cd: 3.4, shell: 1, keep: 430 },
      pylon: { hp: 250, spd: 0, r: 22, h: 44, top: 100, dmg: 0, rng: 0, cd: 9, still: 1, glow: '255,60,60' },
      boss: { hp: 2600, spd: 0, r: 64, h: 74, top: 150, dmg: 0, rng: 0, cd: 9, still: 1, glow: '190,120,255' }
    };
    this.FP = {
      aro: { body: '#7a4a1c', trim: '#ffd27a', skin: '#c98a5a', hair: '#2a1a10', cape: '#b3541e', leg: '#3a2414' },
      ena: { body: '#2d3f7a', trim: '#cfe6ff', skin: '#e8c4a8', hair: '#e9eefc', cape: '#5b6fc0', leg: '#1c2748' },
      raider: { body: '#5a3a2a', trim: '#8a8a8a', skin: '#b88a6a', hair: '#1a1210', cape: '#3a2a22', leg: '#2a1c14' },
      archer: { body: '#3a4a2a', trim: '#b0a070', skin: '#b88a6a', hair: '#3a2a1a', cape: '#2a3a1e', leg: '#1e2414' },
      soldier: { body: '#3a4238', trim: '#1c201c', skin: '#b89a80', hair: '#2a2e2a', cape: '#2a302a', leg: '#1c201c' },
      white: { body: '#ffffff', trim: '#ffffff', skin: '#ffffff', hair: '#ffffff', cape: '#ffffff', leg: '#ffffff' }
    };
    this.PAL = {
      aurel: { base: '#1d3a3a', blobs: ['34,92,84', '22,60,70', '70,120,90', '120,110,60'], speck: '160,220,190', grade: ['60,120,140', '255,190,120'] },
      snow: { base: '#3a4660', blobs: ['90,105,140', '60,72,104', '130,146,180', '40,50,80'], speck: '220,230,255', grade: ['40,70,160', '20,30,80'] },
      field: { base: '#4a4a2a', blobs: ['96,98,48', '70,80,40', '130,112,60', '54,60,34'], speck: '210,200,130', grade: ['255,200,120', '120,90,60'] },
      earth: { base: '#20262c', blobs: ['40,48,54', '28,34,40', '36,52,44', '18,22,28'], speck: '120,140,150', grade: ['60,90,140', '10,20,40'] },
      lava: { base: '#2a1614', blobs: ['70,30,22', '40,20,18', '110,44,20', '20,12,12'], speck: '255,140,60', grade: ['255,110,50', '80,10,10'] },
      void: { base: '#141026', blobs: ['40,30,80', '24,18,50', '70,40,110', '10,8,22'], speck: '190,150,255', grade: ['150,100,255', '20,10,60'] }
    };
    this.PL = {
      aurel: { base: '#17535a', cols: ['#2f8f7a', '#1b6f8a', '#caa86a', '#e9f1ea', '#0f3d52'], atm: '110,220,230', seed: 11 },
      earth: { base: '#134a8c', cols: ['#2f7d4f', '#8a7a4f', '#f1f5fa', '#f1f5fa', '#0d3a78'], atm: '120,180,255', seed: 23 },
      dying: { base: '#3a1a14', cols: ['#6a2a1a', '#201010', '#8a3a1a', '#120a0a'], atm: '255,120,60', seed: 37 },
      husk: { base: '#2a2630', cols: ['#3a3440', '#1a1820', '#4a4050'], atm: '160,140,200', seed: 51 }
    };
    this.SC = {
      title: { neb: ['40,70,140', '120,60,40', '30,90,100'] }, genesis: { neb: ['60,50,120', '120,90,40', '30,80,110'] },
      night: { neb: ['30,40,110', '20,30,70'] }, ages: { neb: ['90,70,40', '30,60,110'] },
      earthfall: { neb: ['30,60,140', '60,40,120'], warp: 520 }, stars: { neb: ['140,40,20', '80,30,60'] },
      end: { neb: ['80,40,150', '30,20,80'] }, rewind: { neb: ['120,100,60', '60,80,150'] }
    };
    this.CH = [
      { name: 'First Breath', place: 'Aurel, the made world · the first morning', scene: 'genesis', pal: 'aurel', weather: 'spores', w: 2200, h: 1500, amb: [150, 160, 190],
        lines: ['Before the first morning, there was only the Maker.', 'From dust and silence it shaped a world, and named it Aurel.', 'Then it made two who could not die: Aro of the sun, and Ena of the moon.', 'It gave them no law but one. Endure.'],
        brief: 'The world is hours old. The Maker’s light still lies scattered across it like dew, and the two do not yet know what their hands are for.',
        goals: ['Gather the six motes of the Maker’s light', 'Scatter the Shades the light draws out'],
        outro: 'They learned that day what their hands were for. It was not a gentle lesson.' },
      { name: 'The First Flame', place: 'Aurel · the long night', scene: 'night', pal: 'snow', weather: 'snow', w: 2000, h: 1400, amb: [26, 32, 58],
        lines: ['The first night lasted a hundred years.', 'Cold could not kill them. It could only make forever feel longer.', 'So they went looking for the one thing the Maker never gave them.'],
        brief: 'No one has ever made fire. Flint lies under the snow, deadwood under the trees, and the Shades hunt anything that glows.',
        goals: ['Find two flints and three bundles of deadwood', 'Strike the first flame at the hearthstones', 'Keep it burning until dawn'],
        outro: 'Dawn found them warm for the first time. Every hearth since is a child of that one.' },
      { name: 'The Long Ages', place: 'Aurel · forty thousand years on', scene: 'ages', pal: 'field', weather: 'dust', w: 2200, h: 1500, amb: [215, 205, 185],
        lines: ['Others came after. Mortal, brief, and brilliant.', 'The two taught them fire. They taught the two how to grieve.', 'Ages turned like pages. Stone. Iron. Engines.', 'Every age found a new reason to burn the last one down.'],
        brief: 'A city has grown around the Beacon the two raised over the first hearth. Each age sends something new against it. Hold through all three.',
        goals: ['Defend the Beacon through the Age of Stone', 'Defend it through the Age of Iron', 'Defend it through the Age of Engines'],
        outro: 'The city outlived its builders, then its names, then its reasons. The two stayed.' },
      { name: 'Earthfall', place: 'Earth · a small, loud, blue world', scene: 'earthfall', pal: 'earth', weather: 'rain', w: 2600, h: 1600, amb: [30, 36, 56],
        lines: ['When Aurel grew quiet, they looked up.', 'Across the dark they found another world, blue and loud and afraid.', 'On Aurel they had been gods. Here they were something else.', 'Here, they were the aliens.'],
        brief: 'The vessel came down hard. Soldiers have ringed the crash site with three pylons that smother your light. Break them, and the vessel can wake.',
        goals: ['Destroy the three containment pylons', 'Survive the soldiers, drones and armor', 'Return to the vessel and leave'],
        outro: 'They did not hate the humans for it. They remembered being young and afraid of the dark.' },
      { name: 'The Dying Stars', place: 'Elsewhere · the last ages', scene: 'stars', pal: 'lava', weather: 'ash', w: 2400, h: 1500, amb: [78, 40, 34],
        lines: ['They wandered for longer than Earth had oceans.', 'World after world, they arrived in time for the ending.', 'Stars guttered. Seas boiled off into the dark.', 'They saved what they could carry.'],
        brief: 'This world has minutes left. Seven seeds of its life are still alive in the ash. Gather them and reach the rift before the ground goes.',
        goals: ['Gather seven seeds of life', 'Avoid the falling sky and the open ground', 'Reach the rift before the world breaks'],
        outro: 'Seven seeds, from a world no one else would ever know had lived.' },
      { name: 'The End of Making', place: 'Aurel · the last day', scene: 'end', pal: 'void', weather: 'void', w: 1700, h: 1100, amb: [46, 36, 78],
        lines: ['At last they came home, and home was ending too.', 'The Maker had gone silent. In its place stood the thing that waits at the end of everything.', 'It did not hate them. It was only the end.', 'They had endured everything else. They would endure this.'],
        brief: 'The Unmaking cannot be destroyed, only stilled for a breath. A breath is long enough to open a door.',
        goals: ['Still the Unmaking', 'Step through the last second, together'],
        outro: 'The door opened onto every morning they had ever seen.' }
    ];
    this.EPI = ['The end could not be killed. But it could be outrun.', 'They tore a door in the last second of the last day, and stepped backward.', 'Past the dying stars. Past Earth. Past engines, iron and stone. Past the first flame.', 'Before the first morning, there were two who remembered.'];
  }

  // ---------------------------------------------------------------- small helpers
  mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  opt(name, def) { const p = this.props || { }; return p[name] == null ? def : p[name]; }
  diff() { const d = this.opt('difficulty', 'Balanced'); return d === 'Story' ? 0.55 : d === 'Relentless' ? 1.45 : 1; }
  fmt(s) { const v = Math.max(0, Math.ceil(s)); return Math.floor(v / 60) + ':' + ('0' + (v % 60)).slice(-2); }
  say(G, text, dur) { G.toast = text; G.toastT = dur || 5; }
  stage(G, n) { G.stage = n; G.st = 0; }

  glow(col, soft) {
    const key = soft ? col + 's' : col; let s = this.spr[key]; if (s) return s;
    s = this.mk(64, 64); const g = s.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (soft) { gr.addColorStop(0, 'rgba(' + col + ',1)'); gr.addColorStop(0.5, 'rgba(' + col + ',0.42)'); gr.addColorStop(1, 'rgba(' + col + ',0)'); }
    else { gr.addColorStop(0, 'rgba(' + col + ',1)'); gr.addColorStop(0.22, 'rgba(' + col + ',0.6)'); gr.addColorStop(0.6, 'rgba(' + col + ',0.13)'); gr.addColorStop(1, 'rgba(' + col + ',0)'); }
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); this.spr[key] = s; return s;
  }
  blit(c, col, x, y, r, a, soft) { if (!(r > 0) || !(a > 0)) return; c.globalAlpha = a > 1 ? 1 : a; c.drawImage(this.glow(col, soft), x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; }

  emit(o) { if (this.P.length > 1400) return; this.P.push(Object.assign({ vx: 0, vy: 0, life: 1, t: 0, size: 6, col: '255,220,160', kind: 'glow', drag: 0, grav: 0, grow: 0 }, o)); }
  burst(x, y, n, col, sp, size, life, kind) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = sp * (0.3 + Math.random() * 0.7); this.emit({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col: col, size: size * (0.5 + Math.random()), life: life * (0.5 + Math.random() * 0.7), kind: kind || 'glow', drag: 2.5 }); }
  }
  ring(x, y, col, r, life, w) { this.emit({ x: x, y: y, kind: 'ring', col: col, size: 4, grow: r / life, life: life, w: w || 3 }); }
  light(G, x, y, r, col, life) { G.TL.push({ x: x, y: y, r: r, col: col, life: life, t: 0 }); }
  updateP(dt) {
    const P = this.P;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.t += dt;
      if (p.t >= p.life) { P[i] = P[P.length - 1]; P.pop(); continue; }
      const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.size += p.grow * dt;
    }
  }
  drawP(c, add) {
    const P = this.P;
    for (let i = 0; i < P.length; i++) {
      const p = P[i], a = 1 - p.t / p.life, k = p.kind;
      if (add) {
        if (k === 'glow') { const sz = Math.max(0.5, p.size); c.globalAlpha = a; c.drawImage(this.glow(p.col), p.x - sz, p.y - sz, sz * 2, sz * 2); }
        else if (k === 'spark') { c.globalAlpha = a; c.strokeStyle = 'rgb(' + p.col + ')'; c.lineWidth = Math.max(1, p.size * 0.35); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); c.stroke(); }
        else if (k === 'ring') { c.globalAlpha = a; c.strokeStyle = 'rgb(' + p.col + ')'; c.lineWidth = Math.max(0.5, p.w * a); c.beginPath(); c.arc(p.x, p.y, Math.max(1, p.size), 0, 6.283); c.stroke(); }
      } else if (k === 'smoke') { const sz = Math.max(0.5, p.size); c.globalAlpha = a * 0.4; c.drawImage(this.glow('26,24,30', 1), p.x - sz, p.y - sz, sz * 2, sz * 2); }
      else if (k === 'text') { c.globalAlpha = a; c.fillStyle = 'rgb(' + p.col + ')'; c.font = '600 ' + p.size + 'px "Barlow Semi Condensed", sans-serif'; c.textAlign = 'center'; c.fillText(p.txt, p.x, p.y); }
    }
    c.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- input and loop
  attach(el) {
    if (el === this.cv) return;
    if (this.off) { this.off(); this.off = null; }
    this.cv = el || null;
    if (!el) { this.stop(); return; }
    el.tabIndex = 0;
    const kd = (e) => this.onKey(e, true), ku = (e) => this.onKey(e, false);
    const pm = (e) => this.onPointer(e);
    const pd = (e) => { this.onPointer(e); if (!e.button) this.mouse.down = true; if (el.focus) el.focus(); if (this.mode === 'cut') this.cutAdvance(); };
    const pu = () => { this.mouse.down = false; };
    const bl = () => { this.keys = { }; this.mouse.down = false; };
    const cm = (e) => e.preventDefault();
    const Ls = [['keydown', kd], ['keyup', ku], ['pointermove', pm], ['pointerdown', pd], ['pointerup', pu], ['pointerleave', pu], ['blur', bl], ['contextmenu', cm]];
    Ls.forEach((p) => el.addEventListener(p[0], p[1]));
    this.off = () => Ls.forEach((p) => el.removeEventListener(p[0], p[1]));
    this.ctx = el.getContext('2d');
    this.start();
  }
  onPointer(e) { const r = this.cv.getBoundingClientRect(); if (!r.width || !r.height) return; this.mouse.x = (e.clientX - r.left) / r.width * 1280; this.mouse.y = (e.clientY - r.top) / r.height * 720; }
  onKey(e, down) {
    const k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['w', 'a', 's', 'd', 'q', 'e', 'f', 'j', 'p', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Enter'].indexOf(k) < 0) return;
    e.preventDefault();
    if (down && !this.keys[k]) this.onTap(k);
    this.keys[k] = down;
  }
  onTap(k) {
    const G = this.G;
    if (this.mode === 'cut') { if (k === ' ' || k === 'Enter') this.cutAdvance(); }
    else if (this.mode === 'play' && G) { if (k === 'q') this.swap(G); else if (k === ' ' || k === 'Shift') this.dash(G); else if (k === 'f') this.commune(G); else if (k === 'p') this.setPause(true); }
    else if (this.mode === 'pause' && k === 'p') this.setPause(false);
  }
  focus() { if (this.cv && this.cv.focus) this.cv.focus(); }
  start() { if (this.raf) return; this.last = 0; const step = (ts) => { this.raf = requestAnimationFrame(step); this.frame(ts); }; this.raf = requestAnimationFrame(step); }
  stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
  frame(ts) {
    let dt = this.last ? (ts - this.last) / 1000 : 0.016; this.last = ts; if (dt > 0.05) dt = 0.05; if (dt < 0) dt = 0;
    this.time += dt; this.dt = dt;
    const c = this.ctx; if (!c) return;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    if (this.G && (this.mode === 'play' || this.mode === 'pause' || this.mode === 'over')) {
      if (this.mode === 'play') this.update(dt); else if (this.mode === 'over') this.idle(dt * 0.4);
      if (this.G) this.renderWorld(c, this.mode === 'pause' ? 0 : dt);
    } else this.renderCosmos(c, dt);
    this.post(c, dt);
  }

  // ---------------------------------------------------------------- flow
  startChapter(i) {
    this.chapter = i; const ch = this.CH[i]; this.G = null; this.P.length = 0;
    this.playCut(ch.scene, ch.lines, 'Chapter ' + ['I', 'II', 'III', 'IV', 'V', 'VI'][i] + ' · ' + ch.name, () => this.startMission(i), i);
  }
  playCut(scene, lines, title, onEnd, chapter) {
    this.mode = 'cut'; this.scene = scene; this.sceneT = 0; this.lineT = 0; this.cut = { lines: lines, i: 0, onEnd: onEnd };
    this.setState({ screen: 'cut', chapter: chapter, cutTitle: title, cutText: lines[0], cutCount: '1 / ' + lines.length });
    this.focus();
  }
  cutAdvance() { const c = this.cut; if (!c) return; c.i++; this.lineT = 0; if (c.i >= c.lines.length) { this.cutEnd(); return; } this.setState({ cutText: c.lines[c.i], cutCount: (c.i + 1) + ' / ' + c.lines.length }); }
  cutEnd() { const c = this.cut; if (!c) return; this.cut = null; c.onEnd(); }
  startMission(i, again) {
    const ch = this.CH[i], rnd = this.rng(1000 + i * 77), pal = this.PAL[ch.pal];
    this.chapter = i;
    const G = this.G = { i: i, ch: ch, w: ch.w, h: ch.h, rnd: rnd, E: [], S: [], Z: [], K: [], I: [], FX: [], TL: [], props: [], blots: [], core: null, cam: { x: 0, y: 0 }, stage: 0, st: 0, t: 0, kills: 0, reborn: 0, ult: 0, amb: ch.amb.slice(), obj: '', sub: '', bar: null, barLabel: '', timer: null, toast: '', toastT: 0, act: 0, queue: [], spawnT: 0, got: 0, near: null, boss: null };
    G.H = [this.hero(0, ch.w / 2 - 30, ch.h / 2 + 50), this.hero(1, ch.w / 2 + 30, ch.h / 2 + 50)];
    for (let k = 0; k < 12; k++) G.blots.push({ x: rnd() * G.w, y: rnd() * G.h, r: 260 + rnd() * 320, col: pal.blobs[k % pal.blobs.length], a: 0.2 + rnd() * 0.2 });
    this.P.length = 0; this.weatherInit(); this.shake = 0; this.slow = 0; this.keys = { }; this.mouse.down = false;
    this['setup' + i](G);
    this.camera(G, 0, true);
    this.mode = 'over';
    if (again) this.beginPlay(); else this.setState({ screen: 'brief', chapter: i, hud: { } });
  }
  beginPlay() { if (!this.G) return; this.mode = 'play'; this.hudKey = ''; this.hudT = 0; this.setState({ screen: 'play' }); this.focus(); }
  setPause(on) {
    if (on && this.mode === 'play') { this.mode = 'pause'; this.setState({ screen: 'pause' }); }
    else if (!on && this.mode === 'pause') { this.mode = 'play'; this.keys = { }; this.setState({ screen: 'play' }); this.focus(); }
  }
  win(G) { if (this.mode !== 'play') return; this.mode = 'over'; this.setState({ screen: 'win', statTime: this.fmt(G.t), statKills: String(G.kills), statReborn: String(G.reborn) }); }
  fail(G, why) { if (this.mode !== 'play') return; this.mode = 'over'; this.setState({ screen: 'fail', failWhy: why }); }
  nextChapter() {
    if (this.chapter < 5) { this.startChapter(this.chapter + 1); return; }
    this.G = null; this.P.length = 0;
    this.playCut('rewind', this.EPI, 'Epilogue', () => { this.mode = 'title'; this.scene = 'title'; this.sceneT = 0; this.setState({ screen: 'end' }); }, 5);
  }
  toTitle() { this.mode = 'title'; this.scene = 'title'; this.sceneT = 0; this.G = null; this.cut = null; this.P.length = 0; this.setState({ screen: 'title' }); }

  // ---------------------------------------------------------------- world helpers
  hero(kind, x, y) { return { kind: kind, x: x, y: y, hp: 100, max: 100, face: 0, walk: 0, cd: 0, dashT: 0, dashCd: 0, dvx: 0, dvy: 0, mx: 0, my: 0, inv: 0, down: 0, flash: 0, safe: 9, swing: 0, lt: 0, name: kind ? 'Ena' : 'Aro', col: kind ? '130,190,255' : '255,186,90' }; }
  spawn(G, type, x, y, o) {
    const T = this.ET[type], hp = T.hp * (0.7 + 0.3 * this.diff());
    const e = Object.assign({ type: type, x: x, y: y, hp: hp, max: hp, r: T.r, h: T.h, face: 0, walk: Math.random() * 6, cd: 0.6 + Math.random(), hit: 0, kx: 0, ky: 0, wind: 0, burst: 0, bt: 0, side: Math.random() < 0.5 ? -1 : 1, pref: 'hero', dead: false, guard: 0 }, o || { });
    G.E.push(e); this.burst(x, y - e.h, 8, '26,24,30', 120, 14, 0.6, 'smoke'); return e;
  }
  near(G, x, y, rad) { const a = Math.random() * 6.283; return [Math.max(70, Math.min(G.w - 70, x + Math.cos(a) * rad)), Math.max(90, Math.min(G.h - 60, y + Math.sin(a) * rad))]; }
  enqueue(G, pref, type) { G.queue.push({ type: type, pref: pref }); }
  free(G, x, y, pad) {
    if (G.avoid) for (const a of G.avoid) if (Math.hypot(a[0] - x, a[1] - y) < a[2]) return false;
    for (const p of G.props) if (Math.hypot(p.x - x, p.y - y) < (p.r || 10) + pad) return false;
    for (const q of G.K) if (Math.hypot(q.x - x, q.y - y) < 70) return false;
    return true;
  }
  scatter(G, n, make, clear, pad) {
    const rn = G.rnd, cx = G.w / 2, cy = G.h / 2;
    for (let i = 0, tries = 0; i < n && tries < n * 40; tries++) {
      const x = 80 + rn() * (G.w - 160), y = 120 + rn() * (G.h - 180);
      if (Math.hypot(x - cx, y - cy) < clear || !this.free(G, x, y, pad || 60)) continue;
      const p = make(rn); p.x = x; p.y = y; G.props.push(p); i++;
    }
  }
  spots(G, n, minD, sep) {
    const out = [], rn = G.rnd; let tries = 0;
    while (out.length < n && tries++ < 5000) {
      const x = 150 + rn() * (G.w - 300), y = 170 + rn() * (G.h - 320);
      if (Math.hypot(x - G.w / 2, y - G.h / 2) < minD || !this.free(G, x, y, 50)) continue;
      let ok = true; for (const q of out) if (Math.hypot(q[0] - x, q[1] - y) < sep) { ok = false; break; }
      if (ok) out.push([x, y]);
    }
    return out;
  }
  bound(G, p, r) {
    for (const q of G.props) { if (!q.r) continue; const dx = p.x - q.x, dy = p.y - q.y, m = q.r + r, d2 = dx * dx + dy * dy; if (d2 < m * m && d2 > 0.01) { const d = Math.sqrt(d2); p.x = q.x + dx / d * m; p.y = q.y + dy / d * m; } }
    const co = G.core; if (co) { const dx = p.x - co.x, dy = p.y - co.y, m = co.r + r, d2 = dx * dx + dy * dy; if (d2 < m * m && d2 > 0.01) { const d = Math.sqrt(d2); p.x = co.x + dx / d * m; p.y = co.y + dy / d * m; } }
    p.x = Math.max(40, Math.min(G.w - 40, p.x)); p.y = Math.max(70, Math.min(G.h - 30, p.y));
  }
  target(G, e) {
    let best = null, bd = 1e9;
    for (const p of G.H) { if (p.down > 0) continue; const d = Math.hypot(p.x - e.x, p.y - e.y); if (d < bd) { bd = d; best = p; } }
    const c = G.core;
    if (c && c.hp > 0 && (e.pref === 'core' ? bd > 130 : !best)) return { x: c.x, y: c.y, r: c.r, core: true, ref: null };
    if (best) return { x: best.x, y: best.y, r: 12, core: false, ref: best };
    return null;
  }

  // ---------------------------------------------------------------- combat
  hurt(G, p, dmg) {
    if (p.down > 0 || p.inv > 0) return;
    const me = p === G.H[G.act];
    p.hp -= dmg * this.diff(); p.flash = 1; p.safe = 0; this.shake = Math.max(this.shake, me ? 7 : 2);
    this.burst(p.x, p.y - 26, 8, p.col, 220, 5, 0.4, 'spark');
    if (me) { this.flash = Math.max(this.flash, 0.14); this.flashCol = '255,60,40'; }
    if (p.hp <= 0) this.fall(G, p);
  }
  fall(G, p) {
    p.hp = 0; p.down = 5; G.reborn++;
    this.burst(p.x, p.y - 20, 22, '26,24,30', 160, 22, 1.1, 'smoke'); this.burst(p.x, p.y - 20, 26, p.col, 260, 7, 0.9); this.ring(p.x, p.y - 20, p.col, 120, 0.5, 4);
    const o = G.H[1 - p.kind]; if (G.act === p.kind && o.down <= 0) G.act = o.kind;
    this.say(G, p.name + ' falls to ash. An immortal does not stay fallen.', 4);
  }
  rise(G, p) {
    p.down = 0; p.hp = p.max; p.inv = 1.6; p.flash = 1;
    for (let i = 0; i < 26; i++) this.emit({ x: p.x + (Math.random() - 0.5) * 20, y: p.y - Math.random() * 30, vy: -160 - Math.random() * 220, col: p.col, size: 8 + Math.random() * 8, life: 0.8 });
    this.ring(p.x, p.y - 20, p.col, 160, 0.5, 4); this.light(G, p.x, p.y - 20, 320, p.col, 0.6);
  }
  hit(G, e, dmg, kx, ky) {
    if (e.dead) return;
    const T = this.ET[e.type]; e.hp -= dmg; e.hit = 1; e.guard = 0;
    if (!T.still) { const m = 1 + e.r / 20; e.kx += kx / m; e.ky += ky / m; }
    G.ult = Math.min(100, G.ult + dmg * 0.11);
    this.burst(e.x, e.y - e.h, 5, '255,232,190', 240, 5, 0.3, 'spark');
    this.emit({ kind: 'text', txt: String(Math.round(dmg)), x: e.x + (Math.random() - 0.5) * 18, y: e.y - T.top, vy: -52, life: 0.6, col: '255,240,205', size: 16 });
    if (e.hp <= 0) this.kill(G, e);
  }
  kill(G, e) {
    if (e.dead) return;
    e.dead = true; G.kills++; const col = this.ET[e.type].glow || '255,205,150';
    this.burst(e.x, e.y - e.h, 14 + e.r, col, 320, 9, 0.6); this.burst(e.x, e.y - e.h, 6, '26,24,30', 110, 18, 0.8, 'smoke');
    this.ring(e.x, e.y - e.h, col, 60 + e.r * 2, 0.35, 3); this.light(G, e.x, e.y - e.h, 200, col, 0.35);
    if (e.r > 20) this.shake = Math.max(this.shake, 9);
  }
  coreHurt(G, dmg) {
    const c = G.core; if (!c || c.hp <= 0) return;
    c.hp = Math.max(0, c.hp - dmg * this.diff()); c.flash = 1;
    this.burst(c.x, c.y - 20, 6, '255,200,120', 200, 5, 0.35, 'spark');
  }
  heroAttack(G, h, ang, pl) {
    const cx = Math.cos(ang), cy = Math.sin(ang), oy = h.y - 26;
    if (h.kind === 0) {
      h.cd = pl ? 0.36 : 0.62; h.swing = 1;
      G.FX.push({ kind: 'slash', x: h.x, y: oy, a: ang, t: 0, life: 0.2, col: h.col, r: 78 });
      for (const e of G.E) {
        if (e.dead) continue;
        const dx = e.x - h.x, dy = e.y - e.h - oy, d = Math.hypot(dx, dy); if (d > 106 + e.r) continue;
        const da = Math.atan2(Math.sin(Math.atan2(dy, dx) - ang), Math.cos(Math.atan2(dy, dx) - ang));
        if (Math.abs(da) < 1.05 || d < e.r + 22) this.hit(G, e, pl ? 30 : 22, cx * 250, cy * 250);
      }
      for (const s of G.S) {
        if (!s.foe || s.life <= 0) continue;
        const dx = s.x - h.x, dy = s.y - oy; if (Math.hypot(dx, dy) > 100) continue;
        const da = Math.atan2(Math.sin(Math.atan2(dy, dx) - ang), Math.cos(Math.atan2(dy, dx) - ang));
        if (Math.abs(da) < 1.15) { s.life = 0; this.burst(s.x, s.y, 6, h.col, 200, 5, 0.3, 'spark'); }
      }
      for (let i = 0; i < 5; i++) { const a = ang + (Math.random() - 0.5) * 1.8; this.emit({ x: h.x + Math.cos(a) * 74, y: oy + Math.sin(a) * 74, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, col: h.col, size: 5, life: 0.25, kind: 'spark' }); }
    } else {
      h.cd = pl ? 0.19 : 0.44;
      G.S.push({ x: h.x + cx * 20, y: oy + cy * 20, vx: cx * 780, vy: cy * 780, dmg: pl ? 13 : 10, r: 6, col: h.col, life: 0.85, foe: false, home: 2.4, core: false });
      this.emit({ x: h.x + cx * 22, y: oy + cy * 22, col: h.col, size: 16, life: 0.12 });
    }
  }
  companion(G, o, h, dt) {
    if (o.down > 0) return;
    const dh = Math.hypot(h.x - o.x, h.y - o.y);
    if (dh > 900) { this.burst(o.x, o.y - 24, 14, o.col, 200, 7, 0.5); o.x = h.x - 40; o.y = h.y + 24; this.ring(o.x, o.y - 24, o.col, 80, 0.4, 3); return; }
    let tg = null, bd = o.kind === 0 ? 260 : 440;
    if (dh < 520) for (const e of G.E) { if (e.dead || e.guard) continue; const d = Math.hypot(e.x - o.x, e.y - o.y); if (d < bd) { bd = d; tg = e; } }
    let gx, gy, stop;
    if (tg) {
      gx = tg.x; gy = tg.y; stop = o.kind === 0 ? tg.r + 62 : 250;
      o.face = Math.atan2(tg.y - tg.h - (o.y - 26), tg.x - o.x);
      if ((o.kind === 1 || bd < tg.r + 92) && o.cd <= 0) this.heroAttack(G, o, o.face, 0);
    } else { gx = h.x + (o.kind ? 50 : -50); gy = h.y + 30; stop = 26; }
    const dx = gx - o.x, dy = gy - o.y, d = Math.hypot(dx, dy) || 1;
    if (d > stop) { const sp = dh > 300 ? 300 : 226; o.x += dx / d * sp * dt; o.y += dy / d * sp * dt; o.walk += dt * 11; if (!tg) o.face = Math.atan2(dy, dx); }
    else if (tg && o.kind === 1 && d < 170) { o.x -= dx / d * 170 * dt; o.y -= dy / d * 170 * dt; o.walk += dt * 11; }
  }
  swap(G) { const o = G.H[1 - G.act]; if (o.down > 0) return; G.act = 1 - G.act; this.ring(o.x, o.y - 22, o.col, 70, 0.3, 3); }
  dash(G) {
    const h = G.H[G.act]; if (h.down > 0 || h.dashCd > 0) return;
    let dx = h.mx, dy = h.my; if (!dx && !dy) { dx = Math.cos(h.face); dy = Math.sin(h.face); }
    h.dvx = dx * 880; h.dvy = dy * 880; h.dashT = 0.17; h.dashCd = 0.75; h.inv = Math.max(h.inv, 0.3);
    this.ring(h.x, h.y - 22, h.col, 70, 0.3, 2);
  }
  commune(G) {
    const a = G.H[0], b = G.H[1];
    if (G.ult < 100 || a.down > 0 || b.down > 0 || G.sealed) return;
    G.ult = 0; const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    for (const e of G.E) { if (e.dead) continue; const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1; if (d < 440) this.hit(G, e, 120, dx / d * 540, dy / d * 540); }
    for (const s of G.S) if (s.foe) s.life = 0;
    a.hp = Math.min(a.max, a.hp + 40); b.hp = Math.min(b.max, b.hp + 40); a.inv = b.inv = 1;
    this.slow = 0.7; this.shake = 20; this.flash = 0.7; this.flashCol = '255,240,210';
    this.ring(x, y - 20, a.col, 440, 0.6, 8); this.ring(x, y - 20, b.col, 320, 0.5, 6); this.ring(x, y - 20, '255,255,255', 200, 0.4, 5);
    this.burst(x, y - 20, 50, a.col, 620, 12, 0.9); this.burst(x, y - 20, 50, b.col, 620, 12, 0.9);
    this.light(G, x, y - 20, 700, '255,235,200', 0.9);
    G.FX.push({ kind: 'beam', x: a.x, y: a.y - 26, x2: b.x, y2: b.y - 26, t: 0, life: 0.5 });
  }
  eshot(G, e, tg, T) {
    const sx = e.x, sy = e.y - e.h, ty = tg.core ? tg.y - 20 : tg.y - 26, a = Math.atan2(ty - sy, tg.x - sx) + (Math.random() - 0.5) * 0.12, col = e.type === 'archer' ? '255,225,170' : '255,96,60';
    G.S.push({ x: sx + Math.cos(a) * 16, y: sy + Math.sin(a) * 16, vx: Math.cos(a) * T.shot, vy: Math.sin(a) * T.shot, dmg: T.dmg, r: 5, col: col, life: 1.7, foe: true, home: 0, core: !!tg.core });
    this.emit({ x: sx + Math.cos(a) * 18, y: sy + Math.sin(a) * 18, col: col, size: 14, life: 0.1 });
  }
  enemies(G, dt) {
    const E = G.E;
    for (let i = 0; i < E.length; i++) {
      const e = E[i]; if (e.dead) continue; const T = this.ET[e.type];
      e.hit = Math.max(0, e.hit - dt * 5); e.cd -= dt;
      const kd = Math.max(0, 1 - 7 * dt); e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= kd; e.ky *= kd;
      if (T.still) continue;
      const tg = this.target(G, e); if (!tg) continue;
      const dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, reach = T.rng + tg.r;
      if (e.guard) { if (d < 520) e.guard = 0; else continue; }
      e.face = Math.atan2(dy, dx);
      let mv = 1;
      if (T.keep) mv = d < T.keep * 0.6 ? -0.7 : d < T.keep ? 0 : 1; else if (d < reach * 0.85) mv = 0;
      if (e.wind > 0) mv = 0;
      let mx = ux * mv, my = uy * mv;
      if ((T.keep && mv <= 0) || T.fly) { mx += -uy * 0.55 * e.side; my += ux * 0.55 * e.side; }
      for (let j = 0; j < E.length; j++) {
        if (j === i || E[j].dead) continue; const q = E[j], sx = e.x - q.x, sy = e.y - q.y, m = e.r + q.r + 4, s2 = sx * sx + sy * sy;
        if (s2 < m * m && s2 > 0.01) { const sd = Math.sqrt(s2); mx += sx / sd * 0.8; my += sy / sd * 0.8; }
      }
      e.x += mx * T.spd * dt; e.y += my * T.spd * dt; if (mx || my) e.walk += dt * 10;
      if (T.fly) { e.x = Math.max(40, Math.min(G.w - 40, e.x)); e.y = Math.max(70, Math.min(G.h - 30, e.y)); } else this.bound(G, e, e.r);
      if (e.wind > 0) {
        e.wind -= dt;
        if (e.wind <= 0) {
          G.FX.push({ kind: 'slash', x: e.x, y: e.y - e.h, a: e.face, t: 0, life: 0.18, col: T.glow || '255,230,200', r: e.r + 22 });
          if (d < reach + 18) { if (tg.core) this.coreHurt(G, T.dmg); else this.hurt(G, tg.ref, T.dmg); }
        }
      } else if (e.burst > 0) {
        e.bt -= dt; if (e.bt <= 0) { e.bt = 0.1; e.burst--; this.eshot(G, e, tg, T); }
      } else if (e.cd <= 0 && d < reach) {
        e.cd = T.cd * (0.85 + Math.random() * 0.3);
        if (T.shell) {
          G.Z.push({ x: tg.x + (Math.random() - 0.5) * 50, y: tg.y + (Math.random() - 0.5) * 50, r: 78, t: 0, delay: 1.25, dmg: T.dmg, col: '255,120,50', kind: 'shell', done: false });
          this.burst(e.x + Math.cos(e.face) * 40, e.y - 40, 8, '255,180,90', 160, 8, 0.3); this.shake = Math.max(this.shake, 3);
        } else if (T.shot) { e.burst = T.burst || 1; e.bt = 0; }
        else e.wind = 0.3;
      }
    }
    let any = false; for (const e of E) if (e.dead) { any = true; break; }
    if (any) G.E = E.filter((e) => !e.dead);
  }
  shots(G, dt) {
    for (const s of G.S) {
      if (s.life <= 0) continue; s.life -= dt;
      if (s.home) {
        let b = null, bd = 240;
        for (const e of G.E) { if (e.dead) continue; const d = Math.hypot(e.x - s.x, e.y - e.h - s.y); if (d < bd) { bd = d; b = e; } }
        if (b) { const want = Math.atan2(b.y - b.h - s.y, b.x - s.x), cur = Math.atan2(s.vy, s.vx), da = Math.atan2(Math.sin(want - cur), Math.cos(want - cur)), turn = Math.max(-s.home * dt, Math.min(s.home * dt, da)), sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(cur + turn) * sp; s.vy = Math.sin(cur + turn) * sp; }
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      this.emit({ x: s.x, y: s.y, col: s.col, size: s.r * 2.2, life: 0.16 });
      if (s.foe) {
        const c = G.core;
        if (s.core && c && c.hp > 0 && Math.hypot(s.x - c.x, s.y - (c.y - 20)) < c.r + 6) { this.coreHurt(G, s.dmg); s.life = 0; }
        else for (const p of G.H) if (p.down <= 0 && Math.hypot(s.x - p.x, s.y - (p.y - 24)) < s.r + 13) { this.hurt(G, p, s.dmg); s.life = 0; break; }
      } else {
        for (const e of G.E) if (!e.dead && Math.hypot(s.x - e.x, s.y - (e.y - e.h)) < s.r + e.r) { this.hit(G, e, s.dmg, s.vx * 0.2, s.vy * 0.2); s.life = 0; break; }
      }
      if (s.x < -40 || s.y < -40 || s.x > G.w + 40 || s.y > G.h + 40) s.life = Math.min(s.life, 0);
      if (s.life <= 0) this.burst(s.x, s.y, 4, s.col, 130, 4, 0.25);
    }
    G.S = G.S.filter((s) => s.life > 0);
  }
  zones(G, dt) {
    let any = false;
    for (const z of G.Z) {
      z.t += dt; if (z.t < z.delay) continue;
      z.done = true; any = true;
      for (const p of G.H) if (Math.hypot(p.x - z.x, p.y - z.y) < z.r) this.hurt(G, p, z.dmg);
      const c = G.core; if (c && z.kind === 'shell' && Math.hypot(c.x - z.x, c.y - z.y) < z.r + c.r) this.coreHurt(G, z.dmg);
      this.burst(z.x, z.y, 26, z.col, 420, 12, 0.6); this.burst(z.x, z.y, 8, '26,24,30', 130, 30, 1, 'smoke');
      this.ring(z.x, z.y, z.col, z.r * 1.5, 0.4, 5); this.light(G, z.x, z.y, z.r * 4, z.col, 0.4); this.shake = Math.max(this.shake, 9);
    }
    if (any) G.Z = G.Z.filter((z) => !z.done);
  }
  fx(G, dt) {
    let any = false;
    for (const f of G.FX) { f.t += dt; if (f.t >= f.life) any = true; }
    if (any) G.FX = G.FX.filter((f) => f.t < f.life);
    any = false; for (const l of G.TL) { l.t += dt; if (l.t >= l.life) any = true; }
    if (any) G.TL = G.TL.filter((l) => l.t < l.life);
    if (dt <= 0) return;
    const c = G.core;
    if (c) {
      c.flash = Math.max(0, c.flash - dt * 4);
      if (c.kind === 'fire' && c.hp > 0) {
        const k = 0.4 + 0.6 * c.hp / c.max;
        for (let i = 0; i < 3; i++) this.emit({ x: c.x + (Math.random() - 0.5) * 24 * k, y: c.y - 8, vx: (Math.random() - 0.5) * 30, vy: -70 - Math.random() * 100 * k, col: Math.random() < 0.3 ? '255,232,150' : '255,130,40', size: 13 * k + Math.random() * 10, life: 0.5 + Math.random() * 0.4, grow: -14 });
        if (Math.random() < 0.3) this.emit({ x: c.x + (Math.random() - 0.5) * 16, y: c.y - 20, vx: (Math.random() - 0.5) * 80, vy: -160 - Math.random() * 120, col: '255,200,110', size: 4, life: 0.9, kind: 'spark' });
        if (Math.random() < 0.12) this.emit({ x: c.x, y: c.y - 50, vx: (Math.random() - 0.5) * 20, vy: -50, size: 16, grow: 16, life: 1.6, kind: 'smoke' });
      }
    }
    for (const it of G.I) if (it.on && !it.done && Math.random() < 0.3) this.emit({ x: it.x + (Math.random() - 0.5) * 80, y: it.y + (Math.random() - 0.5) * 30, vy: -70, col: '255,225,160', size: 5, life: 1 });
    for (const q of G.K) if (!q.got && Math.random() < 0.08) this.emit({ x: q.x + (Math.random() - 0.5) * 24, y: q.y - 16, vy: -40, col: q.col, size: 4, life: 0.9 });
    if (G.lava && Math.random() < 0.4) { const l = G.lava[(Math.random() * G.lava.length) | 0], a = Math.random() * 6.283, d = Math.random() * l.r; this.emit({ x: l.x + Math.cos(a) * d, y: l.y + Math.sin(a) * d, vy: -60 - Math.random() * 60, col: '255,150,50', size: 5, life: 1 }); }
    const b = G.boss; if (b && !b.dead) { const a = Math.random() * 6.283; this.emit({ x: b.x + Math.cos(a) * 120, y: b.y - b.h + Math.sin(a) * 120, vx: -Math.cos(a) * 110, vy: -Math.sin(a) * 110, col: '190,120,255', size: 6, life: 0.9 }); }
    for (const p of G.H) if (p.down <= 0 && p.dashT > 0) this.emit({ x: p.x, y: p.y - 26, col: p.col, size: 26, life: 0.25 });
  }
  idle(dt) { const G = this.G; if (!G) return; this.fx(G, dt); this.updateP(dt); }

  update(dt0) {
    const G = this.G, k = this.keys; let dt = dt0;
    if (this.slow > 0) { this.slow -= dt0; dt *= 0.35; }
    G.t += dt; G.st += dt; G.toastT -= dt;
    for (const p of G.H) {
      p.cd -= dt; p.dashCd -= dt; p.inv -= dt; p.flash = Math.max(0, p.flash - dt * 3); p.safe += dt; p.swing = Math.max(0, p.swing - dt * 5);
      if (p.down > 0) { p.down -= dt; if (p.down <= 0) this.rise(G, p); }
      else if (p.safe > 4 && p.hp < p.max) p.hp = Math.min(p.max, p.hp + 3 * dt);
    }
    if (G.H[G.act].down > 0 && G.H[1 - G.act].down <= 0) G.act = 1 - G.act;
    const h = G.H[G.act], o = G.H[1 - G.act], mwx = this.mouse.x + G.cam.x, mwy = this.mouse.y + G.cam.y;
    if (h.down <= 0) {
      let mx = (k.d || k.ArrowRight ? 1 : 0) - (k.a || k.ArrowLeft ? 1 : 0), my = (k.s || k.ArrowDown ? 1 : 0) - (k.w || k.ArrowUp ? 1 : 0);
      const ml = Math.hypot(mx, my); if (ml) { mx /= ml; my /= ml; }
      h.mx = mx; h.my = my;
      if (h.dashT > 0) { h.dashT -= dt; h.x += h.dvx * dt; h.y += h.dvy * dt; }
      else { h.x += mx * 236 * dt; h.y += my * 236 * dt; if (ml) h.walk += dt * 11; }
      h.face = Math.atan2(mwy - (h.y - 26), mwx - h.x);
      if ((this.mouse.down || k.j) && h.cd <= 0) this.heroAttack(G, h, h.face, 1);
    }
    this.companion(G, o, h, dt);
    this.bound(G, h, 13); this.bound(G, o, 13);
    G.near = null;
    for (const it of G.I) {
      if (!it.on || it.done) continue;
      if (h.down <= 0 && Math.hypot(h.x - it.x, h.y - it.y) < it.r) {
        G.near = it;
        if (k.e) { it.prog += dt; const a = Math.random() * 6.283; this.emit({ x: it.x + Math.cos(a) * 70, y: it.y - 20 + Math.sin(a) * 40, vx: -Math.cos(a) * 130, vy: -Math.sin(a) * 80, col: '255,225,160', size: 6, life: 0.5 }); if (it.prog >= it.hold) { it.done = true; it.fn(); } }
        else it.prog = Math.max(0, it.prog - dt * 2);
      } else it.prog = Math.max(0, it.prog - dt);
    }
    for (const q of G.K) {
      if (q.got) continue;
      for (const p of G.H) if (p.down <= 0 && Math.hypot(p.x - q.x, p.y - q.y) < 42) {
        q.got = true; G.got++; G[q.kind] = (G[q.kind] || 0) + 1; G.ult = Math.min(100, G.ult + 6);
        this.burst(q.x, q.y - 16, 22, q.col, 260, 8, 0.7); this.ring(q.x, q.y - 16, q.col, 90, 0.4, 3); this.light(G, q.x, q.y - 16, 260, q.col, 0.5); break;
      }
    }
    this.enemies(G, dt); this.shots(G, dt); this.zones(G, dt); this.fx(G, dt);
    G.spawnT -= dt;
    if (G.queue.length && G.spawnT <= 0) { G.spawnT = G.gap || 0.7; const q = G.queue.shift(), f = G.core || h, p = this.near(G, f.x, f.y, 620); this.spawn(G, q.type, p[0], p[1], { pref: q.pref }); }
    this['tick' + G.i](G, dt);
    if (this.mode === 'play' && G.H[0].down > 0 && G.H[1].down > 0) this.fail(G, 'Both immortals fell in the same breath, and their light scattered. The road must be walked again.');
    this.camera(G, dt, false);
    this.updateP(dt);
    this.pushHud(G, dt0);
  }
  camera(G, dt, snap) {
    const h = G.H[G.act], cam = G.cam;
    let tx = h.x - 640 + (this.mouse.x - 640) * 0.16, ty = h.y - 390 + (this.mouse.y - 360) * 0.16;
    tx = Math.max(0, Math.min(G.w - 1280, tx)); ty = Math.max(0, Math.min(G.h - 720, ty));
    const k = snap ? 1 : Math.min(1, dt * 6); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  }
  pushHud(G, dt) {
    this.hudT -= dt; if (this.hudT > 0 || this.mode !== 'play') return; this.hudT = 0.1;
    const a = G.H[0], b = G.H[1], bs = G.boss;
    const hud = { a: Math.ceil(a.hp), b: Math.ceil(b.hp), act: G.act, da: a.down > 0 ? Math.ceil(a.down) : 0, db: b.down > 0 ? Math.ceil(b.down) : 0, ult: Math.floor(G.ult), sealed: !!G.sealed, obj: G.obj, sub: G.sub, bar: G.bar == null ? null : Math.round(G.bar * 100), barLabel: G.barLabel, timer: G.timer == null ? '' : this.fmt(G.timer), boss: bs && !bs.dead ? Math.max(0, Math.round(bs.hp / bs.max * 100)) : null, toast: G.toastT > 0 ? G.toast : '', hint: G.near ? G.near.label : '' };
    const key = JSON.stringify(hud); if (key !== this.hudKey) { this.hudKey = key; this.setState({ hud: hud }); }
  }

  // ---------------------------------------------------------------- chapters
  setup0(G) {
    this.scatter(G, 22, (r) => { const v = r() < 0.6; return { type: 'tree', r: 14, s: 0.9 + r() * 0.5, c1: '#2a2438', c2: v ? '#2c9c88' : '#a8559a', c3: v ? '#74dcc0' : '#e59ad4', glow: v ? '120,255,220' : '255,150,230', gh: 62, gr: 70, ga: 0.2 }; }, 220);
    this.scatter(G, 12, (r) => ({ type: 'crystal', r: 13, s: 0.8 + r() * 0.8, c1: '#3fc7d6', c2: '#bff6ff', glow: '110,230,255', gh: 30, gr: 80, ga: 0.45, lit: 130 }), 200);
    this.scatter(G, 16, (r) => { const s = 0.7 + r() * 0.8; return { type: 'rock', r: 18 * s, s: s, c1: '#3b4654', c2: '#5d6c7c' }; }, 200);
    for (const p of this.spots(G, 6, 380, 380)) G.K.push({ x: p[0], y: p[1], kind: 'mote', col: '255,236,170', got: false });
    G.obj = 'Gather the Maker’s light';
    this.say(G, 'Move with W A S D. Aim with the mouse. Click to strike. Space to dash. Q to swap.', 10);
  }
  tick0(G) {
    const h = G.H[G.act];
    if (G.stage === 0) {
      G.sub = G.got + ' / 6 motes';
      if (G.got >= 6) { this.stage(G, 1); G.obj = 'Scatter the Shades'; this.say(G, 'The light draws something out of the dark.'); for (let i = 0; i < 6; i++) { const p = this.near(G, h.x, h.y, 430); this.spawn(G, 'shade', p[0], p[1]); } }
    } else if (G.stage === 1) {
      G.sub = G.E.length + ' remain';
      if (!G.E.length && G.st > 1) { this.stage(G, 2); this.say(G, 'More of them. Something larger walks behind.'); for (let i = 0; i < 8; i++) { const p = this.near(G, h.x, h.y, 480); this.spawn(G, i ? 'shade' : 'brute', p[0], p[1]); } }
    } else { G.sub = G.E.length + ' remain'; if (!G.E.length && G.st > 1) this.win(G); }
  }

  setup1(G) {
    const cx = G.w / 2, cy = G.h / 2;
    G.props.push({ type: 'hearth', x: cx, y: cy, r: 0 });
    this.scatter(G, 26, (r) => ({ type: 'dead', r: 10, s: 0.9 + r() * 0.6, c1: '#1c1e2a' }), 200);
    this.scatter(G, 20, (r) => { const s = 0.7 + r() * 0.8; return { type: 'rock', r: 18 * s, s: s, c1: '#56617a', c2: '#c9d6ee' }; }, 200);
    this.spots(G, 5, 420, 360).forEach((p, i) => G.K.push({ x: p[0], y: p[1], kind: i < 2 ? 'flint' : 'wood', col: i < 2 ? '200,222,255' : '255,200,140', got: false }));
    for (let i = 0; i < 4; i++) { const p = this.near(G, cx, cy, 620); this.spawn(G, 'shade', p[0], p[1]); }
    G.I.push({ x: cx, y: cy, r: 84, label: 'Strike the first flame', hold: 2.4, prog: 0, on: false, done: false, fn: () => this.ignite(G) });
    G.obj = 'Find flint and deadwood'; G.rt = 7; G.wt = 2;
    this.say(G, 'Cold light on the snow marks what the two are looking for.', 6);
  }
  ignite(G) {
    this.stage(G, 2); G.core = { kind: 'fire', x: G.w / 2, y: G.h / 2, r: 30, hp: 100, max: 100, flash: 0 };
    G.obj = 'Keep the flame alive until dawn'; G.sub = 'The Shades come for it';
    this.burst(G.core.x, G.core.y - 20, 60, '255,150,50', 460, 12, 0.9); this.ring(G.core.x, G.core.y - 20, '255,190,110', 300, 0.6, 6);
    this.shake = 10; this.flash = 0.5; this.flashCol = '255,200,130';
    this.say(G, 'Fire. The first thing they ever made themselves.');
  }
  tick1(G, dt) {
    const f = G.flint || 0, w = G.wood || 0, h = G.H[G.act];
    if (G.stage === 0) {
      G.sub = 'Flint ' + f + ' / 2 · Deadwood ' + w + ' / 3';
      G.rt -= dt; if (G.rt <= 0) { G.rt = 7; if (G.E.length < 4) { const p = this.near(G, h.x, h.y, 560); this.spawn(G, 'shade', p[0], p[1]); } }
      if (f >= 2 && w >= 3) { this.stage(G, 1); G.I[0].on = true; G.obj = 'Return to the hearthstones'; G.sub = 'Hold E to strike the flint'; this.say(G, 'Stone on stone. Ena has watched lightning do this.'); }
    } else if (G.stage === 2) {
      const c = G.core, k = Math.min(1, G.st / 75);
      G.timer = 75 - G.st; G.bar = c.hp / c.max; G.barLabel = 'The Flame';
      G.amb = [26 + k * k * 130, 32 + k * k * 105, 58 + k * k * 70];
      G.wt -= dt;
      if (G.wt <= 0) {
        G.wt = Math.max(3.2, 6.5 - G.st * 0.04);
        const n = 2 + (G.st > 30 ? 1 : 0) + (Math.random() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++) this.enqueue(G, Math.random() < 0.72 ? 'core' : 'hero', 'shade');
        if (G.st > 34 && !G.b1) { G.b1 = 1; this.enqueue(G, 'core', 'brute'); }
        if (G.st > 56 && !G.b2) { G.b2 = 1; this.enqueue(G, 'core', 'brute'); }
      }
      if (c.hp <= 0) { this.fail(G, 'The flame went out, and the long night closed over it.'); return; }
      if (G.st >= 75) { this.flash = 0.85; this.flashCol = '255,225,170'; for (const e of G.E) this.kill(G, e); G.timer = 0; this.win(G); }
    }
  }

  setup2(G) {
    const cx = G.w / 2, cy = G.h / 2; G.age = 0; G.wave = -1; G.gap = 0.9;
    G.core = { kind: 'beacon', x: cx, y: cy, r: 26, hp: 260, max: 260, flash: 0 };
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + 0.3, d = 250 + (i % 3) * 60; G.props.push({ type: 'home', x: cx + Math.cos(a) * d * 1.25, y: cy + Math.sin(a) * d * 0.8, r: 24, seed: i }); }
    this.scatter(G, 20, (r) => ({ type: 'tree', r: 14, s: 0.9 + r() * 0.5, c1: '#3a2c1c', c2: '#5c7a2c', c3: '#93b04a' }), 520);
    this.scatter(G, 14, (r) => { const s = 0.7 + r() * 0.8; return { type: 'rock', r: 18 * s, s: s, c1: '#6a6250', c2: '#9a917a' }; }, 480);
    G.H[0].y += 60; G.H[1].y += 60;
    G.waves = [['The Age of Stone', [['shade', 12], ['brute', 2]]], ['The Age of Iron', [['raider', 11], ['archer', 5]]], ['The Age of Engines', [['raider', 9], ['archer', 5], ['engine', 3]]]];
    G.obj = 'Defend the Beacon'; G.sub = 'They are coming';
  }
  tick2(G) {
    const c = G.core; G.bar = c.hp / c.max; G.barLabel = 'The Beacon';
    if (c.hp <= 0) { this.fail(G, 'The Beacon fell, and the age fell with it.'); return; }
    if (G.stage === 0) {
      if (G.st > (G.wave < 0 ? 2.5 : 4)) {
        G.wave++; const w = G.waves[G.wave], list = []; this.stage(G, 1); G.obj = 'Defend the Beacon · ' + w[0];
        for (const p of w[1]) for (let i = 0; i < p[1]; i++) list.push(p[0]);
        list.sort(() => Math.random() - 0.5);
        for (const ty of list) this.enqueue(G, Math.random() < 0.6 ? 'core' : 'hero', ty);
      }
    } else {
      G.sub = (G.queue.length + G.E.length) + ' foes remain';
      if (!G.queue.length && !G.E.length && G.st > 2) {
        if (G.wave >= 2) { this.win(G); return; }
        this.stage(G, 0); G.age = G.wave + 1; G.sub = 'An age passes';
        this.flash = 0.9; this.flashCol = '255,245,220'; c.hp = Math.min(c.max, c.hp + c.max * 0.4);
        for (const h of G.H) if (h.down <= 0) h.hp = h.max;
        this.say(G, G.wave === 0 ? 'Stone gives way to iron. The children of the first children forget their names.' : 'Iron gives way to engines. The city no longer wants gods, only guards.', 6);
      }
    }
  }

  setup3(G) {
    const px = 260, py = G.h / 2, spots = [[1100, 380], [1750, 1200], [2300, 560]];
    G.H[0].x = px + 70; G.H[0].y = py + 60; G.H[1].x = px + 120; G.H[1].y = py + 30;
    G.avoid = [[px, py, 230]].concat(spots.map((p) => [p[0], p[1], 150]));
    G.props.push({ type: 'pod', x: px, y: py, r: 44, glow: '255,222,170', gh: 24, gr: 100, ga: 0.4, lit: 240 });
    this.scatter(G, 16, (r) => ({ type: 'pine', r: 12, s: 0.9 + r() * 0.6, c1: '#1a1410', c2: '#12301f', c3: '#1c4a2e' }), 0);
    this.scatter(G, 7, () => ({ type: 'truck', r: 40 }), 0, 90);
    this.scatter(G, 12, () => ({ type: 'crate', r: 17 }), 0);
    this.scatter(G, 8, () => ({ type: 'lamp', r: 6, glow: '210,230,255', gh: 82, gr: 50, ga: 0.9, lit: 270, ly: -40, lcol: '200,220,255' }), 0, 120);
    G.pyl = spots.map((p) => {
      const e = this.spawn(G, 'pylon', p[0], p[1]);
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.5; this.spawn(G, 'soldier', p[0] + Math.cos(a) * 90, p[1] + Math.sin(a) * 70, { guard: 1 }); }
      this.spawn(G, 'drone', p[0] + 40, p[1] - 80, { guard: 1 });
      return e;
    });
    G.search = [{ cx: 900, cy: 900, rad: 260, sp: 0.4, ph: 0 }, { cx: 1600, cy: 600, rad: 320, sp: -0.3, ph: 2 }, { cx: 2100, cy: 1100, rad: 240, sp: 0.5, ph: 4 }];
    G.I.push({ x: px + 30, y: py + 60, r: 96, label: 'Wake the vessel', hold: 3, prog: 0, on: false, done: false, fn: () => this.win(G) });
    G.sealed = true; G.pd = 0; G.rt = 8; G.obj = 'Destroy the containment pylons';
    this.say(G, '“Contact. Two unknowns at the crash site. They are… glowing.”', 7);
  }
  tick3(G, dt) {
    let alive = 0; for (const e of G.pyl) if (!e.dead) alive++;
    const gone = 3 - alive, h = G.H[G.act];
    G.sealed = alive > 0;
    if (gone > G.pd) {
      G.pd = gone;
      this.say(G, ['“Pylon one is gone. Light them up!”', '“We are losing containment. Send the armor.”', '“All pylons down. God help us.”'][gone - 1], 6);
      if (gone === 2) { const p = this.near(G, h.x, h.y, 640); this.spawn(G, 'tank', p[0], p[1]); }
      if (gone === 3) { this.stage(G, 1); G.I[0].on = true; G.obj = 'Return to the vessel'; G.sub = 'West, where you fell · hold E beside it'; this.flash = 0.5; this.flashCol = '200,230,255'; }
    }
    if (G.stage === 0) G.sub = gone + ' / 3 destroyed · Communion suppressed';
    G.rt -= dt;
    if (G.rt <= 0) {
      G.rt = G.stage ? 5 : 8; let n = 0; for (const e of G.E) if (!e.guard && e.type !== 'pylon') n++;
      if (n < 9) { this.enqueue(G, 'hero', 'soldier'); this.enqueue(G, 'hero', Math.random() < 0.5 ? 'drone' : 'soldier'); }
    }
  }

  setup4(G) {
    const rn = G.rnd, sy = G.h / 2;
    G.H[0].x = 220; G.H[1].x = 280; G.H[0].y = G.H[1].y = sy;
    G.avoid = [[250, sy, 240], [G.w - 220, sy, 200]]; G.lava = [];
    for (let i = 0, tries = 0; i < 9 && tries < 400; tries++) { const x = 480 + rn() * (G.w - 800), y = 220 + rn() * (G.h - 400), r = 60 + rn() * 60; if (G.avoid.some((a) => Math.hypot(a[0] - x, a[1] - y) < a[2] + r)) continue; G.lava.push({ x: x, y: y, r: r }); G.avoid.push([x, y, r + 40]); i++; }
    this.scatter(G, 26, (r) => { const s = 0.8 + r() * 0.9; return { type: 'spire', r: 15 * s, s: s, c1: '#1a1010', c2: '#3a1c16', glow: '255,120,40', gh: 22, gr: 60, ga: 0.3 }; }, 0);
    this.scatter(G, 14, (r) => { const s = 0.7 + r() * 0.8; return { type: 'rock', r: 18 * s, s: s, c1: '#2a1a18', c2: '#4a2a22' }; }, 0);
    for (const p of this.spots(G, 7, 0, 330)) G.K.push({ x: p[0], y: p[1], kind: 'seed', col: '170,255,190', got: false });
    G.I.push({ x: G.w - 220, y: sy, r: 96, label: 'Step into the rift', hold: 1.6, prog: 0, on: false, done: false, fn: () => this.win(G) });
    G.limit = 150; G.mt = 3; G.wt = 6; G.qt = 5; G.need = G.K.length; G.obj = 'Gather the last seeds of life';
    this.say(G, 'The sky is coming down. Watch the ground for where it will land.', 6);
  }
  tick4(G, dt) {
    const h = G.H[G.act], k = Math.min(1, G.t / G.limit);
    G.timer = G.limit - G.t;
    if (G.timer <= 0) { this.fail(G, 'The world broke apart before they could carry its seeds away.'); return; }
    G.mt -= dt;
    if (G.mt <= 0) { G.mt = 1.7 - k; const a = Math.random() * 6.283, d = Math.random() * 380; G.Z.push({ x: Math.max(60, Math.min(G.w - 60, h.x + Math.cos(a) * d)), y: Math.max(80, Math.min(G.h - 50, h.y + Math.sin(a) * d)), r: 74 + Math.random() * 30, t: 0, delay: 1.35, dmg: 20, col: '255,110,40', kind: 'meteor', done: false }); }
    G.wt -= dt; if (G.wt <= 0) { G.wt = 9; if (G.E.length < 7) { this.enqueue(G, 'hero', 'wraith'); this.enqueue(G, 'hero', 'wraith'); } }
    G.qt -= dt; if (G.qt <= 0) { G.qt = 5 + Math.random() * 4; this.shake = Math.max(this.shake, 10 + k * 10); }
    // ponytail: only the player-controlled immortal burns in lava; the companion has no pathfinding to avoid it
    if (h.down <= 0 && h.dashT <= 0) for (const l of G.lava) if (Math.hypot(h.x - l.x, h.y - l.y) < l.r) { h.lt -= dt; if (h.lt <= 0) { h.lt = 0.4; this.hurt(G, h, 7); } break; }
    if (G.stage === 0) {
      G.sub = G.got + ' / ' + G.need + ' seeds';
      if (G.got >= G.need) { this.stage(G, 1); G.I[0].on = true; G.obj = 'Reach the rift'; G.sub = 'East, before the ground goes'; this.say(G, 'Seven seeds. Seven worlds that might be.'); }
    }
  }

  setup5(G) {
    const cx = G.w / 2, rn = G.rnd;
    G.H[0].x = cx - 40; G.H[1].x = cx + 40; G.H[0].y = G.H[1].y = G.h - 220;
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; G.props.push({ type: 'shard', x: cx + Math.cos(a) * (G.w / 2 - 110), y: G.h / 2 + 30 + Math.sin(a) * (G.h / 2 - 130), r: 18, s: 0.8 + rn() * 0.8, c1: '#2a1e4a', c2: '#6a4ab0', glow: '170,120,255', gh: 40, gr: 80, ga: 0.4, lit: 150 }); }
    G.boss = this.spawn(G, 'boss', cx, 330);
    G.I.push({ x: cx, y: G.h / 2 + 60, r: 96, label: 'Step through the last second', hold: 2, prog: 0, on: false, done: false, fn: () => this.win(G) });
    G.bt = 3; G.bi = 0; G.ph = 0; G.spiral = 0; G.sa = 0; G.sc = 0;
    G.obj = 'Still the Unmaking'; G.sub = 'It cannot be killed. It can be outlasted.';
  }
  bshot(G, b, a, sp) { G.S.push({ x: b.x + Math.cos(a) * 60, y: b.y - b.h + Math.sin(a) * 60, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: 12, r: 8, col: '200,130,255', life: 5, foe: true, home: 0, core: false }); }
  tick5(G, dt) {
    const b = G.boss;
    if (G.stage === 0) {
      if (b.dead) {
        this.stage(G, 1); for (const e of G.E) this.kill(G, e); for (const s of G.S) s.life = 0; G.Z = [];
        this.slow = 1.2; this.shake = 24; this.flash = 0.9; this.flashCol = '225,200,255'; this.say(G, 'For one breath, the end holds still.', 6); return;
      }
      const f = b.hp / b.max, ph = f < 0.3 ? 2 : f < 0.62 ? 1 : 0;
      if (ph > G.ph) { G.ph = ph; this.shake = 16; this.ring(b.x, b.y - b.h, '200,130,255', 420, 0.7, 8); this.say(G, ph === 1 ? 'It unfolds. There is more of it than there is sky.' : 'The last second is close enough to touch.'); }
      b.x = G.w / 2 + Math.sin(G.t * 0.4) * (120 + ph * 90); b.y = 330 + Math.sin(G.t * 0.63) * 40 * ph;
      if (G.spiral > 0) { G.spiral -= dt; G.sa += dt * 2.6; G.sc -= dt; if (G.sc <= 0) { G.sc = 0.08; this.bshot(G, b, G.sa, 250); this.bshot(G, b, G.sa + 3.1416, 250); } }
      G.bt -= dt;
      if (G.bt <= 0) {
        G.bt = 2.7 - ph * 0.45;
        const seq = ph === 0 ? ['ring', 'zone', 'ring', 'summon'] : ['ring', 'zone', 'spiral', 'summon', 'zone'], act = seq[G.bi++ % seq.length];
        if (act === 'ring') { const n = 18 + ph * 5, off = Math.random() * 6.283; for (let i = 0; i < n; i++) if (i % 6) this.bshot(G, b, off + i / n * 6.283, 210 + ph * 30); this.ring(b.x, b.y - b.h, '200,130,255', 160, 0.4, 5); }
        else if (act === 'zone') { for (const p of G.H) for (let i = 0; i <= ph; i++) G.Z.push({ x: p.x + (Math.random() - 0.5) * 170 * i, y: p.y + (Math.random() - 0.5) * 170 * i, r: 86, t: 0, delay: 1.15, dmg: 22, col: '180,110,255', kind: 'void', done: false }); }
        else if (act === 'spiral') { G.spiral = 2.4; G.sa = Math.random() * 6; G.sc = 0; }
        else if (G.E.length < 6) for (let i = 0; i < 2 + ph; i++) { const p = this.near(G, b.x, b.y, 160); this.spawn(G, 'wraith', p[0], p[1]); }
      }
    } else if (G.stage === 1) {
      if (Math.random() < 0.3) this.burst(b.x + (Math.random() - 0.5) * 140, b.y - b.h + (Math.random() - 0.5) * 140, 14, '200,130,255', 300, 10, 0.7);
      if (G.st > 2.6) { this.stage(G, 2); G.I[0].on = true; G.obj = 'Step through the last second'; G.sub = 'A door stands open where the end was'; }
    }
  }

  // ---------------------------------------------------------------- world rendering
  tile(key) {
    if (this.tiles[key]) return this.tiles[key];
    const pal = this.PAL[key], cv = this.mk(512, 512), g = cv.getContext('2d'), rn = this.rng(key.length * 97 + key.charCodeAt(0));
    g.fillStyle = pal.base; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 240; i++) {
      const x = rn() * 512, y = rn() * 512, r = 24 + rn() * 80, sp = this.glow(pal.blobs[(rn() * pal.blobs.length) | 0], 1); g.globalAlpha = 0.1 + rn() * 0.22;
      for (let ox = -512; ox <= 512; ox += 512) for (let oy = -512; oy <= 512; oy += 512) g.drawImage(sp, x + ox - r, y + oy - r, r * 2, r * 2);
    }
    g.fillStyle = 'rgb(' + pal.speck + ')';
    for (let i = 0; i < 700; i++) { g.globalAlpha = 0.08 + rn() * 0.25; const s = 1 + rn() * 2; g.fillRect(rn() * 512, rn() * 512, s, s); }
    g.globalAlpha = 1; g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    for (let i = 0; i < 26; i++) { let x = rn() * 512, y = rn() * 512; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rn() - 0.5) * 50; y += (rn() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
    this.tiles[key] = cv; return cv;
  }
  lightPass(c, cx, cy, amb) {
    const lc = this.lc || (this.lc = this.mk(320, 180)), g = this.lg || (this.lg = lc.getContext('2d'));
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = amb; g.fillRect(0, 0, 320, 180);
    g.globalCompositeOperation = 'lighter';
    for (const l of this.L) { const x = (l.x - cx) / 4, y = (l.y - cy) / 4, r = l.r / 4; if (!(r > 0) || !(l.a > 0) || x < -r || y < -r || x > 320 + r || y > 180 + r) continue; g.globalAlpha = l.a > 1 ? 1 : l.a; g.drawImage(this.glow(l.col, 1), x - r, y - r, r * 2, r * 2); }
    g.globalAlpha = 1;
    c.globalCompositeOperation = 'multiply'; c.drawImage(lc, 0, 0, 1280, 720); c.globalCompositeOperation = 'source-over';
  }
  renderWorld(c, dt) {
    const G = this.G, t = this.time, W = 1280, H = 720, pal = this.PAL[G.ch.pal];
    let sx = 0, sy = 0; if (this.shake > 0.3 && this.opt('screenShake', true)) { sx = (Math.random() - 0.5) * this.shake; sy = (Math.random() - 0.5) * this.shake; }
    const cx = Math.round(G.cam.x + sx), cy = Math.round(G.cam.y + sy), tl = this.tile(G.ch.pal);
    const ox = -(((cx % 512) + 512) % 512), oy = -(((cy % 512) + 512) % 512);
    for (let x = ox; x < W; x += 512) for (let y = oy; y < H; y += 512) c.drawImage(tl, x, y);
    c.save(); c.translate(-cx, -cy);
    for (const b of G.blots) this.blit(c, b.col, b.x, b.y, b.r, b.a, 1);
    if (G.lava) for (const l of G.lava) {
      c.fillStyle = '#4a1608'; c.beginPath(); c.arc(l.x, l.y, l.r + 7, 0, 6.283); c.fill();
      c.fillStyle = '#e8601a'; c.beginPath(); c.arc(l.x, l.y, l.r, 0, 6.283); c.fill();
      c.fillStyle = '#ffb347'; c.beginPath(); c.arc(l.x + Math.sin(t + l.x) * 6, l.y + Math.cos(t * 0.8 + l.y) * 6, Math.max(4, l.r * 0.55 + Math.sin(t * 2 + l.x) * 5), 0, 6.283); c.fill();
    }
    for (const z of G.Z) {
      const k = Math.min(1, z.t / z.delay);
      c.fillStyle = 'rgba(' + z.col + ',0.14)'; c.beginPath(); c.arc(z.x, z.y, z.r, 0, 6.283); c.fill();
      c.fillStyle = 'rgba(' + z.col + ',0.26)'; c.beginPath(); c.arc(z.x, z.y, z.r * k, 0, 6.283); c.fill();
    }
    for (const e of G.E) if (e.type === 'pylon' && !e.dead) { c.strokeStyle = 'rgba(255,70,60,0.35)'; c.lineWidth = 2; c.beginPath(); c.ellipse(e.x, e.y, 120 + Math.sin(t * 3) * 6, 46, 0, 0, 6.283); c.stroke(); }
    const h = G.H[G.act]; if (h.down <= 0) { c.strokeStyle = 'rgba(' + h.col + ',0.85)'; c.lineWidth = 2; c.beginPath(); c.ellipse(h.x, h.y + 2, 21, 9, 0, 0, 6.283); c.stroke(); }
    const list = [], vis = [], x0 = cx - 140, x1 = cx + W + 140, y0 = cy - 60, y1 = cy + H + 180;
    for (const p of G.props) if (p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1) { list.push({ y: p.y, k: 0, o: p }); vis.push(p); }
    for (const e of G.E) if (!e.dead) list.push({ y: e.y, k: 1, o: e });
    for (const p of G.H) list.push({ y: p.y, k: 2, o: p });
    for (const q of G.K) if (!q.got) list.push({ y: q.y, k: 3, o: q });
    if (G.core) list.push({ y: G.core.y, k: 4, o: G.core });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) { if (d.k === 0) this.prop(c, d.o, t, G); else if (d.k === 1) this.foe(c, d.o, t); else if (d.k === 2) this.heroDraw(c, d.o, t); else if (d.k === 3) this.pick(c, d.o); else this.coreDraw(c, d.o); }
    c.restore();

    const L = this.L; L.length = 0;
    for (const p of G.H) L.push({ x: p.x, y: p.y - 20, r: p.down > 0 ? 90 : 280, col: p.col, a: 0.95 });
    for (const p of G.props) if (p.lit) L.push({ x: p.x, y: p.y - (p.ly == null ? p.gh * (p.s || 1) : p.ly), r: p.lit, col: p.lcol || p.glow, a: 0.75 });
    for (const s of G.S) L.push({ x: s.x, y: s.y, r: 80, col: s.col, a: 0.5 });
    for (const q of G.K) if (!q.got) L.push({ x: q.x, y: q.y - 14, r: 120, col: q.col, a: 0.85 });
    for (const it of G.I) if (it.on && !it.done) L.push({ x: it.x, y: it.y, r: 220, col: '255,230,170', a: 0.85 });
    const co = G.core;
    if (co) { if (co.kind === 'fire') L.push({ x: co.x, y: co.y - 10, r: (220 + 280 * co.hp / co.max) * (0.95 + 0.05 * Math.sin(t * 17)), col: '255,170,90', a: 1 }); else L.push({ x: co.x, y: co.y - 40, r: 420, col: '255,230,170', a: 0.9 }); }
    for (const e of G.E) { const gl = this.ET[e.type].glow; if (gl && !e.dead) L.push({ x: e.x, y: e.y - e.h, r: e.type === 'boss' ? 480 : e.type === 'pylon' ? 210 : 64, col: gl, a: 0.6 }); }
    for (const l of G.TL) L.push({ x: l.x, y: l.y, r: l.r, col: l.col, a: 1 - l.t / l.life });
    for (const z of G.Z) L.push({ x: z.x, y: z.y, r: z.r * 1.6, col: z.col, a: 0.5 * Math.min(1, z.t / z.delay) });
    if (G.lava) for (const l of G.lava) L.push({ x: l.x, y: l.y, r: l.r * 2, col: '255,120,40', a: 0.8 });
    if (G.search) for (const s of G.search) L.push({ x: s.cx + Math.cos(t * s.sp + s.ph) * s.rad, y: s.cy + Math.sin(t * s.sp + s.ph) * s.rad * 0.6, r: 220, col: '220,235,255', a: 0.9 });
    const bo = this.bolt > 0 ? 120 * this.bolt / 0.3 : 0;
    this.lightPass(c, cx, cy, 'rgb(' + Math.min(255, (G.amb[0] + bo) | 0) + ',' + Math.min(255, (G.amb[1] + bo) | 0) + ',' + Math.min(255, (G.amb[2] + bo) | 0) + ')');

    c.save(); c.translate(-cx, -cy); c.globalCompositeOperation = 'lighter';
    if (G.lava) for (const l of G.lava) this.blit(c, '255,110,30', l.x, l.y, l.r * 1.5, 0.45, 1);
    if (G.search) for (const s of G.search) this.blit(c, '200,220,255', s.cx + Math.cos(t * s.sp + s.ph) * s.rad, s.cy + Math.sin(t * s.sp + s.ph) * s.rad * 0.6, 190, 0.14, 1);
    for (const z of G.Z) {
      const k = Math.min(1, z.t / z.delay); c.globalAlpha = 0.5 + 0.5 * k; c.strokeStyle = 'rgb(' + z.col + ')'; c.lineWidth = 2; c.beginPath(); c.arc(z.x, z.y, z.r, 0, 6.283); c.stroke();
      if (z.kind === 'void') { c.beginPath(); c.arc(z.x, z.y, Math.max(1, z.r * (1 - k)), 0, 6.283); c.stroke(); c.globalAlpha = 1; }
      else { const q = 1 - k, mx = z.x + q * 240, my = z.y - q * 680; c.lineWidth = 5; c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + 36, my - 100); c.stroke(); c.globalAlpha = 1; this.blit(c, z.col, mx, my, 34, 1); }
    }
    for (const it of G.I) if (it.on && !it.done) {
      const pu = 0.6 + 0.4 * Math.sin(t * 3); this.blit(c, '255,225,160', it.x, it.y - 10, 80, 0.4 * pu, 1);
      c.globalAlpha = 0.25; c.fillStyle = '#ffe1a0'; c.fillRect(it.x - 1.5, it.y - 280, 3, 270);
      c.globalAlpha = 0.9; c.strokeStyle = '#ffe1a0'; c.lineWidth = 2; c.beginPath(); c.ellipse(it.x, it.y, 48, 19, 0, 0, 6.283); c.stroke();
      if (it.prog > 0) { c.lineWidth = 5; c.beginPath(); c.arc(it.x, it.y - 78, 18, -1.5708, -1.5708 + 6.283 * Math.min(1, it.prog / it.hold)); c.stroke(); }
      c.globalAlpha = 1;
    }
    for (const q of G.K) if (!q.got) { const by = q.y - 16 + Math.sin(t * 3 + q.x) * 4; this.blit(c, q.col, q.x, by, 28, 0.9); this.blit(c, '255,255,255', q.x, by, 7, 0.9); c.globalAlpha = 0.22; c.fillStyle = 'rgb(' + q.col + ')'; c.fillRect(q.x - 1, q.y - 200, 2, 180); c.globalAlpha = 1; }
    if (co) {
      if (co.kind === 'fire') this.blit(c, '255,150,60', co.x, co.y - 20, 90 * (0.4 + 0.6 * co.hp / co.max) * (0.9 + 0.1 * Math.sin(t * 23)), 0.7);
      else { const pu = 0.8 + 0.2 * Math.sin(t * 2.4); this.blit(c, '255,225,160', co.x, co.y - 108, 64 * pu, 0.9); c.globalAlpha = 0.3 * pu; c.fillStyle = '#ffe9b8'; c.fillRect(co.x - 3, co.y - 760, 6, 652); c.globalAlpha = 1; }
    }
    for (const p of vis) if (p.glow) this.blit(c, p.glow, p.x, p.y - p.gh * (p.s || 1), p.gr, p.ga * (0.8 + 0.2 * Math.sin(t * 2 + p.x)), 1);
    for (const e of G.E) if (!e.dead) this.foeGlow(c, e, t);
    for (const p of G.H) {
      if (p.down > 0) { this.blit(c, p.col, p.x, p.y - 6, 28, 0.5); c.strokeStyle = 'rgb(' + p.col + ')'; c.lineWidth = 3; c.globalAlpha = 0.9; c.beginPath(); c.arc(p.x, p.y - 36, 12, -1.5708, -1.5708 + 6.283 * Math.max(0.02, 1 - p.down / 5)); c.stroke(); c.globalAlpha = 1; continue; }
      this.blit(c, p.col, p.x, p.y - 26, p.dashT > 0 ? 72 : 46, 0.3 + p.flash * 0.5, 1);
      if (p.kind) this.blit(c, p.col, p.x + Math.cos(p.face) * 11, p.y - 55 + Math.sin(p.face) * 9, 13, 0.9); else this.blit(c, p.col, p.x + Math.cos(p.face) * 28, p.y - 30 + Math.sin(p.face) * 24, 15, 0.8);
    }
    for (const s of G.S) { this.blit(c, s.col, s.x, s.y, s.r * 3.2, 1); this.blit(c, '255,255,255', s.x, s.y, s.r * 1.1, 1); }
    for (const f of G.FX) {
      const k = f.t / f.life; c.globalAlpha = 1 - k; c.lineCap = 'round';
      if (f.kind === 'slash') {
        const sw = Math.min(1, k * 2.4 + 0.15), a0 = f.a - 1.05;
        c.strokeStyle = 'rgb(' + f.col + ')'; c.lineWidth = f.r * 0.22 * (1 - k) + 2; c.beginPath(); c.arc(f.x, f.y, f.r, a0, a0 + 2.1 * sw); c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 4 * (1 - k) + 1; c.beginPath(); c.arc(f.x, f.y, f.r + 4, a0 + 0.84 * sw, a0 + 2.1 * sw); c.stroke();
      } else { c.strokeStyle = '#fff3d0'; c.lineWidth = 12 * (1 - k) + 1; c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x2, f.y2); c.stroke(); }
    }
    c.globalAlpha = 1; c.lineCap = 'butt';
    this.drawP(c, true);
    c.globalCompositeOperation = 'source-over'; this.drawP(c, false);
    c.restore();

    this.weather(c, G.ch.weather, dt, G.cam);
    c.globalCompositeOperation = 'soft-light';
    const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(' + pal.grade[0] + ',0.32)'); gr.addColorStop(1, 'rgba(' + pal.grade[1] + ',0.32)');
    c.fillStyle = gr; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';

    let best = null, bd = 1e9;
    const mark = (m) => { const d = Math.hypot(m.x - h.x, m.y - h.y); if (d < bd) { bd = d; best = m; } };
    for (const q of G.K) if (!q.got) mark(q);
    for (const it of G.I) if (it.on && !it.done) mark(it);
    if (G.pyl) for (const e of G.pyl) if (!e.dead) mark(e);
    if (best) this.arrow(c, best.x - cx, best.y - cy, '255,225,160');
    if (co) this.arrow(c, co.x - cx, co.y - cy, '255,170,90');
  }
  arrow(c, sx, sy, col) {
    if (sx > 30 && sx < 1250 && sy > 30 && sy < 690) return;
    const a = Math.atan2(sy - 360, sx - 640), px = Math.max(46, Math.min(1234, sx)), py = Math.max(130, Math.min(600, sy));
    c.save(); c.translate(px, py); c.rotate(a);
    c.globalCompositeOperation = 'lighter'; this.blit(c, col, 0, 0, 26, 0.6); c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgb(' + col + ')'; c.beginPath(); c.moveTo(15, 0); c.lineTo(-8, -10); c.lineTo(-3, 0); c.lineTo(-8, 10); c.closePath(); c.fill();
    c.restore();
  }
  prop(c, p, t, G) {
    const x = p.x, y = p.y, s = p.s || 1, sway = Math.sin(t * 0.9 + x * 0.01) * 3;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(x, y + 2, (p.r || 30) * 1.25, (p.r || 30) * 0.5, 0, 0, 6.283); c.fill();
    switch (p.type) {
      case 'rock':
        c.fillStyle = p.c1; c.beginPath(); c.ellipse(x, y - 10 * s, 22 * s, 16 * s, 0, 0, 6.283); c.fill();
        c.fillStyle = p.c2; c.beginPath(); c.ellipse(x - 5 * s, y - 15 * s, 13 * s, 8 * s, -0.3, 0, 6.283); c.fill(); break;
      case 'tree':
        c.fillStyle = p.c1; c.fillRect(x - 4 * s, y - 48 * s, 8 * s, 48 * s);
        c.fillStyle = p.c2; c.beginPath(); c.arc(x + sway, y - 70 * s, 30 * s, 0, 6.283); c.fill(); c.beginPath(); c.arc(x - 19 * s + sway, y - 55 * s, 20 * s, 0, 6.283); c.fill(); c.beginPath(); c.arc(x + 19 * s + sway, y - 57 * s, 22 * s, 0, 6.283); c.fill();
        c.fillStyle = p.c3; c.beginPath(); c.arc(x - 7 * s + sway, y - 78 * s, 15 * s, 0, 6.283); c.fill(); break;
      case 'pine':
        c.fillStyle = p.c1; c.fillRect(x - 4 * s, y - 20 * s, 8 * s, 20 * s);
        for (let i = 0; i < 3; i++) { const by = y - 16 * s - i * 22 * s, w = (30 - i * 7) * s; c.fillStyle = i % 2 ? p.c3 : p.c2; c.beginPath(); c.moveTo(x - w, by); c.lineTo(x + sway * 0.5, by - 38 * s); c.lineTo(x + w, by); c.closePath(); c.fill(); } break;
      case 'dead':
        c.strokeStyle = p.c1; c.lineCap = 'round'; c.lineWidth = 7 * s; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3 * s, y - 50 * s); c.stroke();
        c.lineWidth = 3 * s; c.beginPath(); c.moveTo(x + 2 * s, y - 30 * s); c.lineTo(x - 20 * s, y - 56 * s); c.moveTo(x + 3 * s, y - 42 * s); c.lineTo(x + 24 * s, y - 66 * s); c.moveTo(x + 3 * s, y - 50 * s); c.lineTo(x - 6 * s, y - 80 * s); c.stroke();
        c.strokeStyle = '#dfe8fa'; c.lineWidth = 2 * s; c.beginPath(); c.moveTo(x - 20 * s, y - 57 * s); c.lineTo(x - 10 * s, y - 46 * s); c.moveTo(x + 24 * s, y - 67 * s); c.lineTo(x + 14 * s, y - 56 * s); c.stroke(); c.lineCap = 'butt'; break;
      case 'crystal':
        c.fillStyle = p.c1; c.beginPath(); c.moveTo(x - 10 * s, y); c.lineTo(x - 14 * s, y - 30 * s); c.lineTo(x, y - 58 * s); c.lineTo(x + 12 * s, y - 28 * s); c.lineTo(x + 9 * s, y); c.closePath(); c.fill();
        c.fillStyle = p.c2; c.beginPath(); c.moveTo(x, y - 58 * s); c.lineTo(x + 12 * s, y - 28 * s); c.lineTo(x + 9 * s, y); c.lineTo(x + 1 * s, y - 12 * s); c.closePath(); c.fill(); break;
      case 'spire':
        c.fillStyle = p.c1; c.beginPath(); c.moveTo(x - 18 * s, y); c.lineTo(x - 4 * s, y - 72 * s); c.lineTo(x + 16 * s, y); c.closePath(); c.fill();
        c.fillStyle = p.c2; c.beginPath(); c.moveTo(x - 4 * s, y - 72 * s); c.lineTo(x + 16 * s, y); c.lineTo(x + 3 * s, y - 8 * s); c.closePath(); c.fill();
        c.strokeStyle = '#ff7a2a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - 8 * s, y - 6 * s); c.lineTo(x - 3 * s, y - 28 * s); c.lineTo(x - 7 * s, y - 44 * s); c.stroke(); break;
      case 'shard': {
        const by = y - 20 * s + Math.sin(t * 1.3 + x) * 6;
        c.fillStyle = p.c1; c.beginPath(); c.moveTo(x, by - 44 * s); c.lineTo(x + 15 * s, by - 10 * s); c.lineTo(x, by + 14 * s); c.lineTo(x - 15 * s, by - 10 * s); c.closePath(); c.fill();
        c.fillStyle = p.c2; c.beginPath(); c.moveTo(x, by - 44 * s); c.lineTo(x + 15 * s, by - 10 * s); c.lineTo(x, by - 2 * s); c.closePath(); c.fill(); break; }
      case 'home': {
        const a = G.age || 0;
        if (a === 0) { c.fillStyle = '#7a6444'; c.fillRect(x - 22, y - 22, 44, 22); c.fillStyle = '#4a3622'; c.beginPath(); c.moveTo(x - 30, y - 20); c.lineTo(x, y - 58); c.lineTo(x + 30, y - 20); c.closePath(); c.fill(); c.fillStyle = '#1e140c'; c.fillRect(x - 5, y - 16, 10, 16); }
        else if (a === 1) { c.fillStyle = '#8a8478'; c.fillRect(x - 28, y - 36, 56, 36); c.fillStyle = '#6a3626'; c.beginPath(); c.moveTo(x - 34, y - 34); c.lineTo(x, y - 64); c.lineTo(x + 34, y - 34); c.closePath(); c.fill(); c.fillStyle = '#ffd98a'; c.fillRect(x - 17, y - 26, 8, 9); c.fillRect(x + 9, y - 26, 8, 9); c.fillStyle = '#2a1c12'; c.fillRect(x - 5, y - 18, 10, 18); }
        else { const hh = 96 + (p.seed % 3) * 22; c.fillStyle = '#39414f'; c.fillRect(x - 24, y - hh, 48, hh); c.fillStyle = '#4b5567'; c.fillRect(x - 24, y - hh, 10, hh); c.fillStyle = '#ffe3a0'; for (let r = 0; r * 16 < hh - 26; r++) for (let q = 0; q < 3; q++) if ((r * 3 + q + p.seed) % 4) c.fillRect(x - 9 + q * 10, y - hh + 10 + r * 16, 6, 8); c.fillStyle = '#272d38'; c.fillRect(x - 3, y - hh - 16, 6, 16); }
        break; }
      case 'pod':
        c.save(); c.translate(x, y - 24); c.rotate(-0.22);
        c.fillStyle = '#c9c2b0'; c.beginPath(); c.ellipse(0, 0, 62, 24, 0, 0, 6.283); c.fill();
        c.fillStyle = '#8f8878'; c.beginPath(); c.ellipse(0, 7, 58, 15, 0, 0, 3.1416); c.fill();
        c.fillStyle = '#20242c'; c.beginPath(); c.ellipse(14, -6, 20, 8, 0, 0, 6.283); c.fill(); c.restore(); break;
      case 'truck':
        c.fillStyle = '#2c3328'; c.fillRect(x - 44, y - 40, 60, 34); c.fillStyle = '#3d4636'; c.fillRect(x + 16, y - 32, 28, 26); c.fillStyle = '#9fb4c4'; c.fillRect(x + 24, y - 28, 16, 9);
        c.fillStyle = '#0e0f10'; c.beginPath(); c.arc(x - 28, y - 4, 8, 0, 6.283); c.fill(); c.beginPath(); c.arc(x + 28, y - 4, 8, 0, 6.283); c.fill(); break;
      case 'crate':
        c.fillStyle = '#4a4436'; c.fillRect(x - 16, y - 26, 32, 26); c.strokeStyle = '#2c281e'; c.lineWidth = 2; c.strokeRect(x - 16, y - 26, 32, 26); c.beginPath(); c.moveTo(x - 16, y - 26); c.lineTo(x + 16, y); c.stroke(); break;
      case 'lamp':
        c.strokeStyle = '#3a3f48'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 78); c.stroke(); c.fillStyle = '#d8e6ff'; c.fillRect(x - 12, y - 86, 24, 8); break;
      case 'hearth':
        c.fillStyle = '#4a5064'; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; c.beginPath(); c.ellipse(x + Math.cos(a) * 30, y + Math.sin(a) * 14 - 2, 9, 6, 0, 0, 6.283); c.fill(); }
        c.strokeStyle = '#3a2a1c'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 14, y - 2); c.lineTo(x + 12, y - 12); c.moveTo(x + 14, y - 2); c.lineTo(x - 12, y - 12); c.stroke(); c.lineCap = 'butt'; break;
    }
  }
  figure(c, x, y, face, walk, pal, o) {
    const dir = Math.cos(face) >= 0 ? 1 : -1, l = Math.sin(walk) * 5, w = Math.sin(walk * 0.7 + 1) * 3;
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x, y + 2, 14, 6, 0, 0, 6.283); c.fill();
    c.save(); c.translate(x, y - Math.abs(Math.sin(walk)) * 1.5);
    c.lineCap = 'round'; c.strokeStyle = pal.leg; c.lineWidth = 4.5;
    c.beginPath(); c.moveTo(-4, -13); c.lineTo(-4 + l, 0); c.moveTo(4, -13); c.lineTo(4 - l, 0); c.stroke();
    if (o.cape) { c.fillStyle = pal.cape; c.beginPath(); c.moveTo(-4 * dir, -35); c.quadraticCurveTo(-17 * dir, -24 + w, (-14 - w) * dir, -5); c.lineTo(-3 * dir, -11); c.closePath(); c.fill(); }
    c.fillStyle = pal.body; c.beginPath(); c.moveTo(-7.5, -35); c.lineTo(7.5, -35); c.lineTo(6, -11); c.lineTo(-6, -11); c.closePath(); c.fill();
    c.fillStyle = pal.trim; c.fillRect(-6.5, -22, 13, 2.5); c.fillRect(-1.2, -34, 2.4, 11);
    c.fillStyle = pal.skin; c.beginPath(); c.arc(0, -41.5, 6.5, 0, 6.283); c.fill();
    c.fillStyle = pal.hair; c.beginPath(); c.arc(0, -42.5, 7, 3.1416, 6.2832); c.fill();
    if (o.long) { c.beginPath(); c.moveTo(-5 * dir, -46); c.quadraticCurveTo(-15 * dir, -38 + w, (-11 - w) * dir, -24); c.lineTo(-4 * dir, -38); c.closePath(); c.fill(); }
    if (o.helm) { c.fillStyle = pal.trim; c.beginPath(); c.arc(0, -42.5, 7.6, 3.1416, 6.2832); c.fill(); c.fillRect(-7.6, -43, 15.2, 2.4); }
    const a = face + (o.swing ? (0.5 - o.swing) * 2.2 : 0), ax = Math.cos(a), ay = Math.sin(a), hx = ax * 11, hy = -30 + ay * 9, wp = o.weapon;
    c.strokeStyle = pal.body; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -31); c.lineTo(hx, hy); c.stroke();
    if (wp === 'blade') { c.strokeStyle = pal.trim === '#ffffff' ? '#ffffff' : '#fff0c4'; c.lineWidth = 3.2; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + ax * 26, hy + ay * 24); c.stroke(); }
    else if (wp === 'staff') { c.strokeStyle = '#dbe8ff'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(hx, hy + 12); c.lineTo(hx, hy - 20); c.stroke(); c.beginPath(); c.arc(hx, hy - 25, 6, 0.6, 4.4); c.stroke(); }
    else if (wp === 'spear') { c.strokeStyle = '#6a5038'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(hx - ax * 12, hy - ay * 12); c.lineTo(hx + ax * 26, hy + ay * 24); c.stroke(); c.strokeStyle = '#c9ccd2'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(hx + ax * 24, hy + ay * 22); c.lineTo(hx + ax * 32, hy + ay * 29); c.stroke(); }
    else if (wp === 'bow') { c.strokeStyle = '#8a6a3a'; c.lineWidth = 2.5; c.beginPath(); c.arc(hx, hy, 13, a - 1.2, a + 1.2); c.stroke(); }
    else if (wp === 'rifle') { c.strokeStyle = '#0e0f11'; c.lineWidth = 4.5; c.lineCap = 'butt'; c.beginPath(); c.moveTo(hx - ax * 6, hy - ay * 5); c.lineTo(hx + ax * 20, hy + ay * 17); c.stroke(); }
    c.lineCap = 'butt'; c.restore();
  }
  heroDraw(c, p, t) {
    if (p.down > 0) { c.fillStyle = '#34343c'; c.beginPath(); c.ellipse(p.x, p.y - 3, 16, 7, 0, 0, 6.283); c.fill(); c.fillStyle = '#4a4a55'; c.beginPath(); c.ellipse(p.x - 2, p.y - 6, 9, 4, 0, 0, 6.283); c.fill(); return; }
    if (p.inv > 0 && p.dashT <= 0 && Math.sin(t * 40) > 0.3) c.globalAlpha = 0.6;
    this.figure(c, p.x, p.y, p.face, p.walk, p.flash > 0.6 ? this.FP.white : this.FP[p.kind ? 'ena' : 'aro'], { weapon: p.kind ? 'staff' : 'blade', cape: 1, long: p.kind === 1, swing: p.swing });
    c.globalAlpha = 1;
  }
  foe(c, e, t) {
    const T = this.ET[e.type], x = e.x, y = e.y, white = e.hit > 0.5;
    c.fillStyle = 'rgba(0,0,0,' + (T.fly ? 0.2 : 0.35) + ')'; c.beginPath(); c.ellipse(x, y + 2, e.r * (T.fly ? 0.8 : 1.15), e.r * 0.45, 0, 0, 6.283); c.fill();
    switch (e.type) {
      case 'shade': case 'wraith': case 'brute': {
        const s = e.type === 'brute' ? 1.8 : 1, wob = Math.sin(t * 6 + e.walk) * 2, ln = e.wind > 0 ? Math.cos(e.face) * 6 : 0;
        c.fillStyle = white ? '#ffffff' : e.type === 'wraith' ? '#1a0f2e' : '#0c0a12';
        c.beginPath(); c.moveTo(x - 13 * s, y); c.quadraticCurveTo(x - 17 * s + ln, y - 22 * s + wob, x - 5 * s + ln, y - 31 * s); c.quadraticCurveTo(x + ln, y - 37 * s - wob, x + 6 * s + ln, y - 31 * s); c.quadraticCurveTo(x + 17 * s + ln, y - 20 * s - wob, x + 13 * s, y); c.quadraticCurveTo(x + 6 * s, y - 5 * s, x, y); c.quadraticCurveTo(x - 6 * s, y - 5 * s, x - 13 * s, y); c.fill();
        if (s > 1) { c.beginPath(); c.moveTo(x - 9 * s, y - 30 * s); c.lineTo(x - 14 * s, y - 42 * s); c.lineTo(x - 4 * s, y - 33 * s); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x + 9 * s, y - 30 * s); c.lineTo(x + 14 * s, y - 42 * s); c.lineTo(x + 4 * s, y - 33 * s); c.closePath(); c.fill(); }
        break; }
      case 'raider': this.figure(c, x, y, e.face, e.walk, white ? this.FP.white : this.FP.raider, { weapon: 'spear', swing: e.wind > 0 ? 0.8 : 0 }); break;
      case 'archer': this.figure(c, x, y, e.face, e.walk, white ? this.FP.white : this.FP.archer, { weapon: 'bow', cape: 1 }); break;
      case 'soldier': this.figure(c, x, y, e.face, e.walk, white ? this.FP.white : this.FP.soldier, { weapon: 'rifle', helm: 1 }); break;
      case 'drone': {
        const by = y - 46 + Math.sin(t * 5 + e.walk) * 3;
        c.fillStyle = white ? '#ffffff' : '#2a2f38'; c.beginPath(); c.ellipse(x, by, 16, 7, 0, 0, 6.283); c.fill();
        c.fillStyle = white ? '#ffffff' : '#4a525f'; c.beginPath(); c.ellipse(x, by - 4, 8, 4, 0, 0, 6.283); c.fill();
        c.fillStyle = 'rgba(200,210,225,0.3)'; c.beginPath(); c.ellipse(x - 15, by - 7, 11, 2.5, 0, 0, 6.283); c.fill(); c.beginPath(); c.ellipse(x + 15, by - 7, 11, 2.5, 0, 0, 6.283); c.fill(); break; }
      case 'engine': case 'tank': {
        const eng = e.type === 'engine', c1 = white ? '#ffffff' : eng ? '#5a3f22' : '#39432e', c2 = white ? '#ffffff' : eng ? '#8a6a34' : '#566246';
        c.fillStyle = '#16181a'; c.fillRect(x - 36, y - 16, 72, 18);
        c.fillStyle = c1; c.fillRect(x - 30, y - 36, 60, 22);
        if (eng) { c.fillStyle = '#2a2018'; c.fillRect(x - 24, y - 56, 8, 20); c.fillStyle = c2; c.beginPath(); c.arc(x - 22, y - 6, 9, 0, 6.283); c.fill(); c.beginPath(); c.arc(x + 22, y - 6, 9, 0, 6.283); c.fill(); }
        c.fillStyle = c2; c.beginPath(); c.arc(x, y - 40, 14, 0, 6.283); c.fill();
        c.strokeStyle = c2; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y - 40); c.lineTo(x + Math.cos(e.face) * 40, y - 40 + Math.sin(e.face) * 22); c.stroke(); break; }
      case 'pylon':
        c.fillStyle = '#2a2e36'; c.fillRect(x - 20, y - 12, 40, 12);
        c.fillStyle = white ? '#ffffff' : '#444b58'; c.beginPath(); c.moveTo(x - 12, y - 12); c.lineTo(x - 6, y - 86); c.lineTo(x + 6, y - 86); c.lineTo(x + 12, y - 12); c.closePath(); c.fill();
        c.fillStyle = '#c23a30'; c.fillRect(x - 9, y - 50, 18, 5); c.fillStyle = '#1c1f26'; c.fillRect(x - 13, y - 94, 26, 8); break;
      case 'boss':
        c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(x, y + 4, 86, 28, 0, 0, 6.283); c.fill();
        c.fillStyle = white ? '#d9c2ff' : '#07050f'; c.beginPath(); c.arc(x, y - e.h, 62, 0, 6.283); c.fill(); break;
    }
    if (e.hp < e.max && e.type !== 'boss') { const w = Math.max(26, e.r * 2); c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(x - w / 2, y - T.top - 8, w, 4); c.fillStyle = '#ff6a4a'; c.fillRect(x - w / 2, y - T.top - 8, w * Math.max(0, e.hp / e.max), 4); }
  }
  foeGlow(c, e, t) {
    const T = this.ET[e.type], x = e.x, y = e.y, dir = Math.cos(e.face) >= 0 ? 1 : -1;
    if (e.type === 'shade' || e.type === 'wraith' || e.type === 'brute') { const s = e.type === 'brute' ? 1.8 : 1, r = (e.wind > 0 ? 13 : 7) * s; this.blit(c, T.glow, x + (dir * 5 - 4) * s, y - 23 * s, r, 0.95); this.blit(c, T.glow, x + (dir * 5 + 4) * s, y - 23 * s, r, 0.95); }
    else if (e.type === 'drone') this.blit(c, T.glow, x + dir * 9, y - 46 + Math.sin(t * 5 + e.walk) * 3, 9, 0.9 * (0.6 + 0.4 * Math.sin(t * 10)));
    else if (e.type === 'pylon') {
      const pu = 0.7 + 0.3 * Math.sin(t * 5); this.blit(c, T.glow, x, y - 92, 34 * pu, 0.9);
      c.globalAlpha = 0.25 * pu; c.fillStyle = '#ff5040'; c.fillRect(x - 2, y - 520, 4, 430);
      c.globalAlpha = 0.8; c.strokeStyle = '#ff5a48'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y - 92, 20 + pu * 8, 7 + pu * 3, 0, 0, 6.283); c.stroke(); c.globalAlpha = 1;
    } else if (e.type === 'boss') {
      const by = y - e.h, pu = 0.85 + 0.15 * Math.sin(t * 2.2);
      this.blit(c, T.glow, x, by, 190 * pu, 0.75, 1);
      c.fillStyle = 'rgb(' + T.glow + ')';
      for (let i = 0; i < 12; i++) { const a = t * 0.2 + i * 0.5236, len = 150 + Math.sin(t * 1.4 + i * 2.3) * 40; c.globalAlpha = 0.1; c.beginPath(); c.moveTo(x, by); c.lineTo(x + Math.cos(a - 0.06) * len, by + Math.sin(a - 0.06) * len); c.lineTo(x + Math.cos(a + 0.06) * len, by + Math.sin(a + 0.06) * len); c.closePath(); c.fill(); }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.fillStyle = e.hit > 0.5 ? '#d9c2ff' : '#07050f'; c.beginPath(); c.arc(x, by, 60, 0, 6.283); c.fill(); c.globalCompositeOperation = 'lighter';
      c.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const a = t * (0.9 + i * 0.5) * (i % 2 ? -1 : 1) + i * 2; c.globalAlpha = 0.85 - i * 0.2; c.strokeStyle = i === 1 ? '#ffffff' : 'rgb(' + T.glow + ')'; c.beginPath(); c.arc(x, by, 72 + i * 16, a, a + 3.4); c.stroke(); }
      c.globalAlpha = 1; this.blit(c, '255,255,255', x, by, 10 + Math.sin(t * 9) * 3, 0.9); this.blit(c, T.glow, x, by, 30, 0.8);
    }
  }
  pick(c, q) {
    const x = q.x, y = q.y;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(x, y + 2, 12, 5, 0, 0, 6.283); c.fill();
    if (q.kind === 'flint') { c.fillStyle = '#4c566a'; c.beginPath(); c.moveTo(x - 10, y); c.lineTo(x - 4, y - 14); c.lineTo(x + 8, y - 10); c.lineTo(x + 11, y); c.closePath(); c.fill(); c.fillStyle = '#9fb0cc'; c.beginPath(); c.moveTo(x - 4, y - 14); c.lineTo(x + 8, y - 10); c.lineTo(x + 2, y - 5); c.closePath(); c.fill(); }
    else if (q.kind === 'wood') { c.strokeStyle = '#6a4a2a'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 13, y - 3); c.lineTo(x + 13, y - 7); c.moveTo(x - 11, y - 10); c.lineTo(x + 12, y - 13); c.stroke(); c.lineCap = 'butt'; }
  }
  coreDraw(c, co) {
    if (co.kind !== 'beacon') return;
    const x = co.x, y = co.y;
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x, y + 2, 34, 13, 0, 0, 6.283); c.fill();
    c.fillStyle = '#6b6455'; c.fillRect(x - 24, y - 10, 48, 10);
    c.fillStyle = co.flash > 0.5 ? '#ffffff' : '#a39a84'; c.beginPath(); c.moveTo(x - 15, y - 10); c.lineTo(x - 9, y - 94); c.lineTo(x, y - 110); c.lineTo(x + 9, y - 94); c.lineTo(x + 15, y - 10); c.closePath(); c.fill();
    c.fillStyle = '#7d745f'; c.beginPath(); c.moveTo(x, y - 110); c.lineTo(x + 9, y - 94); c.lineTo(x + 15, y - 10); c.lineTo(x + 3, y - 10); c.closePath(); c.fill();
    c.fillStyle = '#e8c27a'; c.fillRect(x - 12, y - 56, 24, 4);
  }
  weatherInit() { this.Wt = []; this.wcx = null; this.wcy = null; for (let i = 0; i < 110; i++) this.Wt.push({ x: Math.random() * 1280, y: Math.random() * 720, z: 0.4 + Math.random() * 0.6, p: Math.random() * 6.28 }); }
  weather(c, kind, dt, cam) {
    const Wt = this.Wt, W = 1280, H = 720, dx = this.wcx == null ? 0 : cam.x - this.wcx, dy = this.wcy == null ? 0 : cam.y - this.wcy; this.wcx = cam.x; this.wcy = cam.y;
    const V = { spores: [10, -16], snow: [-46, 96], rain: [-240, 980], ash: [-26, 44], dust: [14, 5], void: [0, -34] }[kind] || [0, 0];
    const add = kind === 'spores' || kind === 'dust' || kind === 'void';
    c.globalCompositeOperation = add ? 'lighter' : 'source-over'; c.strokeStyle = 'rgba(190,210,240,0.35)'; c.lineWidth = 1;
    for (let i = 0; i < Wt.length; i++) {
      const p = Wt[i]; p.x += (V[0] * dt - dx) * p.z + Math.sin(this.time + p.p) * 6 * dt; p.y += (V[1] * dt - dy) * p.z;
      if (p.x < -20) p.x += W + 40; else if (p.x > W + 20) p.x -= W + 40;
      if (p.y < -20) p.y += H + 40; else if (p.y > H + 20) p.y -= H + 40;
      if (kind === 'rain') { c.globalAlpha = p.z; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + 5 * p.z, p.y - 20 * p.z); c.stroke(); }
      else if (kind === 'snow') { c.globalAlpha = 0.8 * p.z; c.fillStyle = '#eef3ff'; c.fillRect(p.x, p.y, 2.5 * p.z, 2.5 * p.z); }
      else if (kind === 'ash') {
        if (i % 3 === 0) { c.globalCompositeOperation = 'lighter'; this.blit(c, '255,130,40', p.x, H - p.y, 5 * p.z, 0.8); c.globalCompositeOperation = 'source-over'; }
        else { c.globalAlpha = 0.5 * p.z; c.fillStyle = '#8a8580'; c.fillRect(p.x, p.y, 2.5 * p.z, 2.5 * p.z); }
      } else this.blit(c, kind === 'spores' ? (i % 2 ? '120,255,215' : '255,225,150') : kind === 'void' ? '180,130,255' : '255,225,170', p.x, p.y, (kind === 'dust' ? 3 : 6) * p.z, kind === 'dust' ? 0.35 : 0.6 * (0.6 + 0.4 * Math.sin(this.time * 2 + p.p)));
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    if (kind === 'rain') { this.bolt -= dt; if (this.bolt < this.boltAt) { this.bolt = 0.3; this.boltAt = -5 - Math.random() * 9; } } else this.bolt = 0;
  }
  post(c, dt) {
    const W = 1280, H = 720;
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    if (this.opt('bloom', true) && this.cv) {
      const b = this.bc || (this.bc = this.mk(320, 180)), g = this.bg || (this.bg = b.getContext('2d'));
      g.globalCompositeOperation = 'source-over'; g.drawImage(this.cv, 0, 0, 320, 180);
      g.globalCompositeOperation = 'multiply'; g.drawImage(b, 0, 0);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55; c.drawImage(b, 0, 0, W, H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    if (!this.vg) { this.vg = this.mk(256, 144); const g = this.vg.getContext('2d'), gr = g.createRadialGradient(128, 72, 50, 128, 72, 150); gr.addColorStop(0, 'rgba(0,0,6,0)'); gr.addColorStop(1, 'rgba(0,0,6,0.8)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 144); }
    c.drawImage(this.vg, 0, 0, W, H);
    if (this.flash > 0.01) { c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(' + this.flashCol + ',' + Math.min(1, this.flash) + ')'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
    this.lb += ((this.mode === 'cut' ? 1 : 0) - this.lb) * Math.min(1, dt * 4);
    if (this.lb > 0.01) { c.fillStyle = '#000000'; c.fillRect(0, 0, W, 76 * this.lb); c.fillRect(0, H - 116 * this.lb, W, 116 * this.lb); }
    this.shake *= Math.max(0, 1 - dt * 7); this.flash = Math.max(0, this.flash - dt * 1.6);
  }

  // ---------------------------------------------------------------- cinematic space scenes
  renderCosmos(c, dt) {
    const W = 1280, H = 720, t = this.time, sc = this.scene || 'title', S = this.SC[sc] || this.SC.title, li = this.cut ? this.cut.i : 0;
    this.sceneT += dt; this.lineT += dt;
    c.fillStyle = '#03040a'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) this.blit(c, S.neb[i % S.neb.length], (i * 337 + 140 + Math.sin(t * 0.03 + i) * 40) % W, (i * 211 + 90) % H, 380 + (i % 3) * 120, 0.2, 1);
    if (!this.stars) { this.stars = []; for (let i = 0; i < 240; i++) this.stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.2 + Math.random() * 0.8, p: Math.random() * 6.28 }); }
    const warp = S.warp || 0; c.fillStyle = '#ffffff'; c.strokeStyle = 'rgb(210,225,255)'; c.lineWidth = 1.2;
    for (const s of this.stars) {
      if (sc === 'rewind') {
        const f = Math.max(0, 1 - dt * 1.6 * s.z); let dx = (s.x - 640) * f, dy = (s.y - 360) * f;
        if (Math.hypot(dx, dy) < 30) { const a = Math.random() * 6.283; dx = Math.cos(a) * 760; dy = Math.sin(a) * 760; }
        s.x = 640 + dx; s.y = 360 + dy; c.globalAlpha = s.z; c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(640 + dx * 1.09, 360 + dy * 1.09); c.stroke();
      } else {
        s.x -= (6 + warp) * s.z * dt; if (s.x < -60) s.x += W + 60;
        c.globalAlpha = s.z * (0.55 + 0.45 * Math.sin(t * 2 + s.p));
        if (warp > 100) { c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x + warp * 0.07 * s.z, s.y); c.stroke(); } else c.fillRect(s.x, s.y, s.z * 2, s.z * 2);
      }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    this.sceneDraw(c, sc, t, this.sceneT, li);
    this.updateP(dt); c.globalCompositeOperation = 'lighter'; this.drawP(c, true); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  }
  sceneDraw(c, sc, t, st, li) {
    const lt = this.lineT, gold = '255,196,110', blue = '140,200,255';
    const B = (col, x, y, r, a, soft) => { c.globalCompositeOperation = 'lighter'; this.blit(c, col, x, y, r, a, soft); c.globalCompositeOperation = 'source-over'; };
    if (sc === 'title') {
      this.entity(c, 930, 200, 120, 0.5 + Math.sin(t * 0.5) * 0.08, '255,220,170');
      B('255,190,120', 640, 500, 520, 0.3, 1);
      this.planet(c, 640, 1090, 630, 'aurel', { rot: t * 0.008, lx: 0.25, ly: -0.95 });
      const ax = 590 + Math.sin(t * 0.7) * 10, ay = 404 + Math.cos(t * 0.9) * 7, bx = 652 + Math.cos(t * 0.6) * 10, by = 392 + Math.sin(t * 0.8) * 7;
      B(gold, ax, ay, 30, 0.95); B('255,255,255', ax, ay, 8, 1); B(blue, bx, by, 28, 0.95); B('255,255,255', bx, by, 8, 1);
      if (Math.random() < 0.3) { this.emit({ x: ax, y: ay, vy: -20, vx: (Math.random() - 0.5) * 20, col: gold, size: 5, life: 1.2 }); this.emit({ x: bx, y: by, vy: -20, vx: (Math.random() - 0.5) * 20, col: blue, size: 5, life: 1.2 }); }
    } else if (sc === 'genesis') {
      const pr = Math.max(0, Math.min(1, (st - 1.5) / 11)), e = pr * pr * (3 - 2 * pr);
      this.entity(c, 640, 230, 105, Math.min(1, st / 3), '255,225,180');
      for (let i = 0; i < 2; i++) { const a = Math.random() * 6.283, R = 330 - e * 140; this.emit({ x: 640 + Math.cos(a) * R, y: 500 + Math.sin(a) * R * 0.5, vx: -Math.sin(a) * 110 - Math.cos(a) * 60, vy: (Math.cos(a) * 110 - Math.sin(a) * 60) * 0.5, col: i ? '120,220,210' : '240,200,140', size: 4 + Math.random() * 5, life: 1.8, drag: 0.4 }); }
      if (e > 0.03) this.planet(c, 640, 500, 150 * e, 'aurel', { rot: t * 0.05, a: Math.min(1, e * 1.5), lx: 0, ly: -0.9 });
      if (li >= 2) {
        const q = li > 2 ? 1 : Math.min(1, lt / 4), y = 250 + q * 150;
        B(gold, 622 - q * 30, y, 22, 1); B(blue, 658 + q * 30, y + 6, 22, 1);
        if (q < 1) { this.emit({ x: 622 - q * 30, y: y, vy: -60, col: gold, size: 7, life: 0.8 }); this.emit({ x: 658 + q * 30, y: y + 6, vy: -60, col: blue, size: 7, life: 0.8 }); }
      }
    } else if (sc === 'night') {
      this.entity(c, 220, 150, 50, 0.22, '200,215,255');
      this.planet(c, 640, 400, 235, 'aurel', { rot: t * 0.02, lx: 0.95, ly: -0.25 });
      if (li >= 2) { const q = Math.min(1, lt / 3); B('255,160,70', 566, 430, 10 + q * 26 + Math.sin(t * 14) * 2, 0.9); B('255,240,200', 566, 430, 4 + q * 4, 1); }
    } else if (sc === 'ages') {
      this.planet(c, 640, 395, 240, 'aurel', { rot: t * 0.05, lx: -0.9, ly: -0.2, cities: Math.min(1, (li + Math.min(1, lt / 4)) / 3) });
      if (li >= 3 && Math.random() < 0.08) this.burst(700 + Math.random() * 150, 300 + Math.random() * 200, 5, '255,90,50', 30, 10, 0.5);
    } else if (sc === 'earthfall') {
      const q = Math.min(1, st / 22);
      this.planet(c, 960, 390, 50 + q * 170, 'earth', { rot: t * 0.04, lx: -0.8, ly: -0.3 });
      for (let i = 0; i < 2; i++) { const x = 180 + q * 420 + i * 30, y = 330 + i * 46 + Math.sin(t * 1.3 + i * 2) * 10, col = i ? blue : gold; B(col, x, y, 26, 1); B('255,255,255', x, y, 8, 1); this.emit({ x: x, y: y, vx: -260, vy: (Math.random() - 0.5) * 20, col: col, size: 9, life: 0.7, grow: -8 }); }
    } else if (sc === 'stars') {
      B('255,90,40', 150, 290, 460, 0.85, 1); B('255,190,120', 150, 290, 190, 0.9);
      this.planet(c, 700, 400, 185, 'dying', { rot: t * 0.02, lx: -0.9, ly: -0.2, crack: Math.min(1, st / 7) });
      this.planet(c, 1090, 210, 62, 'husk', { rot: t * 0.03, lx: -0.9, ly: 0.1, a: Math.max(0.15, 1 - st / 16) });
      if (Math.random() < 0.5) { const a = Math.random() * 6.283; this.emit({ x: 700 + Math.cos(a) * 185, y: 400 + Math.sin(a) * 185, vx: Math.cos(a) * 30 + 26, vy: Math.sin(a) * 30, col: '255,130,60', size: 5, life: 2 }); this.emit({ x: 1090 + Math.cos(a) * 60, y: 210 + Math.sin(a) * 60, vx: 40, vy: Math.sin(a) * 14, col: '170,150,210', size: 4, life: 2 }); }
    } else if (sc === 'end') {
      this.entity(c, 640, 150, 80, 0.16 + Math.sin(t * 7) * 0.05, '220,220,255');
      B('170,100,255', 1000, 230, 210, 0.7, 1); c.fillStyle = '#020108'; c.beginPath(); c.arc(1000, 230, 92, 0, 6.283); c.fill();
      this.planet(c, 600, 480, 215, 'aurel', { rot: t * 0.02, lx: 0.7, ly: -0.5, crack: 1, crackCol: '190,120,255' });
      const a = Math.random() * 6.283, d = Math.random() * 215; this.emit({ x: 600 + Math.cos(a) * d, y: 480 + Math.sin(a) * d, vx: 50 + Math.random() * 40, vy: -40 - Math.random() * 40, col: Math.random() < 0.5 ? '190,130,255' : '110,220,230', size: 5, life: 2.2 });
    } else if (sc === 'rewind') {
      this.planet(c, 640, 360, 58, ['aurel', 'dying', 'earth', 'aurel'][Math.min(3, li)], { rot: -t * 0.6, lx: 0, ly: -0.8 });
      c.globalCompositeOperation = 'lighter'; c.lineWidth = 3;
      for (let i = 0; i < 4; i++) { const a = -t * (1.2 + i * 0.4) + i; c.strokeStyle = i % 2 ? 'rgba(140,200,255,0.8)' : 'rgba(255,205,130,0.8)'; c.beginPath(); c.arc(640, 360, 78 + i * 34, a, a + 4.4); c.stroke(); }
      c.globalCompositeOperation = 'source-over'; B('255,255,255', 640, 360, 170, 0.25, 1);
      if (li >= 3) { c.fillStyle = 'rgba(255,250,235,' + Math.min(0.9, lt / 5) + ')'; c.fillRect(0, 0, 1280, 720); }
    }
  }
  planet(c, x, y, r, key, o) {
    const pl = this.PL[key], al = o.a == null ? 1 : o.a, rot = o.rot || 0, lx = o.lx == null ? -0.5 : o.lx, ly = o.ly == null ? -0.4 : o.ly;
    if (!(r > 1)) return;
    c.globalCompositeOperation = 'lighter'; this.blit(c, pl.atm, x, y, r * 1.28, 0.55 * al, 1); c.globalCompositeOperation = 'source-over';
    if (!pl.b) { const rn = this.rng(pl.seed); pl.b = []; for (let i = 0; i < 46; i++) pl.b.push({ a: rn() * 6.283, lat: (rn() - 0.5) * 2.2, s: 0.08 + rn() * 0.26, c: pl.cols[(rn() * pl.cols.length) | 0] }); }
    c.save(); c.beginPath(); c.arc(x, y, r, 0, 6.283); c.clip();
    c.globalAlpha = al; c.fillStyle = pl.base; c.fillRect(x - r, y - r, r * 2, r * 2);
    for (const b of pl.b) { const ca = Math.cos(b.a + rot); if (ca <= 0.05) continue; c.globalAlpha = al * 0.5 * ca; c.fillStyle = b.c; c.beginPath(); c.ellipse(x + Math.sin(b.a + rot) * Math.cos(b.lat * 0.7) * r, y + Math.sin(b.lat * 0.7) * r, b.s * r * ca * 1.6, b.s * r * 0.55, 0, 0, 6.283); c.fill(); }
    c.globalAlpha = al;
    if (o.crack) {
      const rn = this.rng(pl.seed + 9); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(' + (o.crackCol || '255,140,60') + ',' + Math.min(1, o.crack) + ')'; c.lineWidth = Math.max(1.5, r * 0.012);
      for (let i = 0; i < 9; i++) { let px = x + (rn() - 0.5) * r * 1.4, py = y + (rn() - 0.5) * r * 1.4; c.beginPath(); c.moveTo(px, py); for (let j = 0; j < 6; j++) { px += (rn() - 0.5) * r * 0.36; py += (rn() - 0.5) * r * 0.36; c.lineTo(px, py); } c.stroke(); }
      c.globalCompositeOperation = 'source-over';
    }
    const g = c.createRadialGradient(x + lx * r * 0.7, y + ly * r * 0.7, r * 0.2, x + lx * r * 0.2, y + ly * r * 0.2, r * 1.25);
    g.addColorStop(0, 'rgba(2,3,10,0)'); g.addColorStop(0.55, 'rgba(2,3,10,0.45)'); g.addColorStop(1, 'rgba(2,3,10,0.96)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    if (o.cities) {
      c.globalCompositeOperation = 'lighter'; const n = Math.floor(pl.b.length * o.cities);
      for (let i = 0; i < n; i++) { const b = pl.b[i], ca = Math.cos(b.a + rot); if (ca <= 0.1) continue; const bx = x + Math.sin(b.a + rot) * Math.cos(b.lat * 0.7) * r, by = y + Math.sin(b.lat * 0.7) * r; if ((bx - x) * lx + (by - y) * ly > -r * 0.1) continue; this.blit(c, '255,200,120', bx, by, r * 0.04, 0.9); }
      c.globalCompositeOperation = 'source-over';
    }
    c.restore(); c.globalAlpha = 1;
    const la = Math.atan2(ly, lx); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5 * al; c.strokeStyle = 'rgb(' + pl.atm + ')'; c.lineWidth = Math.max(1.5, r * 0.012); c.beginPath(); c.arc(x, y, r, la - 1.2, la + 1.2); c.stroke();
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  entity(c, x, y, s, a, col) {
    const t = this.time; if (!(a > 0)) return;
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgb(' + col + ')';
    for (let i = 0; i < 14; i++) { const ang = t * 0.04 + i * 0.449 + Math.sin(i * 7.3) * 0.2, len = s * (2.6 + Math.sin(t * 0.6 + i * 2.1) * 0.8); c.globalAlpha = Math.min(1, a * 0.06); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang - 0.05) * len, y + Math.sin(ang - 0.05) * len); c.lineTo(x + Math.cos(ang + 0.05) * len, y + Math.sin(ang + 0.05) * len); c.closePath(); c.fill(); }
    this.blit(c, col, x, y, s * 1.9, a * 0.8, 1); this.blit(c, col, x, y, s * 0.9, a); this.blit(c, '255,255,255', x, y, s * 0.4, a);
    c.strokeStyle = 'rgb(' + col + ')'; c.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { c.globalAlpha = Math.min(1, a * (0.6 - i * 0.15)); c.beginPath(); c.ellipse(x, y, s * (0.85 + i * 0.3), s * (0.26 + i * 0.1), t * 0.15 * (i % 2 ? 1 : -1) + i * 1.1, 0, 6.283); c.stroke(); }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = Math.min(1, a); c.fillStyle = '#05050c'; c.beginPath(); c.ellipse(x, y, s * 0.05, s * 0.2, 0, 0, 6.283); c.fill();
    c.globalAlpha = 1;
  }
}
