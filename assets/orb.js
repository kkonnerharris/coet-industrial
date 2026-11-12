/* COET — the orb. This is <ThinkingOrb state="searching" size={64} /> from Libraries.dev's thinking-orbs (MIT,
   © Jakub Antalik): a scan meridian sweeping a dotted globe, straight
   from the package: its own preset, its own frame maths and its own painter, with more and smaller dots set
   through the package's own `dots` and `dotSize` controls. The package's
   engine is framework-free, so no React is needed here. Two things differ from the 64px original, both things the
   package itself allows: it is enlarged (the 64px drawing is scaled as a vector, never redrawn) and tinted COET amber.
   Around it: light/dark mode picks the ink (theme.js), and a few of its particles carry a small label that does
   something when pressed (the first starts the voice agent).
   Like the original it draws on a plain 2D canvas, pauses off screen and in hidden tabs, and shows one still
   frame under reduced motion. */
(function () {
  'use strict';
  var host = document.querySelector('[data-orb]');
  if (!host) return;
  var canvas = host.querySelector('.orb__main'), spare = host.querySelector('.orb__glow');
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ENGINE = new URL('vendor/thinking-orbs-0.3.2/engine.es.js', document.currentScript.src).href;
  var KIT = new URL('vendor/thinking-orbs-0.3.2/index-B8WsUNf5.js', document.currentScript.src).href;
  var TINT = { r: 245, g: 158, b: 11 };                // COET amber (#f59e0b)
  var STATE = 'searching', DESIGN = 64, ORB_R = 26.24;                      // the library's design size, and the orb's radius inside it

  Promise.all([import(ENGINE), import(KIT)]).then(function (mods) {
    var lib = mods[0], kit = mods[1];                    // kit.s = scaleCounts, kit.a = scaleRadii
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (spare) spare.style.display = 'none';
    canvas.style.opacity = 1;
    var preset = lib.resolvePreset(STATE, DESIGN), frameFn = lib.MODE_FRAMES[preset.mode], speed = preset.speed;
    // more dots, much smaller: the package's own `dots` and `dotSize` controls (the same ones <ThinkingOrb> exposes)
    var DOTS = 3.8, DOT_SIZE = .2;
    var opts = Object.assign({}, kit.a(kit.s(preset.opts, DOTS), DOT_SIZE), { rMin: .05 });
    var PARTICLE_R = .8 * DOT_SIZE;                                // a label rides one of the larger, nearer dots

    // ── labelled particles: a very small label rides on an ordinary particle. Add an entry here for each new one. ──
    var LABELS = [
      { key: 'voice', text: 'Talk to COET', hint: 'AI voice assistant',
        press: function () { if (window.COETVoice) window.COETVoice.toggle(); },
        bind: function (show) { if (window.COETVoice) window.COETVoice.onState(show); } }
    ];
    var VOICE_TEXT = { idle: 'Talk to COET', connecting: 'Connecting…', listening: 'Listening · say stop', speaking: 'Speaking · say stop', blocked: 'Mic blocked', failed: 'No connection' };
    var stageEl = host.parentNode;
    LABELS.forEach(function (l) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'orb-node'; b.dataset.state = 'idle'; b.title = l.hint;
      var text = document.createElement('span'); text.className = 'orb-node__text'; text.textContent = l.text; b.appendChild(text);
      b.addEventListener('click', function () { l.press(); });
      stageEl.appendChild(b); l.el = b; l.at = null;
      if (l.bind) l.bind(function (st) {
        b.dataset.state = st; text.textContent = VOICE_TEXT[st] || VOICE_TEXT.idle;
        b.setAttribute('aria-label', st === 'idle' ? 'Talk to COET: start a voice conversation with an AI assistant (uses your microphone)' : st === 'listening' || st === 'speaking' || st === 'connecting' ? 'End the voice conversation' : text.textContent);
      });
    });

    // ── size and place: radius 42% of the stage's short side; up and to the left on wide screens ──
    var W = 0, H = 0, dpr = 1, scale = 1, cx = 0, cy = 0;
    function setup() {
      var b = host.getBoundingClientRect(); W = b.width; H = b.height;
      if (!W || !H) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      var small = W < 700, R = (small ? .5 : .42) * Math.min(W, H), wide = matchMedia('(min-width: 901px)').matches;
      scale = R / ORB_R;
      cx = W / 2 - (wide ? .4 * R : 0); cy = H / 2 - (wide ? .13 * R : 0);
    }

    function draw(t) {
      var dark = root.dataset.theme !== 'light', half = DESIGN / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      var frame = frameFn(DESIGN, t, opts);
      // the library's painter, at the library's design size; only the canvas transform enlarges it
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (cx - half * scale), dpr * (cy - half * scale));
      lib.paintFrame(ctx, frame, dark, TINT);
      place(frame.dots);
    }

    // each label follows one particle: the nearest one to where it was a frame ago
    function place(dots) {
      for (var j = 0; j < LABELS.length; j++) {
        var l = LABELS[j];
        if (!dots) { l.el.style.visibility = 'hidden'; l.at = null; continue; }
        var best = null, bd = 1e9;
        for (var i = 0; i < dots.length; i++) {
          var d = dots[i];
          if (d.r < PARTICLE_R) continue;                                              // particles only, not the faint orbit trails
          var dist = l.at ? (d.x - l.at.x) * (d.x - l.at.x) + (d.y - l.at.y) * (d.y - l.at.y) + (d.z - l.at.z) * (d.z - l.at.z) : Math.abs(d.x - 20 - j * 9) + Math.abs(d.y - 22) - d.z;
          if (dist < bd) { bd = dist; best = d; }
        }
        if (!best) continue;
        l.at = { x: best.x, y: best.y, z: best.z };
        var front = Math.max(0, Math.min(1, best.z / (2 * ORB_R) + .5));
        l.el.style.visibility = '';
        l.el.style.opacity = (.78 + front * .22).toFixed(2);
        l.el.style.transform = 'translate3d(' + (cx + (best.x - DESIGN / 2) * scale).toFixed(1) + 'px,' + (cy + (best.y - DESIGN / 2) * scale).toFixed(1) + 'px,0) translate(-50%, -50%)';
      }
    }

    // ── the loop: the same clock as the library (page time × the preset's speed) ──
    var raf = 0, running = false, visible = true;
    function loop() { draw(performance.now() / 1000 * speed); if (running) raf = requestAnimationFrame(loop); }
    function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    function still() { draw(reduce ? .6 : performance.now() / 1000 * speed); }
    setup(); still();
    if (!reduce) {
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !document.hidden) start(); else stop(); }).observe(host);
      else start();
      document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });
    }
    if ('ResizeObserver' in window) new ResizeObserver(function () { setup(); if (!running) still(); }).observe(host);
    document.addEventListener('coet:theme', function () { if (!running) still(); });
  }).catch(function () {});
})();
