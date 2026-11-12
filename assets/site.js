/* COET — industrial minimal. Small, dependency-free: the reel (desktop or phone cut, pausable), a solid nav
   after the hero, rise-in reveals, spec counters, and the statement lighting word by word as it scrolls. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The reel: the portrait cut on phones, the wide one elsewhere. Paused and still under reduced motion.
  var reel = document.querySelector('[data-reel]'), toggle = document.querySelector('[data-reel-toggle]');
  if (reel) {
    var src = reel.querySelector('source'), phone = matchMedia('(max-width: 760px) and (orientation: portrait)').matches;
    src.src = phone ? src.dataset.srcPhone : src.dataset.srcDesktop;
    if (phone) reel.poster = 'assets/video/reel-m-poster.webp';
    reel.load();
    var setBtn = function () { toggle.textContent = reel.paused ? 'Play film' : 'Pause film'; toggle.setAttribute('aria-pressed', String(!reel.paused)); };
    if (reduce) { reel.removeAttribute('autoplay'); reel.pause(); } else { reel.play().catch(function () {}); }
    reel.addEventListener('play', setBtn); reel.addEventListener('pause', setBtn); setBtn();
    toggle.addEventListener('click', function () { if (reel.paused) reel.play().catch(function () {}); else reel.pause(); });
  }

  // Nav turns solid once the film is behind you; the film eases in a touch as you leave it.
  var nav = document.querySelector('[data-nav]'), hero = document.querySelector('.hero'), ticking = false;
  function onScroll() {
    ticking = false;
    var h = hero ? hero.offsetHeight : 600, y = scrollY;
    nav.classList.toggle('is-solid', y > h - 80);
    if (hero && !reduce) hero.style.setProperty('--hero-p', Math.min(1, y / h).toFixed(3));
    lightWords();
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  // Rise in once. Siblings in the same block stagger slightly.
  var rise = [].slice.call(document.querySelectorAll('[data-rise]'));
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, i = [].indexOf.call(el.parentNode.children, el);
        el.style.setProperty('--d', Math.min(i, 4) * 70 + 'ms');
        el.classList.add('in'); io.unobserve(el);
        var n = el.querySelector('[data-count]'); if (n) count(n);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    rise.forEach(function (el) { io.observe(el); });
  } else rise.forEach(function (el) { el.classList.add('in'); });

  // Spec counters: from zero to the real figure, once.
  function count(el) {
    var to = +el.dataset.count, t0 = 0;
    if (reduce) return;
    function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * e); if (p < 1) requestAnimationFrame(step); }
    el.textContent = '0'; requestAnimationFrame(step);
  }

  // The statement lights word by word as it crosses the middle of the screen.
  var words = document.querySelector('[data-words]'), spans = [];
  if (words) {
    var text = words.textContent.trim(); words.textContent = '';
    words.setAttribute('aria-label', text);
    text.split(/\s+/).forEach(function (w, i, a) {
      var s = document.createElement('span'); s.className = 'w'; s.textContent = w; s.setAttribute('aria-hidden', 'true');
      words.appendChild(s); if (i < a.length - 1) words.appendChild(document.createTextNode(' ')); spans.push(s);
    });
  }
  function lightWords() {
    if (!spans.length || reduce) return;
    var r = words.getBoundingClientRect(), vh = innerHeight;
    var p = Math.max(0, Math.min(1, (vh * .78 - r.top) / (r.height + vh * .38)));
    var on = Math.round(p * spans.length);
    spans.forEach(function (s, i) { s.classList.toggle('lit', i < on); });
  }
  onScroll();
})();
