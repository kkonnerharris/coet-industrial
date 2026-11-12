/* COET — industrial minimal, v2. Dependency-free: the reel, nav state and section spy, rise-in reveals, spec
   counters, the word-lit statement, the services selector with its tilting stage, and the sound hooks. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var S = window.COETSound || { tick: function () {}, select: function () {}, press: function () {}, arrive: function () {}, rush: function () {}, set: function () { return false; }, wanted: function () { return false; } };
  var panX = function (el) { var r = el.getBoundingClientRect(); return ((r.left + r.width / 2) / innerWidth) * 2 - 1; };

  /* ── sound toggle (the speaker in the bar): off until asked for; remembered on this device ── */
  var toggle = document.querySelector('[data-sound-toggle]');
  function showSound(v) { if (!toggle) return; toggle.setAttribute('aria-pressed', String(v)); toggle.setAttribute('aria-label', v ? 'Sound on' : 'Sound off'); }
  if (toggle) {
    showSound(false);
    toggle.addEventListener('click', function () { showSound(S.set(toggle.getAttribute('aria-pressed') !== 'true')); });
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
    nav.classList.toggle('is-compact', y > 60);
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

  /* ── the menu: full screen, light; Esc or Close shuts it, focus stays inside while open ── */
  var menu = document.querySelector('[data-menu]'), menuBtn = document.querySelector('[data-menu-toggle]'), menuLabel = document.querySelector('[data-menu-label]');
  if (menu && menuBtn) {
    [].forEach.call(menu.querySelectorAll('.m-pill'), function (p, i) { p.style.setProperty('--i', i); });
    var openMenu = function (open) {
      menuBtn.setAttribute('aria-expanded', String(open)); menuLabel.textContent = open ? 'Close' : 'Menu';
      document.documentElement.classList.toggle('menu-open', open); document.body.classList.toggle('menu-open', open);
      if (open) { menu.hidden = false; requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add('is-open'); }); }); var f = menu.querySelector('a'); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 60); S.press(-.8); }
      else { menu.classList.remove('is-open'); setTimeout(function () { if (menuBtn.getAttribute('aria-expanded') === 'false') menu.hidden = true; }, reduce ? 0 : 420); menuBtn.focus({ preventScroll: true }); S.select(-.8); }
    };
    menuBtn.addEventListener('click', function () { openMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    [].forEach.call(document.querySelectorAll('[data-menu-close]'), function (l) { l.addEventListener('click', function () { if (menuBtn.getAttribute('aria-expanded') === 'true') openMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (menuBtn.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') { e.preventDefault(); openMenu(false); return; }
      if (e.key === 'Tab') {   // keep focus in the bar and the menu
        var f = [].slice.call(document.querySelectorAll('.mnav a, .mnav button, .menu a'));
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* ── the studio clock: Scottsdale time, like MetaLab's city clock ── */
  var clock = document.querySelector('[data-clock]');
  if (clock) {
    var fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });
    var tickClock = function () { clock.textContent = 'PHX ' + fmt.format(new Date()); };
    tickClock(); setInterval(tickClock, 15000);
  }

  /* ── home stage: nothing picked at first; a project takes the stage while pointed at or focused ── */
  var ws = document.querySelector('[data-ws-root]');
  if (ws) {
    var pills = [].slice.call(ws.querySelectorAll('[data-ws]')), layers = [].slice.call(ws.querySelectorAll('[data-ws-layer]')), home = ws.querySelector('[data-ws-home]');
    var cur = -1, leaveT;
    var show = function (i) {
      clearTimeout(leaveT);
      if (i === cur) return;
      cur = i;
      // set the final state directly: exactly one layer (or the C) is on, whatever was mid-transition
      layers.forEach(function (l, k) { l.classList.toggle('is-on', k === i); l.setAttribute('aria-hidden', String(k !== i)); });
      pills.forEach(function (p, k) { p.classList.toggle('is-on', k === i); });
      if (i === -1) {   // back to the C: its lines drop in from above again
        home.classList.add('is-entering'); void home.offsetWidth; home.classList.add('is-on');
        requestAnimationFrame(function () { home.classList.remove('is-entering'); });
      } else home.classList.remove('is-on');
      S.arrive();
    };
    pills.forEach(function (p, i) {
      if (fine) p.addEventListener('pointerenter', function () { show(i); });
      p.addEventListener('focus', function () { show(i); });
      p.addEventListener('blur', function () { leaveT = setTimeout(function () { if (!ws.contains(document.activeElement)) show(-1); }, 120); });
    });
    var list = ws.querySelector('.ws-pills');
    if (fine) list.addEventListener('pointerleave', function () { leaveT = setTimeout(function () { show(-1); }, 380); });

    // MetaLab's cursor on the work screen: a thin ring that trails the pointer and opens up over a project
    if (fine && !reduce) {
      var ring = document.createElement('span'); ring.className = 'ws-cursor'; ring.setAttribute('aria-hidden', 'true'); ws.appendChild(ring);
      var tx = 0, ty = 0, rx = 0, ry = 0, raf2 = 0, inside = false;
      var loop = function () { rx += (tx - rx) * .2; ry += (ty - ry) * .2; ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)'; raf2 = (Math.abs(tx - rx) + Math.abs(ty - ry) > .2 || inside) ? requestAnimationFrame(loop) : 0; };
      ws.addEventListener('pointermove', function (e) { var r = ws.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; if (!inside) { rx = tx; ry = ty; } inside = true; ws.classList.add('has-cursor'); if (!raf2) raf2 = requestAnimationFrame(loop); });
      ws.addEventListener('pointerleave', function () { inside = false; ws.classList.remove('has-cursor'); });
      [].forEach.call(ws.querySelectorAll('a, button'), function (el) {
        el.addEventListener('pointerenter', function () { ring.classList.add('is-big'); });
        el.addEventListener('pointerleave', function () { ring.classList.remove('is-big'); });
      });
    }

    // the C leans toward the cursor and its liquid surface keeps moving
    var c = ws.querySelector('[data-c]'), turb = ws.querySelector('[data-liquid]');
    if (c && !reduce) {
      if (fine) ws.addEventListener('pointermove', function (e) {
        var x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
        c.style.setProperty('--cy', (x * 14).toFixed(2) + 'deg'); c.style.setProperty('--cx', (-y * 10).toFixed(2) + 'deg');
      });
      // the liquid only moves while the stage is on screen (no work, and no battery, spent off screen)
      if (turb) {
        var t0 = performance.now(), live = true, flowing = 0;
        var flow = function (t) { flowing = 0; if (!live) return; var k = (t - t0) / 1000; turb.setAttribute('baseFrequency', (0.008 + Math.sin(k * .35) * .0025).toFixed(4) + ' ' + (0.012 + Math.cos(k * .27) * .003).toFixed(4)); flowing = requestAnimationFrame(flow); };
        if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { live = es[0].isIntersecting; if (live && !flowing) flowing = requestAnimationFrame(flow); }).observe(ws);
        flowing = requestAnimationFrame(flow);
      }
    }
  }

  onScroll();
})();
