/* COET — the network: a loose, sprawling web of dots in COET amber, in the spirit of a notes-app graph view.
   Clusters (a hub with its leaves) are joined by a few long links; hubs are bigger because more links meet there.
   Signals drive across it like traffic, link after link, and unlinked strays drift free between the clusters.
   Every dot floats a little, so the links stretch and the whole thing stays alive. The dot under the pointer and
   its neighbours light up. Canvas, with a second blurred canvas on top for the glow. It pauses off screen and in
   hidden tabs; under reduced motion it draws one still frame. */
(function () {
  'use strict';
  var host = document.querySelector('[data-orb]');
  if (!host) return;
  var main = host.querySelector('.orb__main'), glow = host.querySelector('.orb__glow');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var small = innerWidth < 700;
  var rnd = Math.random, TAU = Math.PI * 2;

  // ── build the graph in a −1…1 square (stretched to the stage when drawn) ──
  var pts = [], links = [], adj = [];
  function node(x, y, hub) { pts.push({ x: x, y: y, z: rnd() * 2 - 1, hub: hub || 0, ph: rnd() * TAU, ph2: rnd() * TAU, sp: .25 + rnd() * .5, ox: 0, oy: 0, vx: 0, vy: 0, pop: 0, lit: 0 }); adj.push([]); return pts.length - 1; }
  function link(a, b, len) { if (a === b || adj[a].indexOf(b) > -1) return; links.push([a, b, len]); adj[a].push(b); adj[b].push(a); }

  var HUBS = small ? 6 : 12, hubs = [];
  for (var h = 0; h < HUBS; h++) {                         // spread the hubs out: best of a few random candidates
    var best = null, bd = -1;
    for (var c = 0; c < 14; c++) {
      var cx0 = (rnd() * 2 - 1) * .9, cy0 = (rnd() * 2 - 1) * .86, near = 9;
      hubs.forEach(function (k) { var dx = pts[k].x - cx0, dy = pts[k].y - cy0; near = Math.min(near, dx * dx + dy * dy); });
      if (near > bd) { bd = near; best = [cx0, cy0]; }
    }
    hubs.push(node(best[0], best[1], 1));
  }
  hubs.forEach(function (hb) {                             // leaves, and a few twigs off the leaves
    var n = 4 + Math.floor(rnd() * (small ? 6 : 10));
    for (var i = 0; i < n; i++) {
      var a = rnd() * TAU, d = .07 + rnd() * .2, lf = node(pts[hb].x + Math.cos(a) * d, pts[hb].y + Math.sin(a) * d);
      link(hb, lf, d);
      if (rnd() < .3) { var tw = 1 + Math.floor(rnd() * 3); for (var t = 0; t < tw; t++) { var a2 = a + (rnd() - .5) * 1.6, d2 = .05 + rnd() * .08; link(lf, node(pts[lf].x + Math.cos(a2) * d2, pts[lf].y + Math.sin(a2) * d2), d2); } }
    }
  });
  hubs.forEach(function (hb) {                             // long roads: each hub reaches its two nearest hubs through a waypoint
    var order = hubs.filter(function (o) { return o !== hb; }).map(function (o) { var dx = pts[o].x - pts[hb].x, dy = pts[o].y - pts[hb].y; return [dx * dx + dy * dy, o]; }).sort(function (u, v) { return u[0] - v[0]; });
    order.slice(0, 2).forEach(function (o) {
      var other = o[1], joined = adj[hb].some(function (m) { return adj[m].indexOf(other) > -1; });
      if (joined) return;
      var mid = node((pts[hb].x + pts[other].x) / 2 + (rnd() - .5) * .12, (pts[hb].y + pts[other].y) / 2 + (rnd() - .5) * .12), L = Math.sqrt(o[0]) / 2;
      link(hb, mid, L); link(mid, other, L);
    });
  });
  var N = pts.length;
  // let it relax like a force graph: dots push apart, links pull to their length, a faint pull to the middle
  for (var it = 0; it < 140; it++) {
    for (var a1 = 0; a1 < N; a1++) for (var b1 = a1 + 1; b1 < N; b1++) {
      var P = pts[a1], Q = pts[b1], dx = P.x - Q.x, dy = P.y - Q.y, d2 = dx * dx + dy * dy + 1e-4;
      if (d2 > .09) continue;
      var f = .00016 / d2, d = Math.sqrt(d2); dx = dx / d * f; dy = dy / d * f; P.x += dx; P.y += dy; Q.x -= dx; Q.y -= dy;
    }
    links.forEach(function (l) { var P = pts[l[0]], Q = pts[l[1]], dx = Q.x - P.x, dy = Q.y - P.y, d = Math.sqrt(dx * dx + dy * dy) || .001, k = (d - l[2]) / d * .08; P.x += dx * k; P.y += dy * k; Q.x -= dx * k; Q.y -= dy * k; });
    pts.forEach(function (p) { p.x *= .9992; p.y *= .9992; p.x = Math.max(-1.02, Math.min(1.02, p.x)); p.y = Math.max(-1.02, Math.min(1.02, p.y)); });
  }
  pts.forEach(function (p, i) { p.deg = adj[i].length; });

  // strays: unlinked dots that wander on their own
  var strays = [], SN = small ? 26 : 54;
  for (var s = 0; s < SN; s++) strays.push({ x: rnd() * 2 - 1, y: rnd() * 2 - 1, z: rnd() * 2 - 1, a: rnd() * TAU, sp: .008 + rnd() * .022, turn: (rnd() - .5) * .5, ph: rnd() * TAU, s: .6 + rnd() * 1.2 });

  // ── traffic ──
  var pulses = [];
  function dist(a, b) { var dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y; return Math.sqrt(dx * dx + dy * dy) || .01; }
  function car(a, b, sp, trips) { return { a: a, b: b, p: -1, t: 0, sp: sp, v: sp / dist(a, b), trips: trips }; }
  function spawn() { var a = Math.floor(rnd() * N), nb = adj[a]; if (nb.length) pulses.push(car(a, nb[Math.floor(rnd() * nb.length)], .16 + rnd() * .2, 6 + Math.floor(rnd() * 16))); }
  // at a junction keep heading roughly the same way, so a signal crosses the web instead of circling one cluster
  function onward(u) {
    var A = pts[u.a], B = pts[u.b], hx = B.x - A.x, hy = B.y - A.y, nb = adj[u.b], best = -1, bs = -1e9;
    for (var i = 0; i < nb.length; i++) {
      if (nb[i] === u.a) continue;
      var C = pts[nb[i]], sc = ((C.x - B.x) * hx + (C.y - B.y) * hy) / dist(u.b, nb[i]) + rnd() * .06 + (pts[nb[i]].deg > 1 ? .03 : 0);
      if (sc > bs) { bs = sc; best = nb[i]; }
    }
    if (best < 0 || --u.trips <= 0) return false;
    u.p = u.a; u.a = u.b; u.b = best; u.t -= 1; u.v = u.sp / dist(u.a, u.b);
    return true;
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
    ctxM.lineCap = ctxG.lineCap = 'round';
  }

  // ── pointer ──
  var mx = -1e4, my = -1e4, aimX = 0, aimY = 0, leanX = 0, leanY = 0, last = 0, clock = 0, hot = -1;
  if (fine) addEventListener('pointermove', function (e) {
    aimX = e.clientX / innerWidth - .5; aimY = e.clientY / innerHeight - .5;
    var b = host.getBoundingClientRect(); mx = e.clientX - b.left; my = e.clientY - b.top;
  });
  function nearest(x, y, max) { var best = -1, bd = max * max; for (var i = 0; i < N; i++) { var q = proj[i]; if (!q) continue; var d = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y); if (d < bd) { bd = d; best = i; } } return best; }
  // a click or tap on the stage: the nearest dot sparks and sends traffic out along every link it has
  var stage = host.closest('[data-ws-root]') || host.parentNode;
  stage.addEventListener('pointerdown', function (e) {
    if (reduce || e.target.closest('a, button')) return;
    var b = host.getBoundingClientRect(), n = nearest(e.clientX - b.left, e.clientY - b.top, 150);
    if (n >= 0) { burst(n, 14); adj[n].forEach(function (m) { pulses.push(car(n, m, .42, 14)); }); }
  });

  var proj = new Array(N);
  function frame(dt) {
    clock += dt;
    leanX += (aimX - leanX) * Math.min(1, dt * 2.5); leanY += (aimY - leanY) * Math.min(1, dt * 2.5);
    var sx = W * .5 * (W > H ? .98 : 1.25), sy = H * .5 * .94, ox = W / 2, oy = H / 2, float = small ? 5 : 8;
    for (var i = 0; i < N; i++) {
      var p = pts[i], dep = (p.z + 1) / 2, amp = float * (p.hub ? .5 : 1);
      var px = ox + p.x * sx + Math.sin(clock * p.sp + p.ph) * amp - leanX * (18 + dep * 46);       // float + depth parallax
      var py = oy + p.y * sy + Math.cos(clock * p.sp * .83 + p.ph2) * amp - leanY * (14 + dep * 36);
      if (!reduce) {                                         // the pointer nudges dots aside; a soft spring brings them home
        var dx = px + p.ox - mx, dy = py + p.oy - my, dd = dx * dx + dy * dy, RR = 120 * 120;
        if (dd < RR) { var f = (1 - dd / RR) * 1400 * dt, inv = 1 / Math.sqrt(dd + 1); p.vx += dx * inv * f; p.vy += dy * inv * f; }
        p.vx += (-p.ox * 26 - p.vx * 5) * dt; p.vy += (-p.oy * 26 - p.vy * 5) * dt;
        p.ox += p.vx * dt; p.oy += p.vy * dt; p.pop = Math.max(0, p.pop - dt * 2.5);
      }
      proj[i] = { x: px + p.ox, y: py + p.oy, d: dep };
    }
    // the dot under the pointer and its neighbours light up
    var now = fine && !reduce ? nearest(mx, my, 70) : -1;
    if (now !== hot) hot = now;
    for (var j = 0; j < N; j++) { var want = hot >= 0 && (j === hot || adj[hot].indexOf(j) > -1) ? 1 : 0; pts[j].lit += (want - pts[j].lit) * Math.min(1, dt * 8); }

    ctxM.clearRect(0, 0, W, H); ctxG.clearRect(0, 0, W, H);
    // links
    for (var l = 0; l < links.length; l++) {
      var A = proj[links[l][0]], B = proj[links[l][1]], d = (A.d + B.d) / 2, lit = Math.min(pts[links[l][0]].lit, pts[links[l][1]].lit);
      ctxM.lineWidth = .8 + lit * .7;
      ctxM.strokeStyle = 'rgba(245,158,11,' + (.13 + d * .27 + lit * .45).toFixed(3) + ')';
      ctxM.beginPath(); ctxM.moveTo(A.x, A.y); ctxM.lineTo(B.x, B.y); ctxM.stroke();
    }
    // strays
    for (var s = 0; s < strays.length; s++) {
      var st = strays[s], sd = (st.z + 1) / 2;
      if (!reduce) { st.a += Math.sin(clock * .3 + st.ph) * st.turn * dt; st.x += Math.cos(st.a) * st.sp * dt; st.y += Math.sin(st.a) * st.sp * dt; if (st.x > 1.08) st.x = -1.08; if (st.x < -1.08) st.x = 1.08; if (st.y > 1.08) st.y = -1.08; if (st.y < -1.08) st.y = 1.08; }
      var qx = ox + st.x * sx - leanX * (18 + sd * 46), qy = oy + st.y * sy - leanY * (14 + sd * 36), qr = (.6 + sd * 1.3) * st.s;
      ctxM.fillStyle = 'rgba(255,214,140,' + (.14 + sd * .5).toFixed(3) + ')'; ctxM.beginPath(); ctxM.arc(qx, qy, qr, 0, TAU); ctxM.fill();
    }
    // dots: more links, bigger dot
    for (var n = 0; n < N; n++) {
      var q = proj[n], p2 = pts[n], rad = (1.3 + Math.sqrt(p2.deg) * 1.05) * (.7 + q.d * .6) * (1 + p2.pop * 1.2 + p2.lit * .35);
      var al = Math.min(1, .45 + q.d * .45 + (p2.hub ? .2 : 0) + p2.lit * .5 + p2.pop * .4);
      ctxM.fillStyle = (p2.lit > .05 || p2.pop > .05 ? 'rgba(255,214,140,' : 'rgba(245,158,11,') + al.toFixed(3) + ')';
      ctxM.beginPath(); ctxM.arc(q.x, q.y, rad, 0, TAU); ctxM.fill();
      if (p2.hub || p2.lit > .05) { ctxG.fillStyle = 'rgba(245,158,11,' + (.35 + q.d * .35 + p2.lit * .3).toFixed(3) + ')'; ctxG.beginPath(); ctxG.arc(q.x, q.y, rad * 2.4, 0, TAU); ctxG.fill(); }
    }
    if (!reduce) {
      var wantCars = small ? 26 : 60;
      if (pulses.length < wantCars && rnd() < dt * 50) spawn();
      pulses = pulses.filter(function (u) { u.t += dt * u.v; while (u.t >= 1) { if (!onward(u)) return false; } return true; });
      sparks = sparks.filter(function (k) { k.life += dt; k.vy += 140 * dt; k.vx *= 1 - dt * 1.5; k.x += k.vx * dt; k.y += k.vy * dt; return k.life < k.max; });
      sparks.forEach(function (k) {
        var a = 1 - k.life / k.max;
        ctxM.fillStyle = 'rgba(255,214,140,' + a.toFixed(3) + ')'; ctxM.beginPath(); ctxM.arc(k.x, k.y, k.r * (.6 + a * .6), 0, TAU); ctxM.fill();
        ctxG.fillStyle = 'rgba(245,158,11,' + (a * .8).toFixed(3) + ')'; ctxG.beginPath(); ctxG.arc(k.x, k.y, k.r * 2.4, 0, TAU); ctxG.fill();
      });
    }
    // traffic: a bright head with a tail that bends back around the last corner
    var TAIL = .55;
    pulses.forEach(function (u) {
      var A = proj[u.a], B = proj[u.b], t = u.t, x = A.x + (B.x - A.x) * t, y = A.y + (B.y - A.y) * t;
      var a = .35 + ((A.d + B.d) / 2) * .65, t0 = t - TAIL;
      [ctxM, ctxG].forEach(function (c, gi) {
        c.strokeStyle = 'rgba(' + (gi ? '245,158,11' : '255,226,170') + ',' + (a * (gi ? .9 : .95)).toFixed(3) + ')'; c.lineWidth = gi ? 3.5 : 1.5;
        c.beginPath();
        if (t0 >= 0 || u.p < 0) { var s0 = Math.max(0, t0); c.moveTo(A.x + (B.x - A.x) * s0, A.y + (B.y - A.y) * s0); }
        else { var P = proj[u.p], s1 = 1 + t0; c.moveTo(P.x + (A.x - P.x) * s1, P.y + (A.y - P.y) * s1); c.lineTo(A.x, A.y); }
        c.lineTo(x, y); c.stroke();
      });
      ctxM.fillStyle = 'rgba(255,240,210,' + a.toFixed(3) + ')'; ctxM.beginPath(); ctxM.arc(x, y, 1.2 + a * .8, 0, TAU); ctxM.fill();
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
  if (reduce) { for (var w = 0; w < 30; w++) spawn(); pulses.forEach(function (u) { u.t = .5; }); frame(0); }
  else {
    raf = requestAnimationFrame(loop);
    var wake = function () { if (live && !raf && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { live = es[0].isIntersecting; wake(); }).observe(host);
    document.addEventListener('visibilitychange', function () { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); });
  }
  if ('ResizeObserver' in window) new ResizeObserver(function () { setup(); if (reduce) frame(0); }).observe(host);
})();
