/* COET — sound. Synthesised in Web Audio, no files. Off until the visitor turns it on (remembered on this device).
   The palette is physical, not musical: haptic ticks for hovers, a soft damped "thock" for selections, a little
   air for arrivals, and a scroll-speed air rush. No notes, chords or melodies, ever. Everything runs through one
   short room and a gentle limiter so nothing pokes out. */
(function () {
  'use strict';
  var KEY = 'coet:sound', ctx = null, out = null, wet = null, noise = null, rush = null, on = false, last = {};

  function pref() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function save(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }

  function build() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    var limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -16; limiter.knee.value = 8; limiter.ratio.value = 4; limiter.attack.value = .003; limiter.release.value = .18;
    out = ctx.createGain(); out.gain.value = .9; out.connect(limiter); limiter.connect(ctx.destination);
    // a short, dark room: decaying stereo noise, softened
    var len = Math.floor(ctx.sampleRate * 1.4), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c), lp = 0; for (var i = 0; i < len; i++) { lp += (Math.random() * 2 - 1 - lp) * .22; d[i] = lp * Math.pow(1 - i / len, 3.2); } }
    var verb = ctx.createConvolver(); verb.buffer = ir;
    wet = ctx.createGain(); wet.gain.value = .5; wet.connect(verb); verb.connect(out);
    var nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
    for (var k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;
    noise = nb;
    // the scroll rush: one looping noise bed whose level and brightness follow scroll speed
    var src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    var bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 300; bp.Q.value = .4;
    var g = ctx.createGain(); g.gain.value = 0;
    src.connect(bp); bp.connect(g); g.connect(out); src.start();
    rush = { f: bp, g: g };
    return true;
  }

  function pan(x) { var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) { p.pan.value = Math.max(-.6, Math.min(.6, x || 0)); p.connect(out); return p; } return out; }
  function env(g, t, peak, attack, decay) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + attack + decay); }
  function burst(t, dest, type, freq, q, peak, attack, decay, sweepTo) {
    var s = ctx.createBufferSource(); s.buffer = noise;
    var f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + attack + decay);
    var g = ctx.createGain(); env(g, t, peak, attack, decay);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 1.5); s.stop(t + attack + decay + .05);
    return g;
  }
  function body(t, dest, from, to, peak, decay) {   // a damped body knock: a falling sine, gone before it can read as a pitch
    var o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + decay * .7);
    var g = ctx.createGain(); env(g, t, peak, .002, decay);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + decay + .05);
    return g;
  }
  function gate(name, ms) { var now = performance.now(); if (last[name] && now - last[name] < ms) return false; last[name] = now; return true; }
  function ready() { if (!on || !ctx) return false; if (ctx.state === 'suspended') ctx.resume(); return true; }

  var api = {
    get on() { return on; },
    /** a hover: a 9 ms haptic tick, panned to where the pointer is */
    tick: function (x) {
      if (!ready() || !gate('tick', 45)) return;
      var t = ctx.currentTime + .005;
      burst(t, pan(x), 'bandpass', 3600 + Math.random() * 500, 1.4, .05, .001, .012);
    },
    /** choosing something: a soft thock with a breath of air and a little room */
    select: function (x) {
      if (!ready() || !gate('select', 90)) return;
      var t = ctx.currentTime + .005, p = pan(x);
      body(t, p, 150, 64, .26, .16).connect(wet);
      burst(t, p, 'bandpass', 1500, .9, .07, .001, .03);
      burst(t + .01, p, 'bandpass', 900, .7, .022, .03, .28, 3200).connect(wet);
    },
    /** a primary action: a deeper press with a soft sub bloom */
    press: function (x) {
      if (!ready() || !gate('press', 150)) return;
      var t = ctx.currentTime + .005, p = pan(x);
      body(t, p, 110, 46, .3, .32).connect(wet);
      burst(t, p, 'bandpass', 1100, .8, .06, .001, .04);
      burst(t + .02, p, 'lowpass', 600, .5, .03, .06, .45, 2400).connect(wet);
    },
    /** a section settling into view: one quiet breath */
    arrive: function () {
      if (!ready() || !gate('arrive', 900)) return;
      var t = ctx.currentTime + .01;
      burst(t, out, 'bandpass', 420, .6, .03, .22, .55, 2000).connect(wet);
    },
    /** scroll speed in px/frame drives the air rush */
    rush: function (v) {
      if (!on || !ctx || !rush) return;
      var s = Math.min(1, Math.abs(v) / 60), t = ctx.currentTime;
      rush.g.gain.setTargetAtTime(s * s * .05, t, s > 0 ? .06 : .25);
      rush.f.frequency.setTargetAtTime(260 + s * 1500, t, .1);
    },
    set: function (v) {
      if (v && !ctx && !build()) return false;
      on = !!v; save(on);
      if (on) {
        if (ctx.state === 'suspended') ctx.resume();
        var t = ctx.currentTime + .02;                    // switching on: a sub bloom and an air swell, no tone
        body(t, out, 70, 40, .22, .5).connect(wet);
        burst(t, out, 'lowpass', 300, .5, .035, .15, .7, 2600).connect(wet);
      } else if (rush) { rush.g.gain.setTargetAtTime(0, ctx.currentTime, .05); }
      return on;
    },
    wanted: pref,
  };
  window.COETSound = api;
})();
