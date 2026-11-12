/* COET — the orb: an "AI brain" sphere of small dots joined like a network, in the C's white glass, with a few
   COET-amber signals running along the links. Canvas (hundreds of moving points), with a second blurred canvas on
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
    pts.push({ x: Math.cos(th) * r * j, y: y * j, z: Math.sin(th) * r * j, ph: Math.random() * Math.PI * 2, s: .6 + Math.random() * .8, ox: 0, oy: 0, vx: 0, vy: 0, pop: 0 });
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
  var sparks = [], MAX_SPARKS = 160;
  function burst(n, count, amber) {
    var p = pts[n]; p.pop = 1;
    var q = proj[n]; if (!q) return;
    p.vx += (Math.random() - .5) * 120; p.vy -= 90 + Math.random() * 80;          // the node itself hops up
    for (var i = 0; i < count && sparks.length < MAX_SPARKS; i++) {
      var ang = (i / count) * Math.PI * 2 + (Math.random() - .5) * .9, sp = 40 + Math.random() * 110;
      sparks.push({ x: q.x, y: q.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 30, life: 0, max: .5 + Math.random() * .6, r: .6 + Math.random() * 1.2, amber: amber && Math.random() < .7 });
    }
  }
  var mx = -1e4, my = -1e4;
  // amber signals travel along links
  var pulses = [];
  function spawn() { var l = links[Math.floor(Math.random() * links.length)]; pulses.push({ a: l[0], b: l[1], t: 0, v: .7 + Math.random() * .9 }); }

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
  // a click or tap on the stage: the nearest front node jumps and bursts
  var stage = host.closest('[data-ws-root]') || host.parentNode;
  stage.addEventListener('pointerdown', function (e) {
    if (reduce || e.target.closest('a, button')) return;
    var b = host.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, best = -1, bd = 1e9;
    for (var i = 0; i < N; i++) { var q = proj[i]; if (!q || q.d < .45) continue; var d = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y); if (d < bd) { bd = d; best = i; } }
    if (best >= 0 && bd < 140 * 140) {
      burst(best, 14, true);
      links.forEach(function (l) { if (l[0] === best || l[1] === best) pulses.push({ a: best, b: l[0] === best ? l[1] : l[0], t: 0, v: 1.4, hop: 1 }); });
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
      proj[i] = { x: px + p.ox, y: py + p.oy, d: dep };  // d: 0 back … 1 front
    }
    ctxM.clearRect(0, 0, W, H); ctxG.clearRect(0, 0, W, H);

    // links: back ones faint, front ones brighter
    ctxM.lineWidth = .6;
    for (var l = 0; l < links.length; l++) {
      var A = proj[links[l][0]], B = proj[links[l][1]], d = (A.d + B.d) / 2;
      ctxM.strokeStyle = 'rgba(226,230,238,' + (links[l][2] ? .04 + d * .06 : .05 + d * .26).toFixed(3) + ')';
      ctxM.beginPath(); ctxM.moveTo(A.x, A.y); ctxM.lineTo(B.x, B.y); ctxM.stroke();
    }
    // nodes
    for (var n = 0; n < N; n++) {
      var q = proj[n], a = Math.min(1, .18 + q.d * .82 + pts[n].pop * .5), rad = (.5 + q.d * 1.5) * pts[n].s * (1 + pts[n].pop * 1.4);
      ctxM.fillStyle = 'rgba(244,246,250,' + a.toFixed(3) + ')';
      ctxM.beginPath(); ctxM.arc(q.x, q.y, rad, 0, 6.2832); ctxM.fill();
      if (q.d > .72) { ctxG.fillStyle = 'rgba(255,255,255,' + ((q.d - .72) * 1.6).toFixed(3) + ')'; ctxG.beginPath(); ctxG.arc(q.x, q.y, rad * 2.2, 0, 6.2832); ctxG.fill(); }
    }
    // signals (COET amber), drawn on both canvases so they glow
    if (!reduce) {
      if (pulses.length < 14 && Math.random() < dt * 9) spawn();
      pulses = pulses.filter(function (u) {
        u.t += dt * u.v;
        if (u.t >= 1) { var e = proj[u.b]; if (e && e.d > .35 && (u.hop || Math.random() < .55)) burst(u.b, u.hop ? 3 : 5, true); return false; }
        return true;
      });
      // sparks: drift, a touch of gravity, fade, then dropped
      sparks = sparks.filter(function (k) { k.life += dt; k.vy += 140 * dt; k.vx *= 1 - dt * 1.5; k.x += k.vx * dt; k.y += k.vy * dt; return k.life < k.max; });
      sparks.forEach(function (k) {
        var a = 1 - k.life / k.max, col = k.amber ? '245,158,11' : '244,246,250';
        ctxM.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')'; ctxM.beginPath(); ctxM.arc(k.x, k.y, k.r * (0.6 + a * .6), 0, 6.2832); ctxM.fill();
        ctxG.fillStyle = 'rgba(' + col + ',' + (a * .8).toFixed(3) + ')'; ctxG.beginPath(); ctxG.arc(k.x, k.y, k.r * 2.4, 0, 6.2832); ctxG.fill();
      });
    }
    pulses.forEach(function (u) {
      var A = proj[u.a], B = proj[u.b], t = u.t, x = A.x + (B.x - A.x) * t, y = A.y + (B.y - A.y) * t;
      var t0 = Math.max(0, t - .18), x0 = A.x + (B.x - A.x) * t0, y0 = A.y + (B.y - A.y) * t0;
      var a = Math.sin(t * Math.PI) * (.35 + ((A.d + B.d) / 2) * .65);
      [ctxM, ctxG].forEach(function (c, gi) {
        c.strokeStyle = 'rgba(245,158,11,' + (a * (gi ? 1 : .9)).toFixed(3) + ')'; c.lineWidth = gi ? 4 : 1.6;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x, y); c.stroke();
      });
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
  if (reduce) { for (var w = 0; w < 6; w++) spawn(); pulses.forEach(function (u) { u.t = .5; }); frame(0); }
  else {
    raf = requestAnimationFrame(loop);
    var wake = function () { if (live && !raf && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { live = es[0].isIntersecting; wake(); }).observe(host);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); });
  }
  if ('ResizeObserver' in window) new ResizeObserver(function () { setup(); if (reduce) frame(0); }).observe(host);
})();
