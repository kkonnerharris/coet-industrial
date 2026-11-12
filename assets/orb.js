/* COET — the orb: an "AI brain" sphere of small dots joined like a network, in the C's white glass, with COET-amber
   traffic driving across it along the links and loose dots floating free around it. Canvas (hundreds of moving points), with a second blurred canvas on
   top for the glow. Points sit on a Fibonacci sphere; each is wired to its nearest neighbours once. Each frame
   the sphere turns, breathes slightly and leans toward the pointer. Depth sets size and brightness. It pauses
   off screen and in hidden tabs; under reduced motion it draws one still frame. */
(function () {
  'use strict';
  var host = document.querySelector('[data-orb]');
  if (!host) return;
  var main = host.querySelector('.orb__main'), glow = host.querySelector('.orb__glow');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ── the sphere ──
  var N = innerWidth < 700 ? 260 : 420, K = 3, pts = [], links = [];
  var GA = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < N; i++) {
    var y = 1 - (i + .5) / N * 2, r = Math.sqrt(1 - y * y), th = i * GA;
    // a little jitter so it reads as grown, not machined
    var j = 1 + (Math.random() - .5) * .06;
    pts.push({ x: Math.cos(th) * r * j, y: y * j, z: Math.sin(th) * r * j, ph: Math.random() * Math.PI * 2, s: .6 + Math.random() * .8, ox: 0, oy: 0, vx: 0, vy: 0, pop: 0, jy: 0 });
  }
  var seen = {};
  pts.forEach(function (p, a) {
    var near = [];
    pts.forEach(function (q, b) { if (a !== b) { var dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z; near.push([dx * dx + dy * dy + dz * dz, b]); } });
    near.sort(function (u, v) { return u[0] - v[0]; });
    for (var k = 0; k < K; k++) { var b = near[k][1], key = a < b ? a + ':' + b : b + ':' + a; if (!seen[key]) { seen[key] = 1; links.push([a, b]); } }
  });
  // a few long "synapses" through the core
  for (var s = 0; s < 18; s++) links.push([Math.floor(Math.random() * N), Math.floor(Math.random() * N), 1]);

  // sparks: tiny particles a node throws off when it jumps (polar spread, controlled randomness, always cleaned up)
  var sparks = [], MAX_SPARKS = 260;
  function burst(n, count, amber) {
    pts[n].pop = 1;
    var q = proj[n]; if (!q) return;
    for (var i = 0; i < count && sparks.length < MAX_SPARKS; i++) {
      var ang = (i / count) * Math.PI * 2 + (Math.random() - .5) * .9, sp = 40 + Math.random() * 110;
      sparks.push({ x: q.x, y: q.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 30, life: 0, max: .5 + Math.random() * .6, r: .6 + Math.random() * 1.2, amber: amber && Math.random() < .7 });
    }
  }
  var mx = -1e4, my = -1e4;
  // amber signals travel along links
  var pulses = [], adj = [];
  for (var ai = 0; ai < N; ai++) adj.push([]);
  links.forEach(function (l) { if (!l[2]) { adj[l[0]].push(l[1]); adj[l[1]].push(l[0]); } });
  function dist(a, b) { var A = pts[a], B = pts[b], dx = A.x - B.x, dy = A.y - B.y, dz = A.z - B.z; return Math.sqrt(dx * dx + dy * dy + dz * dz) || .01; }
  // one car: it drives from node a to node b at a steady road speed (sp, in sphere radii per second)
  function car(a, b, sp, trips) { return { a: a, b: b, p: -1, t: 0, sp: sp, v: sp / dist(a, b), trips: trips }; }
  function spawn(from) {
    var a = from == null ? Math.floor(Math.random() * N) : from, nb = adj[a];
    if (!nb.length) return;
    pulses.push(car(a, nb[Math.floor(Math.random() * nb.length)], .42 + Math.random() * .5, 14 + Math.floor(Math.random() * 30)));
  }
  // at a junction, keep heading the way it was going (so it crosses the globe instead of circling one block)
  function onward(u) {
    var A = pts[u.a], B = pts[u.b], hx = B.x - A.x, hy = B.y - A.y, hz = B.z - A.z, nb = adj[u.b], best = -1, bs = -1e9;
    for (var i = 0; i < nb.length; i++) {
      if (nb[i] === u.a) continue;
      var C = pts[nb[i]], sc = (C.x - B.x) * hx + (C.y - B.y) * hy + (C.z - B.z) * hz + Math.random() * .012;
      if (sc > bs) { bs = sc; best = nb[i]; }
    }
    if (best < 0 || --u.trips <= 0) return false;                       // dead end or journey over
    u.p = u.a; u.a = u.b; u.b = best; u.t -= 1; u.v = u.sp / dist(u.a, u.b);
    return true;
  }
  // free floaters: loose dots drifting around the globe on their own slow orbits, wired to nothing
  var floaters = [], FN = innerWidth < 700 ? 34 : 60;
  for (var fi = 0; fi < FN; fi++) floaters.push({ r: 1.08 + Math.random() * .55, th: Math.random() * 6.2832, y: (Math.random() - .5) * 1.7, w: (Math.random() < .5 ? -1 : 1) * (.04 + Math.random() * .12),
    bob: .05 + Math.random() * .14, bs: .25 + Math.random() * .5, ph: Math.random() * 6.2832, s: .5 + Math.random() * 1.1 });

  // ── canvas setup (CSS pixels × devicePixelRatio) ──
  var W = 0, H = 0, ctxM, ctxG;
  function setup() {
    var dpr = Math.min(devicePixelRatio || 1, 2), b = host.getBoundingClientRect();
    W = b.width; H = b.height;
    [main, glow].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    ctxM = main.getContext('2d'); ctxG = glow.getContext('2d');
    ctxM.setTransform(dpr, 0, 0, dpr, 0, 0); ctxG.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxM.lineCap = ctxG.lineCap = 'round';
  }

  // ── motion state ──
  var rotY = 0, tiltX = -.22, aimX = 0, aimY = 0, leanX = 0, leanY = 0, last = 0, clock = 0;
  if (fine) addEventListener('pointermove', function (e) {
    aimY = (e.clientX / innerWidth - .5) * .9; aimX = (e.clientY / innerHeight - .5) * .6;
    var b = host.getBoundingClientRect(); mx = e.clientX - b.left; my = e.clientY - b.top;
  });
  // a click or tap on the stage: the nearest front node sparks and sends traffic out along every road it has
  var stage = host.closest('[data-ws-root]') || host.parentNode;
  stage.addEventListener('pointerdown', function (e) {
    if (reduce || e.target.closest('a, button')) return;
    var b = host.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, best = -1, bd = 1e9;
    for (var i = 0; i < N; i++) { var q = proj[i]; if (!q || q.d < .45) continue; var d = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y); if (d < bd) { bd = d; best = i; } }
    if (best >= 0 && bd < 140 * 140) {
      burst(best, 14, true);
      adj[best].forEach(function (b) { pulses.push(car(best, b, .9, 22)); });
    }
  });

  var proj = new Array(N);
  function frame(dt) {
    clock += dt;
    rotY += dt * .12;
    leanX += (aimX - leanX) * Math.min(1, dt * 2.5); leanY += (aimY - leanY) * Math.min(1, dt * 2.5);
    var ay = rotY + leanY, ax = tiltX + leanX, cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    var R = Math.min(W, H) * .38, ox = W / 2, oy = H / 2, F = 2.6;
    for (var i = 0; i < N; i++) {
      var p = pts[i], br = 1 + Math.sin(clock * .9 + p.ph) * .018;      // breathing
      var x = p.x * br, y = p.y * br, z = p.z * br;
      var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;                  // turn
      var y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;                 // tilt
      var k = F / (F - z2);                                             // perspective
      var px = ox + x1 * R * k, py = oy + y1 * R * k, dep = (z2 + 1) / 2;
      // cursor nudges nearby front nodes away; a spring pulls every node home (a little hop, then settle)
      if (!reduce) {
        var dx = px - mx, dy = py - my, dd = dx * dx + dy * dy, RR = 110 * 110;
        if (dd < RR && dep > .4) { var f = (1 - dd / RR) * 2600 * dt, inv = 1 / Math.sqrt(dd + 1); p.vx += dx * inv * f; p.vy += dy * inv * f; }
        p.vx += (-p.ox * 60 - p.vx * 9) * dt; p.vy += (-p.oy * 60 - p.vy * 9) * dt;
        p.ox += p.vx * dt; p.oy += p.vy * dt; p.pop = Math.max(0, p.pop - dt * 3);
      }
      proj[i] = { x: px + p.ox, y: py + p.oy + p.jy, d: dep };  // d: 0 back … 1 front
    }
    ctxM.clearRect(0, 0, W, H); ctxG.clearRect(0, 0, W, H);

    // links: back ones faint, front ones brighter
    ctxM.lineWidth = .6;
    for (var l = 0; l < links.length; l++) {
      var A = proj[links[l][0]], B = proj[links[l][1]], d = (A.d + B.d) / 2;
      ctxM.strokeStyle = 'rgba(245,158,11,' + (links[l][2] ? .04 + d * .06 : .05 + d * .26).toFixed(3) + ')';
      ctxM.beginPath(); ctxM.moveTo(A.x, A.y); ctxM.lineTo(B.x, B.y); ctxM.stroke();
    }
    // nodes
    for (var n = 0; n < N; n++) {
      var q = proj[n], a = Math.min(1, .18 + q.d * .82 + pts[n].pop * .5), rad = (.5 + q.d * 1.5) * pts[n].s * (1 + pts[n].pop * 1.4);
      ctxM.fillStyle = (pts[n].pop > .05 ? 'rgba(255,214,140,' : 'rgba(245,158,11,') + a.toFixed(3) + ')';
      ctxM.beginPath(); ctxM.arc(q.x, q.y, rad, 0, 6.2832); ctxM.fill();
      if (q.d > .72) { ctxG.fillStyle = 'rgba(245,158,11,' + ((q.d - .72) * 1.6).toFixed(3) + ')'; ctxG.beginPath(); ctxG.arc(q.x, q.y, rad * 2.2, 0, 6.2832); ctxG.fill(); }
    }
    // signals (COET amber), drawn on both canvases so they glow
    if (!reduce) {
      var want = N < 300 ? 60 : 110;
      if (pulses.length < want && Math.random() < dt * 60) spawn();
      pulses = pulses.filter(function (u) {
        u.t += dt * u.v;
        while (u.t >= 1) { if (!onward(u)) return false; }
        return true;
      });
      // sparks: drift, a touch of gravity, fade, then dropped
      sparks = sparks.filter(function (k) { k.life += dt; k.vy += 140 * dt; k.vx *= 1 - dt * 1.5; k.x += k.vx * dt; k.y += k.vy * dt; return k.life < k.max; });
      sparks.forEach(function (k) {
        var a = 1 - k.life / k.max, col = k.amber ? '245,158,11' : '255,214,140';
        ctxM.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')'; ctxM.beginPath(); ctxM.arc(k.x, k.y, k.r * (0.6 + a * .6), 0, 6.2832); ctxM.fill();
        ctxG.fillStyle = 'rgba(' + col + ',' + (a * .8).toFixed(3) + ')'; ctxG.beginPath(); ctxG.arc(k.x, k.y, k.r * 2.4, 0, 6.2832); ctxG.fill();
      });
    }
    // free floaters (same turn and tilt as the globe, plus their own drift)
    for (var f = 0; f < floaters.length; f++) {
      var fl = floaters[f], fy = Math.max(-.98, Math.min(.98, fl.y + Math.sin(clock * fl.bs + fl.ph) * fl.bob)), fr = Math.sqrt(1 - fy * fy) * fl.r, fa = fl.th + clock * fl.w;
      var fx = Math.cos(fa) * fr, fz = Math.sin(fa) * fr, fyy = fy * fl.r;
      var gx = fx * cy + fz * sy, gz = -fx * sy + fz * cy, gy = fyy * cx - gz * sx, gz2 = fyy * sx + gz * cx, fk = F / (F - gz2);
      var fd = Math.max(0, Math.min(1, (gz2 / fl.r + 1) / 2)), fpx = ox + gx * R * fk, fpy = oy + gy * R * fk, frad = (.7 + fd * 1.6) * fl.s;
      ctxM.fillStyle = 'rgba(255,214,140,' + (.16 + fd * .6).toFixed(3) + ')'; ctxM.beginPath(); ctxM.arc(fpx, fpy, frad, 0, 6.2832); ctxM.fill();
      if (fd > .5) { ctxG.fillStyle = 'rgba(245,158,11,' + ((fd - .5) * .9).toFixed(3) + ')'; ctxG.beginPath(); ctxG.arc(fpx, fpy, frad * 2.6, 0, 6.2832); ctxG.fill(); }
    }
    // traffic
    var TAIL = .7;
    pulses.forEach(function (u) {
      var A = proj[u.a], B = proj[u.b], t = u.t, x = A.x + (B.x - A.x) * t, y = A.y + (B.y - A.y) * t;
      var a = .3 + ((A.d + B.d) / 2) * .7, t0 = t - TAIL;
      [ctxM, ctxG].forEach(function (c, gi) {
        c.strokeStyle = 'rgba(' + (gi ? '245,158,11' : '255,226,170') + ',' + (a * (gi ? .9 : .95)).toFixed(3) + ')'; c.lineWidth = gi ? 3.5 : 1.5;
        c.beginPath();
        if (t0 >= 0 || u.p < 0) { var s0 = Math.max(0, t0); c.moveTo(A.x + (B.x - A.x) * s0, A.y + (B.y - A.y) * s0); }
        else { var P = proj[u.p], s1 = 1 + t0; c.moveTo(P.x + (A.x - P.x) * s1, P.y + (A.y - P.y) * s1); c.lineTo(A.x, A.y); }
        c.lineTo(x, y); c.stroke();
      });
      ctxM.fillStyle = 'rgba(255,240,210,' + a.toFixed(3) + ')'; ctxM.beginPath(); ctxM.arc(x, y, 1.3 + a * .9, 0, 6.2832); ctxM.fill();   // the headlight
    });
  }

  function loop(now) {
    raf = 0;
    if (!live) return;
    var dt = Math.min((now - (last || now)) / 1000, .25);   // clamped delta time
    last = now; frame(dt); raf = requestAnimationFrame(loop);
  }
  var raf = 0, live = true;
  setup();
  if (reduce) { for (var w = 0; w < 40; w++) spawn(); pulses.forEach(function (u) { u.t = .5; }); frame(0); }
  else {
    raf = requestAnimationFrame(loop);
    var wake = function () { if (live && !raf && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { live = es[0].isIntersecting; wake(); }).observe(host);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); });
  }
  if ('ResizeObserver' in window) new ResizeObserver(function () { setup(); if (reduce) frame(0); }).observe(host);
})();
