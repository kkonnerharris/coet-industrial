/* COET — the globe, in real 3D (three.js): a loose globe made of many lit amber balls. Every ball is a shaded
   sphere on its own orbit around the centre, each in a different plane and at a different speed, so the balls keep
   moving around the globe while it holds its shape. The whole globe turns slowly and leans toward the pointer; a
   click or tap makes it breathe out and settle. It is drawn at reduced opacity so the headline stays the subject.
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
  var OPACITY = .7;                                     // how strongly the globe shows against the black stage
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
    // light: a soft sky, a key light from the upper left, and a warm glow from the core
    scene.add(new THREE.HemisphereLight(0xfff0d0, 0x140a00, 1.2));
    var key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-2.5, 3, 4); scene.add(key);
    var core = new THREE.PointLight(0xffa726, 14, 6, 1.6); scene.add(core);

    // ── the balls: one instanced mesh ──
    var N = small ? 900 : 2200, rnd = Math.random, TAU = Math.PI * 2;
    var geo = new THREE.SphereGeometry(1, 10, 8);
    var mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .32, metalness: .15, emissive: 0x9a4e00, emissiveIntensity: .8 });
    var mesh = new THREE.InstancedMesh(geo, mat, N);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    var globe = new THREE.Group(); globe.add(mesh); scene.add(globe);

    // ── labelled balls: a few balls carry a label and do something when pressed. Each drifts across the front of
    //    the globe (never behind it) and has a real button that follows it. Add an entry here for each new one. ──
    var LABELS = [
      { key: 'voice', text: 'Talk to COET', sub: 'AI voice assistant', phase: 0,
        press: function () { if (window.COETVoice) window.COETVoice.toggle(); },
        bind: function (show) { if (window.COETVoice) window.COETVoice.onState(show); } }
    ];
    var VOICE_TEXT = { idle: ['Talk to COET', ''], connecting: ['Connecting', ''], listening: ['Listening', 'say stop'], speaking: ['Speaking', 'say stop'], blocked: ['Mic blocked', ''], failed: ['No connection', ''] };
    var BALL_PX = 34;                                   // the labelled ball's radius on screen: big enough to hold its small label
    var stageEl = host.parentNode, lgeo = new THREE.SphereGeometry(1, 24, 18), tmp = new THREE.Vector3();
    LABELS.forEach(function (l) {
      l.mesh = new THREE.Mesh(lgeo, new THREE.MeshStandardMaterial({ color: 0xfff2d6, roughness: .3, emissive: 0xffc46b, emissiveIntensity: 1.5 }));
      scene.add(l.mesh);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'orb-node'; b.dataset.state = 'idle';
      var ring = document.createElement('span'); ring.className = 'orb-node__ring';
      var text = document.createElement('span'); text.className = 'orb-node__text';
      var main = document.createElement('span'), sub = document.createElement('span'); sub.className = 'orb-node__sub';
      main.textContent = l.text; b.title = l.sub;
      text.appendChild(main); text.appendChild(sub); b.appendChild(ring); b.appendChild(text);
      b.addEventListener('click', function () { l.press(); });
      b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });          // a press on the label is not a press on the globe
      stageEl.appendChild(b); l.el = b;
      if (l.bind) l.bind(function (st) {
        var t = VOICE_TEXT[st] || VOICE_TEXT.idle; b.dataset.state = st; main.textContent = t[0]; sub.textContent = t[1];
        b.setAttribute('aria-label', st === 'idle' ? 'Talk to COET: start a voice conversation with an AI assistant (uses your microphone)' : st === 'listening' || st === 'speaking' || st === 'connecting' ? 'End the voice conversation' : t[0]);
        l.live = st === 'listening' || st === 'speaking';
      });
    });

    var balls = [], tint = new THREE.Color(), amber = new THREE.Color(0xf59e0b), pale = new THREE.Color(0xffd08a), deep = new THREE.Color(0xd97706);
    function unit() { var u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - u * u); return new THREE.Vector3(Math.cos(a) * r, u, Math.sin(a) * r); }
    for (var i = 0; i < N; i++) {
      // a thick, uneven shell: most balls near the surface, some inside, a few far out
      var k = rnd(), rad = k < .78 ? .9 + rnd() * .22 : k < .92 ? .5 + rnd() * .38 : 1.14 + rnd() * .34;
      var u = unit(), axis = unit(), v = new THREE.Vector3().crossVectors(axis, u);
      if (v.lengthSq() < 1e-4) v.set(u.y, -u.x, 0);
      v.normalize();                                     // u and v span this ball's orbit plane
      var big = rnd();
      balls.push({
        ux: u.x, uy: u.y, uz: u.z, vx: v.x, vy: v.y, vz: v.z, r: rad,
        w: (rnd() < .5 ? -1 : 1) * (.06 + rnd() * .3) / rad,              // orbit speed (rad/s); outer balls travel slower
        th: rnd() * TAU, bob: .02 + rnd() * .07, bf: .2 + rnd() * .5, bp: rnd() * TAU,
        s: (big < .05 ? .016 + rnd() * .007 : big < .3 ? .009 + rnd() * .004 : .0045 + rnd() * .003)   // small, like nodes in a neural network
      });
      tint.copy(amber).lerp(rnd() < .5 ? pale : deep, rnd() * .6);
      mesh.setColorAt(i, tint);
    }
    mesh.instanceColor.needsUpdate = true;

    // ── size ──
    var W = 0, H = 0;
    function setup() {
      var b = host.getBoundingClientRect(); W = b.width; H = b.height;
      if (!W || !H) return;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      // keep the globe (radius 1) at about 42% of the shorter side, half on phones
      var half = H / ((small ? 1 : .84) * Math.min(W, H)), d = half / Math.tan(FOV * Math.PI / 360);
      camera.position.set(0, 0, d); camera.updateProjectionMatrix();
      scene.fog.near = d - 1.1; scene.fog.far = d + 2.4;
    }

    // ── pointer ──
    var aimX = 0, aimY = 0, leanX = 0, leanY = 0, clock = 0, spin = 0, last = 0, kick = 0, kv = 0;
    if (fine) addEventListener('pointermove', function (e) { aimX = e.clientX / innerWidth - .5; aimY = e.clientY / innerHeight - .5; });
    var stage = host.closest('[data-ws-root]') || host.parentNode;
    stage.addEventListener('pointerdown', function (e) { if (!reduce && !e.target.closest('a, button')) kv += 1.6; });   // breathe out

    var arr = mesh.instanceMatrix.array;
    function frame(dt) {
      clock += dt; spin += dt * .05;
      leanX += (aimX - leanX) * Math.min(1, dt * 2.5); leanY += (aimY - leanY) * Math.min(1, dt * 2.5);
      kv += (-kick * 30 - kv * 5) * dt; kick += kv * dt;                 // a soft spring for the click
      globe.rotation.set(-.16 + leanY * .5, spin + leanX * .8, 0);
      var grow = 1 + kick * .12;
      for (var i = 0, o = 0; i < N; i++, o += 16) {
        var b = balls[i], a = b.th + clock * b.w, c = Math.cos(a), s = Math.sin(a);
        var r = b.r * (1 + Math.sin(clock * b.bf + b.bp) * b.bob) * grow;
        arr[o] = b.s; arr[o + 1] = 0; arr[o + 2] = 0; arr[o + 3] = 0;
        arr[o + 4] = 0; arr[o + 5] = b.s; arr[o + 6] = 0; arr[o + 7] = 0;
        arr[o + 8] = 0; arr[o + 9] = 0; arr[o + 10] = b.s; arr[o + 11] = 0;
        arr[o + 12] = (b.ux * c + b.vx * s) * r; arr[o + 13] = (b.uy * c + b.vy * s) * r; arr[o + 14] = (b.uz * c + b.vz * s) * r; arr[o + 15] = 1;
      }
      mesh.instanceMatrix.needsUpdate = true;
      for (var j = 0; j < LABELS.length; j++) {            // labelled balls wander over the upper front of the globe
        var l = LABELS[j], t = clock * .11 + l.phase;
        var lx = Math.sin(t) * .6 - .14, ly = .34 + Math.sin(t * 1.31 + 1) * .3, lz = Math.sqrt(Math.max(.05, 1.25 - lx * lx - ly * ly));
        l.mesh.position.set(lx * grow, ly * grow, lz * grow);
        tmp.copy(l.mesh.position).project(camera); var sx0 = tmp.x, sy0 = tmp.y;
        tmp.copy(l.mesh.position); tmp.x += 1; tmp.project(camera);
        var perUnit = Math.max(1, (tmp.x - sx0) * .5 * W);                 // screen pixels per world unit at the ball's depth
        l.mesh.scale.setScalar(BALL_PX / perUnit * (l.live ? 1.06 + Math.sin(clock * 5) * .05 : 1));
        tmp.x = sx0; tmp.y = sy0;
        l.el.style.transform = 'translate3d(' + ((tmp.x * .5 + .5) * W).toFixed(1) + 'px,' + ((-tmp.y * .5 + .5) * H).toFixed(1) + 'px,0)';
      }
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
