/* COET — the "Get ideas?" assistant. A visitor describes a problem; an AI model (running behind chat-api/, which
   holds the API key) names the kind of problem, the usual fixes and what's possible. The server URL comes from
   <meta name="coet-chat">; with no URL the button never appears, so the site is never left with a dead chat.
   The conversation lives in this tab only (sessionStorage) and is sent to the server with each message. */
(function () {
  'use strict';
  var meta = document.querySelector('meta[name="coet-chat"]'), API = meta ? meta.content.trim() : '';
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {           // local testing only: ?chat=http://localhost:8787
    var q = /[?&]chat=([^&]+)/.exec(location.search); if (q) API = decodeURIComponent(q[1]);
  }
  // No server yet: run a rule-based demo so the widget can be seen and tried (labelled as a demo, not AI).
  var DEMO = !API;
  API = API.replace(/\/+$/, '');

  var gsap = window.gsap, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, root = document.documentElement;
  var S = window.COETSound || {};
  var STARTERS = ['Our machine\'s screen confuses new operators', 'We need a website before our launch', 'Our app and our hardware feel like two products'];
  var HELLO = 'Tell me what you\'re stuck on with your product. I\'ll tell you what kind of problem it usually is, how teams tend to solve it, and what\'s possible.';
  var KEY = 'coet:ideas', history = [], busy = false, ctrl = null;
  try { history = JSON.parse(sessionStorage.getItem(KEY) || '[]') || []; } catch (e) { history = []; }
  var save = function () { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-24))); } catch (e) {} };

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  // ── the pill ──
  var pill = el('button', 'idea-pill'); pill.type = 'button'; pill.setAttribute('aria-haspopup', 'dialog'); pill.setAttribute('aria-expanded', 'false');
  pill.appendChild(el('span', 'idea-pill__dot')); pill.appendChild(el('span', '', 'Get ideas?'));

  // ── the panel ──
  var panel = el('section', 'idea'); panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Get ideas: AI assistant');
  if (gsap && !reduce) panel.classList.add('idea--gsap');
  var head = el('header', 'idea__head'), titles = el('div');
  titles.appendChild(el('h2', 'idea__title', 'Get ideas')); titles.appendChild(el('p', 'idea__tag', DEMO ? 'Demo · rule-based answers, not AI' : 'AI assistant · not a person'));
  var close = el('button', 'idea__close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close');
  head.appendChild(titles); head.appendChild(close);
  var log = el('div', 'idea__log'); log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite'); log.setAttribute('data-lenis-prevent', '');
  var form = el('form', 'idea__form'), input = el('textarea', 'idea__input'), sendBtn = el('button', 'idea__send', '↑');
  input.rows = 1; input.maxLength = 2000; input.placeholder = 'Describe the problem…'; input.setAttribute('aria-label', 'Describe the problem');
  sendBtn.type = 'submit'; sendBtn.setAttribute('aria-label', 'Send'); sendBtn.disabled = true;
  form.appendChild(input); form.appendChild(sendBtn);
  var fine = el('p', 'idea__fine'); fine.appendChild(document.createTextNode(DEMO ? 'Demo mode: canned answers matched to keywords, not a quote. For a real answer, ' : 'Ideas from an AI model, not a quote. It can be wrong. Don\'t share anything confidential. For a real answer, '));
  var toForm = el('a', '', 'talk to the team'); toForm.href = (document.getElementById('contact') ? '' : (document.querySelector('.mnav__logo') || {}).href || './') + '#contact';
  fine.appendChild(toForm); fine.appendChild(document.createTextNode('.'));
  var foot = el('div'); foot.appendChild(form); foot.appendChild(fine);
  panel.appendChild(head); panel.appendChild(log); panel.appendChild(foot);
  document.body.appendChild(pill); document.body.appendChild(panel);

  function rise(node) { if (gsap && !reduce) gsap.from(node, { y: 10, autoAlpha: 0, duration: .35, ease: 'power3.out' }); }
  function bottom() { log.scrollTop = log.scrollHeight; }
  function bubble(kind, text) { var b = el('div', 'idea__msg idea__msg--' + kind, text); log.appendChild(b); rise(b); bottom(); return b; }
  function chips() {
    var row = el('div', 'idea__chips');
    STARTERS.forEach(function (t) { var c = el('button', 'idea__chip', t); c.type = 'button'; c.addEventListener('click', function () { ask(t); }); row.appendChild(c); });
    log.appendChild(row); rise(row);
  }
  function paint() {
    log.textContent = '';
    bubble('bot', HELLO);
    if (!history.length) chips();
    history.forEach(function (m) { bubble(m.role === 'user' ? 'me' : 'bot', m.content); });
    bottom();
  }

  // ── open / close ──
  var open = false;
  function show(v) {
    if (v === open) return; open = v;
    pill.setAttribute('aria-expanded', String(v)); root.classList.toggle('idea-open', v);
    if (v) {
      panel.hidden = false; if (!log.firstChild) paint();
      if (gsap && !reduce) gsap.fromTo(panel, { scale: .6, autoAlpha: 0, y: 16 }, { scale: 1, autoAlpha: 1, y: 0, duration: .45, ease: 'power3.out', overwrite: true });
      if (S.press) S.press(.8);
      setTimeout(function () { input.focus({ preventScroll: true }); }, 60);
    } else {
      var done = function () { panel.hidden = true; };
      if (gsap && !reduce) gsap.to(panel, { scale: .7, autoAlpha: 0, y: 12, duration: .22, ease: 'power2.in', overwrite: true, onComplete: done }); else done();
      if (S.select) S.select(.8);
      pill.focus({ preventScroll: true });
    }
  }
  pill.addEventListener('click', function () { show(true); });
  close.addEventListener('click', function () { show(false); });
  toForm.addEventListener('click', function () { show(false); });
  document.addEventListener('keydown', function (e) { if (open && e.key === 'Escape') { e.preventDefault(); show(false); } });

  // ── the input grows with the text; Enter sends, Shift+Enter makes a new line ──
  function fit() { input.style.height = 'auto'; input.style.height = Math.min(120, input.scrollHeight) + 'px'; sendBtn.disabled = busy || !input.value.trim(); }
  input.addEventListener('input', fit);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });

  var SORRY = {
    slow: 'That\'s a lot of messages in a short time. Give it a few minutes and try again.',
    busy: 'The assistant has had a busy day and is resting. The contact form below still reaches the team.',
    too_long: 'That message is too long. Try a shorter description of the problem.',
    fallback: 'The assistant couldn\'t answer just now. Try again in a moment, or use the contact form below.'
  };

  // ── demo answers: keyword rules over COET's own service copy (used only when no server is set) ──
  var RULES = [
    { k: /\b(hi|hey|hello|yo)\b/, a: 'Hi! Describe a problem with your product, like a confusing machine screen, a launch without a website, or an app that doesn\'t feel connected to the hardware, and I\'ll tell you what kind of problem it usually is.' },
    { k: /pric|cost|budget|how much|\bfee|equity|revenue share|\bpay/, a: 'COET works three ways. Take Ownership: COET may negotiate an equity position in a product it helps develop. Revenue Sharing: COET may build in exchange for a negotiated share of future revenue. Company Template: a reusable company template (architecture, backend systems, infrastructure) for $50,000. Ownership and revenue terms are negotiated per product.' },
    { k: /screen|operator|confus|\bui\b|\bux\b|interface|hmi|display|dashboard|control|button|touch|haptic|sound/, a: 'That\'s usually an interface problem: the machine can do the job, but the screen makes people think too hard. The usual fixes are to watch real operators, cut each screen down to one main action, make every state obvious (idle, running, fault), and give clear feedback with sound and haptics. That\'s COET\'s Interfaces work: "The screens, controls, and sounds people touch every day. We tune every tap, click, and buzz until the machine feels like part of you."' },
    { k: /\bapps?\b|firmware|embedded|integrat|two products|connect|sync|bluetooth|\bapi\b|backend|software/, a: 'When the app and the hardware feel like two products, it\'s usually an integration gap: separate teams, separate design languages, and state that doesn\'t match between them. The usual fix is one design system across screen and device, and one source of truth for the machine\'s state. That\'s COET\'s Implementation work: "We take the interface off the screen and put it on the machine. Production-ready software, integrated with your hardware and systems."' },
    { k: /website|web site|\bsite\b|landing|launch|\bseo\b|framer|\bcms\b|homepage/, a: 'A launch without a site is a positioning problem as much as a web one: people need to understand the machine before the demo. The usual fix is a fast, focused site with one clear story, real product visuals and one call to action. That\'s COET\'s Web work: "Your site sells the machine before the demo does. Built from scratch, never from a template."' },
    { k: /brand|logo|\bdeck|pitch|investor|identity|color|font/, a: 'That sounds like a credibility gap: the product is further along than the brand makes it look. The usual fixes are a tighter identity (logo, type, color) and a pitch deck that tells the machine\'s story in a few slides. That\'s COET\'s Branding work: "Your brand should reflect the credibility of your product, and the company you\'re becoming."' },
    { k: /render|\bcad\b|\b3d\b|film|video|photo|visual|image|keyshot|blender/, a: 'If you need to show the product before it exists in volume, that\'s a visualization problem. The usual fix is photoreal renders and short launch films made from your CAD files. That\'s COET\'s Rendering work: "Show the machine before it ships. Built from your CAD files, true down to the last bolt."' }
  ];
  var DEFAULT = 'I couldn\'t match that to a common problem yet. Tell me who uses the product, where it breaks down for them, and what you\'ve already tried. COET covers branding, web, rendering, interfaces and implementation for hardware products.';
  function demoAnswer(text) {
    var t = text.toLowerCase();
    for (var i = 0; i < RULES.length; i++) if (RULES[i].k.test(t)) return RULES[i].a + (i > 1 ? ' Want a real look at it? Use the contact form below.' : '');
    return DEFAULT;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function streamDemo(text, b) {                                  // types the answer out like a model would
    await wait(reduce ? 0 : 650);
    var words = text.split(' '), got = '';
    for (var i = 0; i < words.length; i++) { got += (i ? ' ' : '') + words[i]; b.textContent = got; bottom(); if (!reduce) await wait(22 + Math.random() * 30); }
    return got;
  }

  async function ask(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true; input.value = ''; fit();
    var row = log.querySelector('.idea__chips'); if (row) row.remove();
    if (history.length >= 22) history = history.slice(-20);               // keep the thread within the server's limit
    if (history.length && history[0].role !== 'user') history.shift();
    history.push({ role: 'user', content: text }); save();
    bubble('me', text);
    var b = bubble('bot', ''), dots = el('span', 'idea__dots'); dots.innerHTML = '<i></i><i></i><i></i>'; b.appendChild(dots);
    var got = '', failed = null;
    ctrl = new AbortController();
    if (DEMO) { try { got = await streamDemo(demoAnswer(text), b); } catch (e0) { failed = 'fallback'; } }
    else try {
      var res = await fetch(API + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history }), signal: ctrl.signal });
      if (!res.ok || !res.body) { var j = {}; try { j = await res.json(); } catch (e2) {} failed = j.error || 'fallback'; }
      else {
        var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
        for (;;) {
          var part = await reader.read(); if (part.done) break;
          buf += dec.decode(part.value, { stream: true });
          var at;
          while ((at = buf.indexOf('\n\n')) > -1) {
            var line = buf.slice(0, at); buf = buf.slice(at + 2);
            if (line.indexOf('data: ') !== 0) continue;
            var ev = {}; try { ev = JSON.parse(line.slice(6)); } catch (e3) { continue; }
            if (ev.t) { if (!got) b.textContent = ''; got += ev.t; b.textContent = got; bottom(); }
            if (ev.error) failed = ev.error;
          }
        }
      }
    } catch (err) { failed = 'fallback'; }
    ctrl = null;
    if (got) { history.push({ role: 'assistant', content: got }); save(); if (S.tick) S.tick(.8); }
    else { b.remove(); history.pop(); save(); }                            // nothing came back: don't keep a one-sided turn
    if (failed) bubble('note', SORRY[failed] || SORRY.fallback);
    busy = false; fit(); if (open) input.focus({ preventScroll: true });
  }
})();
