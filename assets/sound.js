/* COET — sound: soft and techy. Synthesised in Web Audio, no files. Off until the visitor turns it on
   (remembered on this device). The palette is a good mechanical keyboard and a quiet machine: keycap taps for
   hovers, a full key clack for choices, a spacebar thock for big actions, scroll-wheel detents for scrolling,
   a glassy swish when the stage changes, and a little boot-up when sound is switched on. Nothing hums, nothing
   is a musical note, and a gentle low-pass keeps every edge soft. */
(function () {
  'use strict';
  var KEY = 'coet:sound', ctx = null, out = null, room = null, noise = null, on = false, last = {}, travel = 0;

  function pref() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function save(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }

  function build() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    var soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 7000; soft.Q.value = .5;   // the soft edge
    var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -18; lim.knee.value = 10; lim.ratio.value = 4; lim.attack.value = .003; lim.release.value = .15;
    out = ctx.createGain(); out.gain.value = .7;
    out.connect(soft); soft.connect(lim); lim.connect(ctx.destination);
    // a desk, not a hall: a very short, warm early reflection
    var len = Math.floor(ctx.sampleRate * .22), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c), lp = 0; for (var i = 0; i < len; i++) { lp += (Math.random() * 2 - 1 - lp) * .35; d[i] = lp * Math.pow(1 - i / len, 4); } }
    var conv = ctx.createConvolver(); conv.buffer = ir;
    room = ctx.createGain(); room.gain.value = .45; room.connect(conv); conv.connect(out);
    var nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
    for (var k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;
    noise = nb;
    return true;
  }

  function pan(x) { if (!ctx.createStereoPanner) return out; var p = ctx.createStereoPanner(); p.pan.value = Math.max(-.6, Math.min(.6, x || 0)); p.connect(out); return p; }
  function env(g, t, peak, a, d) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
  function click(t, dest, f, q, peak, d, type) {        // a filtered noise transient
    var s = ctx.createBufferSource(); s.buffer = noise;
    var fl = ctx.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.value = f; fl.Q.value = q;
    var g = ctx.createGain(); env(g, t, peak, .0008, d);
    s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random() * 1.6); s.stop(t + d + .05);
    return g;
  }
  function body(t, dest, f, peak, d) {                  // the keycap's plastic body: a very short, damped knock
    var o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + d * .5);
    var g = ctx.createGain(); env(g, t, peak, .001, d); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + .05);
    return g;
  }
  function swish(t, dest, from, to, peak, d) {          // air through a narrow filter: glassy, data-like, not a tone
    var s = ctx.createBufferSource(); s.buffer = noise;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 4;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + d);
    var g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + d * .4); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + d + .05);
    return g;
  }
  var vary = function (v, amt) { return v * (1 - amt + Math.random() * amt * 2); };
  function gate(n, ms) { var now = performance.now(); if (last[n] && now - last[n] < ms) return false; last[n] = now; return true; }
  function ready() { if (!on || !ctx) return false; if (ctx.state === 'suspended') ctx.resume(); return true; }

  function key(t, dest, weight) {                      // one keystroke: bottom-out, then the spring and cap returning
    var w = weight || 1;
    click(t, dest, vary(2400 / w, .12), 1.1, .07 * w, .014);
    body(t, dest, vary(260 / w, .08), .06 * w, .03).connect(room);
    click(t + vary(.038 * w, .15), dest, vary(3600 / w, .1), 1.6, .028 * w, .01);
  }

  var api = {
    get on() { return on; },
    /** hover: a light keycap tap, never quite the same twice */
    tick: function (x) {
      if (!ready() || !gate('tick', 45)) return;
      var t = ctx.currentTime + .004, p = pan(x);
      click(t, p, vary(3000, .2), 1.3, .035, .01);
      body(t, p, vary(320, .1), .025, .02);
    },
    /** choosing: a full key clack */
    select: function (x) {
      if (!ready() || !gate('select', 70)) return;
      key(ctx.currentTime + .004, pan(x), 1);
    },
    /** a big action: a spacebar thock, deeper and wider */
    press: function (x) {
      if (!ready() || !gate('press', 120)) return;
      var t = ctx.currentTime + .004, p = pan(x);
      key(t, p, 1.6);
      click(t + .002, p, 900, .7, .04, .03).connect(room);
    },
    /** the stage changing or a section arriving: a soft glassy swish with a tiny confirming tick */
    arrive: function () {
      if (!ready() || !gate('arrive', 500)) return;
      var t = ctx.currentTime + .01;
      swish(t, out, 2600, 7200, .018, .22).connect(room);
      click(t + .2, out, 5200, 2, .012, .008);
    },
    /** scrolling: scroll-wheel detents, one soft tick for every notch of distance travelled */
    rush: function (v) {
      if (!on || !ctx || !v) return;
      travel += Math.abs(v);
      if (travel < 110) return;
      travel = 0;
      if (!gate('detent', 55)) return;
      var t = ctx.currentTime + .002;
      click(t, out, vary(4200, .1), 2.4, .016, .006);
      body(t, out, vary(520, .05), .008, .012);
    },
    set: function (v) {
      if (v && !ctx && !build()) return false;
      on = !!v; save(on);
      if (on) {
        if (ctx.state === 'suspended') ctx.resume();
        // boot: a quick burst of soft keystrokes, slowing like someone finishing a word, then a warm breath of air
        var t = ctx.currentTime + .03, gaps = [0, .07, .12, .16, .23, .34];
        gaps.forEach(function (g, i) { key(t + g, pan(-.4 + i * .16), .7 + (i === gaps.length - 1 ? .5 : 0)); });
        swish(t + .38, out, 500, 2600, .03, .7).connect(room);
      }
      return on;
    },
    wanted: pref,
  };
  window.COETSound = api;
})();
