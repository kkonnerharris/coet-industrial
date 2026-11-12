/* COET — sound, built from hardware. Synthesised in Web Audio, no files. Off until the visitor turns it on
   (remembered on this device). Every cue is a machine part, not an instrument: tactile switches, relays,
   solenoids, servos and a motor that follows scroll speed. Metal rings are short and inharmonic so nothing
   reads as a note. Everything runs through a small, dry room and a limiter. */
(function () {
  'use strict';
  var KEY = 'coet:sound', ctx = null, out = null, room = null, noise = null, motor = null, on = false, last = {};

  function pref() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function save(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }

  function build() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    var lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -14; lim.knee.value = 6; lim.ratio.value = 6; lim.attack.value = .002; lim.release.value = .12;
    out = ctx.createGain(); out.gain.value = .85; out.connect(lim); lim.connect(ctx.destination);
    // a small, hard room: an enclosure, not a hall
    var len = Math.floor(ctx.sampleRate * .45), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 5); }
    var conv = ctx.createConvolver(); conv.buffer = ir;
    room = ctx.createGain(); room.gain.value = .35; room.connect(conv); conv.connect(out);
    var nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
    for (var k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;
    noise = nb;
    // the motor: a saw and a little brush noise, filtered, its pitch and level following scroll speed
    var osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 48;
    var osc2 = ctx.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 96.7;
    var brush = ctx.createBufferSource(); brush.buffer = noise; brush.loop = true;
    var bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 2400; bf.Q.value = 1.2;
    var bg = ctx.createGain(); bg.gain.value = .25;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; lp.Q.value = 2;
    var o2g = ctx.createGain(); o2g.gain.value = .25;
    var g = ctx.createGain(); g.gain.value = 0;
    osc.connect(lp); osc2.connect(o2g); o2g.connect(lp); brush.connect(bf); bf.connect(bg); bg.connect(g); lp.connect(g); g.connect(out);
    osc.start(); osc2.start(); brush.start();
    motor = { o: osc, o2: osc2, f: lp, g: g };
    return true;
  }

  function pan(x) { if (!ctx.createStereoPanner) return out; var p = ctx.createStereoPanner(); p.pan.value = Math.max(-.7, Math.min(.7, x || 0)); p.connect(out); return p; }
  function env(g, t, peak, a, d) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
  function snap(t, dest, f, q, peak, d, type) {         // a filtered noise transient: contacts, latches, clicks
    var s = ctx.createBufferSource(); s.buffer = noise;
    var fl = ctx.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.value = f; fl.Q.value = q;
    var g = ctx.createGain(); env(g, t, peak, .0006, d);
    s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + d + .05);
    return g;
  }
  function ring(t, dest, freqs, peak, d) {             // a short inharmonic metal ring: plate, spring, housing
    freqs.forEach(function (f, i) {
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      var g = ctx.createGain(); env(g, t, peak / (i + 1), .0008, d * (1 - i * .18));
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + .05);
    });
  }
  function thunk(t, dest, from, to, peak, d) {         // a chassis knock: falling sine, gone before it's a pitch
    var o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + d * .6);
    var g = ctx.createGain(); env(g, t, peak, .001, d); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + .05);
    return g;
  }
  function whir(t, dest, from, to, peak, d) {          // a servo or drive spinning: a filtered saw sweep
    var o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + d);
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(from * 4, t); f.frequency.exponentialRampToValueAtTime(to * 4, t + d); f.Q.value = 3;
    var g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + d * .25); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + d + .05);
  }
  function gate(n, ms) { var now = performance.now(); if (last[n] && now - last[n] < ms) return false; last[n] = now; return true; }
  function ready() { if (!on || !ctx) return false; if (ctx.state === 'suspended') ctx.resume(); return true; }
  var jitter = function (f) { return f * (.94 + Math.random() * .12); };

  var api = {
    get on() { return on; },
    /** hover: a tactile switch, contact snap plus a tiny plate ring */
    tick: function (x) {
      if (!ready() || !gate('tick', 40)) return;
      var t = ctx.currentTime + .004, p = pan(x);
      snap(t, p, jitter(5200), 2.2, .07, .008, 'highpass');
      ring(t, p, [jitter(3150), 4870], .012, .03);
    },
    /** choosing: a relay, contact, bounce 11 ms later, and a chassis thunk */
    select: function (x) {
      if (!ready() || !gate('select', 80)) return;
      var t = ctx.currentTime + .004, p = pan(x);
      snap(t, p, jitter(2600), 1.4, .16, .012);
      snap(t + .011, p, jitter(3400), 1.8, .07, .008);
      thunk(t, p, 210, 95, .18, .07).connect(room);
      ring(t, p, [jitter(1830), 2710, 4420], .02, .06);
    },
    /** a primary action: a solenoid ka-chunk with a short servo whir */
    press: function (x) {
      if (!ready() || !gate('press', 140)) return;
      var t = ctx.currentTime + .004, p = pan(x);
      snap(t, p, 1400, 1, .12, .015);
      thunk(t, p, 140, 52, .3, .14).connect(room);
      snap(t + .045, p, jitter(3000), 1.6, .1, .01);
      whir(t + .03, p, 140, 260, .035, .16);
    },
    /** a section or view arriving: a servo seeking position */
    arrive: function () {
      if (!ready() || !gate('arrive', 900)) return;
      var t = ctx.currentTime + .01;
      whir(t, out, 180, 120, .025, .22);
      snap(t + .22, out, 2200, 1.4, .05, .01);
    },
    /** scroll speed in px/frame spins the motor up and down */
    rush: function (v) {
      if (!on || !ctx || !motor) return;
      var s = Math.min(1, Math.abs(v) / 50), t = ctx.currentTime;
      motor.g.gain.setTargetAtTime(s * .06, t, s > 0 ? .05 : .3);
      motor.o.frequency.setTargetAtTime(48 + s * 70, t, .12); motor.o2.frequency.setTargetAtTime(96.7 + s * 141, t, .12);
      motor.f.frequency.setTargetAtTime(300 + s * 1600, t, .1);
    },
    set: function (v) {
      if (v && !ctx && !build()) return false;
      on = !!v; save(on);
      if (on) {
        if (ctx.state === 'suspended') ctx.resume();
        var t = ctx.currentTime + .02;                 // power up: a relay, then a drive spinning up
        snap(t, out, 2400, 1.4, .14, .012); thunk(t, out, 180, 70, .2, .09).connect(room);
        whir(t + .05, out, 60, 320, .04, .55);
      } else if (motor) { motor.g.gain.setTargetAtTime(0, ctx.currentTime, .05); }
      return on;
    },
    wanted: pref,
  };
  window.COETSound = api;
})();
