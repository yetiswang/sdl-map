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
    // Seven beats: entry id, zoom, and one line each. zh-Hant is derived.
    var BEATS = [
      { id: 'ares_afrl',     year: 2016, k: 4.5, en: ['ARES · Dayton', 'The first closed loop: a program plans, a robot runs, the result feeds the next plan.'], zh: ['ARES · 代顿', '第一个闭环：程序规划，机器人执行，结果反哺下一轮规划。'] },
      { id: 'cronin',        year: 2018, k: 5.5, en: ['Chemputer · Glasgow', 'Chemistry written as code a machine can execute.'], zh: ['Chemputer · 格拉斯哥', '把化学写成机器可以执行的代码。'] },
      { id: 'cooper',        year: 2020, k: 5.5, en: ['Mobile Robot Chemist · Liverpool', 'A robot walks the lab and works eight days unattended.'], zh: ['移动机器人化学家 · 利物浦', '机器人在实验室里走动，连续八天无人值守地工作。'] },
      { id: 'maosic_cuhksz', year: 2020, k: 4.5, en: ['MAOSIC · Shenzhen', "China's first cloud lab: experiments sent from anywhere, run by machines."], zh: ['MAOSIC · 深圳', '中国第一个云实验室：实验从任何地方提交，由机器完成。'] },
      { id: 'alab',          year: 2023, k: 3.2, en: ['A-Lab · Berkeley, with Coscientist · Pittsburgh', 'Powders and language in one year: a lab that makes new solids, and a model that plans experiments.'], zh: ['A-Lab · 伯克利，与 Coscientist · 匹兹堡', '粉体与语言同年登场：一个能合成新固体的实验室，一个能规划实验的模型。'] },
      { id: 'bigmap',        year: 2023, k: 4.5, en: ['FINALES · Europe', 'Labs in several countries run one experiment together.'], zh: ['FINALES · 欧洲', '几个国家的实验室一起运行同一个实验。'] },
      { id: null,            year: 2026, k: 1,   en: ['2024 to 2026 · The wave', 'Forty-one new sites in two years, on every tier. The map is still being drawn.'], zh: ['2024 至 2026 · 浪潮', '两年内新增四十一个站点，覆盖每一层级。这张图谱仍在绘制中。'] },
    ];
    var HANT = [
      ['ARES · 代頓', '第一個閉環：程式規劃，機器人執行，結果反哺下一輪規劃。'],
      ['Chemputer · 格拉斯哥', '把化學寫成機器可以執行的程式碼。'],
      ['移動機器人化學家 · 利物浦', '機器人在實驗室裡走動，連續八天無人值守地工作。'],
      ['MAOSIC · 深圳', '中國第一個雲實驗室：實驗從任何地方提交，由機器完成。'],
      ['A-Lab · 柏克萊，與 Coscientist · 匹茲堡', '粉體與語言同年登場：一個能合成新固體的實驗室，一個能規劃實驗的模型。'],
      ['FINALES · 歐洲', '幾個國家的實驗室一起運行同一個實驗。'],
      ['2024 至 2026 · 浪潮', '兩年內新增四十一個站點，覆蓋每一層級。這張圖譜仍在繪製中。'],
    ];
    var beatText = function (b) { var i = BEATS.indexOf(b); return hant ? HANT[i] : (zh ? b.zh : b.en); };

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
    cap.innerHTML = '<div class="story-year"></div><div class="story-title"></div><div class="story-line"></div>';
    app.appendChild(cap);
    var prog = document.createElement('div');
    prog.id = 'story-prog'; prog.className = 'story-prog glass story-ctl'; prog.setAttribute('aria-hidden', 'true');
    app.appendChild(prog);
    var yearEl = cap.querySelector('.story-year'), titleEl = cap.querySelector('.story-title'), lineEl = cap.querySelector('.story-line');

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
      yearEl.textContent = year; titleEl.textContent = t[0]; lineEl.textContent = t[1];
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
