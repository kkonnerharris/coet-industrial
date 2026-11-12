/* COET — the voice agent, with no widget. One labelled ball in the globe starts a spoken conversation with COET's
   ElevenLabs agent; the ball's label shows what is happening. It ends when the visitor says "stop" (or similar),
   clicks the ball again, presses Esc, leaves the page, or the agent hangs up.
   The ElevenLabs SDK (about 1 MB) is only fetched when someone starts a call. Audio goes to ElevenLabs. */
(function () {
  'use strict';
  var AGENT = 'agent_6701m7755g4je1abpyz8ge576r5y';
  var SDK = new URL('vendor/elevenlabs-client-1.36.0.iife.js', document.currentScript.src).href;
  var state = 'idle', convo = null, subs = [], sdk = null, cancelled = false, timer = 0;
  // idle → connecting → listening ⇄ speaking → idle;  blocked / failed fall back to idle after a moment
  function set(s) { if (s === state) return; state = s; subs.forEach(function (f) { try { f(s); } catch (e) {} }); }

  function loadSdk() {
    return sdk || (sdk = new Promise(function (res, rej) {
      if (window.ElevenLabsClient) return res();
      var s = document.createElement('script'); s.src = SDK; s.async = true;
      s.onload = function () { res(); }; s.onerror = function () { sdk = null; rej(new Error('sdk')); };
      document.head.appendChild(s);
    }));
  }

  // "stop", "that's all", "goodbye"… but only as a short remark, so "we need to stop the belt jamming" carries on
  var STOP = /\b(stop|hang up|good ?bye|bye|end (the |this )?(call|chat|conversation)|that'?s (all|it)|that is all|i'?m done|we'?re done|quit|cancel)\b/i;
  function heardStop(text) { var t = String(text || '').trim(); return t.length > 0 && t.split(/\s+/).length <= 6 && STOP.test(t); }

  async function start() {
    if (state !== 'idle') return;
    clearTimeout(timer); cancelled = false; set('connecting');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('no mic'), { name: 'NotFoundError' });
      var probe = await navigator.mediaDevices.getUserMedia({ audio: true });      // ask first, so a refusal is a clear state
      probe.getTracks().forEach(function (t) { t.stop(); });
      await loadSdk();
      var c = await window.ElevenLabsClient.Conversation.startSession({
        agentId: AGENT,
        connectionType: 'webrtc',
        onConnect: function () { if (!cancelled) set('listening'); },
        onDisconnect: function () { convo = null; set('idle'); },
        onError: function (message) { console.warn('[voice]', message); },
        onModeChange: function (m) { if (convo) set(m && m.mode === 'speaking' ? 'speaking' : 'listening'); },
        onMessage: function (m) { if (m && (m.role === 'user' || m.source === 'user') && heardStop(m.message)) stop(); }
      });
      if (cancelled) { try { await c.endSession(); } catch (e) {} set('idle'); return; }
      convo = c; if (state === 'connecting') set('listening');
    } catch (err) {
      convo = null;
      var denied = err && (err.name === 'NotAllowedError' || err.name === 'NotFoundError' || err.name === 'SecurityError');
      set(denied ? 'blocked' : 'failed');
      timer = setTimeout(function () { if (state === 'blocked' || state === 'failed') set('idle'); }, 3600);
    }
  }
  async function stop() {
    if (state === 'connecting') { cancelled = true; return; }
    var c = convo; convo = null;
    if (c) { try { await c.endSession(); } catch (e) {} }
    set('idle');
  }
  function toggle() { if (state === 'idle') start(); else if (state === 'blocked' || state === 'failed') { clearTimeout(timer); set('idle'); } else stop(); }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (state === 'listening' || state === 'speaking' || state === 'connecting')) stop(); });
  addEventListener('pagehide', function () { if (convo) { try { convo.endSession(); } catch (e) {} } });

  window.COETVoice = { toggle: toggle, stop: stop, state: function () { return state; }, onState: function (f) { subs.push(f); f(state); } };
})();
