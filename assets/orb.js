/* COET — the globe, in real 3D (three.js): a knowledge-graph sphere. Balls of different sizes sit in clusters
   through a round volume; the more links a ball has, the bigger it is. Thin lines join each ball to its nearest
   neighbours and to its cluster's hub, and a few long lines cross between clusters. Each cluster has its own shade
   of COET's amber. Every ball floats around its place, so the lines stretch and the graph stays alive; the whole
   thing turns slowly and leans toward the pointer, and a click makes it breathe out and settle.
   three.js is loaded only on the page that has the globe. It pauses off screen and in hidden tabs; under reduced
   motion it draws one still frame. Without WebGL the stage is simply black. */
(function () {
  'use strict';
  var host = document.querySelector('[data-orb]');
  if (!host) return;
  var canvas = host.querySelector('.orb__main'), spare = host.querySelector('.orb__glow');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var small = innerWidth < 700;
  var OPACITY = .85;                                    // how strongly the globe shows against the black stage
  var src = new URL('vendor/three-0.160.0.module.min.js', document.currentScript.src).href;

  import(src).then(function (THREE) {
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { return; }
    if (spare) spare.style.display = 'none';
    canvas.style.opacity = OPACITY;
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene(), FOV = 32, camera = new THREE.PerspectiveCamera(FOV, 1, .1, 50);
    scene.fog = new THREE.Fog(0x000000, 4, 9);
    scene.add(new THREE.HemisphereLight(0xfff0d0, 0x140a00, 1.3));
    var key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-2.5, 3, 4); scene.add(key);

    // ── build the graph ──
    var rnd = Math.random, TAU = Math.PI * 2;
    var SHADES = [0xf59e0b, 0xfcd34d, 0xfb923c, 0xfde9b0, 0xf97316, 0xfacc15, 0xffb454];   // one per cluster, all in the amber family
    var CLUSTERS = small ? 5 : 7, PER = small ? 26 : 44;
    function unit() { var u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u); return [Math.cos(a) * r, u, Math.sin(a) * r]; }
    var nodes = [], links = [], seen = {};
    function link(a, b) { if (a === b) return; var k = a < b ? a + ':' + b : b + ':' + a; if (seen[k]) return; seen[k] = 1; links.push([a, b]); nodes[a].deg++; nodes[b].deg++; }
    var centres = [];
    for (var c = 0; c < CLUSTERS; c++) {                 // cluster centres spread through the ball
      var best = null, bd = -1;
      for (var t = 0; t < 14; t++) { var u0 = unit(), r0 = .3 + rnd() * .45, p0 = [u0[0] * r0, u0[1] * r0, u0[2] * r0], near = 9; centres.forEach(function (q) { var dx = q[0] - p0[0], dy = q[1] - p0[1], dz = q[2] - p0[2]; near = Math.min(near, dx * dx + dy * dy + dz * dz); }); if (near > bd) { bd = near; best = p0; } }
      centres.push(best);
    }
    centres.forEach(function (ctr, c) {
      for (var i = 0; i < PER; i++) {
        var u = unit(), d = i === 0 ? 0 : .12 + Math.pow(rnd(), .7) * .5;   // the first ball of a cluster is its hub, at the centre
        var x = ctr[0] + u[0] * d, y = ctr[1] + u[1] * d, z = ctr[2] + u[2] * d, len = Math.sqrt(x * x + y * y + z * z);
        if (len > 1.05) { x *= 1.05 / len; y *= 1.05 / len; z *= 1.05 / len; }   // keep it a ball
        nodes.push({ x: x, y: y, z: z, c: c, hub: i === 0, deg: 0,
          ax: .02 + rnd() * .05, ay: .02 + rnd() * .05, az: .02 + rnd() * .05, fx: .15 + rnd() * .35, fy: .15 + rnd() * .35, fz: .15 + rnd() * .35, px: rnd() * TAU, py: rnd() * TAU, pz: rnd() * TAU });
      }
    });
    var N = nodes.length;
    for (var a = 0; a < N; a++) {                        // each ball: its two nearest in the cluster, and often its hub
      var A = nodes[a], near2 = [];
      for (var b = 0; b < N; b++) { if (b === a || nodes[b].c !== A.c) continue; var B = nodes[b], dx = A.x - B.x, dy = A.y - B.y, dz = A.z - B.z; near2.push([dx * dx + dy * dy + dz * dz, b]); }
      near2.sort(function (p, q) { return p[0] - q[0]; });
      link(a, near2[0][1]); link(a, near2[1][1]);
      if (!A.hub && rnd() < .45) link(a, A.c * PER);
    }
    for (var x2 = 0; x2 < (small ? 26 : 60); x2++) {     // long lines between clusters
      var p = Math.floor(rnd() * N), q = Math.floor(rnd() * N);
      if (nodes[p].c !== nodes[q].c) link(rnd() < .5 ? nodes[p].c * PER : p, q);
    }

    // ── balls ──
    var geo = new THREE.SphereGeometry(1, 16, 12);
    var mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .35, metalness: .1, emissive: 0xffffff, emissiveIntensity: 0 });
    var mesh = new THREE.InstancedMesh(geo, mat, N);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    var col = new THREE.Color();
    nodes.forEach(function (n, i) {
      n.s = (.011 + Math.sqrt(n.deg) * .007) * (n.hub ? 1.25 : 1) * (small ? 1.15 : 1);   // more links, bigger ball
      mesh.setColorAt(i, col.setHex(SHADES[n.c % SHADES.length]));
    });
    mesh.instanceColor.needsUpdate = true;

    // ── lines ──
    var L = links.length, lpos = new Float32Array(L * 6), lcol = new Float32Array(L * 6);
    links.forEach(function (l, i) {
      var ca = col.setHex(SHADES[nodes[l[0]].c % SHADES.length]).clone(), cb = col.setHex(SHADES[nodes[l[1]].c % SHADES.length]);
      lcol.set([ca.r, ca.g, ca.b, cb.r, cb.g, cb.b], i * 6);
    });
    var lgeo = new THREE.BufferGeometry();
    lgeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3).setUsage(THREE.DynamicDrawUsage));
    lgeo.setAttribute('color', new THREE.BufferAttribute(lcol, 3));
    var lines = new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .34, depthWrite: false }));
    lines.frustumCulled = false;

    var globe = new THREE.Group(); globe.add(lines); globe.add(mesh); scene.add(globe);

    // ── size ──
    var W = 0, H = 0;
    function setup() {
      var b = host.getBoundingClientRect(); W = b.width; H = b.height;
      if (!W || !H) return;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      var half = H / ((small ? 1.02 : .86) * Math.min(W, H)), d = half / Math.tan(FOV * Math.PI / 360);   // globe ≈ 43% of the shorter side
      camera.position.set(0, 0, d); camera.updateProjectionMatrix();
      scene.fog.near = d - 1; scene.fog.far = d + 2.6;
    }

    // ── pointer ──
    var aimX = 0, aimY = 0, leanX = 0, leanY = 0, clock = 0, spin = 0, last = 0, kick = 0, kv = 0;
    if (fine) addEventListener('pointermove', function (e) { aimX = e.clientX / innerWidth - .5; aimY = e.clientY / innerHeight - .5; });
    var stage = host.closest('[data-ws-root]') || host.parentNode;
    stage.addEventListener('pointerdown', function (e) { if (!reduce && !e.target.closest('a, button')) kv += 1.6; });   // breathe out

    var arr = mesh.instanceMatrix.array, cur = new Float32Array(N * 3);
    function frame(dt) {
      clock += dt; spin += dt * .07;
      leanX += (aimX - leanX) * Math.min(1, dt * 2.5); leanY += (aimY - leanY) * Math.min(1, dt * 2.5);
      kv += (-kick * 30 - kv * 5) * dt; kick += kv * dt;
      globe.rotation.set(-.14 + leanY * .5, spin + leanX * .8, 0);
      var grow = 1 + kick * .12;
      for (var i = 0, o = 0, k = 0; i < N; i++, o += 16, k += 3) {
        var n = nodes[i];
        var x = (n.x + Math.sin(clock * n.fx + n.px) * n.ax) * grow, y = (n.y + Math.sin(clock * n.fy + n.py) * n.ay) * grow, z = (n.z + Math.sin(clock * n.fz + n.pz) * n.az) * grow;
        cur[k] = x; cur[k + 1] = y; cur[k + 2] = z;
        arr[o] = n.s; arr[o + 1] = 0; arr[o + 2] = 0; arr[o + 3] = 0;
        arr[o + 4] = 0; arr[o + 5] = n.s; arr[o + 6] = 0; arr[o + 7] = 0;
        arr[o + 8] = 0; arr[o + 9] = 0; arr[o + 10] = n.s; arr[o + 11] = 0;
        arr[o + 12] = x; arr[o + 13] = y; arr[o + 14] = z; arr[o + 15] = 1;
      }
      for (var j = 0, m = 0; j < L; j++, m += 6) {
        var p = links[j][0] * 3, q = links[j][1] * 3;
        lpos[m] = cur[p]; lpos[m + 1] = cur[p + 1]; lpos[m + 2] = cur[p + 2]; lpos[m + 3] = cur[q]; lpos[m + 4] = cur[q + 1]; lpos[m + 5] = cur[q + 2];
      }
      mesh.instanceMatrix.needsUpdate = true; lgeo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    }

    var raf = 0, live = true;
    function loop(now) {
      raf = 0;
      if (!live) return;
      var dt = Math.min((now - (last || now)) / 1000, .25);              // clamped delta time
      last = now; frame(dt); raf = requestAnimationFrame(loop);
    }
    setup();
    if (reduce) frame(0);
    else {
      raf = requestAnimationFrame(loop);
      var wake = function () { if (live && !raf && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } };
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { live = es[0].isIntersecting; wake(); }).observe(host);
      document.addEventListener('visibilitychange', function () { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); });
    }
    if ('ResizeObserver' in window) new ResizeObserver(function () { setup(); if (reduce || !raf) frame(0); }).observe(host);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; });
    canvas.addEventListener('webglcontextrestored', function () { setup(); if (!reduce) { last = 0; raf = requestAnimationFrame(loop); } else frame(0); });
  }).catch(function () {});
})();
