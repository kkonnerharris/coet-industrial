/* COET — industrial minimal, v2. Dependency-free: the reel, nav state and section spy, rise-in reveals, spec
   counters, the word-lit statement, the services selector with its tilting stage, and the sound hooks. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var S = window.COETSound || { tick: function () {}, select: function () {}, press: function () {}, arrive: function () {}, rush: function () {}, set: function () { return false; }, wanted: function () { return false; } };
  var panX = function (el) { var r = el.getBoundingClientRect(); return ((r.left + r.width / 2) / innerWidth) * 2 - 1; };

  /* ── sound toggle: off until asked for; the choice is remembered on this device ── */
  var toggle = document.querySelector('[data-sound-toggle]'), label = document.querySelector('[data-sound-label]');
  function showSound(v) { toggle.setAttribute('aria-pressed', String(v)); label.textContent = v ? 'Sound on' : 'Sound off'; }
  if (toggle) {
    showSound(false);
    toggle.addEventListener('click', function () { showSound(S.set(toggle.getAttribute('aria-pressed') !== 'true')); });
    // remembered "on": browsers only allow audio after a gesture, so it wakes on the first one
    if (S.wanted()) {
      var wake = function () { showSound(S.set(true)); removeEventListener('pointerdown', wake, true); removeEventListener('keydown', wake, true); };
      addEventListener('pointerdown', wake, true); addEventListener('keydown', wake, true);
    }
  }
  // declarative cues: data-sfx="tick" on hover (mouse only), "press"/"tick" on activation
  document.querySelectorAll('[data-sfx]').forEach(function (el) {
    var kind = el.dataset.sfx;
    if (fine) el.addEventListener('pointerenter', function () { S.tick(panX(el)); });
    el.addEventListener('click', function () { (kind === 'press' ? S.press : S.select)(panX(el)); });
  });

  /* ── the reel: the portrait cut on phones, paused under reduced motion ── */
  var reel = document.querySelector('[data-reel]'), reelBtn = document.querySelector('[data-reel-toggle]');
  if (reel) {
    var src = reel.querySelector('source'), phone = matchMedia('(max-width: 760px) and (orientation: portrait)').matches;
    src.src = phone ? src.dataset.srcPhone : src.dataset.srcDesktop;
    if (phone) reel.poster = 'assets/video/reel-m-poster.webp';
    reel.load();
    var setBtn = function () { reelBtn.textContent = reel.paused ? 'Play film' : 'Pause film'; reelBtn.setAttribute('aria-pressed', String(!reel.paused)); };
    if (reduce) { reel.removeAttribute('autoplay'); reel.pause(); } else reel.play().catch(function () {});
    reel.addEventListener('play', setBtn); reel.addEventListener('pause', setBtn); setBtn();
    reelBtn.addEventListener('click', function () { S.select(panX(reelBtn)); if (reel.paused) reel.play().catch(function () {}); else reel.pause(); });
  }

  /* ── scroll: solid nav after the film, film eases in, statement lights, air rush follows speed ── */
  var nav = document.querySelector('[data-nav]'), hero = document.querySelector('.hero'), ticking = false, lastY = scrollY, idle;
  function onScroll() {
    ticking = false;
    var h = hero ? hero.offsetHeight : 600, y = scrollY, v = y - lastY; lastY = y;
    nav.classList.toggle('is-solid', y > h - 90);
    if (hero && !reduce) hero.style.setProperty('--hero-p', Math.min(1, y / h).toFixed(3));
    lightWords();
    S.rush(v); clearTimeout(idle); idle = setTimeout(function () { S.rush(0); }, 90);
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ── section spy: the nav chip for the section you're in stays lit ── */
  var chips = [].slice.call(document.querySelectorAll('[data-spy]'));
  if ('IntersectionObserver' in window && chips.length) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        chips.forEach(function (c) { c.setAttribute('aria-current', String(c.dataset.spy === e.target.id)); });
        S.arrive();
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    chips.forEach(function (c) { var s = document.getElementById(c.dataset.spy); if (s) spy.observe(s); });
  }

  /* ── rise in once; siblings stagger a touch ── */
  var rise = [].slice.call(document.querySelectorAll('[data-rise]'));
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, i = [].indexOf.call(el.parentNode.children, el);
        el.style.setProperty('--d', Math.min(i, 5) * 60 + 'ms');
        el.classList.add('in'); io.unobserve(el);
        var n = el.querySelector('[data-count]'); if (n) count(n);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    rise.forEach(function (el) { io.observe(el); });
  } else rise.forEach(function (el) { el.classList.add('in'); });

  function count(el) {
    if (reduce) return;
    var to = +el.dataset.count, t0 = 0;
    function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }
    el.textContent = '0'; requestAnimationFrame(step);
  }

  /* ── statement lights word by word ── */
  var words = document.querySelector('[data-words]'), spans = [];
  if (words) {
    var text = words.textContent.trim(); words.textContent = ''; words.setAttribute('aria-label', text);
    text.split(/\s+/).forEach(function (w, i, a) {
      var s = document.createElement('span'); s.className = 'w'; s.textContent = w; s.setAttribute('aria-hidden', 'true');
      words.appendChild(s); if (i < a.length - 1) words.appendChild(document.createTextNode(' ')); spans.push(s);
    });
  }
  function lightWords() {
    if (!spans.length || reduce) return;
    var r = words.getBoundingClientRect(), p = Math.max(0, Math.min(1, (innerHeight * .78 - r.top) / (r.height + innerHeight * .38)));
    var on = Math.round(p * spans.length);
    spans.forEach(function (s, i) { s.classList.toggle('lit', i < on); });
  }

  /* ── services: tabs (click/tap, arrow keys; hover previews on a mouse) and the stage that follows ── */
  var box = document.querySelector('[data-services]');
  if (box) {
    var tabs = [].slice.call(box.querySelectorAll('[role="tab"]')), panels = [].slice.call(box.querySelectorAll('[role="tabpanel"]'));
    var idx = box.querySelector('[data-stage-idx]'), current = 0, hoverTimer;
    function pick(i, opts) {
      if (i === current) return;
      var prev = current; current = i;
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      var out = panels[prev], inn = panels[i];
      out.classList.remove('is-in'); out.classList.add('is-out');
      setTimeout(function () { if (current !== prev) { out.hidden = true; out.classList.remove('is-out'); } }, reduce ? 0 : 560);
      inn.hidden = false; inn.classList.remove('is-out'); void inn.offsetWidth; inn.classList.add('is-in');
      idx.textContent = String(i + 1).padStart(2, '0');
      if (opts && opts.focus) tabs[i].focus();
      S.select(panX(tabs[i]) * .5 + .25);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { pick(i); });
      if (fine) {
        t.addEventListener('pointerenter', function () { S.tick(-.2); clearTimeout(hoverTimer); hoverTimer = setTimeout(function () { pick(i); }, 140); });
        t.addEventListener('pointerleave', function () { clearTimeout(hoverTimer); });
      }
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = tabs.length, to = null;
        if (k === 'ArrowDown' || k === 'ArrowRight') to = (i + 1) % n;
        else if (k === 'ArrowUp' || k === 'ArrowLeft') to = (i - 1 + n) % n;
        else if (k === 'Home') to = 0; else if (k === 'End') to = n - 1;
        if (to !== null) { e.preventDefault(); pick(to, { focus: true }); }
      });
    });

    // the stage leans toward the cursor; the drawing and its ground drift apart for depth
    var stage = box.querySelector('[data-tilt]');
    if (stage && fine && !reduce) {
      var raf = 0, mx = 0, my = 0;
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5;
        stage.classList.add('is-tracking');
        if (!raf) raf = requestAnimationFrame(function () {
          raf = 0;
          stage.style.setProperty('--rx', (mx * 7).toFixed(2) + 'deg'); stage.style.setProperty('--ry', (-my * 7).toFixed(2) + 'deg');
          stage.style.setProperty('--px', (mx * 18).toFixed(1) + 'px'); stage.style.setProperty('--py', (my * 14).toFixed(1) + 'px');
        });
      });
      stage.addEventListener('pointerleave', function () {
        stage.classList.remove('is-tracking');
        ['--rx', '--ry', '--px', '--py'].forEach(function (p) { stage.style.removeProperty(p); });
      });
    }
  }

  /* ── work stage (MetaLab): pointing at or focusing a project swaps the whole stage; a click opens its case study ── */
  var ws = document.querySelector('[data-ws-root]');
  if (ws) {
    var wsPills = [].slice.call(ws.querySelectorAll('[data-ws]')), wsLayers = [].slice.call(ws.querySelectorAll('[data-ws-layer]')), wsOn = 0;
    function show(i) {
      if (i === wsOn) return;
      wsOn = i;
      wsLayers.forEach(function (l, k) { l.classList.toggle('is-on', k === i); l.setAttribute('aria-hidden', String(k !== i)); });
      wsPills.forEach(function (p, k) { p.classList.toggle('is-on', k === i); });
      S.tick(-.6);
    }
    wsPills.forEach(function (p, i) {
      if (fine) p.addEventListener('pointerenter', function () { show(i); });
      p.addEventListener('focus', function () { show(i); });
    });
  }

  onScroll();
})();
