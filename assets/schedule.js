/* COET — preferred call time, beside the lead form. A custom month calendar and time slots in the visitor's own
   time zone. It records a preference only (no booking system behind it): the choice goes out with the form as
   hidden fields, with the same moment in Phoenix time for COET. */
(function () {
  'use strict';
  var root = document.querySelector('[data-sched]');
  if (!root) return;
  var form = root.closest('form');
  var grid = root.querySelector('[data-sched-days]'), title = root.querySelector('[data-sched-month]');
  var prev = root.querySelector('[data-sched-prev]'), next = root.querySelector('[data-sched-next]');
  var slotsEl = root.querySelector('[data-sched-slots]'), out = root.querySelector('[data-sched-out]');
  var fDay = root.querySelector('[name="preferred_day"]'), fTime = root.querySelector('[name="preferred_time"]'), fPhx = root.querySelector('[name="preferred_time_phoenix"]');
  var S = window.COETSound || { tick: function () {}, select: function () {} };

  var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
  root.querySelector('[data-sched-tz]').textContent = tz ? tz.replace(/_/g, ' ') : 'your time';

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var last = new Date(today); last.setDate(last.getDate() + 60);          // up to two months ahead
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var day = null, time = null;                                            // time: minutes after midnight

  var fmtMonth = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
  var fmtDay = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  var fmtShort = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  var fmtTime = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  var fmtPhx = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Phoenix', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  var same = function (a, b) { return a && b && a.getTime() === b.getTime(); };

  // weekday labels, starting Sunday
  var wk = root.querySelector('[data-sched-week]'), sun = new Date(2026, 0, 4);
  for (var w = 0; w < 7; w++) { var d0 = new Date(sun); d0.setDate(4 + w); var s = document.createElement('span'); s.textContent = d0.toLocaleDateString(undefined, { weekday: 'narrow' }); s.setAttribute('aria-hidden', 'true'); wk.appendChild(s); }

  function drawMonth() {
    title.textContent = fmtMonth.format(view);
    prev.disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    next.disabled = new Date(view.getFullYear(), view.getMonth() + 1, 1) > last;
    grid.innerHTML = '';
    var lead = view.getDay(), days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (var i = 0; i < lead; i++) { var pad = document.createElement('span'); pad.setAttribute('aria-hidden', 'true'); grid.appendChild(pad); }
    for (var n = 1; n <= days; n++) {
      var date = new Date(view.getFullYear(), view.getMonth(), n), b = document.createElement('button');
      b.type = 'button'; b.className = 'sched__day'; b.textContent = n; b.dataset.n = n;
      b.setAttribute('aria-label', fmtDay.format(date));
      var off = date < today || date > last;
      if (off) b.disabled = true;
      if (same(date, today)) b.classList.add('is-today');
      if (date.getDay() === 0 || date.getDay() === 6) b.classList.add('is-weekend');
      b.setAttribute('aria-pressed', String(same(date, day)));
      b.tabIndex = same(date, day) || (!day && same(date, firstOpen())) ? 0 : -1;
      grid.appendChild(b);
    }
  }
  function firstOpen() { var f = new Date(Math.max(today, view)); if (f.getMonth() !== view.getMonth()) return null; return f; }

  function drawSlots() {
    slotsEl.innerHTML = '';
    if (!day) { slotsEl.innerHTML = '<p class="sched__hint">Pick a day to see times.</p>'; return; }
    var now = new Date();
    for (var m = 9 * 60; m <= 17 * 60; m += 30) {                       // 9:00 to 17:00, every half hour, local time
      var at = new Date(day); at.setMinutes(m);
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sched__slot'; b.dataset.m = m; b.textContent = fmtTime.format(at);
      if (at < now) b.disabled = true;
      b.setAttribute('aria-pressed', String(time === m));
      slotsEl.appendChild(b);
    }
  }

  function commit() {
    if (day && time !== null) {
      var at = new Date(day); at.setMinutes(time);
      fDay.value = fmtDay.format(day); fTime.value = fmtTime.format(at) + (tz ? ' (' + tz + ')' : '');
      fPhx.value = fmtPhx.format(at) + ' Phoenix';
      out.textContent = fmtShort.format(day) + ' · ' + fmtTime.format(at);
      root.classList.add('is-set');
    } else {
      fDay.value = day ? fmtDay.format(day) : ''; fTime.value = ''; fPhx.value = '';
      out.textContent = day ? fmtShort.format(day) + ' · pick a time' : 'No preference yet';
      root.classList.remove('is-set');
    }
  }

  grid.addEventListener('click', function (e) {
    var b = e.target.closest('.sched__day'); if (!b || b.disabled) return;
    day = new Date(view.getFullYear(), view.getMonth(), +b.dataset.n);
    // keep the time if it's still in the future on the new day
    if (time !== null) { var at = new Date(day); at.setMinutes(time); if (at < new Date()) time = null; }
    drawMonth(); drawSlots(); commit(); S.select(0);
    var again = grid.querySelector('[aria-pressed="true"]'); if (again) again.focus();
  });
  grid.addEventListener('keydown', function (e) {
    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]; if (!step) return;
    var b = e.target.closest('.sched__day'); if (!b) return;
    e.preventDefault();
    var all = [].slice.call(grid.querySelectorAll('.sched__day:not(:disabled)')), i = all.indexOf(b), t = all[i + step] || (step > 0 ? all[all.length - 1] : all[0]);
    if (t) { b.tabIndex = -1; t.tabIndex = 0; t.focus(); S.tick(0); }
  });
  slotsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.sched__slot'); if (!b || b.disabled) return;
    time = +b.dataset.m; drawSlots(); commit(); S.select(0);
    var again = slotsEl.querySelector('[aria-pressed="true"]'); if (again) again.focus();
  });
  prev.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); drawMonth(); S.tick(0); });
  next.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); drawMonth(); S.tick(0); });
  root.querySelector('[data-sched-clear]').addEventListener('click', function () { day = null; time = null; drawMonth(); drawSlots(); commit(); S.tick(0); });
  if (form) form.addEventListener('reset', function () { day = null; time = null; view = new Date(today.getFullYear(), today.getMonth(), 1); setTimeout(function () { drawMonth(); drawSlots(); commit(); }); });

  drawMonth(); drawSlots(); commit();
})();
