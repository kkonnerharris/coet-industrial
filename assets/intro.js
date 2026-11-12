/* COET — the opening film. On the first visit in a tab (wide screens, dark mode, motion allowed) a short film plays
   where the globe will be: a line of light crosses a device and it bursts into orange sparks. At the burst the
   real globe's balls fly out from the same point and take over, and the film fades away.
   The film is black-backed and blended with "screen", so only its light shows. If it cannot play, the globe simply
   appears. The globe's position here must match orb.js (centre offset −0.4, +0.13; radius 42% of the short side). */
(function () {
  'use strict';
  var host = document.querySelector('[data-orb]');
  if (!host) return;
  var ok = matchMedia('(min-width: 901px)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.theme !== 'light';
  var seen = false; try { seen = sessionStorage.getItem('coet:intro') === '1'; } catch (e) {}
  if (!ok || seen) return;

  var waiting = [], fired = false;
  var api = window.COETIntro = { pending: true, onBurst: function (f) { if (fired) f(true); else waiting.push(f); } };
  function fire(instant) { if (fired) return; fired = true; api.pending = false; waiting.forEach(function (f) { f(!!instant); }); }

  var BURST = 3.3, FADE = 4.35, FADE_FOR = 1.2;          // seconds into the film: sparks leave the device; film starts to fade
  var v = document.createElement('video');
  v.className = 'ws-film'; v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
  v.preload = 'auto'; v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1; v.disablePictureInPicture = true;
  v.src = new URL('video/intro-burst.mp4', document.currentScript.src).href;
  function place() {
    var b = host.getBoundingClientRect(), R = .42 * Math.min(b.width, b.height);
    v.style.left = (b.width / 2 - .4 * R) + 'px'; v.style.top = (b.height / 2 - .13 * R) + 'px'; v.style.width = (R * 3.9) + 'px';
  }
  place(); addEventListener('resize', place);
  host.parentNode.insertBefore(v, host.nextSibling);

  var raf = 0, guard = setTimeout(function () { end(true); }, 3000);       // never leave the stage empty if the film stalls
  function tick() {
    var t = v.currentTime;
    if (t >= BURST) fire(false);
    if (t >= FADE) v.style.opacity = Math.max(0, 1 - (t - FADE) / FADE_FOR).toFixed(3);
    if (!v.ended && !v.paused) raf = requestAnimationFrame(tick);
  }
  function end(instant) {
    clearTimeout(guard); cancelAnimationFrame(raf); fire(instant);
    removeEventListener('resize', place); if (v.parentNode) v.parentNode.removeChild(v);
  }
  v.addEventListener('playing', function () { clearTimeout(guard); try { sessionStorage.setItem('coet:intro', '1'); } catch (e) {} cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); });
  v.addEventListener('ended', function () { end(false); });
  v.addEventListener('error', function () { end(true); });
  var p = v.play(); if (p && p.catch) p.catch(function () { end(true); });
})();
