/* COET — the light/dark switch. The saved choice is applied in <head> before the page paints; this wires the
   button, keeps its label honest and tells the 3D globe which background it is fading into. */
(function () {
  'use strict';
  var root = document.documentElement, KEY = 'coet:theme';
  var btns = [].slice.call(document.querySelectorAll('[data-theme-toggle]'));
  var meta = document.querySelector('meta[name="theme-color"]');
  function show() {
    var light = root.dataset.theme === 'light';
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(light)); b.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode'); });
    if (meta) meta.content = light ? '#ffffff' : '#000000';
    document.dispatchEvent(new CustomEvent('coet:theme', { detail: { light: light } }));
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var light = root.dataset.theme !== 'light';
      if (light) root.dataset.theme = 'light'; else delete root.dataset.theme;
      try { localStorage.setItem(KEY, light ? 'light' : 'dark'); } catch (e) {}
      show();
    });
  });
  show();
})();
