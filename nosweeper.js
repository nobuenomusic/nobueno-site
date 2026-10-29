// No Sweeper: Minesweeper im No-Bueno-Look
(function () {
  var board = document.getElementById('sw-board');
  if (!board) return;
  var LV = { leicht: { c: 9, r: 9, m: 10 }, mittel: { c: 12, r: 12, m: 24 }, schwer: { c: 16, r: 16, m: 40 } };
  var lvKey = 'leicht', cfg = LV.leicht;
  var cnt = document.getElementById('sw-count'), tim = document.getElementById('sw-time'),
      face = document.getElementById('sw-face'), stat = document.getElementById('sw-status'),
      bestEl = document.getElementById('sw-best'), modeBtn = document.getElementById('sw-mode'),
      lvBtns = document.querySelectorAll('[data-sw-level]');
  var el = [], mine = [], open = [], flag = [], num = [];
  var started, over, flags, opened, secs, timer, mode = 'dig', lastFlag = 0, pressT = 0, longFired = false;

  function best(k) { try { return parseInt(localStorage.getItem('nb-sweep-' + k), 10) || 0; } catch (e) { return 0; } }
  function saveBest(k, v) { try { localStorage.setItem('nb-sweep-' + k, String(v)); } catch (e) {} }
  function pad(n) { var neg = n < 0; n = Math.min(999, Math.abs(n)); var s = String(n); while (s.length < (neg ? 2 : 3)) s = '0' + s; return neg ? '-' + s : s; }
  function showBest() { var b = best(lvKey); bestEl.textContent = b ? b + ' s' : '–'; }
  function nb(i) {
    var c = cfg.c, x = i % c, y = (i - x) / c, out = [];
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      var nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < c && ny >= 0 && ny < cfg.r) out.push(ny * c + nx);
    }
    return out;
  }
  function paint(i) {
    var e = el[i], cl = 'sw-c';
    if (open[i]) { cl += ' o'; if (mine[i]) cl += ' mine'; else if (num[i]) cl += ' n' + num[i]; }
    if (flag[i]) cl += ' f';
    e.className = cl;
    e.textContent = open[i] && !mine[i] && num[i] ? num[i] : (flag[i] ? 'NB' : '');
  }
  function setFace(t) { face.textContent = t; }
  function tick() { secs = Math.min(999, secs + 1); tim.textContent = pad(secs); }
  function stop() { clearInterval(timer); timer = 0; }

  function newGame() {
    stop();
    cfg = LV[lvKey]; var n = cfg.c * cfg.r;
    board.style.setProperty('--cols', cfg.c);
    board.innerHTML = '';
    el = []; mine = []; open = []; flag = []; num = [];
    for (var i = 0; i < n; i++) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sw-c'; b.setAttribute('data-i', i); b.tabIndex = -1;
      board.appendChild(b); el.push(b); mine.push(false); open.push(false); flag.push(false); num.push(0);
    }
    started = false; over = false; flags = 0; opened = 0; secs = 0;
    cnt.textContent = pad(cfg.m); tim.textContent = pad(0);
    setFace(':)'); stat.textContent = 'Los geht’s. Erste Kachel ist sicher.';
    showBest();
    lvBtns.forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-sw-level') === lvKey ? 'true' : 'false'); });
  }
  function place(first) {
    var n = cfg.c * cfg.r, safe = {}, k;
    safe[first] = 1; nb(first).forEach(function (j) { safe[j] = 1; });
    var pool = [];
    for (k = 0; k < n; k++) if (!safe[k]) pool.push(k);
    for (k = pool.length - 1; k > 0; k--) { var r = Math.floor(Math.random() * (k + 1)), t = pool[k]; pool[k] = pool[r]; pool[r] = t; }
    for (k = 0; k < cfg.m; k++) mine[pool[k]] = true;
    for (k = 0; k < n; k++) { var c = 0; nb(k).forEach(function (j) { if (mine[j]) c++; }); num[k] = c; }
  }
  function lose(hit) {
    over = true; stop(); setFace('X(');
    for (var i = 0; i < mine.length; i++) if (mine[i] && !flag[i]) { open[i] = true; paint(i); }
    el[hit].classList.add('boom');
    stat.textContent = 'Boom. Das war eine Platte zu viel.';
  }
  function win() {
    over = true; stop(); setFace('B)');
    for (var i = 0; i < mine.length; i++) if (mine[i] && !flag[i]) { flag[i] = true; paint(i); }
    flags = cfg.m; cnt.textContent = pad(0);
    var b = best(lvKey), msg = 'Geschafft in ' + secs + ' s.';
    if (!b || secs < b) { saveBest(lvKey, secs); msg += ' Neuer Rekord!'; showBest(); }
    stat.textContent = msg;
  }
  function reveal(i) {
    var stack = [i];
    while (stack.length) {
      var j = stack.pop();
      if (open[j] || flag[j]) continue;
      open[j] = true; opened++; paint(j);
      if (num[j] === 0 && !mine[j]) nb(j).forEach(function (q) { if (!open[q] && !flag[q]) stack.push(q); });
    }
  }
  function dig(i) {
    if (over) return;
    if (open[i]) {
      // Akkord: Nachbarn aufdecken, wenn genug Flaggen
      if (!num[i]) return;
      var around = nb(i), f = 0;
      around.forEach(function (j) { if (flag[j]) f++; });
      if (f !== num[i]) return;
      for (var k = 0; k < around.length; k++) {
        var j = around[k];
        if (flag[j] || open[j]) continue;
        if (mine[j]) { open[j] = true; paint(j); lose(j); return; }
        reveal(j);
      }
    } else {
      if (flag[i]) return;
      if (!started) { place(i); started = true; timer = setInterval(tick, 1000); stat.textContent = 'Viel Glück.'; }
      if (mine[i]) { open[i] = true; paint(i); lose(i); return; }
      reveal(i);
    }
    if (opened === cfg.c * cfg.r - cfg.m) win();
  }
  function toggleFlag(i) {
    if (over || open[i]) return;
    flag[i] = !flag[i]; flags += flag[i] ? 1 : -1;
    paint(i); cnt.textContent = pad(cfg.m - flags);
  }
  function idx(e) { var t = e.target.closest ? e.target.closest('.sw-c') : null; return t ? parseInt(t.getAttribute('data-i'), 10) : -1; }

  board.addEventListener('click', function (e) {
    var i = idx(e); if (i < 0) return;
    if (longFired) { longFired = false; return; }
    if (mode === 'flag' && !open[i]) toggleFlag(i); else dig(i);
  });
  board.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    if (Date.now() - lastFlag < 900) return;
    var i = idx(e); if (i >= 0) toggleFlag(i);
  });
  board.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    var i = idx(e); if (i < 0) return;
    longFired = false; clearTimeout(pressT);
    pressT = setTimeout(function () { longFired = true; lastFlag = Date.now(); toggleFlag(i); if (navigator.vibrate) try { navigator.vibrate(20); } catch (x) {} }, 420);
  });
  ['pointerup', 'pointercancel', 'pointerleave', 'pointermove'].forEach(function (t) {
    board.addEventListener(t, function (e) { if (e.pointerType !== 'mouse' && (t !== 'pointermove')) clearTimeout(pressT); });
  });
  board.addEventListener('touchmove', function () { clearTimeout(pressT); }, { passive: true });

  face.addEventListener('click', newGame);
  lvBtns.forEach(function (b) { b.addEventListener('click', function () { lvKey = b.getAttribute('data-sw-level'); newGame(); }); });
  modeBtn.addEventListener('click', function () {
    mode = mode === 'dig' ? 'flag' : 'dig';
    modeBtn.textContent = mode === 'dig' ? 'Modus: Aufdecken' : 'Modus: Flagge';
    modeBtn.setAttribute('aria-pressed', mode === 'flag' ? 'true' : 'false');
  });
  newGame();
})();
