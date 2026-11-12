/* COET — the globe: a loose globe made of many free-floating balls in COET amber. Nothing is wired together and
   nothing travels across it. Each ball has a home somewhere in a thick, uneven shell and drifts around that home
   on its own slow path, so the globe keeps its shape while every ball floats. The whole thing turns slowly and
   leans toward the pointer; balls near the pointer drift aside and ease back. Depth sets size and brightness.
   Canvas, with a second blurred canvas on top for the glow. It pauses off screen and in hidden tabs; under
   reduced motion it draws one still frame. */
(function () {
  'use strict';
  var host = document.querySelector('[data-orb]');
  if (!host) return;
  var main = host.querySelector('.orb__main'), glow = host.querySelector('.orb__glow');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var small = innerWidth < 700;
  var rnd = Math.random, TAU = Math.PI * 2;

  // ── the balls ──
  var N = small ? 700 : 1600, pts = [];
  for (var i = 0; i < N; i++) {
    var u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u);
    // a thick, uneven shell: most balls near the surface, some well inside, a few far out
    var k = rnd(), rad = k < .8 ? .9 + rnd() * .2 : k < .92 ? .55 + rnd() * .35 : 1.1 + rnd() * .34;
    var big = rnd();
    pts.push({
      x: Math.cos(a) * r * rad, y: u * rad, z: Math.sin(a) * r * rad,
      s: big < .04 ? 3.4 + rnd() * 2 : big < .26 ? 1.8 + rnd() * 1.1 : .8 + rnd() * .8,      // a few big, some medium, mostly small
      // its own drift: a slow wave per axis, different for every ball
      ax: .03 + rnd() * .07, ay: .03 + rnd() * .07, az: .03 + rnd() * .07,
      fx: .12 + rnd() * .3, fy: .12 + rnd() * .3, fz: .12 + rnd() * .3,
      px: rnd() * TAU, py: rnd() * TAU, pz: rnd() * TAU,
      ox: 0, oy: 0, vx: 0, vy: 0, pop: 0, hot: big < .12
    });
  }

  // sparks from a click
  var sparks = [], MAX_SPARKS = 200;
  function burst(n, count) {
    var q = proj[n]; if (!q) return; pts[n].pop = 1;
    for (var i = 0; i < count && sparks.length < MAX_SPARKS; i++) {
      var ang = (i / count) * TAU + (rnd() - .5) * .9, sp = 40 + rnd() * 110;
      sparks.push({ x: q.x, y: q.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 30, life: 0, max: .5 + rnd() * .6, r: .6 + rnd() * 1.2 });
    }
  }

  // ── canvas setup (CSS pixels × devicePixelRatio) ──
  var W = 0, H = 0, ctxM, ctxG;
  function setup() {
    var dpr = Math.min(devicePixelRatio || 1, 2), b = host.getBoundingClientRect();
    W = b.width; H = b.height;
    [main, glow].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    ctxM = main.getContext('2d'); ctxG = glow.getContext('2d');
    ctxM.setTransform(dpr, 0, 0, dpr, 0, 0); ctxG.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── pointer ──
  var mx = -1e4, my = -1e4, aimX = 0, aimY = 0, leanX = 0, leanY = 0, last = 0, clock = 0, rotY = 0;
  if (fine) addEventListener('pointermove', function (e) {
    aimX = e.clientX / innerWidth - .5; aimY = e.clientY / innerHeight - .5;
    var b = host.getBoundingClientRect(); mx = e.clientX - b.left; my = e.clientY - b.top;
  });
  // a click or tap on the stage: the nearest front ball sparks and its neighbours scatter
  var stage = host.closest('[data-ws-root]') || host.parentNode;
  stage.addEventListener('pointerdown', function (e) {
    if (reduce || e.target.closest('a, button')) return;
    var b = host.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, best = -1, bd = 150 * 150;
    for (var i = 0; i < N; i++) {
      var q = proj[i]; if (!q || q.d < .4) continue;
      var dx = q.x - x, dy = q.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
      if (d < 130 * 130) { var inv = 1 / Math.sqrt(d + 1), f = (1 - d / (130 * 130)) * 260; pts[i].vx += dx * inv * f; pts[i].vy += dy * inv * f; }
    }
    if (best >= 0) burst(best, 14);
  });

  var proj = new Array(N), order = [];
  for (var o = 0; o < N; o++) order.push(o);
  function frame(dt) {
    clock += dt; rotY += dt * .06;
    leanX += (aimX - leanX) * Math.min(1, dt * 2.5); leanY += (aimY - leanY) * Math.min(1, dt * 2.5);
    var ay = rotY + leanX * .7, ax = -.18 + leanY * .45, cy = Math.cos(ay), sn = Math.sin(ay), cx = Math.cos(ax), snx = Math.sin(ax);
    var R = Math.min(W, H) * (small ? .5 : .42), ox = W / 2, oy = H / 2, F = 3.2;
    for (var i = 0; i < N; i++) {
      var p = pts[i];
      // home + its own drift (in the globe's space, so the drift turns with it)
      var x = p.x + Math.sin(clock * p.fx + p.px) * p.ax, y = p.y + Math.sin(clock * p.fy + p.py) * p.ay, z = p.z + Math.sin(clock * p.fz + p.pz) * p.az;
      var x1 = x * cy + z * sn, z1 = -x * sn + z * cy;                                    // turn
      var y1 = y * cx - z1 * snx, z2 = y * snx + z1 * cx;                                 // tilt
      var k = F / (F - z2), dep = Math.max(0, Math.min(1, (z2 / 1.5 + 1) / 2));           // perspective; 0 back … 1 front
      var px = ox + x1 * R * k, py = oy + y1 * R * k;
      if (!reduce) {                                         // the pointer pushes nearby balls aside; a soft spring floats them home
        var dx = px + p.ox - mx, dy = py + p.oy - my, dd = dx * dx + dy * dy, RR = 130 * 130;
        if (dd < RR && dep > .3) { var f = (1 - dd / RR) * 1500 * dt, inv = 1 / Math.sqrt(dd + 1); p.vx += dx * inv * f; p.vy += dy * inv * f; }
        p.vx += (-p.ox * 14 - p.vx * 3.2) * dt; p.vy += (-p.oy * 14 - p.vy * 3.2) * dt;
        p.ox += p.vx * dt; p.oy += p.vy * dt; p.pop = Math.max(0, p.pop - dt * 2.5);
      }
      proj[i] = { x: px + p.ox, y: py + p.oy, d: dep, k: k };
    }
    order.sort(function (a, b) { return proj[a].d - proj[b].d; });                        // far balls first, near balls on top

    ctxM.clearRect(0, 0, W, H); ctxG.clearRect(0, 0, W, H);
    for (var j = 0; j < N; j++) {
      var n = order[j], q = proj[n], p2 = pts[n], rad = p2.s * (.55 + q.d * 1.1) * q.k * (small ? .8 : 1) * (1 + p2.pop * 1.2);
      var al = Math.min(1, .2 + q.d * .8 + p2.pop * .4);
      ctxM.fillStyle = (p2.hot || p2.pop > .05 ? 'rgba(255,205,120,' : 'rgba(245,158,11,') + al.toFixed(3) + ')';
      ctxM.beginPath(); ctxM.arc(q.x, q.y, rad, 0, TAU); ctxM.fill();
      if (rad > 2.2 && q.d > .45) { ctxG.fillStyle = 'rgba(245,158,11,' + (.25 + q.d * .45).toFixed(3) + ')'; ctxG.beginPath(); ctxG.arc(q.x, q.y, rad * 2.2, 0, TAU); ctxG.fill(); }
    }
    if (!reduce) {
      sparks = sparks.filter(function (s) { s.life += dt; s.vy += 140 * dt; s.vx *= 1 - dt * 1.5; s.x += s.vx * dt; s.y += s.vy * dt; return s.life < s.max; });
      sparks.forEach(function (s) {
        var a = 1 - s.life / s.max;
        ctxM.fillStyle = 'rgba(255,214,140,' + a.toFixed(3) + ')'; ctxM.beginPath(); ctxM.arc(s.x, s.y, s.r * (.6 + a * .6), 0, TAU); ctxM.fill();
        ctxG.fillStyle = 'rgba(245,158,11,' + (a * .8).toFixed(3) + ')'; ctxG.beginPath(); ctxG.arc(s.x, s.y, s.r * 2.4, 0, TAU); ctxG.fill();
      });
    }
  }

  function loop(now) {
    raf = 0;
    if (!live) return;
    var dt = Math.min((now - (last || now)) / 1000, .25);   // clamped delta time
    last = now; frame(dt); raf = requestAnimationFrame(loop);
  }
  var raf = 0, live = true;
  setup();
  if (reduce) frame(0);
  else {
    raf = requestAnimationFrame(loop);
    var wake = function () { if (live && !raf && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { live = es[0].isIntersecting; wake(); }).observe(host);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); });
  }
  if ('ResizeObserver' in window) new ResizeObserver(function () { setup(); if (reduce) frame(0); }).observe(host);
})();
