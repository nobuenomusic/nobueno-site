/* Snake für No Bueno – ohne Abhängigkeiten */
(function () {
  var cv = document.getElementById('snake-cv');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var ov = document.getElementById('snake-ov'), ovT = document.getElementById('snake-ov-title'), ovS = document.getElementById('snake-ov-sub');
  var goBtn = document.getElementById('snake-go'), scoreEl = document.getElementById('snake-score');
  var bestEl = document.getElementById('snake-best-out'), muteBtn = document.getElementById('snake-mute');
  var N = 18, C = cv.width / N;
  var snake, dir, queue, food, score, best = 0, timer = 0, running = false, over = false, muted = false;
  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var INK = '#111', LIME = '#e6ff4d', PINK = '#f44584', BG1 = '#b9c25a', BG2 = '#aeb851';

  try { best = parseInt(localStorage.getItem('nb-snake-best'), 10) || 0; } catch (e) {}
  bestEl.textContent = best;

  var ac = null;
  function beep(f, d, type, vol) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'square'; o.frequency.value = f;
      g.gain.value = vol || 0.04; g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
    } catch (e) {}
  }

  function place() {
    var free = [];
    for (var x = 0; x < N; x++) for (var y = 0; y < N; y++) {
      var hit = false;
      for (var i = 0; i < snake.length; i++) if (snake[i][0] === x && snake[i][1] === y) { hit = true; break; }
      if (!hit) free.push([x, y]);
    }
    food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }
  function reset() {
    var m = Math.floor(N / 2);
    snake = [[m, m], [m - 1, m], [m - 2, m]];
    dir = DIRS.right; queue = []; score = 0; over = false;
    scoreEl.textContent = 0; place(); draw();
  }
  function speed() { return Math.max(60, 150 - Math.floor(score / 4) * 10); }
  function schedule() { clearTimeout(timer); if (running) timer = setTimeout(step, speed()); }

  function showOv(title, sub, btn) {
    ovT.textContent = title; ovS.textContent = sub; goBtn.textContent = btn; ov.hidden = false;
  }
  function start() {
    if (over || !snake) reset();
    running = true; ov.hidden = true; schedule();
    try { cv.focus({ preventScroll: true }); } catch (e) {}
  }
  function pause(msg) {
    if (!running) return;
    running = false; clearTimeout(timer);
    showOv('pause', msg || 'weiter mit Leertaste', 'Weiter');
  }
  function end() {
    running = false; over = true; clearTimeout(timer);
    beep(160, 0.35, 'sawtooth', 0.06);
    var isBest = score > best;
    if (isBest) { best = score; bestEl.textContent = best; try { localStorage.setItem('nb-snake-best', String(best)); } catch (e) {} }
    showOv('game over', (isBest && score > 0 ? 'neuer Rekord: ' + score + ' · ' : score + ' Punkte · ') + 'schlecht für den Teint.', 'Nochmal');
  }

  function turn(name) {
    var d = DIRS[name]; if (!d) return;
    var last = queue.length ? queue[queue.length - 1] : dir;
    if (d[0] === -last[0] && d[1] === -last[1]) return;
    if (d[0] === last[0] && d[1] === last[1]) return;
    if (queue.length < 3) queue.push(d);
    if (!running) start();
  }

  function step() {
    if (!running) return;
    if (queue.length) dir = queue.shift();
    var h = snake[0], nx = h[0] + dir[0], ny = h[1] + dir[1];
    if (nx < 0 || ny < 0 || nx >= N || ny >= N) return end();
    var eat = food && nx === food[0] && ny === food[1];
    var body = eat ? snake : snake.slice(0, -1);
    for (var i = 0; i < body.length; i++) if (body[i][0] === nx && body[i][1] === ny) return end();
    snake.unshift([nx, ny]);
    if (eat) { score++; scoreEl.textContent = score; beep(660 + Math.min(score, 20) * 20, 0.09); place(); if (!food) { draw(); return end(); } }
    else snake.pop();
    draw(); schedule();
  }

  function cell(x, y, col, inset) {
    var p = inset || 1;
    ctx.fillStyle = INK; ctx.fillRect(x * C + p - 1, y * C + p - 1, C - 2 * p + 2, C - 2 * p + 2);
    ctx.fillStyle = col; ctx.fillRect(x * C + p + 1, y * C + p + 1, C - 2 * p - 2, C - 2 * p - 2);
  }
  function draw() {
    for (var x = 0; x < N; x++) for (var y = 0; y < N; y++) {
      ctx.fillStyle = (x + y) % 2 ? BG1 : BG2; ctx.fillRect(x * C, y * C, C, C);
    }
    if (food) { // CD
      var cx = food[0] * C + C / 2, cy = food[1] * C + C / 2, r = C * 0.44;
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(cx, cy, r + 1.5, 0, 7); ctx.fill();
      var g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#c9d4e0'); g.addColorStop(0.6, '#f5c2dc'); g.addColorStop(1, '#a9d3ec');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 3.6, 5.0); ctx.stroke();
      ctx.fillStyle = '#e6ff4d'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.42, 0, 7); ctx.fill();
      ctx.fillStyle = (food[0] + food[1]) % 2 ? BG1 : BG2; ctx.beginPath(); ctx.arc(cx, cy, r * 0.2, 0, 7); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r * 0.2, 0, 7); ctx.stroke();
    }
    if (!snake) return;
    for (var i = snake.length - 1; i >= 0; i--) cell(snake[i][0], snake[i][1], i === 0 ? '#fff56a' : (i % 2 ? LIME : '#d5ee3c'));
    var h = snake[0], ex = dir[0], ey = dir[1];
    var px = h[0] * C + C / 2, py = h[1] * C + C / 2, ox = ey ? 5 : 0, oy = ex ? 5 : 0;
    ctx.fillStyle = INK;
    ctx.fillRect(px + ex * 3 - ox - 1.5, py + ey * 3 - oy - 1.5, 3, 3);
    ctx.fillRect(px + ex * 3 + ox - 1.5, py + ey * 3 + oy - 1.5, 3, 3);
  }

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    var map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
    var k = map[e.key], focused = document.activeElement === cv;
    if (k && (running || focused)) {
      e.preventDefault();
      if (over || !snake) reset();
      turn(k);
    } else if ((e.key === ' ' || e.key === 'p' || e.key === 'P') && (running || focused)) {
      e.preventDefault();
      if (running) pause(); else start();
    }
  });

  var tx = 0, ty = 0, touching = false;
  cv.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; tx = t.clientX; ty = t.clientY; touching = true; }, { passive: true });
  cv.addEventListener('touchmove', function (e) {
    if (!touching) return;
    if (running || !ov.hidden) e.preventDefault();
    var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
    if (over || !snake) reset();
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    tx = t.clientX; ty = t.clientY;
  }, { passive: false });
  cv.addEventListener('touchend', function () { touching = false; }, { passive: true });

  var padBtns = document.querySelectorAll('.snake-pad button');
  for (var i = 0; i < padBtns.length; i++) padBtns[i].addEventListener('click', function () {
    if (over || !snake) reset(); turn(this.getAttribute('data-dir'));
  });
  goBtn.addEventListener('click', function () { start(); });
  muteBtn.addEventListener('click', function () {
    muted = !muted; muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false'); muteBtn.textContent = 'Ton: ' + (muted ? 'aus' : 'an');
  });

  document.addEventListener('visibilitychange', function () { if (document.hidden) pause('Spiel pausiert'); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { if (!en[0].isIntersecting) pause('Spiel pausiert'); }, { threshold: 0.2 }).observe(cv);
  }

  reset();
})();
