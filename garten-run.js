/* Garten Run für No Bueno – ohne Abhängigkeiten.
   Ein-Tasten-Runner durch Frau Gerolds Garten: Platten sammeln, Harassen überspringen,
   mit der Strecke zurück in die 2000er, 90er und 80er (Back to the Hits). */
(function () {
  var cv = document.getElementById('run-cv');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var board = cv.parentNode;
  var ov = document.getElementById('run-ov'), selEl = document.getElementById('run-select'), overEl = document.getElementById('run-over');
  var muteBtn = document.getElementById('run-mute'), bestEl = document.getElementById('run-best');
  var W = 360, H = 480, GY = 396, PX = 84;
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * DPR; cv.height = H * DPR;
  var INK = '#111', LIME = '#e6ff4d', PINK = '#f45584';

  /* ---------- Figuren ---------- */
  var CHARS = {
    bowgli: 'assets/run/bowgli.webp', stranger: 'assets/run/stranger.webp',
    nobueno: 'assets/run/nobueno.webp'
  };
  var HW = { bowgli: 11, stranger: 11, nobueno: 22 };
  var LOGO = new Image(); LOGO.src = 'assets/run/btth.webp';
  var GLOGO = new Image(); GLOGO.src = 'assets/run/gerold-hq.webp';
  var SIDE = {};
  Object.keys(CHARS).forEach(function (k) { var i = new Image(); i.src = 'assets/run/' + k + '-side.webp'; SIDE[k] = i; });
  var IMG = {};
  Object.keys(CHARS).forEach(function (k) { var i = new Image(); i.src = CHARS[k]; IMG[k] = i; });
  var SPR_H = 106;
  var ZOOM = 1.22, AX = 80;   /* Kamera: näher dran, Figur etwas weiter links */

  /* ---------- Zeitreise: Paletten ---------- */
  var ERAS = [
    { label: 'HEUTE', t: [156, 203, 232], b: [248, 190, 215], far: [122, 150, 190], c1: [244, 85, 132], c2: [230, 255, 77], c3: [92, 160, 220], g: [169, 178, 71], gd: [112, 120, 42], l: [230, 255, 77], sun: [255, 246, 170], cl: [255, 255, 255] },
    { label: '2000ER', t: [170, 190, 232], b: [232, 238, 250], far: [130, 142, 178], c1: [150, 170, 212], c2: [200, 206, 218], c3: [80, 110, 192], g: [172, 178, 194], gd: [110, 116, 142], l: [130, 205, 255], sun: [255, 255, 255], cl: [246, 249, 255] },
    { label: '90ER', t: [120, 226, 206], b: [255, 240, 152], far: [62, 142, 152], c1: [255, 100, 170], c2: [255, 226, 60], c3: [70, 180, 202], g: [255, 198, 62], gd: [190, 132, 30], l: [255, 70, 150], sun: [255, 100, 170], cl: [255, 255, 236] },
    { label: '80ER', t: [44, 16, 104], b: [255, 60, 172], far: [92, 22, 124], c1: [0, 230, 255], c2: [255, 60, 172], c3: [132, 82, 255], g: [52, 22, 112], gd: [26, 8, 70], l: [0, 240, 255], sun: [255, 222, 84], cl: [255, 120, 200] },
    { label: '70ER', t: [255, 170, 72], b: [255, 226, 152], far: [172, 92, 42], c1: [222, 112, 42], c2: [242, 192, 62], c3: [132, 162, 72], g: [172, 112, 52], gd: [112, 68, 30], l: [255, 240, 162], sun: [255, 250, 222], cl: [255, 242, 212] }
  ];
  var KEYS = ['t', 'b', 'far', 'c1', 'c2', 'c3', 'g', 'gd', 'l', 'sun', 'cl'];
  var cur = {};
  KEYS.forEach(function (k) { cur[k] = ERAS[0][k].slice(); });
  /* Epoche nach gelaufenen Metern: heute -> 2000er -> 90er -> 80er */
  function eraFor(m) { return m < 120 ? 0 : m < 320 ? 1 : m < 600 ? 2 : 3; }
  var ERA_ITEMS = [['speaker', 'speaker'], ['nokia', 'ipod'], ['tama', 'discman'], ['walkman', 'rubik']];
  function meters() { return Math.floor(dist / 40); }
  function rgb(c, a) { return (a == null ? 'rgb(' : 'rgba(') + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + (a == null ? ')' : ',' + a + ')'); }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function dark(c, f) { return [c[0] * f, c[1] * f, c[2] * f]; }

  /* ---------- Zustand ---------- */
  var state = 'select', char = 'bowgli', best = 0, muted = false;
  var dist, speed, records, eraIdx, gapLeft, obstacles, recs, parts, floaters, banner, shake, flash;
  var P, t = 0, last = 0, rafId = 0, inView = false, deadT = 0, runT = 0;
  var scroll = 0;
  try { best = parseInt(localStorage.getItem('nb-run-best'), 10) || 0; } catch (e) {}
  if (bestEl) bestEl.textContent = best;
  try { var c0 = localStorage.getItem('nb-run-char'); if (c0 && CHARS[c0]) char = c0; } catch (e) {}

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function reset() {
    stopBeat();
    dist = 0; speed = 200; records = 0; eraIdx = 0; gapLeft = 430;
    obstacles = []; recs = []; parts = []; floaters = []; banner = null; shake = 0; flash = 0; runT = 0;
    P = { y: 0, vy: 0, ground: true, coyote: 0, buffer: 0, land: 0, holding: false, step: 0, rot: 0 };
  }
  reset();

  /* ---------- Ton ---------- */
  var ac = null;
  function beep(f, d, type, vol, slide) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'square'; o.frequency.value = f;
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, ac.currentTime + d);
      g.gain.value = vol || 0.035; g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
    } catch (e) {}
  }

  /* ---------- Game-Over-Beat (kommt, bevor die Party-Werbung erscheint) ---------- */
  var beatOn = false, beatTimer = 0, noiseBuf = null, master = null;
  function actx() {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function noise(a) {
    if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var n = a.createBufferSource(); n.buffer = noiseBuf; return n;
  }
  function kick(a, t0) {
    var o = a.createOscillator(), g = a.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.14);
    g.gain.setValueAtTime(0.9, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.3);
  }
  function hit(a, t0, type, freq, len, vol) {
    var n = noise(a), f = a.createBiquadFilter(), g = a.createGain(); f.type = type; f.frequency.value = freq; f.Q.value = type === 'bandpass' ? 0.9 : 0.5;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + len);
    n.connect(f); f.connect(g); g.connect(master); n.start(t0); n.stop(t0 + len + 0.02);
  }
  function tone(a, t0, f, len, type, vol, lp) {
    var o = a.createOscillator(), g = a.createGain(), fl = a.createBiquadFilter(); o.type = type; o.frequency.value = f;
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(lp, t0); fl.frequency.exponentialRampToValueAtTime(Math.max(120, lp * 0.25), t0 + len);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + len);
    o.connect(fl); fl.connect(g); g.connect(master); o.start(t0); o.stop(t0 + len + 0.02);
  }
  /* 124 BPM, 2 Takte House/Disco: Kick auf jedem Schlag, Clap auf 2 und 4, Offbeat-Hats, wandernder Bass, Akkord-Stabs */
  var BPM = 124, STEP = 60 / BPM / 4;
  var BASS = [55, 55, 65.4, 55, 73.4, 55, 65.4, 82.4];          /* A1 A1 C2 A1 D2 A1 C2 E2 (Offbeats) */
  var STAB = [[220, 261.6, 329.6, 392], [196, 246.9, 293.7, 392]];
  function scheduleBar(t0, bar) {
    var a = ac, i;
    for (i = 0; i < 16; i++) {
      var tt = t0 + i * STEP;
      if (i % 4 === 0) kick(a, tt);
      if (i === 4 || i === 12) hit(a, tt, 'bandpass', 1800, 0.14, 0.5);
      if (i % 4 === 2) { hit(a, tt, 'highpass', 7500, 0.07, 0.22); tone(a, tt, BASS[((i - 2) / 4 + (bar % 2) * 4) | 0], 0.2, 'sawtooth', 0.32, 700); }
      if (i % 2 === 1) hit(a, tt, 'highpass', 9000, 0.03, 0.08);
      if ((i === 3 || i === 10) || (bar % 2 === 1 && i === 14)) STAB[(i > 8 ? 1 : 0)].forEach(function (f) { tone(a, tt, f, 0.16, 'square', 0.06, 2600); });
    }
  }
  function startBeat() {
    if (muted || beatOn) return;
    try {
      var a = actx(); master = master || a.createGain(); master.gain.value = 0.55; master.connect(a.destination);
      beatOn = true; var t0 = a.currentTime + 0.06, bar = 0, barDur = 16 * STEP;
      (function next() {
        if (!beatOn) return;
        scheduleBar(t0, bar); t0 += barDur; bar++;
        beatTimer = setTimeout(next, Math.max(50, (t0 - a.currentTime - 0.4) * 1000));
      })();
    } catch (e) { beatOn = false; }
  }
  function stopBeat() {
    beatOn = false; clearTimeout(beatTimer);
    try { if (master) { master.gain.cancelScheduledValues(0); master.gain.setValueAtTime(0, ac.currentTime); master.disconnect(); master = null; } } catch (e) {}
  }
  /* Beim Verlieren: weicher Bass-Drop, dann sofort der Beat */
  function thump() {
    if (muted) return;
    try {
      var a = actx(), t0 = a.currentTime, o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(170, t0); o.frequency.exponentialRampToValueAtTime(40, t0 + 0.3);
      g.gain.setValueAtTime(0.5, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
      o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + 0.42);
    } catch (e) {}
  }

  /* ---------- Spawner ---------- */
  var OB = {
    crate: { w: 28, h: 26 }, stack: { w: 28, h: 50 }, speaker: { w: 34, h: 44 }, pot: { w: 26, h: 42 },
    nokia: { w: 22, h: 44 }, ipod: { w: 22, h: 38 }, tama: { w: 30, h: 34 }, discman: { w: 38, h: 26 }, walkman: { w: 24, h: 38 }, rubik: { w: 30, h: 30 }
  };
  function addRec(x, yc) { recs.push({ x: x, y: yc, ph: rnd(0, 6), got: false }); }
  function arc(cx, h, n, spread) {
    for (var i = 0; i < n; i++) {
      var u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      addRec(cx + u * spread, h + 15 + 22 * (1 - u * u));
    }
  }
  function spawn() {
    var x = W + 40, r = Math.random(), w = 0;
    var items = ERA_ITEMS[Math.min(eraIdx, ERA_ITEMS.length - 1)];
    var types = ['crate', 'stack', items[0], items[1]];
    if (dist < 900) types = ['crate', items[1]];
    if (r < 0.14) {                       /* Platten am Boden */
      var n = 5 + (Math.random() * 3 | 0);
      for (var i = 0; i < n; i++) addRec(x + i * 30, 17);
      w = n * 30;
    } else if (r < 0.24) {                /* hohe Platten-Bogen ohne Hindernis */
      arc(x + 70, 0, 6, 80); w = 170;
    } else if (r < 0.40 && speed >= (char === 'nobueno' ? 310 : 270)) { /* zwei Harassen hintereinander (Abstand passt zur Sprungweite) */
      var gap = rnd(36, Math.max(40, speed * 0.44 - 76 - 2 * ((HW[char] || 10) - 10)));
      obstacles.push({ type: 'crate', x: x, w: OB.crate.w, h: OB.crate.h });
      obstacles.push({ type: 'crate', x: x + OB.crate.w + gap, w: OB.crate.w, h: OB.crate.h });
      arc(x + (2 * OB.crate.w + gap) / 2, 20, 6, (OB.crate.w + gap) / 2 + 8);
      w = 2 * OB.crate.w + gap;
    } else {                              /* ein Hindernis mit Platten-Bogen */
      var ty = types[Math.random() * types.length | 0], o = OB[ty];
      obstacles.push({ type: ty, x: x, w: o.w, h: o.h });
      arc(x + o.w / 2, o.h - 2, 5, 46);
      w = o.w;
    }
    gapLeft = w + speed * 0.64 + 90 + Math.random() * 130;
  }

  /* ---------- Eingabe ---------- */
  function press() {
    if (state === 'ready') { state = 'run'; }
    if (state !== 'run') return;
    P.holding = true; P.buffer = 0.13;
  }
  function release() {
    P.holding = false;
    if (state === 'run' && P.vy > 400) P.vy = Math.max(400, P.vy * 0.5);
  }
  function tryJump() {
    if (P.buffer > 0 && (P.ground || P.coyote > 0)) {
      P.vy = 640; P.ground = false; P.coyote = 0; P.buffer = 0;
      beep(300, 0.14, 'square', 0.035, 620);
    }
  }

  var pointerOn = false;
  board.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('button,a')) return;
    if (state === 'paused') { resume(); e.preventDefault(); return; }
    if (state === 'select' || state === 'dead') return;
    pointerOn = true; press(); e.preventDefault();
  });
  window.addEventListener('pointerup', function () { if (pointerOn) { pointerOn = false; release(); } });
  window.addEventListener('pointercancel', function () { if (pointerOn) { pointerOn = false; release(); } });
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k !== ' ' && k !== 'ArrowUp' && k !== 'w' && k !== 'W') return;
    if (!inView) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (tag === 'BUTTON' && state !== 'run' && state !== 'ready') return;
    if (state === 'paused') { resume(); e.preventDefault(); return; }
    if (state === 'run' || state === 'ready') { e.preventDefault(); if (!e.repeat) press(); }
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') release();
  });

  /* ---------- Overlay-Steuerung ---------- */
  function show(which) {
    ov.hidden = !which;
    selEl.hidden = which !== 'select'; overEl.hidden = which !== 'over';
    var p = ov.querySelector('.run-pause'); if (p) p.hidden = which !== 'pause';
  }
  function pickChar(k) {
    char = k;
    try { localStorage.setItem('nb-run-char', k); } catch (e) {}
    reset(); state = 'ready'; show(null);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-run-char]'), function (b) {
    b.addEventListener('click', function () { pickChar(b.getAttribute('data-run-char')); });
  });
  var againBtn = document.getElementById('run-again'), changeBtn = document.getElementById('run-change'), shareBtn = document.getElementById('run-share');
  if (againBtn) againBtn.addEventListener('click', function () { reset(); state = 'ready'; show(null); });
  if (changeBtn) changeBtn.addEventListener('click', function () { reset(); state = 'select'; show('select'); });
  if (muteBtn) muteBtn.addEventListener('click', function () {
    muted = !muted; if (muted) stopBeat(); muteBtn.setAttribute('aria-pressed', String(muted)); muteBtn.textContent = muted ? 'Ton: aus' : 'Ton: an';
  });
  var shareMsg = document.getElementById('run-share-msg');
  if (shareBtn) shareBtn.addEventListener('click', function () {
    var url = location.href.split('#')[0] + '#garten-run';
    var text = (eraIdx > 0 ? 'Ich habe es bis in die ' + ERAS[eraIdx].label.replace('ER', 'er') + ' geschafft! ' : 'Ich bin ' + meters() + ' m gerannt! ') + 'Garten Run von No Bueno. Back to the Hits, Sa 14.11., Frau Gerolds Garten, Eintritt frei.';
    if (navigator.share) { navigator.share({ title: 'Garten Run – No Bueno', text: text, url: url }).catch(function () {}); return; }
    var done = function (m) { if (shareMsg) shareMsg.textContent = m; };
    try { navigator.clipboard.writeText(text + ' ' + url).then(function () { done('Text und Link kopiert.'); }, function () { done(url); }); }
    catch (e) { done(url); }
  });

  function pause() {
    if (state !== 'run') return;
    state = 'paused'; show('pause');
  }
  function resume() {
    if (state !== 'paused') return;
    state = 'run'; last = 0; show(null);
  }

  /* ---------- Ende ---------- */
  function die() {
    state = 'dying'; banner = null; deadT = 0; shake = 0.35; flash = 0.25; P.vy = 260;
    startBeat();
    for (var i = 0; i < 16; i++) parts.push({ x: PX, y: GY - 30, vx: rnd(-160, 160), vy: rnd(-260, 80), life: rnd(0.4, 0.9), c: i % 2 ? LIME : PINK });
  }
  function finish() {
    state = 'dead';
    var isBest = records > best;
    if (isBest) { best = records; try { localStorage.setItem('nb-run-best', String(best)); } catch (e) {} if (bestEl) bestEl.textContent = best; }
    var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
    set('run-o-recs', records); set('run-o-dist', Math.floor(dist / 40) + ' m');
    set('run-o-best', best);
    var era = ERAS[eraIdx].label;
    var lineEl = document.getElementById('run-o-line');
    if (lineEl) lineEl.innerHTML = (isBest && records > 0 ? 'Neuer Rekord! ' : '') + 'Du bist ' + (eraIdx === 0 ? 'in der <b>Gegenwart</b>' : 'in den <b>' + era.replace('ER', 'ern') + '</b>') + ' gelandet.';
    if (shareMsg) shareMsg.textContent = '';
    show('over'); startBeat();
    try { againBtn.focus({ preventScroll: true }); } catch (e) {}
  }

  /* ---------- Update ---------- */
  function update(dt) {
    t += dt; if (state !== 'dead' && state !== 'dying') scroll += dt;
    /* Farben weich überblenden */
    var tgt = ERAS[eraIdx], k = Math.min(1, dt * 2.2);
    KEYS.forEach(function (key) { cur[key] = mix(cur[key], tgt[key], k); });
    var i, p;
    if (state === 'select' || state === 'ready' || state === 'paused' || state === 'dead') {
      if (state === 'select') dist += 70 * dt;
      return;
    }
    if (state === 'dying') {
      deadT += dt; P.vy -= 1900 * dt; P.y = Math.max(0, P.y + P.vy * dt); P.rot += dt * 7;
      if (P.y === 0 && P.vy < 0) { P.vy = 0; }
      if (deadT > 1) finish();
    } else {
      runT += dt;
      speed = 200 + Math.min(180, dist * 0.018);
      var d = speed * dt; dist += d;
      var ne = eraFor(meters());
      if (ne !== eraIdx) {
        eraIdx = ne; banner = { txt: 'ZURÜCK IN DIE ' + ERAS[ne].label + '!', life: 2 }; flash = 0.2;
        [523, 659, 784, 1047].forEach(function (f, n) { setTimeout(function () { beep(f, 0.12, 'square', 0.03); }, n * 70); });
      }
      P.coyote = P.ground ? 0.1 : Math.max(0, P.coyote - dt);
      P.buffer = Math.max(0, P.buffer - dt);
      tryJump();
      P.vy -= 1900 * dt; P.y += P.vy * dt;
      if (P.y <= 0) {
        if (!P.ground) { P.land = 0.16; for (i = 0; i < 5; i++) parts.push({ x: PX + rnd(-8, 8), y: GY - 2, vx: rnd(-60, 60), vy: rnd(-60, -10), life: 0.3, c: 'rgba(255,255,255,0.8)' }); }
        P.y = 0; P.vy = 0; P.ground = true; tryJump();
      } else { P.ground = false; }
      P.land = Math.max(0, P.land - dt);
      P.step += dt * (P.ground ? 7.5 : 0);
      gapLeft -= d; if (gapLeft <= 0) spawn();
      for (i = obstacles.length - 1; i >= 0; i--) {
        var o = obstacles[i]; o.x -= d;
        if (o.x + o.w < -40) { obstacles.splice(i, 1); continue; }
        var hw = HW[char] || 10;
        if (PX + hw > o.x + 3 && PX - hw < o.x + o.w - 3 && P.y < o.h - 4) { die(); break; }
      }
      for (i = recs.length - 1; i >= 0; i--) {
        var r = recs[i]; r.x -= d;
        if (r.x < -30) { recs.splice(i, 1); continue; }
        var dx = r.x - PX, dy = (GY - r.y) - (GY - P.y - 32);
        if (!r.got && dx * dx + dy * dy < 24 * 24 + 100) {
          r.got = true; recs.splice(i, 1); records++;
          beep(880, 0.08, 'square', 0.03); setTimeout(function () { beep(1320, 0.1, 'square', 0.03); }, 60);
          for (var j = 0; j < 6; j++) parts.push({ x: r.x, y: GY - r.y, vx: rnd(-90, 90), vy: rnd(-120, 20), life: 0.4, c: LIME });
          floaters.push({ x: r.x, y: GY - r.y - 10, txt: '+1', life: 0.8 });
        }
      }
    }
    for (i = parts.length - 1; i >= 0; i--) { p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; if (p.life <= 0) parts.splice(i, 1); }
    for (i = floaters.length - 1; i >= 0; i--) { floaters[i].life -= dt; floaters[i].y -= 30 * dt; if (floaters[i].life <= 0) floaters.splice(i, 1); }
    if (banner) { banner.life -= dt; if (banner.life <= 0) banner = null; }
    shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt);
  }

  /* ---------- Zeichnen ---------- */
  function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function text(s, x, y, size, color, align) {
    ctx.font = '600 ' + size + 'px "Pixelify Sans", "Courier New", monospace';
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 5); ctx.strokeStyle = INK; ctx.strokeText(s, x, y);
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }

  var FAR = [];
  (function () {
    var x = 0, seed = 7;
    function rr() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    while (x < 640) { var w = 36 + rr() * 44 | 0, h = 40 + rr() * 90 | 0; FAR.push({ x: x, w: w, h: h }); x += w + (rr() * 10 | 0); }
  })();
  var CONT = [
    { x: 20, c: 0, n: 2 }, { x: 118, c: 1, n: 4 }, { x: 216, c: 2, n: 1 }, { x: 314, c: 0, n: 3 },
    { x: 412, c: 1, n: 4, bar: 1 }, { x: 510, c: 2, n: 2 }, { x: 608, c: 0, n: 4, logo: 1 }
  ];
  var SKIN = ['#f2c29b', '#d99b6c', '#a86b45', '#f7d6b8'], HAIR = ['#2a1d16', '#6b4423', '#e8c25a', '#9a9a9a', '#c0392b'];
  /* kleine Pixel-Person, tanzt: Arme hoch im Wechsel */
  function person(x, y, k, s2, alpha) {
    var ph = k * 1.7, bob = Math.abs(Math.sin(t * 6 + ph)) * 2.2 * s2, arm = Math.sin(t * 6 + ph) > 0;
    var shirt = [cur.c1, cur.c2, cur.c3, [250, 250, 250], [30, 30, 40]][k % 5], sk = SKIN[k % 4], hr = HAIR[(k * 3) % 5];
    var Rr = function (dx, dy, w, h, c) { R(x + dx * s2, y - bob + dy * s2, w * s2, h * s2, c); };
    ctx.globalAlpha = alpha;
    Rr(-2, -8, 2, 8, '#2b2b3a'); Rr(0, -8, 2, 8, '#2b2b3a');
    Rr(-3, -16, 6, 9, typeof shirt === 'string' ? shirt : rgb(shirt));
    Rr(-2, -21, 4, 5, sk); Rr(-2, -22, 4, 2, hr);
    if (arm) { Rr(-5, -23, 2, 8, sk); Rr(3, -17, 2, 6, sk); } else { Rr(-5, -17, 2, 6, sk); Rr(3, -23, 2, 8, sk); }
    ctx.globalAlpha = 1;
  }
  function crowd(x, y, n, k0, alpha) { for (var q = 0; q < n; q++) person(x + q * 13 + (q % 2) * 3, y - (q % 2) * 2, k0 + q, 1, alpha); }
  var CLOUDS = [{ x: 30, y: 70, s: 1 }, { x: 210, y: 40, s: 0.8 }, { x: 330, y: 110, s: 1.2 }];

  function drawBg() {
    var i, off;
    /* Himmel in Pixel-Bändern */
    var bands = 14;
    for (i = 0; i < bands; i++) R(0, i * (GY / bands), W, GY / bands + 1, rgb(mix(cur.t, cur.b, i / (bands - 1))));
    /* Sonne */
    var sx = 276, sy = 128;
    R(sx - 16, sy - 28, 32, 56, rgb(cur.sun)); R(sx - 28, sy - 16, 56, 32, rgb(cur.sun)); R(sx - 24, sy - 24, 48, 48, rgb(cur.sun));
    /* Wolken */
    CLOUDS.forEach(function (c) {
      var x = ((c.x - scroll * 6 * c.s) % (W + 120) + (W + 120)) % (W + 120) - 60, y = c.y;
      var col = rgb(cur.cl, 0.9);
      R(x, y + 8 * c.s, 60 * c.s, 12 * c.s, col); R(x + 10 * c.s, y, 30 * c.s, 12 * c.s, col); R(x + 28 * c.s, y - 6 * c.s, 20 * c.s, 10 * c.s, col);
    });
    /* Skyline mit Hochhaus */
    off = -((dist * 0.12) % 640);
    for (var rep = 0; rep < 3; rep++) {
      FAR.forEach(function (b) {
        var x = b.x + off + rep * 640;
        if (x > W || x + b.w < 0) return;
        R(x, GY - b.h, b.w, b.h, rgb(cur.far));
        for (var wy = GY - b.h + 8; wy < GY - 8; wy += 14) for (var wx = x + 6; wx < x + b.w - 6; wx += 12) R(wx, wy, 4, 5, rgb(mix(cur.far, [255, 255, 255], 0.28)));
      });
      var tx = 430 + off + rep * 640;
      if (tx > -60 && tx < W + 10) {
        /* Prime Tower Zürich: breite Glasscheibe, rechts ein vorgesetzter Flügel, der auf halber Höhe mit einer dunklen Kante endet, flaches Dach mit Spitze */
        var tg = mix(mix(cur.far, [30, 140, 150], 0.45), cur.b, 0.12), TW = 62, TH = 214, ty0 = GY - TH;
        var tb = rgb(tg), tdk = rgb(dark(tg, 0.62)), tmid = rgb(dark(tg, 0.8)), tl = rgb(mix(tg, [255, 255, 255], 0.3)), cap = rgb(dark(tg, 0.36));
        R(tx, ty0, TW, TH, tb);
        R(tx, ty0, Math.round(TW * 0.55), Math.round(TH * 0.38), rgb(mix(tg, cur.b, 0.28)));            /* Himmelsspiegelung */
        for (var gy2 = ty0 + 5; gy2 < GY - 2; gy2 += 6) R(tx, gy2, TW, 1, tl);                          /* Geschossbänder */
        for (var gx2 = tx + 5; gx2 < tx + TW; gx2 += 6) R(gx2, ty0, 1, TH, tmid);                        /* Fassadenraster */
        var fh = Math.round(TH * 0.62);
        R(tx + TW, ty0 + 6, 9, fh, tdk);                                                                  /* Flügel rechts */
        for (var gy3 = ty0 + 10; gy3 < ty0 + fh; gy3 += 6) R(tx + TW, gy3, 9, 1, tmid);
        R(tx + TW - 1, ty0 + fh + 4, 11, 4, cap);                                                         /* dunkle Kante unter dem Flügel */
        R(tx + TW, ty0 + fh + 8, 5, TH - fh - 8, tdk);                                                    /* Turm läuft schmaler weiter */
        R(tx, ty0, TW, 3, cap); R(tx + TW * 0.3, ty0 - 3, TW * 0.4, 3, cap); R(tx + TW, ty0 + 3, 9, 3, cap); /* Dach */
        R(tx - 3, GY - 38, 3, 38, tdk);                                                                   /* Sockel links */
      }
    }
    /* Container-Reihe: Stapel bis 4 hoch, einer mit Bar obendrauf */
    off = -((dist * 0.42) % 720);
    for (var rp = 0; rp < 3; rp++) {
      CONT.forEach(function (c, ci) {
        var x = c.x + off + rp * 720; if (x > W || x + 94 < 0) return;
        for (var lv = 0; lv < c.n; lv++) {
          var col = mix(cur['c' + (((c.c + lv) % 3) + 1)], cur.b, 0.2), y0 = GY - 46 * (lv + 1);
          R(x, y0, 92, 46, rgb(col)); R(x, y0, 92, 4, rgb(dark(col, 0.78))); R(x, y0 + 42, 92, 4, rgb(dark(col, 0.82)));
          for (var rx = x + 6; rx < x + 90; rx += 8) R(rx, y0 + 4, 2, 38, rgb(dark(col, 0.86)));
          if (lv === 0) { R(x + 66, y0 + 10, 20, 30, rgb(dark(col, 0.7))); R(x + 69, y0 + 13, 14, 24, rgb(dark(col, 0.8))); }
          else { R(x + 18, y0 + 14, 26, 16, rgb(mix(col, [255, 255, 255], 0.6))); R(x + 29, y0 + 14, 2, 16, rgb(dark(col, 0.8))); }
        }
        if (c.logo && LOGO.complete && LOGO.naturalWidth) {
          /* Leuchtschild mit Pixel-Logo an der Containerwand */
          var lx0 = x + 2, ly0 = GY - 46 * 3 - 4, lw = 88, lh = Math.round(88 * LOGO.naturalHeight / LOGO.naturalWidth) + 8;
          R(lx0 - 2, ly0 - 2, lw + 4, lh + 4, INK); R(lx0, ly0, lw, lh, '#241437');
          ctx.imageSmoothingEnabled = false; ctx.drawImage(LOGO, lx0 + 2, ly0 + 4, lw - 4, lh - 8);
          var lb = ((t * 2.5) | 0) % 2; for (var lq = 0; lq < lw; lq += 8) { R(lx0 + lq + 1, ly0 - 1, 3, 3, rgb(((lq / 8 | 0) + lb) % 2 ? cur.l : cur.c1)); R(lx0 + lq + 1, ly0 + lh - 2, 3, 3, rgb(((lq / 8 | 0) + lb) % 2 ? cur.c1 : cur.l)); }
        }
        if (c.bar) {
          var ty0 = GY - 46 * c.n;
          R(x - 4, ty0 - 4, 100, 5, INK); R(x - 2, ty0 - 3, 96, 3, '#6b6b78');          /* Deck */
          for (var rr = x; rr < x + 92; rr += 12) R(rr, ty0 - 16, 2, 12, INK);             /* Gelaender */
          R(x, ty0 - 17, 92, 2, INK);
          R(x + 50, ty0 - 34, 40, 12, INK); R(x + 52, ty0 - 32, 36, 8, '#4a3526');        /* Bartresen */
          R(x + 50, ty0 - 22, 40, 18, '#4a3526'); R(x + 50, ty0 - 22, 40, 3, '#7a5a3a');
          for (var bt = 0; bt < 5; bt++) R(x + 55 + bt * 7, ty0 - 40, 3, 8, ['#2fa84f', '#e8c25a', '#c0392b', '#6ab0e8', '#fff'][bt]); /* Flaschen */
          R(x + 2, ty0 - 52, 46, 16, INK); R(x + 4, ty0 - 50, 42, 12, rgb(cur.c1));         /* Schild */
          text('BAR', x + 25, ty0 - 40, 14, '#fff', 'center');
          R(x + 8, ty0 - 36, 2, 20, INK); R(x + 40, ty0 - 36, 2, 20, INK);
          var bl = ((t * 2) | 0) % 2; for (var lx = 0; lx < 92; lx += 8) R(x + lx + 2, ty0 - 12 + (lx % 16 ? 3 : 0), 3, 3, rgb(bl ^ (lx % 16 ? 1 : 0) ? cur.l : cur.c1));
          person(x + 14, ty0 - 4, ci, 1, 1); person(x + 28, ty0 - 4, ci + 2, 1, 1); person(x + 42, ty0 - 4, ci + 3, 1, 1);
        }
      });
    }
    /* Lichterketten: Masten stehen am Boden, mehrere Girlanden pro Feld */
    function bunting(par, span, topY, sag, hMast, phase, n, bulbR, alpha) {
      var o2 = -((dist * par) % span), j, bi;
      for (j = -1; j < Math.ceil(W / span) + 2; j++) {
        var xa = o2 + j * span, xb = xa + span;
        /* Mast bis zum Boden */
        R(xa - 2, GY - hMast, 4, hMast, 'rgba(34,24,40,' + alpha + ')'); R(xa - 3, GY - hMast - 3, 6, 4, 'rgba(34,24,40,' + alpha + ')');
        R(xa - 5, GY - 4, 10, 4, 'rgba(34,24,40,' + alpha + ')');
        ctx.strokeStyle = 'rgba(17,17,17,' + (alpha * 0.85) + ')'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(xa, topY); ctx.quadraticCurveTo(xa + span / 2, topY + sag * 2, xb, topY); ctx.stroke();
        for (bi = 1; bi < n; bi++) {
          var u = bi / n, bx = xa + u * span, by = topY + sag * 2 * u * (1 - u) * 1.0 + 0;
          var on = 0.7 + 0.3 * Math.sin(t * 3 + bi * 1.7 + j * 2 + phase);
          var bc = (bi + j) % 3 === 0 ? mix(cur.l, [255, 255, 255], 0.55) : (bi + j) % 3 === 1 ? cur.c1 : cur.l;
          ctx.fillStyle = rgb(bc, 0.16 * on * alpha); ctx.beginPath(); ctx.arc(bx, by + bulbR + 2, bulbR * 2.6, 0, 6.3); ctx.fill();
          R(bx - 0.5, by, 1, 2, 'rgba(17,17,17,' + alpha + ')');
          R(bx - bulbR / 2, by + 2, bulbR, bulbR + 1, rgb(bc, on * alpha));
        }
      }
    }
    bunting(0.42, 150, GY - 96, 7, 100, 0, 10, 3, 0.75);
    bunting(0.7, 130, GY - 150, 9, 154, 1.3, 9, 4, 1);
    bunting(0.7, 130, GY - 126, 8, 154, 2.6, 9, 4, 0.9);
    /* Eingangstor "Frau Gerolds Garten" (vor den Lichterketten, damit das Logo frei bleibt) */
    if (GLOGO.complete && GLOGO.naturalWidth) {
      var go = -((dist * 0.42) % 720);
      for (var gp = 0; gp < 3; gp++) {
        var gx = 236 + go + gp * 720; if (gx > W + 10 || gx + 158 < -10) continue;
        var gw = 152, gtop = GY - 96;
        R(gx, gtop, 4, 96, '#2a1d33'); R(gx + gw - 4, gtop, 4, 96, '#2a1d33');                    /* Pfosten */
        R(gx - 2, gtop - 3, 8, 4, '#2a1d33'); R(gx + gw - 6, gtop - 3, 8, 4, '#2a1d33');
        R(gx + 2, gtop + 2, gw - 4, 17, INK); R(gx + 4, gtop + 4, gw - 8, 13, '#2f1a45');         /* Schild */
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(GLOGO, gx + 8, gtop + 6, 136, 8.4); ctx.imageSmoothingEnabled = false;
        for (var gb = 0; gb < gw - 8; gb += 10) R(gx + 5 + gb, gtop + 19, 3, 3, rgb(((gb / 10 | 0) + (((t * 2) | 0) % 2)) % 2 ? cur.l : cur.c1));
      }
    }
    /* Tanzende Leute im Hintergrund (klein, leicht ausgeblendet) */
    var co = -((dist * 0.7) % 520);
    for (var cg = -1; cg < 3; cg++) { var cx0 = co + cg * 520; crowd(cx0 + 170, GY - 6, 4, cg + 7, 0.88); crowd(cx0 + 420, GY - 6, 3, cg + 11, 0.88); }
    /* Büsche */
    off = -((dist * 0.85) % 300);
    for (i = 0; i < 4; i++) {
      var bxx = off + i * 300 + 40;
      R(bxx, GY - 24, 60, 24, '#2f6b3a'); R(bxx + 8, GY - 34, 40, 14, '#3a8247'); R(bxx + 18, GY - 40, 20, 10, '#46964f');
    }
    /* Boden */
    R(0, GY, W, H - GY, rgb(cur.g));
    R(0, GY, W, 6, rgb(mix(cur.g, [255, 255, 255], 0.25)));
    R(0, GY + 6, W, 3, INK);
    off = -((dist) % 48);
    for (i = -1; i < 9; i++) R(off + i * 48, GY + 20, 26, 4, rgb(cur.gd));
    for (i = -1; i < 9; i++) R(off * 1.3 + i * 64 + 18, GY + 44, 34, 4, rgb(cur.gd));
    R(0, GY + 62, W, H - GY - 62, rgb(dark(cur.g, 0.78)));
    for (i = -1; i < 12; i++) R(off + i * 36, GY + 80, 4, H - GY - 80, rgb(cur.gd));
  }

  function drawObstacle(o) {
    var x = Math.round(o.x), y = GY - o.h, w = o.w, h = o.h, i;
    if (o.type === 'crate' || o.type === 'stack') {
      var n = o.type === 'stack' ? 2 : 1;
      for (i = 0; i < n; i++) {
        var cy = i ? GY - 50 : GY - 26;
        R(x, cy, w, 26, INK); R(x + 2, cy + 2, w - 4, 22, '#f2c230'); R(x + 2, cy + 2, w - 4, 4, '#ffe27a');
        for (var cx = x + 5; cx < x + w - 6; cx += 8) { R(cx, cy + 10, 5, 9, '#7a5a10'); R(cx + 1, cy + 11, 3, 3, i % 2 ? '#2f8f4a' : '#c0392b'); }
      }
    } else if (o.type === 'nokia') {
      R(x, y, w, h, INK); R(x + 2, y + 2, w - 4, h - 4, '#3b5a9a'); R(x + 4, y + 6, w - 8, 12, '#a8e07a'); R(x + 6, y + 9, 7, 2, '#2c4a1a'); R(x + 6, y + 13, 4, 2, '#2c4a1a');
      for (i = 0; i < 4; i++) for (var cc = 0; cc < 3; cc++) R(x + 4 + cc * 5, y + 22 + i * 5, 4, 3, '#cfd6ee');
      R(x + w - 6, y - 7, 3, 7, INK);
    } else if (o.type === 'ipod') {
      R(x, y, w, h, INK); R(x + 2, y + 2, w - 4, h - 4, '#f2f2f2'); R(x + 4, y + 4, w - 8, 12, '#9ec7e8'); R(x + 6, y + 7, 8, 2, '#2d5a80');
      ctx.fillStyle = '#d4d4d4'; ctx.beginPath(); ctx.arc(x + w / 2, y + h - 12, 8, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(x + w / 2, y + h - 12, 3, 0, 6.3); ctx.fill();
    } else if (o.type === 'tama') {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x + w / 2, GY - 17, 15, 17, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#ff6aa8'; ctx.beginPath(); ctx.ellipse(x + w / 2, GY - 17, 13, 15, 0, 0, 6.3); ctx.fill();
      R(x + 9, GY - 27, 12, 12, INK); R(x + 10, GY - 26, 10, 10, '#b7d68a'); R(x + 13, GY - 22, 4, 4, INK);
      R(x + 8, GY - 9, 3, 3, '#ffe23c'); R(x + 13, GY - 8, 3, 3, '#ffe23c'); R(x + 18, GY - 9, 3, 3, '#ffe23c');
    } else if (o.type === 'discman') {
      R(x, GY - 26, w, 26, INK); R(x + 2, GY - 24, w - 4, 22, '#c9ced6'); R(x + 2, GY - 24, w - 4, 3, '#eef1f5');
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x + w / 2, GY - 12, 9, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#e8e8e8'; ctx.beginPath(); ctx.arc(x + w / 2, GY - 12, 3, 0, 6.3); ctx.fill();
      R(x + 4, GY - 22, 6, 3, '#f45584');
    } else if (o.type === 'walkman') {
      R(x, y, w, h, INK); R(x + 2, y + 2, w - 4, h - 4, '#2d6cdf'); R(x + 4, y + 5, w - 8, 14, '#222');
      ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(x + 9, y + 12, 3, 0, 6.3); ctx.arc(x + w - 9, y + 12, 3, 0, 6.3); ctx.fill();
      for (i = 0; i < 3; i++) R(x + 4 + i * 6, y + 23, 4, 10, '#ffd23c');
    } else if (o.type === 'rubik') {
      R(x, y, w, h, INK);
      var rc = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#fb8c00', '#f4f4f4', '#fdd835', '#e53935', '#1e88e5'];
      for (i = 0; i < 9; i++) R(x + 2 + (i % 3) * 9, y + 2 + ((i / 3) | 0) * 9, 8, 8, rc[i]);
    } else if (o.type === 'speaker') {
      R(x, y, w, h, INK); R(x + 2, y + 2, w - 4, h - 4, '#262626'); R(x + 2, y + 2, w - 4, 3, '#444');
      R(x + w / 2 - 8, y + 20, 16, 16, '#111'); R(x + w / 2 - 6, y + 22, 12, 12, '#555'); R(x + w / 2 - 3, y + 25, 6, 6, '#999');
      R(x + w / 2 - 4, y + 8, 8, 8, '#555'); R(x + w / 2 - 2, y + 10, 4, 4, '#bbb');
      R(x + 4, y + h - 5, 6, 3, LIME);
    } else {
      R(x + 3, GY - 20, w - 6, 20, INK); R(x + 5, GY - 18, w - 10, 16, '#c8643a'); R(x + 5, GY - 18, w - 10, 4, '#e0875a');
      R(x + 1, GY - 22, w - 2, 5, INK); R(x + 3, GY - 21, w - 6, 3, '#d9774a');
      R(x + 10, GY - 34, 6, 14, '#2f8f4a'); R(x + 4, GY - 40, 8, 12, '#46a85a'); R(x + 14, GY - 42, 8, 14, '#3a9a50'); R(x + 8, GY - 30, 10, 10, '#2f8f4a');
    }
  }
  /* Sammelobjekt: CD (die anderen Varianten sind ungenutzt) */
  function drawItem(kind, sc) {
    var i;
    ctx.save(); ctx.scale(sc, sc);
    if (kind === 0) {                          /* Musik-Datei (Streaming) */
      R(-12, -12, 24, 24, INK); R(-10, -10, 20, 20, '#1ed760'); R(-10, -10, 20, 3, '#6df59c');
      R(-3, -6, 8, 2, '#0b2c18'); R(3, -6, 2, 9, '#0b2c18'); R(-5, 1, 6, 5, '#0b2c18'); R(-3, -2, 2, 7, '#0b2c18');
      R(-8, 7, 16, 2, 'rgba(11,44,24,0.55)');
    } else if (kind === 1) {                   /* CD */
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.3); ctx.fill();
      var g = ctx.createLinearGradient(-11, -11, 11, 11); g.addColorStop(0, '#f2f6fb'); g.addColorStop(0.35, '#a8e4ff'); g.addColorStop(0.6, '#ffb8e6'); g.addColorStop(1, '#e8f0d0');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 6.3); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, 6.3); ctx.fill();
    } else if (kind === 2) {                   /* MiniDisc */
      R(-12, -12, 24, 24, INK); R(-10, -10, 20, 20, '#35c4c0'); R(-10, -10, 20, 4, '#8ff0ec');
      R(-6, -10, 12, 9, '#c9ced6'); R(-3, -8, 3, 5, INK); R(-8, 2, 16, 6, '#fff'); R(-6, 4, 8, 1, INK); R(-6, 6, 5, 1, INK);
    } else {                                   /* Kassette */
      R(-14, -9, 28, 18, INK); R(-12, -7, 24, 14, '#e8e2d0'); R(-12, -7, 24, 3, '#ff5a7a');
      R(-9, -3, 18, 7, '#2a2a2a'); ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(-5, 0, 2.6, 0, 6.3); ctx.arc(5, 0, 2.6, 0, 6.3); ctx.fill();
      R(-7, 5, 14, 2, '#8a8a7a');
    }
    ctx.restore();
  }
  function drawRec(r) {
    var cx = r.x, cy = GY - r.y + Math.sin(t * 3 + r.ph) * 2;
    var spin = Math.max(0.2, Math.abs(Math.cos(t * 3.4 + r.ph)));
    ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); ctx.scale(spin, 1);
    drawItem(1, 1);                          /* immer CDs */
    ctx.restore();
  }

  function drawPlayer() {
    var img = (state === 'dying' || state === 'dead') ? IMG[char] : SIDE[char];
    if (!img || !img.complete || !img.naturalWidth) img = SIDE[char];
    if (!img || !img.complete || !img.naturalWidth) img = IMG[char];
    if (!img || !img.complete || !img.naturalWidth) return;
    var h = SPR_H, w = h * img.naturalWidth / img.naturalHeight;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var feetY = GY - P.y;
    /* Schatten */
    var sh = Math.max(0.35, 1 - P.y / 140);
    ctx.fillStyle = 'rgba(17,17,17,0.28)'; ctx.beginPath(); ctx.ellipse(PX, GY + 3, 20 * sh, 4 * sh, 0, 0, 6.3); ctx.fill();
    var bob = 0, rot = 0, sy = 1, sx = 1, run = (P.ground && state === 'run');
    if (state === 'dying') { rot = 0; sy = 1.04; }
    else if (run) {
      bob = Math.abs(Math.sin(P.step * Math.PI)) * 2.5; rot = 0.04;
    } else if (!P.ground) { sy = 1 + Math.min(0.1, Math.abs(P.vy) / 6000 * 1.2); sx = 2 - sy; rot = 0.1; }
    else { bob = Math.sin(t * 3) * 1; }
    if (P.land > 0) { sy = 0.9; sx = 1.08; }
    ctx.save();
    ctx.translate(PX, feetY - bob);
    ctx.rotate(rot);
    ctx.scale(sx, sy);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, iw, ih, -w / 2, -h, w, h);
    ctx.restore();
  }

  function drawHud() {
    /* Track-Zähler */
    ctx.save(); ctx.translate(24, 24); drawItem(1, 0.85); ctx.restore();
    text('× ' + records, 40, 32, 22, '#fff');
    /* Jahr */
    ctx.textAlign = 'right';
    text(meters() + ' m', W - 14, 34, 30, LIME, 'right');
    text(ERAS[eraIdx].label, W - 14, 50, 12, '#fff', 'right');
    if (banner) {
      var a = Math.min(1, banner.life * 2.2), pop = 1 + Math.max(0, banner.life - 1.6) * 1.2;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, 150); ctx.scale(pop, pop);
      var wB = 300; R(-wB / 2, -30, wB, 52, INK); R(-wB / 2 + 4, -26, wB - 8, 44, PINK);
      text(banner.txt, 0, 8, 26, '#fff', 'center'); ctx.restore();
    }
    floaters.forEach(function (f) { ctx.globalAlpha = Math.min(1, f.life * 2); text(f.txt, AX + (f.x - PX) * ZOOM, GY + (f.y - GY) * ZOOM, 14, LIME, 'center'); ctx.globalAlpha = 1; });
  }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = false;
    var sx = 0, sy = 0;
    if (shake > 0) { sx = rnd(-3, 3); sy = rnd(-3, 3); }
    ctx.save(); ctx.translate(sx, sy);
    ctx.save(); ctx.translate(AX, GY); ctx.scale(ZOOM, ZOOM); ctx.translate(-PX, -GY);
    drawBg();
    obstacles.forEach(drawObstacle);
    recs.forEach(drawRec);
    if (state !== 'select') drawPlayer();
    parts.forEach(function (p) { ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 3)); R(p.x - 2, p.y - 2, 4, 4, p.c); ctx.globalAlpha = 1; });
    ctx.restore();
    if (state === 'ready') {
      var pulse = 0.75 + 0.25 * Math.sin(t * 5);
      ctx.globalAlpha = pulse; text('TIPPEN = SPRINGEN', W / 2, 220, 24, '#fff', 'center'); ctx.globalAlpha = 1;
      text('CDs sammeln, Hindernissen ausweichen', W / 2, 246, 14, LIME, 'center');
    }
    if (state !== 'select') drawHud();
    ctx.restore();
    if (flash > 0) { ctx.fillStyle = 'rgba(244,85,132,' + (flash * 1.6) + ')'; ctx.fillRect(0, 0, W, H); }
  }

  /* ---------- Schleife ---------- */
  function frame(ts) {
    rafId = requestAnimationFrame(frame);
    if (!last) last = ts;
    var dt = Math.min(0.033, (ts - last) / 1000); last = ts;
    if (state === 'select') scroll += dt;
    update(dt); draw();
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopBeat(); });
  function startLoop() { if (!rafId) { last = 0; rafId = requestAnimationFrame(frame); } }
  function stopLoop() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        inView = e.isIntersecting && e.intersectionRatio > 0.25;
        if (e.isIntersecting) startLoop();
        if (!inView) { if (state === 'run') pause(); }
        if (!e.isIntersecting) { stopLoop(); stopBeat(); }
      });
    }, { threshold: [0, 0.25, 0.5] }).observe(board);
  } else { inView = true; startLoop(); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });

  /* Falls die Schrift noch lädt, danach neu zeichnen */
  try { if (document.fonts && document.fonts.load) document.fonts.load('600 20px "Pixelify Sans"'); } catch (e) {}

  /* Figurenwahl vorhervorheben */
  var pre = document.querySelector('[data-run-char="' + char + '"]'); if (pre) pre.classList.add('is-last');
  draw();
})();
