// Kontakt-Adresse hier einmal ändern (und im HTML bei id="mail-addr", "foot-addr" und "foot-mail").
var MAIL = 'djsnobueno@gmail.com';

// Fernseher: hier die Sender eintragen. Pro Sender eine Zeile.
// Eigene Videodatei (empfohlen, keine Fremdrechte, läuft überall):
//   { title: 'Mix Oktober', video: 'videos/mix-oktober.mp4' }   (Datei in den Ordner "videos" legen)
// Oder ein Video von YouTube:
//   { title: 'Mix Oktober', youtube: 'VIDEO_ID', start: 0 }   (start = Sekunde, optional)
// Die VIDEO_ID steht in der YouTube-Adresse hinter "v=" (z. B. youtube.com/watch?v=dQw4w9WgXcQ).
// Solange die Liste leer ist, zeigt der Fernseher "KEIN SIGNAL".
var TV_CHANNELS = [
  { video: 'videos/c1.mp4' },
  { video: 'videos/c2.mp4' },
  { video: 'videos/c3.mp4' },
  { video: 'videos/c6.mp4' },
  { video: 'videos/c7.mp4' },
  { video: 'videos/c8.mp4' },
  { video: 'videos/c9.mp4' },
  { video: 'videos/c10.mp4' },
  { video: 'videos/c11.mp4' },
  { video: 'videos/c12.mp4' },
  { nosignal: true },
  // { title: 'Mix 1', youtube: '' },
];

