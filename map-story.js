/* map-story.js — story mode and idle cinematic for map-legacy.html (2026-09-21).
 *
 * Story: the map empties, then the 118 entries land in order of start year at
 * a steady rate with the arrival ring, a year counter running. At seven beats
 * the clock stops: the camera flies to the entry and holds with a caption.
 * The last beat pulls back to the world with the full count.
 * Idle (desktop, hovering pointer, not reduced motion): two minutes without
 * input, tab visible, nothing open → the story plays from blank, then the globe
 * keeps turning slowly until any input, which flies back to the saved view.
 * The map exposes what this needs on window.__sdlStoryAPI (map-legacy.html).
 * Spec: vault 30-Projects/SDL-Map/2026-09-21-story-and-idle-spec.md.
 * QA: ?story=fast runs the schedule at 8×; ?idle=3 sets the threshold to 3 s.
 */
(function () {
  'use strict';
  var Q = (function () { try { return location.search + (window.frameElement ? window.frameElement.ownerDocument.location.search : ''); } catch (e) { return location.search; } })();
  var FAST = /[?&]story=fast/.test(Q) ? 8 : 1;
  var IDLE_MS = (function () { var m = Q.match(/[?&]idle=(\d+)/); return m ? +m[1] * 1000 : 120000; })();

  function ready() { return window.__sdlStoryAPI && document.getElementById('map-wrap') && document.getElementById('z-reset'); }
  function boot() { if (!ready()) { setTimeout(boot, 60); return; } init(); }
  boot();

  function init() {
    var API = window.__sdlStoryAPI;
    var app = document.getElementById('app'); if (!app) return;
    var lang = window.SDL_LANG || 'en';
    var zh = lang === 'zh';
    var hant = zh && window.SDL_ZH_SCRIPT === 'Hant';
    var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

    // ---- strings -------------------------------------------------------
    var S = {
      en: { play: 'Play the story', stop: 'Stop', of: 'of' },
      zh: { play: '播放图谱故事', stop: '停止', of: '/' },
      hant: { play: '播放圖譜故事', stop: '停止', of: '/' },
    };
    var T = hant ? S.hant : (zh ? S.zh : S.en);
    // Eight stops (2026-09-21, Yuyang's cut after cross-checking Canty &
    // Abolhasani, Nat. Rev. Chem. 2026): credit goes to the earliest layers;
    // recent labs appear only as numbers. Every line is a dated fact from the
    // entry's listed sources or the review; `src` is printed under the caption.
    // Text: [title, line, source]. The close computes its counts from DATA.
    var BEATS = [
      { id: 'hamilton', year: 1980, k: 4.5,
        en: ['Hamilton · Reno', 'Liquid-handling robots, and by the 1980s Hamilton and Tecan modules running Simplex optimisations. The review\'s timeline opens here.', 'hamiltoncompany.com · Canty & Abolhasani, Nat. Rev. Chem. 2026'],
        zh: ['Hamilton · 里诺', '移液机器人；到 1980 年代，Hamilton 与 Tecan 的模块已在运行单纯形优化。综述的时间线从这里开始。', 'hamiltoncompany.com · Canty & Abolhasani, Nat. Rev. Chem. 2026'],
        hant: ['Hamilton · 里諾', '移液機器人；到 1980 年代，Hamilton 與 Tecan 的模組已在運行單純形最佳化。綜述的時間線從這裡開始。', 'hamiltoncompany.com · Canty & Abolhasani, Nat. Rev. Chem. 2026'] },
      { id: 'ecl', year: 2015, k: 5,
        en: ['Emerald Cloud Lab · South San Francisco', 'A laboratory used through a browser, one of the cloud labs the review places in the 2010s.', 'emeraldcloudlab.com · Canty & Abolhasani 2026'],
        zh: ['Emerald Cloud Lab · 南旧金山', '通过浏览器使用的实验室，综述归入 2010 年代的云实验室之一。', 'emeraldcloudlab.com · Canty & Abolhasani 2026'],
        hant: ['Emerald Cloud Lab · 南舊金山', '透過瀏覽器使用的實驗室，綜述歸入 2010 年代的雲實驗室之一。', 'emeraldcloudlab.com · Canty & Abolhasani 2026'] },
      { id: 'ares_afrl', year: 2016, k: 4.5,
        en: ['ARES · Dayton', 'A closed loop on carbon nanotube growth; Table 1 of the review begins here. Closed-loop research itself is older: Adam in 2009, Eve in 2015.', 'doi.org/10.1038/npjcompumats.2016.31 · Table 1, Canty & Abolhasani 2026'],
        zh: ['ARES · 代顿', '碳纳米管生长的闭环；综述的表 1 由此开始。闭环研究本身更早：2009 年的 Adam，2015 年的 Eve。', 'doi.org/10.1038/npjcompumats.2016.31 · Table 1, Canty & Abolhasani 2026'],
        hant: ['ARES · 代頓', '碳奈米管生長的閉環；綜述的表 1 由此開始。閉環研究本身更早：2009 年的 Adam，2015 年的 Eve。', 'doi.org/10.1038/npjcompumats.2016.31 · Table 1, Canty & Abolhasani 2026'] },
      { id: 'matter', year: 2017, k: 4.5,
        en: ['Matter Lab · Toronto', 'ChemOS, an operating system for self-driving labs, and the Mission Innovation workshop that named materials acceleration platforms.', 'doi.org/10.1126/scirobotics.aat5559 · mission-innovation.net'],
        zh: ['Matter Lab · 多伦多', 'ChemOS，一套自主实验室的操作系统；以及为“材料加速平台”命名的 Mission Innovation 研讨会。', 'doi.org/10.1126/scirobotics.aat5559 · mission-innovation.net'],
        hant: ['Matter Lab · 多倫多', 'ChemOS，一套自主實驗室的作業系統；以及為「材料加速平台」命名的 Mission Innovation 研討會。', 'doi.org/10.1126/scirobotics.aat5559 · mission-innovation.net'] },
      { id: 'dpt', year: 2018, k: 4.5,
        en: ['DP Technology 深势科技 · Beijing', 'Bohrium: simulation, models and more than 1,800 instruments on one platform.', 'dp.tech · bohrium.dp.tech'],
        zh: ['深势科技 · 北京', '玻尔平台：模拟、模型与一千八百多台仪器汇于一处。', 'dp.tech · bohrium.dp.tech'],
        hant: ['深勢科技 · 北京', '玻爾平台：模擬、模型與一千八百多台儀器匯於一處。', 'dp.tech · bohrium.dp.tech'] },
      { id: 'cooper', year: 2020, k: 5.5,
        en: ['Cooper Group · Liverpool', 'The Mobile Robot Chemist: a robot that moves between stations and worked eight days unattended, in the Materials Innovation Factory opened in 2017.', 'liverpool.ac.uk/cooper-group · Table 1, Canty & Abolhasani 2026'],
        zh: ['Cooper 课题组 · 利物浦', '移动机器人化学家：在工作站之间移动、连续八天无人值守地工作的机器人，位于 2017 年启用的材料创新工厂。', 'liverpool.ac.uk/cooper-group · Table 1, Canty & Abolhasani 2026'],
        hant: ['Cooper 課題組 · 利物浦', '移動機器人化學家：在工作站之間移動、連續八天無人值守地工作的機器人，位於 2017 年啟用的材料創新工廠。', 'liverpool.ac.uk/cooper-group · Table 1, Canty & Abolhasani 2026'] },
      { id: 'capex', year: 2022, k: 5,
        en: ['CAPeX · Lyngby', 'A thirteen-year national centre for Power-to-X materials, five universities.', 'dg.dk · dtu.dk'],
        zh: ['CAPeX · 灵比', '为期十三年的国家级 Power-to-X 材料中心，五所大学。', 'dg.dk · dtu.dk'],
        hant: ['CAPeX · 靈比', '為期十三年的國家級 Power-to-X 材料中心，五所大學。', 'dg.dk · dtu.dk'] },
      { id: null, year: 2026, k: 1,
        en: ['The map, 2026', '{n} sites in {c} countries: {a} before 2014, {b} by 2019, {c2} more by 2023, {d} more since. The map is still being drawn.', 'sdl-map dataset, September 2026'],
        zh: ['图谱，2026', '{c} 个国家，{n} 个站点：2014 年前 {a} 个，2019 年前 {b} 个，2023 年前再加 {c2} 个，此后又 {d} 个。这张图谱仍在绘制中。', 'sdl-map 数据集，2026 年 9 月'],
        hant: ['圖譜，2026', '{c} 個國家，{n} 個站點：2014 年前 {a} 個，2019 年前 {b} 個，2023 年前再加 {c2} 個，此後又 {d} 個。這張圖譜仍在繪製中。', 'sdl-map 資料集，2026 年 9 月'] },
    ];
    var COUNTS = (function () { var all = API.order, a = 0, b = 0, c2 = 0, d = 0, cs = {}; all.forEach(function (x) { cs[x.country] = 1; if (x.start < 2014) a++; else if (x.start <= 2019) b++; else if (x.start <= 2023) c2++; else d++; }); return { n: all.length, c: Object.keys(cs).length, a: a, b: b, c2: c2, d: d }; })();
    var fill = function (str) { return String(str).replace(/\{(n|c2|c|a|b|d)\}/g, function (_, k) { return COUNTS[k]; }); };
    var beatText = function (b) { var t = hant ? b.hant : (zh ? b.zh : b.en); return t.map(fill); };

    // ---- DOM: play button, caption, progress -------------------------------
    var seen = false; try { seen = localStorage.getItem('sdlmap.storySeen') === '1'; } catch (e) {}
    var btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'sdl-story-play';
    btn.className = 'sdl-fab glass story-ctl' + (seen ? '' : ' is-pill');
    btn.setAttribute('aria-label', T.play); btn.title = T.play;
    btn.innerHTML = '<svg class="story-ico-play" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>' +
      '<svg class="story-ico-stop" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/></svg>' +
      '<span class="story-lbl">' + esc(T.play) + '</span>';
    app.appendChild(btn);
    var cap = document.createElement('div');
    cap.id = 'story-cap'; cap.className = 'story-cap glass glass-strong story-ctl'; cap.setAttribute('aria-live', 'polite');
    cap.innerHTML = '<div class="story-year"></div><div class="story-title"></div><div class="story-line"></div><div class="story-src"></div>';
    app.appendChild(cap);
    var prog = document.createElement('div');
    prog.id = 'story-prog'; prog.className = 'story-prog glass story-ctl'; prog.setAttribute('aria-hidden', 'true');
    app.appendChild(prog);
    var yearEl = cap.querySelector('.story-year'), titleEl = cap.querySelector('.story-title'), lineEl = cap.querySelector('.story-line'), srcEl = cap.querySelector('.story-src');

    // ---- schedule ----------------------------------------------------------
    var ORDER = API.order, N = API.total;
    var idxOf = {}; ORDER.forEach(function (d, i) { idxOf[d.id] = i; });
    var PIN_MS = 60000 / FAST, HOLD_MS = 3400 / FAST, FLY_MS = Math.max(300, 1100 / FAST), END_HOLD_MS = 3200 / FAST;
    // A beat fires when the year counter reaches its milestone year: the first
    // entry in start order with start >= year. Several beats can share a year
    // (2020, 2023); they play back to back at that point.
    var beatAt = {};
    BEATS.forEach(function (b, i) { if (b.id == null) return; var idx = ORDER.findIndex(function (d) { return d.start >= b.year; }); if (idx < 0) idx = N - 1; (beatAt[idx] = beatAt[idx] || []).push(i); });

    var st = { running: false, idle: false, timers: [], raf: 0, saved: null, savedMode: null, t0: 0, rank: 0, nextIdx: 0 };
    function later(fn, ms) { var t = setTimeout(fn, ms); st.timers.push(t); return t; }
    function clearTimers() { st.timers.forEach(clearTimeout); st.timers = []; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; }
    function setProg(rank) {
      var d = ORDER[Math.max(0, Math.min(N - 1, rank - 1))];
      prog.textContent = (rank > 0 ? d.start : '') + (rank > 0 ? '  ·  ' : '') + rank + ' ' + T.of + ' ' + N;
    }
    var capLog = [];
    function showCap(b, year) {
      var t = beatText(b);
      yearEl.textContent = year; titleEl.textContent = t[0]; lineEl.textContent = t[1]; srcEl.textContent = t[2] || '';
      cap.classList.add('show');
      capLog.push(year + ' ' + t[0]);
    }
    function hideCap() { cap.classList.remove('show'); }
    function worldK() { return API.worldScale() / (API.getView().scale / API.k()); }

    // Reveal pins from st.rank up to `upto` at a steady rate, then call done.
    function revealTo(upto, done) {
      var from = st.rank, span = upto - from;
      if (span <= 0) { done(); return; }
      var dur = span / N * PIN_MS, start = performance.now();
      var step = function (now) {
        if (!st.running) return;
        var p = Math.min(1, (now - start) / dur);
        var r = from + Math.round(span * p);
        if (r !== st.rank) { st.rank = r; API.setRank(r); setProg(r); }
        if (p < 1) st.raf = requestAnimationFrame(step); else done();
      };
      st.raf = requestAnimationFrame(step);
    }
    function runBeat(i, done) {
      var b = BEATS[i];
      if (b.id == null) {   // final: pull back to the world, reveal the rest, hold
        API.flyToView(API.getView().rotate, API.worldScale(), FLY_MS);
        revealTo(N, function () { showCap(b, ORDER[N - 1].start); later(function () { hideCap(); done(); }, HOLD_MS + END_HOLD_MS); });
        return;
      }
      var d = ORDER[idxOf[b.id]];
      API.flyTo(d.lon, d.lat, b.k * (API.touch() ? 0.85 : 1), FLY_MS);
      later(function () {
        // The beat's own pin is on the map by the time the camera arrives.
        if (st.rank < idxOf[b.id] + 1) { st.rank = idxOf[b.id] + 1; API.setRank(st.rank); setProg(st.rank); }
        showCap(b, b.year);
        later(function () { hideCap(); later(done, 250 / FAST); }, HOLD_MS);
      }, FLY_MS * 0.7);
    }
    // Walk the schedule: reveal up to the next beat, play it, repeat.
    var pending = [];   // beats queued at the current trigger index
    function walk() {
      if (!st.running) return;
      if (pending.length) { runBeat(pending.shift(), walk); return; }
      var nextIdx = -1;
      for (var i = st.rank; i < N; i++) if (beatAt[i]) { nextIdx = i; break; }
      if (nextIdx < 0) { runBeat(BEATS.length - 1, finish); return; }
      pending = beatAt[nextIdx].slice(); delete beatAt[nextIdx];
      // between beats: back to the world view while pins land
      if (API.k() > 1.6) API.flyToView(API.getView().rotate, API.worldScale(), FLY_MS);
      revealTo(nextIdx, walk);
    }

    function start(opts) {
      opts = opts || {};
      if (st.running) return;
      st.running = true; st.idle = !!opts.idle; st.rank = 0;
      st.saved = API.getView(); st.savedMode = API.mode();
      document.body.classList.add('story-on');
      btn.classList.add('is-on'); btn.setAttribute('aria-label', T.stop); btn.title = T.stop;
      try { localStorage.setItem('sdlmap.storySeen', '1'); } catch (e) {}
      btn.classList.remove('is-pill');
      beatAt = {}; pending = [];
      BEATS.forEach(function (b, i) { if (b.id == null) return; var idx = ORDER.findIndex(function (d) { return d.start >= b.year; }); if (idx < 0) idx = N - 1; (beatAt[idx] = beatAt[idx] || []).push(i); });
      API.setRank(0); setProg(0);
      API.flyToView(API.getView().rotate, API.worldScale(), FLY_MS);
      if (API.mode() === 'globe' && !API.reduced) API.spin(true, 2);   // a gentle turn while the pins land
      later(walk, FLY_MS + 200 / FAST);
    }
    function finish() {
      // Natural end: everything is on the map. From idle, keep turning; from
      // Play, go back to where the viewer was.
      if (!st.running) return;
      clearTimers(); hideCap();
      st.running = false;
      API.setRank(null);
      if (st.idle) { document.body.classList.add('story-idle'); if (API.mode() === 'globe' && !API.reduced) API.spin(true, 4); prog.textContent = ''; return; }
      restore();
    }
    function restore() {
      API.spin(false);
      document.body.classList.remove('story-on', 'story-idle');
      btn.classList.remove('is-on'); btn.setAttribute('aria-label', T.play); btn.title = T.play;
      prog.textContent = '';
      if (st.saved) { API.flyToView(st.saved.rotate, st.saved.scale, API.reduced ? 1 : 1000); }
      if (st.savedMode && st.savedMode !== API.mode()) API.setMode(st.savedMode);
      st.saved = null; st.idle = false;
    }
    function stop() {
      var wasRunning = st.running, wasIdle = st.idle || document.body.classList.contains('story-idle');
      clearTimers(); hideCap();
      st.running = false;
      API.setRank(null);
      if (wasRunning || wasIdle) restore();
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); if (st.running || document.body.classList.contains('story-idle')) stop(); else start({ idle: false }); });
    // Any gesture on the map ends the story; Escape too.
    var wrap = document.getElementById('map-wrap');
    ['pointerdown', 'wheel', 'touchstart'].forEach(function (ev) { wrap.addEventListener(ev, function (e) { if (e.target.closest && e.target.closest('.story-ctl')) return; if (st.running || document.body.classList.contains('story-idle')) stop(); }, { passive: true, capture: true }); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (st.running || document.body.classList.contains('story-idle'))) stop(); });

    // ---- idle cinematic (desktop, hovering pointer, motion allowed) -------
    var HOVER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (HOVER && !API.reduced) {
      var last = performance.now();
      var docs = [window]; try { if (window.frameElement) docs.push(window.frameElement.ownerDocument.defaultView); } catch (e) {}
      var wake = function () {
        last = performance.now();
        if (st.idle && (st.running || document.body.classList.contains('story-idle'))) stop();
      };
      docs.forEach(function (w) { ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { w.addEventListener(ev, wake, { passive: true, capture: true }); }); });
      document.addEventListener('visibilitychange', function () { if (document.visibilityState !== 'visible') { if (st.idle) stop(); last = performance.now(); } });
      setInterval(function () {
        if (st.running || document.body.classList.contains('story-idle')) return;
        if (document.visibilityState !== 'visible') { last = performance.now(); return; }
        if (performance.now() - last < IDLE_MS) return;
        if (API.uiOpen()) { last = performance.now(); return; }
        start({ idle: true });
      }, 1000);
    }
    window.__sdlStory = { play: function () { start({ idle: false }); }, stop: stop, state: function () { return { running: st.running, idle: st.idle || document.body.classList.contains('story-idle'), rank: API.getRank(), seen: seen, captions: capLog.slice() }; } };
  }
})();
