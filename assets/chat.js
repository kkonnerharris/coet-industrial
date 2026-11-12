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
  if (!API) return;
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
  titles.appendChild(el('h2', 'idea__title', 'Get ideas')); titles.appendChild(el('p', 'idea__tag', 'AI assistant · not a person'));
  var close = el('button', 'idea__close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close');
  head.appendChild(titles); head.appendChild(close);
  var log = el('div', 'idea__log'); log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite'); log.setAttribute('data-lenis-prevent', '');
  var form = el('form', 'idea__form'), input = el('textarea', 'idea__input'), sendBtn = el('button', 'idea__send', '↑');
  input.rows = 1; input.maxLength = 2000; input.placeholder = 'Describe the problem…'; input.setAttribute('aria-label', 'Describe the problem');
  sendBtn.type = 'submit'; sendBtn.setAttribute('aria-label', 'Send'); sendBtn.disabled = true;
  form.appendChild(input); form.appendChild(sendBtn);
  var fine = el('p', 'idea__fine'); fine.appendChild(document.createTextNode('Ideas from an AI model, not a quote. It can be wrong. Don\'t share anything confidential. For a real answer, '));
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
    try {
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