(function () {
  var root = document.documentElement;

  // ---------- Adresse einsetzen ----------
  var addrEl = document.getElementById('mail-addr');
  if (addrEl) addrEl.textContent = MAIL;
  var footAddr = document.getElementById('foot-addr');
  if (footAddr) footAddr.textContent = MAIL;
  var footMail = document.getElementById('foot-mail');
  if (footMail) footMail.href = 'mailto:' + MAIL;

  // ---------- Röhrenfernseher ----------
  (function () {
    var tv = document.getElementById('crt');
    if (!tv) return;
    var power = document.getElementById('tv-power');
    var chBtn = document.getElementById('tv-ch');
    var startBtn = document.getElementById('tv-start');
    var noise = document.getElementById('tv-noise');
    var frame = document.getElementById('tv-frame');
    var osd = document.getElementById('tv-osd');
    var msg = document.getElementById('tv-bars-msg');
    var clock = document.getElementById('tv-bars-clock'), clockT = 0;
    var list = document.getElementById('tv-channels');
    var note = document.getElementById('tv-note');
    var yt = document.getElementById('tv-yt');
    var chans = (window.TV_CHANNELS || TV_CHANNELS || []).filter(function (c) { return c && (c.youtube || c.src || c.video || c.nosignal); });
    var on = false, cur = 0, timer = 0, raf = 0, osdTimer = 0, last = 0;
    var reduceTv = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ctx = noise && noise.getContext ? noise.getContext('2d') : null;
    var img = ctx ? ctx.createImageData(noise.width, noise.height) : null;

    function drawNoise(t) {
      if (tv.getAttribute('data-state') !== 'static') { raf = 0; return; }
      if (ctx && (t - last > 70 || !last)) {
        last = t;
        var d = img.data;
        for (var i = 0; i < d.length; i += 4) { var v = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
        ctx.putImageData(img, 0, 0);
      }
      if (reduceTv) { raf = 0; return; }
      raf = requestAnimationFrame(drawNoise);
    }
    function setState(s) {
      tv.setAttribute('data-state', s);
      if (s === 'static' && !raf) raf = requestAnimationFrame(drawNoise);
      if (s !== 'play') frame.innerHTML = '';
      clearInterval(clockT);
      if (s === 'bars') { var t0 = Date.now(); clockT = setInterval(function () { var n = Math.floor((Date.now() - t0) / 1000); if (clock) clock.textContent = ('0' + Math.floor(n / 60) % 100).slice(-2) + ':' + ('0' + n % 60).slice(-2); }, 1000); if (clock) clock.textContent = '00:00'; }
    }
    function showOsd(text) {
      osd.textContent = text; osd.classList.add('is-on');
      clearTimeout(osdTimer); osdTimer = setTimeout(function () { osd.classList.remove('is-on'); }, 2200);
    }
    function markList() {
      if (!list) return;
      var bs = list.querySelectorAll('button');
      for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('is-on', on && i === cur);
    }
    function embedUrl(c) {
      if (c.youtube) return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(c.youtube) + '?autoplay=1&rel=0&playsinline=1&modestbranding=1' + (c.start ? '&start=' + (parseInt(c.start, 10) || 0) : '');
      var ok = ['https://www.youtube-nocookie.com/', 'https://player.vimeo.com/', 'https://w.soundcloud.com/', 'https://www.mixcloud.com/widget/'];
      for (var i = 0; i < ok.length; i++) if (c.src && c.src.indexOf(ok[i]) === 0) return c.src;
      return '';
    }
    function play(i) {
      clearTimeout(timer);
      cur = chans.length ? (i + chans.length) % chans.length : 0;
      setState('static');
      markList();
      showOsd(chans.length ? 'KANAL ' + (cur + 1) : 'KANAL –');
      timer = setTimeout(function () {
        if (!on) return;
        var c = chans[cur];
        if (c && c.nosignal) { if (yt) yt.hidden = true; msg.textContent = 'NO SIGNAL'; setState('bars'); showOsd('KANAL ' + (cur + 1)); return; }
        if (c && c.video && /^(videos\/|https:\/\/|data:video\/)/.test(c.video)) {
          if (yt) yt.hidden = true;
          var v = document.createElement('video');
          v.src = c.video; v.title = c.title || 'Video';
          v.autoplay = true; v.loop = true; v.controls = false; v.playsInline = true; v.disablePictureInPicture = true;
          v.setAttribute('playsinline', ''); v.setAttribute('aria-label', c.title || 'Video');
          v.addEventListener('error', function () { msg.textContent = 'NO SIGNAL'; setState('bars'); });
          frame.innerHTML = ''; frame.appendChild(v);
          setState('play');
          showOsd(c.title || 'KANAL ' + (cur + 1));
          var pr = v.play(); if (pr && pr.catch) pr.catch(function () { v.muted = true; var p2 = v.play(); if (p2 && p2.catch) p2.catch(function () {}); });
          return;
        }
        var url = c ? embedUrl(c) : '';
        if (!url) { msg.textContent = 'NO SIGNAL'; setState('bars'); return; }
        var f = document.createElement('iframe');
        if (yt) { if (c.youtube) { yt.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(c.youtube) + (c.start ? '&t=' + (parseInt(c.start, 10) || 0) + 's' : ''); yt.hidden = false; } else { yt.hidden = true; } }
        f.src = url; f.title = c.title || 'Video';
        f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        f.setAttribute('allowfullscreen', ''); f.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.innerHTML = ''; frame.appendChild(f);
        setState('play');
        showOsd(c.title || 'KANAL ' + (cur + 1));
      }, reduceTv ? 200 : 750);
    }
    function setPower(v) {
      on = v;
      power.setAttribute('aria-pressed', v ? 'true' : 'false');
      if (!v) { if (yt) yt.hidden = true; clearTimeout(timer); setState('off'); osd.classList.remove('is-on'); markList(); return; }
      play(cur);
    }
    if (list) {
      if (!chans.length) {
        list.innerHTML = '<span class="mono">Videos folgen bald.</span>';
        if (note) note.hidden = true;
      } else {
        if (note) note.hidden = !chans.some(function (c) { return c.youtube || c.src; });
        chans.forEach(function (c, i) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'b95';
          b.textContent = (i + 1) + ' · ' + (c.title || 'Kanal ' + (i + 1));
          b.addEventListener('click', function () { on = true; power.setAttribute('aria-pressed', 'true'); play(i); });
          list.appendChild(b);
        });
      }
    }
    power.addEventListener('click', function () { setPower(!on); });
    startBtn.addEventListener('click', function () { setPower(true); });
    chBtn.addEventListener('click', function () { if (!on) { setPower(true); return; } play(cur + 1); });
    setState('off');
  })();

  var menuMail = document.getElementById('menu-mail');
  if (menuMail) { menuMail.textContent = MAIL; menuMail.href = 'mailto:' + MAIL; }

  // ---------- Hamburger-Menü ----------
  var burger = document.getElementById('burger');
  var menuEl = document.getElementById('menu');
  function setMenu(open) {
    if (!burger || !menuEl) return;
    menuEl.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    menuEl.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) { menuEl.removeAttribute('inert'); } else { menuEl.setAttribute('inert', ''); }
    if (open) { var f = menuEl.querySelector('a'); if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }, 350); }
  }
  if (burger && menuEl) {
    burger.addEventListener('click', function () { setMenu(!menuEl.classList.contains('is-open')); });
    menuEl.addEventListener('click', function (e) { if (e.target.closest('a')) { setMenu(false); } });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuEl.classList.contains('is-open')) { setMenu(false); burger.focus(); }
    });
    // am Desktop erscheint der Knopf erst nach dem Hero
    var shown = false;
    function onScrollBurger() {
      var s = window.pageYOffset > window.innerHeight * 0.7;
      if (s !== shown) { shown = s; burger.classList.toggle('is-shown', s); }
    }
    window.addEventListener('scroll', onScrollBurger, { passive: true });
    onScrollBurger();
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // ---------- Adresse kopieren ----------
  var copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      function done(ok) {
        copyBtn.textContent = ok ? 'Kopiert' : 'Adresse markieren und kopieren';
        if (!ok && addrEl && window.getSelection) {
          var r = document.createRange();
          r.selectNodeContents(addrEl);
          var s = window.getSelection();
          s.removeAllRanges();
          s.addRange(r);
        }
        setTimeout(function () { copyBtn.textContent = 'Adresse kopieren'; }, 2500);
      }
      try {
        navigator.clipboard.writeText(MAIL).then(function () { done(true); }, function () { done(false); });
      } catch (e) { done(false); }
    });
  }

  // Anker-Links (#top, #ueber, ...) scrollen selbst, damit sie auch in eingebetteten Vorschauen nicht ins Leere führen
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button) { return; }
    var id = a.getAttribute('href').slice(1);
    if (!id) { return; }
    var target = id === 'top' ? document.body : document.getElementById(id);
    if (!target) { return; }
    e.preventDefault();
    try {
      if (id === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    } catch (err) {
      if (id === 'top') { window.scrollTo(0, 0); } else { target.scrollIntoView(); }
    }
  });

  // "Sag mir Bescheid" wählt im Formular direkt Merch aus
  var merchBtn = document.getElementById('merch-btn');
  var typeSel = document.getElementById('f-type');
  if (merchBtn && typeSel) {
    merchBtn.addEventListener('click', function () { typeSel.value = 'Merch'; });
  }

  // ---------- Formular: baut eine E-Mail im Mailprogramm (kein Server) ----------
  var form = document.getElementById('contact-form');
  var status = document.getElementById('form-status');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements['name'].value.trim();
      var mail = form.elements['mail'].value.trim();
      var msg = form.elements['msg'].value.trim();
      if (!name || !mail || !msg) {
        status.textContent = 'Bitte Name, E-Mail und Nachricht ausfüllen.';
        return;
      }
      var type = form.elements['type'].value;
      var date = form.elements['date'].value.trim();
      var subject = type + ': Anfrage an No Bueno';
      var body = 'Hallo No Bueno,\n\n' + msg + '\n\n' +
        'Anlass: ' + type + '\n' +
        (date ? 'Datum: ' + date + '\n' : '') +
        '\nName: ' + name + '\nE-Mail: ' + mail + '\n';
      status.textContent = 'Dein Mailprogramm sollte sich jetzt öffnen. Falls nicht, schreib direkt an ' + MAIL + '.';
      window.location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

  // =====================================================
  //  Scroll-Bewegungen
  // =====================================================
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { window.__nbReady = true; return; }

  // gestaffelte Verzögerung unter Geschwistern
  var parents = new Map();
  document.querySelectorAll('.reveal').forEach(function (el) {
    var p = el.parentElement;
    var n = parents.get(p) || 0;
    parents.set(p, n + 1);
    el.style.setProperty('--d', Math.min(n * 100, 500) + 'ms');
  });

  // Elemente öffnen sich beim Reinscrollen, Linien-Masken, Kritzeleien zeichnen sich
  var targets = document.querySelectorAll('.reveal, [data-lines], [data-draw]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  }

  // ---------- Zahl zählt hoch (BPM) ----------
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var end = parseFloat(el.getAttribute('data-count')) || 0, started = false;
    el.textContent = '60';
    if (!('IntersectionObserver' in window)) { el.textContent = end; return; }
    new IntersectionObserver(function (es, o) {
      es.forEach(function (en) {
        if (!en.isIntersecting || started) return;
        started = true; o.disconnect();
        var t0 = performance.now();
        (function tick(t) {
          var k = clamp((t - t0) / 1600, 0, 1);
          el.textContent = Math.round(60 + (end - 60) * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.6 }).observe(el);
  });

  // ---------- Win95-Hinweise beim Scrollen ----------
  var toast = document.getElementById('toast');
  var toastTimer = 0;
  function showToast(title, msg, link, merch) {
    if (!toast) return;
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-msg').textContent = msg;
    var ok = document.getElementById('toast-ok');
    ok.setAttribute('href', link);
    ok.onclick = function () { if (merch && typeSel) typeSel.value = 'Merch'; toast.hidden = true; };
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 7000);
  }
  var tx2 = document.getElementById('toast-x');
  if (tx2) tx2.addEventListener('click', function () { toast.hidden = true; });
  function once(id, fn) {
    var el = document.getElementById(id);
    if (!el || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es, o) {
      es.forEach(function (en) { if (en.isIntersecting) { o.disconnect(); fn(); } });
    }, { threshold: 0.5 }).observe(el);
  }
  once('bigwords', function () { showToast('fehler.exe', 'Fehler 404: Langeweile nicht gefunden.', '#kontakt', false); });
  once('merch-title', function () { showToast('merch.exe', 'Drop wird vorbereitet. Willst du Bescheid wissen?', '#kontakt', true); });

  // ---------- Merch: horizontales Scrollen ----------
  var hs = document.getElementById('hscroll');
  var hsTrack = document.getElementById('hs-track');
  var hsOn = false, hsDist = 0;
  function hsSetup() {
    if (!hs || !hsTrack) return;
    var want = window.innerHeight >= 560 && window.innerWidth >= 700;
    if (want !== hsOn) { hsOn = want; root.classList.toggle('js-hs', want); if (!want) { hs.style.height = ''; hsTrack.style.transform = ''; } }
    if (hsOn) {
      hsDist = Math.max(0, hsTrack.scrollWidth - window.innerWidth);
      hs.style.height = (window.innerHeight + hsDist) + 'px';
    }
  }
  hsSetup();
  window.addEventListener('resize', hsSetup);
  window.addEventListener('load', hsSetup);

  // ---------- Schleife: alles, was direkt am Scrollen hängt ----------
  var marquee = document.getElementById('marquee');
  var bar = document.getElementById('progress-bar');
  var loaderBar = document.getElementById('loader-bar');
  var loaderPct = document.getElementById('loader-pct');
  var pxs = document.querySelectorAll('[data-speed]');
  var heroLines = document.querySelectorAll('.hero h1 .ln');
  var pola = document.querySelector('.px--pola');
  var bursts = document.querySelectorAll('.burst');
  var skewEls = document.querySelectorAll('.big-title, .contact h2, .merch-title');
  var bwRows = document.querySelectorAll('[data-bw]');
  var bw = document.getElementById('bigwords');
  var pool = document.querySelector('.pool');

  var half = 0, tx = 0, sv = -0.8, dirSign = -1, vel = 0, lastY = window.pageYOffset, frame = 0, lastPct = -1, skew = 0;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function loop() {
    var y = window.pageYOffset;
    var vh = window.innerHeight;
    var max = Math.max(1, document.documentElement.scrollHeight - vh);
    var p = clamp(y / max, 0, 1);

    // Marquee: läuft immer, wird beim Scrollen schneller und dreht beim Hochscrollen um
    var dy = y - lastY; lastY = y;
    vel += (dy - vel) * 0.15;
    if (vel > 0.6) dirSign = -1; else if (vel < -0.6) dirSign = 1;
    var target = dirSign * (0.8 + Math.min(Math.abs(vel), 60) * 0.3);
    sv += (target - sv) * 0.08;
    if (marquee) {
      if (frame % 90 === 0) half = marquee.scrollWidth / 2;
      tx += sv;
      if (half > 0) { if (tx <= -half) tx += half; if (tx > 0) tx -= half; }
      marquee.style.transform = 'translate3d(' + tx.toFixed(2) + 'px,0,0)';
    }

    // Tempo-Schräglage: Titel und Marquee kippen leicht, je schneller man scrollt
    skew += (clamp(vel * -0.22, -9, 9) - skew) * 0.12;
    var sk = 'skewX(' + skew.toFixed(2) + 'deg)';
    for (var s = 0; s < skewEls.length; s++) skewEls[s].style.transform = sk;

    // Fortschrittsbalken oben und Lade-Fenster "tanzfläche.exe"
    if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    var pct = Math.round(4 + p * 96);
    if (loaderBar) loaderBar.style.width = pct + '%';
    if (loaderPct && pct !== lastPct) { loaderPct.textContent = pct + '%'; lastPct = pct; }

    // Hero: "No" und "Bueno" schieben sich auseinander
    var hp = clamp(y / (vh * 0.9), 0, 1);
    for (var h = 0; h < heroLines.length; h++) {
      var dir = h % 2 === 0 ? -1 : 1;
      heroLines[h].style.transform = 'translateX(' + (dir * hp * 14).toFixed(2) + 'vw) skewX(' + (dir * hp * -8).toFixed(2) + 'deg)';
    }

    // Polaroid kippt, Sticker drehen sich
    if (pola) pola.style.rotate = (y * 0.03).toFixed(2) + 'deg';
    for (var b = 0; b < bursts.length; b++) bursts[b].style.rotate = ((b % 2 ? 9 : -10) + y * (b % 2 ? -0.05 : 0.05)).toFixed(1) + 'deg';

    // Pool-Kacheln wandern im Hintergrund
    if (pool) {
      var pr = pool.getBoundingClientRect();
      pool.style.backgroundPositionY = (-pr.top * 0.25).toFixed(1) + 'px';
    }

    // Riesenwörter: Zeilen laufen gegeneinander, gesteuert von der Position
    if (bw && bwRows.length) {
      var br = bw.getBoundingClientRect();
      var prog = clamp((vh - br.top) / (vh + br.height), 0, 1);
      for (var w = 0; w < bwRows.length; w++) {
        var d = parseFloat(bwRows[w].getAttribute('data-bw')) || 1;
        var span = bwRows[w].scrollWidth / 2;
        var off = (prog * span * 0.9) * d - (d < 0 ? 0 : span * 0.9);
        bwRows[w].style.transform = 'translate3d(' + off.toFixed(1) + 'px,0,0)';
      }
    }

    // Merch: Streifen läuft seitwärts, während die Seite festhält
    if (hsOn && hs) {
      var hr = hs.getBoundingClientRect();
      var hpv = hsDist > 0 ? clamp(-hr.top / hsDist, 0, 1) : 0;
      hsTrack.style.transform = 'translate3d(' + (-hpv * hsDist).toFixed(1) + 'px,0,0)';
    }

    // Parallax: Sticker, Fenster und Kritzeleien bewegen sich unterschiedlich schnell
    for (var i = 0; i < pxs.length; i++) {
      var el = pxs[i];
      var sp = parseFloat(el.getAttribute('data-speed')) || 0;
      var r = el.getBoundingClientRect();
      var offp = (r.top + r.height / 2) - vh / 2;
      el.style.translate = '0 ' + clamp(-offp * sp, -70, 70).toFixed(1) + 'px';
    }

    frame++;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.__nbReady = true;
})();

