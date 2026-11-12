/* COET — scroll motion. Lenis eases the scroll itself (mouse and trackpad only); GSAP ScrollTrigger ties every
   reveal to the scroll position, the same in every browser. Transform and opacity only. Nothing runs under
   prefers-reduced-motion, and if the libraries fail to load the page falls back to the plain rise-in in site.js. */
(function () {
  'use strict';
  var gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST) return;
  gsap.registerPlugin(ST);
  var root = document.documentElement;
  var all = function (sel) { return [].slice.call(document.querySelectorAll(sel)); };

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', function () {
    root.classList.add('has-gsap');

    /* ── smooth scroll: wheel and trackpad glide; touch stays native ── */
    var lenis = null;
    if (window.Lenis && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      lenis = new window.Lenis({
        lerp: 0.09,
        stopInertiaOnNavigate: true,
        prevent: function (node) { return !!(node.matches && node.matches('dialog, .menu')); }
      });
      lenis.on('scroll', ST.update);
      var raf = function (t) { lenis.raf(t * 1000); };
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      // the page holds still while the menu or a bio is open
      var hold = function () { if (root.classList.contains('menu-open') || root.classList.contains('bio-open')) lenis.stop(); else lenis.start(); };
      var watch = new MutationObserver(hold); watch.observe(root, { attributes: true, attributeFilter: ['class'] });
      window.COETLenis = lenis;
    }

    /* ── in-page links: measure the target without its scroll transform, so the landing spot is exact ── */
    function pageTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }
    function onLink(e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a || a.origin !== location.origin || a.pathname !== location.pathname || a.hash.length < 2 || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      var y = Math.max(0, pageTop(target) - 88);
      requestAnimationFrame(function () {         // after the menu has let go of the page
        if (lenis) { lenis.start(); lenis.scrollTo(y, { duration: 1.2 }); } else window.scrollTo({ top: y, behavior: 'smooth' });
      });
      history.replaceState(null, '', a.hash);
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });   // keyboard focus follows, as a native jump would
    }
    document.addEventListener('click', onLink);

    var used = [];
    function scrub(el, from, to, start, end, trigger) {
      to.ease = 'none';
      to.scrollTrigger = { trigger: trigger || el, start: 'clamp(' + start + ')', end: 'clamp(' + end + ')', scrub: true };
      used.push(el);
      return gsap.fromTo(el, from, to);
    }
    var skip = function (el) { return el.closest('.cs-hero, dialog') || used.indexOf(el) > -1; };

    /* ── sections behave like windows: each one slides up and settles, then recedes as the next arrives ── */
    all('main > section, main > .ws').forEach(function (sec, i) {
      if (i > 0) scrub(sec, { y: 80, scale: .96, borderRadius: 32, boxShadow: '0 0 0 1px rgba(255,255,255,.14)' },
        { y: 0, scale: 1, borderRadius: 0, boxShadow: '0 0 0 1px rgba(255,255,255,0)' }, 'top bottom', 'top 45%');
      gsap.fromTo(sec, { scale: 1, opacity: 1, boxShadow: '0 0 0 1px rgba(255,255,255,0)' }, {
        scale: .9, opacity: .45, borderRadius: 32, boxShadow: '0 0 0 1px rgba(255,255,255,.16)', ease: 'none', immediateRender: false,
        scrollTrigger: { trigger: sec, start: 'bottom 60%', end: 'bottom top', scrub: true }
      });
    });

    /* ── titles come up and settle ── */
    all('.head__title, .ap-title, .statement__text, .close__title').forEach(function (el) {
      if (!skip(el)) scrub(el, { opacity: 0, y: 44, scale: .96 }, { opacity: 1, y: 0, scale: 1 }, 'top bottom', 'top 72%');
    });

    /* ── media settles into place ── */
    var svc = document.querySelector('.svc'), stage = document.querySelector('.svc__stage');
    if (svc && stage && matchMedia('(min-width: 901px)').matches) scrub(stage, { opacity: .2, scale: .9 }, { opacity: 1, scale: 1 }, 'top bottom', 'top 40%', svc);
    all('.cs-grid .cs-plate, .team__globe, .cs-next__media').forEach(function (el) {
      if (!skip(el)) scrub(el, { opacity: .2, scale: .9 }, { opacity: 1, scale: 1 }, 'top bottom', 'top 55%');
    });

    /* ── everything else rises ── */
    all('[data-rise]').forEach(function (el) {
      if (!skip(el)) scrub(el, { opacity: 0, y: 28 }, { opacity: 1, y: 0 }, 'top bottom', 'top 80%');
    });

    /* ── the footer wordmark lifts into view at the very end ── */
    var mark = document.querySelector('.foot__mark');
    if (mark) scrub(mark, { opacity: 0, yPercent: 30 }, { opacity: 1, yPercent: 0 }, 'top bottom', 'bottom bottom');
    // its outline draws itself as you arrive (one tween, scrubbed; the path is measured as length 1)
    var markSvg = mark && mark.querySelector('svg'), markPath = markSvg && markSvg.querySelector('path');
    if (markPath) {
      var sizeStroke = function () { var vb = markSvg.viewBox.baseVal, w = markSvg.getBoundingClientRect().width; if (w) markSvg.style.setProperty('--mark-stroke', (1.4 * vb.width / w).toFixed(4)); };
      sizeStroke(); ST.addEventListener('refresh', sizeStroke);
      markPath.setAttribute('pathLength', '1');
      gsap.fromTo(markPath, { strokeDasharray: 1.02, strokeDashoffset: 1.02, fillOpacity: 0 }, { strokeDashoffset: 0, fillOpacity: 1, ease: 'none',
        scrollTrigger: { trigger: mark, start: 'clamp(top bottom)', end: 'clamp(bottom bottom)', scrub: true } });
    }

    /* ── the first screen arrives in order: the paragraph, then the project list (a timeline, not delays) ── */
    if (matchMedia('(min-width: 901px)').matches && document.querySelector('.ws-intro')) {
      gsap.timeline({ defaults: { duration: .6, ease: 'power3.out' } })
        .from('.ws-intro', { y: 16, autoAlpha: 0, clearProps: 'all' }, .25)
        .from('.ws-pills li', { x: -14, autoAlpha: 0, stagger: .04, clearProps: 'all' }, '<0.1');
    }

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });

    return function () {                       // reduced motion switched on: put everything back
      root.classList.remove('has-gsap');
      document.removeEventListener('click', onLink);
      if (lenis) { watch.disconnect(); gsap.ticker.remove(raf); lenis.destroy(); window.COETLenis = null; }
    };
  });
})();
