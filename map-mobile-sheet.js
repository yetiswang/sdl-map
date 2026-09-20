/* map-mobile-sheet.js — the phone bottom sheet for map-legacy.html.
 *
 * On viewports ≤ 900 px it replaces four floating buttons, two edge tabs,
 * two slide-in drawers and the region column with ONE sheet in three states:
 *   peek  — "N in view" · Filters (k) · region chips        (112 px)
 *   half  — plus the list of what is in view, or the filters (52 svh)
 *   full  — the same, taller                                (86 svh)
 * The filter chips are the SAME DOM nodes the desktop asides use (moved in
 * on narrow viewports, moved back on wide ones), so render() in the map
 * keeps driving them. What is "in view" arrives on the `sdl:view` event the
 * cluster pass dispatches. Strings are self-contained per language, like
 * export.js. Styles: map-chrome.css.
 */
(function () {
  'use strict';
  // The map builds #app's contents in a DOMContentLoaded handler, which runs
  // AFTER deferred scripts — anything appended earlier is wiped by that
  // innerHTML write. Boot once the map's own controls exist.
  function ready() { return document.getElementById('map-wrap') && document.getElementById('reset') && document.getElementById('z-reset'); }
  function start() { if (!ready()) { setTimeout(start, 40); return; } init(); }
  start();
  function init() {
  var app = document.getElementById('app');
  if (!app) return;
  var MQ = window.matchMedia('(max-width: 900px)');
  var lang = window.SDL_LANG || 'en';
  var key = lang === 'zh' ? (window.SDL_ZH_SCRIPT === 'Hant' ? 'zh-Hant' : 'zh-Hans') : lang;
  var T = {
    en: { inView: 'in view', filters: 'Filters', eu: 'Europe', us: 'Americas', ea: 'East Asia', about: 'About this map', exportMap: 'Export map', data: 'Data & sharing', flat: 'Flat map', globe: 'Globe', view: 'Globe / flat', clear: 'Clear filters', suggest: 'Suggest a lab', empty: 'Nothing in view. Zoom out or pan.', expand: 'Expand panel', collapse: 'Collapse panel' },
    'zh-Hans': { inView: '视野内', filters: '筛选', eu: '欧洲', us: '美洲', ea: '东亚', about: '关于本图', exportMap: '导出地图', data: '数据与分享', flat: '平面地图', globe: '地球仪', view: '地球仪 / 平面', clear: '清除筛选', suggest: '推荐实验室', empty: '视野内没有项目，请缩小或平移。', expand: '展开面板', collapse: '收起面板' },
    'zh-Hant': { inView: '視野內', filters: '篩選', eu: '歐洲', us: '美洲', ea: '東亞', about: '關於本圖', exportMap: '匯出地圖', data: '資料與分享', flat: '平面地圖', globe: '地球儀', view: '地球儀 / 平面', clear: '清除篩選', suggest: '推薦實驗室', empty: '視野內沒有項目，請縮小或平移。', expand: '展開面板', collapse: '收起面板' },
    ja: { inView: '表示中', filters: 'フィルタ', eu: 'ヨーロッパ', us: '米州', ea: '東アジア', about: 'この地図について', exportMap: '地図を書き出す', data: 'データと共有', flat: '平面図', globe: '地球儀', view: '地球儀 / 平面', clear: 'フィルタを解除', suggest: 'ラボを提案', empty: '表示範囲に項目がありません。縮小または移動してください。', expand: 'パネルを開く', collapse: 'パネルを閉じる' },
    ko: { inView: '표시 중', filters: '필터', eu: '유럽', us: '미주', ea: '동아시아', about: '이 지도에 대해', exportMap: '지도 내보내기', data: '데이터 및 공유', flat: '평면 지도', globe: '지구본', view: '지구본 / 평면', clear: '필터 지우기', suggest: '연구실 제안', empty: '표시 범위에 항목이 없습니다. 축소하거나 이동하세요.', expand: '패널 열기', collapse: '패널 닫기' },
  };
  var t = T[key] || T.en;
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ---- DOM ---------------------------------------------------------------
  var sheet = document.createElement('section');
  sheet.className = 'msheet glass';
  sheet.id = 'msheet';
  sheet.dataset.state = 'peek';
  sheet.setAttribute('aria-label', t.inView);
  sheet.innerHTML =
    '<div class="msheet-head" id="msheet-head">' +
      '<span class="msheet-bar" aria-hidden="true"></span>' +
      '<div class="msheet-row1">' +
        '<button type="button" class="msheet-tab is-on" id="msheet-tab-list" data-pane="list"><b id="msheet-n">0</b> ' + esc(t.inView) + '</button>' +
        '<button type="button" class="msheet-tab" id="msheet-tab-filters" data-pane="filters">' + esc(t.filters) + ' <span class="msheet-badge" id="msheet-fbadge" hidden>0</span></button>' +
        '<button type="button" class="msheet-grip" id="msheet-grip" aria-expanded="false" aria-controls="msheet-body" aria-label="' + esc(t.expand) + '">' +
          '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 10l4.5-4.5 4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="msheet-row2" role="group">' +
        '<button type="button" class="msheet-chip" data-region="eu">' + esc(t.eu) + '</button>' +
        '<button type="button" class="msheet-chip" data-region="us">' + esc(t.us) + '</button>' +
        '<button type="button" class="msheet-chip" data-region="ea">' + esc(t.ea) + '</button>' +
        '<span class="msheet-sep" aria-hidden="true"></span>' +
        '<button type="button" class="msheet-ico" data-act="about" aria-label="' + esc(t.about) + '" title="' + esc(t.about) + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></button>' +
        '<button type="button" class="msheet-ico" data-act="data" aria-label="' + esc(t.data) + '" title="' + esc(t.data) + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 19h16"/></svg></button>' +
        '<button type="button" class="msheet-ico" data-act="view" aria-label="' + esc(t.view) + '" title="' + esc(t.view) + '"><svg class="ico-globe" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3.6 9h16.8M3.6 15h16.8"/></svg><svg class="ico-flat" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 12h18M9 6.2c-1.5 3.8-1.5 8 0 11.6M15 6.2c1.5 3.8 1.5 8 0 11.6"/></svg></button>' +
      '</div>' +
    '</div>' +
    '<div class="msheet-body" id="msheet-body">' +
      '<div class="msheet-pane" id="msheet-list" data-pane="list"></div>' +
      '<div class="msheet-pane" id="msheet-filters" data-pane="filters" hidden></div>' +
    '</div>';
  app.appendChild(sheet);

  var body = sheet.querySelector('#msheet-body');
  var listPane = sheet.querySelector('#msheet-list');
  var filtersPane = sheet.querySelector('#msheet-filters');
  var nEl = sheet.querySelector('#msheet-n');
  var fbadge = sheet.querySelector('#msheet-fbadge');
  var grip = sheet.querySelector('#msheet-grip');
  var actions = document.createElement('div');
  actions.className = 'msheet-actions';
  actions.innerHTML =
    '<button type="button" class="msheet-action" data-act="export">' + esc(t.exportMap) + '</button>' +
    '<a class="msheet-action" href="https://github.com/yetiswang/sdl-map/issues/new?template=add-lab.yml" target="_blank" rel="noopener">' + esc(t.suggest) + ' ↗</a>' +
    '<button type="button" class="msheet-action" data-act="clear">' + esc(t.clear) + '</button>';

  // ---- state -------------------------------------------------------------
  var STATES = ['peek', 'half', 'full'];
  function heightFor(s) {
    if (s === 'peek') return 112;
    if (s === 'half') return Math.round(window.innerHeight * 0.52);
    return Math.round(window.innerHeight * 0.86);
  }
  function setState(s, remember) {
    if (STATES.indexOf(s) < 0) s = 'peek';
    sheet.dataset.state = s;
    sheet.classList.toggle('glass-strong', s !== 'peek');   // reading surfaces are less transparent
    sheet.style.height = '';
    document.documentElement.style.setProperty('--msheet-h', heightFor(s) + 'px');
    document.body.classList.toggle('msheet-open', s !== 'peek');
    grip.setAttribute('aria-expanded', String(s !== 'peek'));
    grip.setAttribute('aria-label', s === 'peek' ? t.expand : t.collapse);
    if (remember !== false) { try { sessionStorage.setItem('sdl-msheet-state', s); } catch (e) {} }
  }
  function setPane(name) {
    sheet.querySelectorAll('.msheet-pane').forEach(function (p) { p.hidden = p.dataset.pane !== name; });
    sheet.querySelectorAll('.msheet-tab').forEach(function (b) { b.classList.toggle('is-on', b.dataset.pane === name); });
    body.scrollTop = 0;
  }
  sheet.querySelectorAll('.msheet-tab').forEach(function (b) {
    b.addEventListener('click', function () {
      setPane(b.dataset.pane);
      if (sheet.dataset.state === 'peek') setState('half');
    });
  });
  grip.addEventListener('click', function () { setState(sheet.dataset.state === 'peek' ? 'half' : 'peek'); });

  // Drag the head: follow the finger, snap to the nearest state on release.
  var drag = null;
  var head = sheet.querySelector('#msheet-head');
  head.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button') && e.pointerType !== 'touch') return;
    drag = { y0: e.clientY, h0: sheet.getBoundingClientRect().height, moved: false, id: e.pointerId };
    head.setPointerCapture(e.pointerId);
  });
  head.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dy = drag.y0 - e.clientY;
    if (!drag.moved && Math.abs(dy) < 6) return;
    drag.moved = true;
    sheet.classList.add('is-dragging');
    sheet.style.height = Math.max(heightFor('peek') - 20, Math.min(heightFor('full'), drag.h0 + dy)) + 'px';
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var moved = drag.moved, h = sheet.getBoundingClientRect().height;
    drag = null;
    sheet.classList.remove('is-dragging');
    if (!moved) return;                   // a tap: the button handlers act
    var best = STATES.reduce(function (acc, s) { return Math.abs(heightFor(s) - h) < Math.abs(heightFor(acc) - h) ? s : acc; }, 'peek');
    setState(best);
  }
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);
  // Suppress the click that follows a drag on a button in the head.
  head.addEventListener('click', function (e) { if (sheet.classList.contains('is-dragging')) { e.stopPropagation(); e.preventDefault(); } }, true);

  // ---- regions -----------------------------------------------------------
  sheet.querySelector('.msheet-chip[data-region="eu"]').classList.add('is-on');   // the initial frame
  sheet.querySelectorAll('.msheet-chip').forEach(function (c) {
    c.addEventListener('click', function () {
      var btn = document.getElementById('r-' + c.dataset.region);
      if (btn) btn.click();
      sheet.querySelectorAll('.msheet-chip').forEach(function (x) { x.classList.toggle('is-on', x === c); });
      if (sheet.dataset.state === 'full') setState('half');
    });
  });

  // ---- actions -----------------------------------------------------------
  function viewLabel() {
    var flat = document.getElementById('v-flat');
    return (flat && flat.classList.contains('active')) ? t.globe : t.flat;
  }
  function syncViewIcon() {
    var flat = document.getElementById('v-flat');
    sheet.classList.toggle('is-flat', !!(flat && flat.classList.contains('active')));
  }
  function onAction(e) {
    var b = e.target.closest('.msheet-action, .msheet-ico');
    if (!b || !b.dataset.act) return;
    var act = b.dataset.act;
    if (act === 'about') { var w = document.getElementById('wmReopen'); if (w) w.click(); }
    else if (act === 'export') { if (window.__sdlExportOpen) window.__sdlExportOpen(); }
    else if (act === 'data') { if (window.__sdlDataOpen) window.__sdlDataOpen(); }
    else if (act === 'view') {
      var flat = document.getElementById('v-flat');
      var isFlat = flat && flat.classList.contains('active');
      if (window.__sdlSetMapMode) window.__sdlSetMapMode(isFlat ? 'globe' : 'flat');
      syncViewIcon();
    }
    else if (act === 'clear') { var r = document.getElementById('reset'); if (r) r.click(); }
  }
  actions.addEventListener('click', onAction);
  sheet.querySelector('.msheet-row2').addEventListener('click', onAction);
  syncViewIcon();

  // ---- filters: borrow the desktop chip groups on narrow viewports -------
  var moved = [];
  function moveFiltersIn() {
    if (moved.length) return;
    ['aside.left', 'aside.right'].forEach(function (sel) {
      var aside = document.querySelector(sel);
      if (!aside) return;
      Array.prototype.slice.call(aside.children).forEach(function (el) {
        if (el.id === 'list' || el.id === 'list-h' || el.classList.contains('drawer-close')) return;
        moved.push({ el: el, parent: aside, next: el.nextSibling });
        filtersPane.appendChild(el);
      });
    });
    filtersPane.appendChild(actions);
    refreshBadge();
  }
  function moveFiltersOut() {
    if (!moved.length) return;
    moved.reverse().forEach(function (m) { m.parent.insertBefore(m.el, m.next && m.next.parentNode === m.parent ? m.next : null); });
    moved = [];
    if (actions.parentNode) actions.parentNode.removeChild(actions);
  }
  function refreshBadge() {
    var n = filtersPane.querySelectorAll('.chip.active').length;
    fbadge.textContent = n;
    fbadge.hidden = n === 0;
  }
  new MutationObserver(refreshBadge).observe(filtersPane, { subtree: true, attributes: true, attributeFilter: ['class'] });

  // ---- in-view list ------------------------------------------------------
  var DATA = window.SDL_DATA || [];
  var byId = {};
  DATA.forEach(function (d) { byId[d.id] = d; });
  var TIER_ORDER = { national: 0, academic: 1, commercial: 2, labos: 3 };
  var lastIds = [];
  function renderList(ids) {
    lastIds = ids || [];
    nEl.textContent = lastIds.length;
    var rows = lastIds.map(function (id) { return byId[id]; }).filter(Boolean)
      .sort(function (a, b) { return (TIER_ORDER[a.tier] - TIER_ORDER[b.tier]) || a.name.localeCompare(b.name); });
    if (!rows.length) { listPane.innerHTML = '<div class="msheet-empty">' + esc(t.empty) + '</div>'; return; }
    listPane.innerHTML = rows.map(function (d) {
      return '<button type="button" class="msheet-row" data-id="' + esc(d.id) + '">' +
        '<span class="ldot" style="background:var(--c-' + esc(d.tier) + ')"></span>' +
        '<span class="msheet-rname">' + esc(d.name) + '</span>' +
        '<span class="msheet-rmeta">' + esc(d.flag || '') + ' ' + esc(d.city || '') + '</span>' +
      '</button>';
    }).join('');
  }
  listPane.addEventListener('click', function (e) {
    var row = e.target.closest('.msheet-row');
    if (!row) return;
    var d = byId[row.dataset.id];
    if (d && window.__sheet && window.__sheet.openSheet) window.__sheet.openSheet(d);
  });
  window.addEventListener('sdl:view', function (e) { if (MQ.matches) renderList(e.detail && e.detail.ids); });

  // ---- glass on chrome that other scripts create at runtime -------------
  // export.js makes the two floating buttons, map-i18n.js the clear button and
  // the welcome pill, export.js the dialog cards. Class them as they appear.
  (function glassChrome() {
    var STATIC = ['.sdl-fab', '.wm-reopen', '#sdl-clear-floating'];
    var tries = 0;
    function tag() {
      var missing = 0;
      STATIC.forEach(function (sel) { var els = document.querySelectorAll(sel); if (!els.length) missing++; els.forEach(function (el) { el.classList.add('glass'); }); });
      document.querySelectorAll('.exp-card').forEach(function (el) { el.classList.add('glass', 'glass-strong'); });
      if (missing && ++tries < 60) setTimeout(tag, 120);
    }
    tag();
    new MutationObserver(function () { document.querySelectorAll('.exp-card:not(.glass)').forEach(function (el) { el.classList.add('glass', 'glass-strong'); }); }).observe(document.body, { childList: true, subtree: true });
  })();

  // ---- wiring ------------------------------------------------------------
  function apply() {
    if (MQ.matches) {
      moveFiltersIn();
      var saved = null;
      try { saved = sessionStorage.getItem('sdl-msheet-state'); } catch (e) {}
      setState(saved || 'peek', false);
      if (window.__sdlInView) renderList(window.__sdlInView());
    } else {
      moveFiltersOut();
      document.body.classList.remove('msheet-open');
      document.documentElement.style.removeProperty('--msheet-h');
    }
  }
  if (MQ.addEventListener) MQ.addEventListener('change', apply); else MQ.addListener(apply);
  window.addEventListener('resize', function () { if (MQ.matches && sheet.dataset.state !== 'peek') setState(sheet.dataset.state, false); });
  apply();
  window.SDLMobileSheet = { setState: setState, setPane: setPane, refresh: function () { renderList(lastIds); refreshBadge(); } };
  }
})();
