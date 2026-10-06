/* map-coach.js — first-visit guided tour (2026-10-06).
 *
 * Five steps, each finished by doing the thing or with Next, never a slide deck
 * (spec: vault 30-Projects/SDL-Map/2026-10-06-site-tutorial-and-interaction-flows):
 *   1  Tap a lab        a showcase pin near the visitor (timezone, no location
 *                       permission) → its card opens.
 *   2  Work with a lab  the card's actions: request an introduction, update or
 *                       claim the entry (nothing is submitted in the tour).
 *   3  Narrow it down   open the filters, tap any chip → count, "Clear and continue".
 *   4  Take the data    the database button: CSV, XLSX, TXT, charts pack.
 *   5  Go further       the story (Play) and List, Timeline, Watch.
 * Runs once, after the welcome card closes on a first visit and the arrival
 * has played. Skip on every step, Esc skips. "Take the quick tour" in the
 * About card replays it. State: localStorage sdlmap.tourDone (this browser
 * only, no tracking). QA: ?tour=1 forces it.
 * Material: tips use the Vitrine glass like the other tips over the map
 * (DESIGN.md § Glass); a spotlight dims all but the step's control, click-through.
 */
(function () {
  'use strict';
  var Q = (function () { try { return location.search + (window.frameElement ? window.frameElement.ownerDocument.location.search : ''); } catch (e) { return location.search; } })();
  var FORCE = /[?&]tour=1/.test(Q);
  var KEY = 'sdlmap.tourDone';

  var lang = window.SDL_LANG || 'en';
  var key = lang === 'zh' ? ('zh-' + (window.SDL_ZH_SCRIPT || 'Hans')) : lang;
  var S = {
    en: {
      step: 'Step {i} of 5', skip: 'Skip tour', next: 'Next', done: 'Done', clear: 'Clear and continue', play: 'Play the story', replay: 'Take the quick tour',
      s1: 'Tap a lab to open its profile. Try {name}.',
      s1b: 'Run a lab on this map? Keep its entry current from here. Looking for a partner? Ask the curator for an introduction.',
      s2: 'Narrow it down: open the filters and tap any chip, for example a domain or a country.',
      s2b: '{n} labs match. Clear brings the whole map back.',
      s3: 'Go further: the 2-minute story shows how the field grew. List, Timeline and Watch are at the top.',
      open: 'Open it',
      s2i: 'Looking for a partner? Request an introduction: a short form, and the curator asks the lab first. Run a lab on this map? Update this entry from here.',
      s2u: 'Run a lab on this map? Update this entry or claim it here: a pre-filled form, reviewed before it appears. Labs maintained with the lab can also receive introduction requests.',
      s4: 'Take the data: the full dataset as CSV, XLSX or TXT, plus a charts pack, from this button.'
    },
    'zh-Hans': {
      step: '第 {i} 步，共 5 步', skip: '跳过引导', next: '下一步', done: '完成', clear: '清除并继续', play: '播放图谱故事', replay: '快速引导',
      s1: '点击一个实验室，查看它的简介。试试 {name}。',
      s1b: '你在运营图上的某个实验室？可以在这里更新条目。在找合作伙伴？可以请策展人引荐。',
      s2: '缩小范围：打开筛选，点任意一个标签，比如领域或国家。',
      s2b: '有 {n} 个实验室符合。清除即可回到完整地图。',
      s3: '继续探索：两分钟的图谱故事讲述这个领域如何成长。列表、时间线和动态在页面顶部。',
      open: '打开看看',
      s2i: '在找合作伙伴？点“申请引荐”：填写简短表单，策展人会先征得实验室同意。你在运营图上的某个实验室？可以在这里更新条目。',
      s2u: '你在运营图上的某个实验室？可以在这里更新或认领条目：表单已预填，审核后才会出现。由实验室共同维护的条目还可以接收引荐请求。',
      s4: '带走数据：完整数据集（CSV、XLSX、TXT）以及图表包，都在这个按钮里。'
    },
    'zh-Hant': {
      step: '第 {i} 步，共 5 步', skip: '略過引導', next: '下一步', done: '完成', clear: '清除並繼續', play: '播放圖譜故事', replay: '快速引導',
      s1: '點擊一個實驗室，查看它的簡介。試試 {name}。',
      s1b: '你在經營圖上的某個實驗室？可以在這裡更新條目。在找合作夥伴？可以請策展人引薦。',
      s2: '縮小範圍：打開篩選，點任意一個標籤，例如領域或國家。',
      s2b: '有 {n} 個實驗室符合。清除即可回到完整地圖。',
      s3: '繼續探索：兩分鐘的圖譜故事講述這個領域如何成長。列表、時間線和動態在頁面頂部。',
      open: '打開看看',
      s2i: '在找合作夥伴？點「申請引薦」：填寫簡短表單，策展人會先徵得實驗室同意。你在經營圖上的某個實驗室？可以在這裡更新條目。',
      s2u: '你在經營圖上的某個實驗室？可以在這裡更新或認領條目：表單已預填，審核後才會出現。由實驗室共同維護的條目還可以接收引薦請求。',
      s4: '帶走數據：完整數據集（CSV、XLSX、TXT）以及圖表包，都在這個按鈕裡。'
    },
    ja: {
      step: 'ステップ {i} / 5', skip: 'ツアーをスキップ', next: '次へ', done: '完了', clear: 'クリアして次へ', play: 'ストーリーを再生', replay: 'クイックツアー',
      s1: 'ラボをタップしてプロフィールを開きます。{name} を試してください。',
      s1b: 'この地図のラボを運営していますか？ここから項目を更新できます。パートナーをお探しなら、キュレーターに紹介を依頼できます。',
      s2: '絞り込み：フィルターを開き、分野や国など任意のチップをタップします。',
      s2b: '{n} 件のラボが該当します。クリアで地図全体に戻ります。',
      s3: 'さらに：2 分のストーリーで分野の広がりを見られます。リスト、タイムライン、動向は上部にあります。',
      open: '開いてみる',
      s2i: 'パートナーをお探しですか？「紹介を依頼」から短いフォームを送ると、キュレーターがまずラボに確認します。この地図のラボを運営している方は、ここから項目を更新できます。',
      s2u: 'この地図のラボを運営していますか？ここから項目の更新や申請ができます。入力済みのフォームで、掲載前に確認されます。ラボと共同で更新される項目は紹介依頼も受け付けます。',
      s4: 'データを持ち出す：データセット全体（CSV・XLSX・TXT）とチャート集は、このボタンから。'
    },
    ko: {
      step: '{i} / 5 단계', skip: '투어 건너뛰기', next: '다음', done: '완료', clear: '지우고 계속', play: '스토리 재생', replay: '빠른 둘러보기',
      s1: '연구실을 눌러 프로필을 여세요. {name}을(를) 눌러 보세요.',
      s1b: '이 지도의 연구실을 운영하시나요? 여기서 항목을 최신으로 유지할 수 있습니다. 파트너를 찾으신다면 큐레이터에게 소개를 요청하세요.',
      s2: '좁혀 보기: 필터를 열고 분야나 국가 등 아무 칩이나 누르세요.',
      s2b: '{n}개 연구실이 해당합니다. 지우면 전체 지도로 돌아갑니다.',
      s3: '더 보기: 2분 스토리가 이 분야의 성장을 보여 줍니다. 목록, 타임라인, 동향은 상단에 있습니다.',
      open: '열어 보기',
      s2i: '파트너를 찾으세요? "소개 요청"에서 짧은 양식을 보내면 큐레이터가 먼저 연구실에 동의를 구합니다. 이 지도의 연구실을 운영하신다면 여기서 항목을 업데이트할 수 있습니다.',
      s2u: '이 지도의 연구실을 운영하시나요? 여기서 항목을 업데이트하거나 등록할 수 있습니다. 미리 채워진 양식이며, 검토 후 게시됩니다. 연구실과 함께 관리되는 항목은 소개 요청도 받을 수 있습니다.',
      s4: '데이터 가져가기: 전체 데이터셋(CSV, XLSX, TXT)과 차트 묶음을 이 버튼에서 받을 수 있습니다.'
    },
  };
  var T = S[key] || S.en;
  var tx = function (k, v) { return String(T[k] || S.en[k]).replace(/\{(\w+)\}/g, function (_, n) { return v && v[n] != null ? v[n] : ''; }); };

  // Showcase pin by timezone: stands alone on the map at a modest zoom.
  function showcaseId() {
    var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    if (/^America\//.test(tz)) return 'abolh';
    if (/^Asia\/(Shanghai|Chongqing|Harbin|Urumqi|Hong_Kong|Macau|Taipei)/.test(tz)) return 'ustc';
    if (/^(Asia|Australia|Pacific)\//.test(tz)) return 'riken_maholo';
    return 'imdea';
  }

  function ready() { return window.__sdlStoryAPI && window.__sheet && document.getElementById('sdl-sheet') && document.getElementById('sdl-story-play'); }
  function boot() { if (!ready()) { setTimeout(boot, 80); return; } init(); }
  boot();

  function init() {
    var API = window.__sdlStoryAPI;
    var DATA = window.SDL_DATA || [];
    var tip = document.createElement('div');
    tip.id = 'sdl-coach'; tip.className = 'coach glass glass-strong'; tip.setAttribute('role', 'dialog'); tip.setAttribute('aria-live', 'polite'); tip.hidden = true;
    tip.innerHTML = '<span class="coach-arrow" aria-hidden="true"></span><div class="coach-step"></div><p class="coach-text"></p><div class="coach-acts"></div>';
    document.body.appendChild(tip);
    // Spotlight (2026-10-06, Yuyang): dim everything except the control the
    // step is about. A transparent box over the anchor casts one huge shadow;
    // pointer-events stay off, so the map underneath remains usable.
    var spot = document.createElement('div');
    spot.className = 'coach-spot'; spot.setAttribute('aria-hidden', 'true'); spot.hidden = true;
    document.body.appendChild(spot);
    function setSpot(r, pad, round) {
      if (!r) { spot.style.cssText = 'left:50%;top:50%;width:0;height:0;border-radius:0;'; return; }
      var x = r.left - pad, y = r.top - pad, w = r.width + pad * 2, h = r.height + pad * 2;
      spot.style.cssText = 'left:' + Math.round(x) + 'px;top:' + Math.round(y) + 'px;width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px;border-radius:' + (round ? '999px' : '10px') + ';';
    }
    var stepEl = tip.querySelector('.coach-step'), textEl = tip.querySelector('.coach-text'), acts = tip.querySelector('.coach-acts'), arrow = tip.querySelector('.coach-arrow');

    var st = { on: false, anchor: null, watch: 0, ro: null, step: 0 };
    function isPhone() { return window.matchMedia('(max-width: 900px)').matches; }
    function visible(el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; }

    function place() {
      if (!st.on || tip.hidden) return;
      var a = typeof st.anchor === 'function' ? st.anchor() : st.anchor;
      var tw = tip.offsetWidth, th = tip.offsetHeight, m = 12, x, y, side = 'none';
      if (a && visible(a)) {
        var r = a.getBoundingClientRect();
        var small = r.width < 40 && r.height < 40;
        setSpot(r, small ? 14 : 8, small);
        var cx = r.left + r.width / 2;
        if (st.prefer === 'west' && !isPhone() && r.left - tw - 18 > 0) { side = 'right'; x = r.left - tw - 14; y = r.top + r.height / 2 - th / 2; }
        else if (r.bottom + th + 18 < innerHeight - (isPhone() ? 120 : 16)) { side = 'top'; y = r.bottom + 14; }
        else if (r.top - th - 18 > (isPhone() ? 60 : 70)) { side = 'bottom'; y = r.top - th - 14; }
        else if (r.right + tw + 18 < innerWidth) { side = 'left'; x = r.right + 14; y = r.top + r.height / 2 - th / 2; }
        else { side = 'right'; x = r.left - tw - 14; y = r.top + r.height / 2 - th / 2; }
        if (side === 'top' || side === 'bottom') x = cx - tw / 2;
        x = Math.max(m, Math.min(innerWidth - tw - m, x)); y = Math.max(m, Math.min(innerHeight - th - m, y));
        if (side === 'top' || side === 'bottom') arrow.style.left = Math.max(14, Math.min(tw - 14, cx - x)) + 'px', arrow.style.top = '';
        else arrow.style.top = Math.max(14, Math.min(th - 14, r.top + r.height / 2 - y)) + 'px', arrow.style.left = '';
      } else {
        setSpot(null);
        x = innerWidth / 2 - tw / 2; y = isPhone() ? 72 : 88;
      }
      tip.dataset.side = side;
      tip.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    }
    function loop() { if (!st.on) return; place(); st.raf = requestAnimationFrame(loop); }

    function show(i, text, anchor, buttons, prefer) {
      st.step = i; st.anchor = anchor; st.prefer = prefer || null;
      document.body.classList.toggle('coach-step3', i === 5);
      stepEl.textContent = tx('step', { i: i });
      textEl.textContent = text;
      acts.innerHTML = '';
      (buttons || []).concat([{ label: tx('skip'), ghost: true, fn: function () { finish(); } }]).forEach(function (b) {
        var el = document.createElement('button'); el.type = 'button'; el.className = 'coach-btn' + (b.ghost ? ' ghost' : '');
        el.textContent = b.label; el.addEventListener('click', function (e) { e.stopPropagation(); b.fn(); });
        acts.appendChild(el);
      });
      tip.hidden = false; spot.hidden = false; tip.classList.remove('in'); void tip.offsetWidth; tip.classList.add('in');
      place();
    }
    function stopWatch() { if (st.watch) clearInterval(st.watch); st.watch = 0; if (st.mo) { st.mo.disconnect(); st.mo = null; } }

    // ---- step 1: tap a lab
    function step1() {
      var id = showcaseId();
      var d = DATA.find(function (x) { return x.id === id; }) || DATA.find(function (x) { return x.id === 'imdea'; });
      if (!d) { step2(); return; }
      var marker = function () { return document.querySelector('.marker[data-id="' + d.id + '"]'); };
      var tries = [6, 9, 14, 22], ti = 0;
      function fly() {
        API.flyTo(d.lon, d.lat, tries[ti], API.reduced ? 1 : 1100);
        setTimeout(function () {
          if (!marker() && ti < tries.length - 1) { ti++; fly(); return; }
          show(1, tx('s1', { name: d.name }), marker, []);
        }, API.reduced ? 120 : 1250);
      }
      fly();
      var sheet = document.getElementById('sdl-sheet');
      st.mo = new MutationObserver(function () {
        if (sheet.classList.contains('open')) { stopWatch(); setTimeout(step1b, 450); }
      });
      st.mo.observe(sheet, { attributes: true, attributeFilter: ['class'] });
    }
    function step1b() {
      var cc = document.querySelector('#sdl-sheet .sheet-cc');
      if (cc) cc.scrollIntoView({ block: 'nearest', behavior: API.reduced ? 'auto' : 'smooth' });
      var hasIntro = !!document.querySelector('#sdl-sheet .cc-intro');
      show(2, tx(hasIntro ? 's2i' : 's2u'), function () { return document.querySelector('#sdl-sheet .sheet-cc'); }, [{ label: tx('next'), fn: function () { closeSheet(); step2(); } }], 'west');
    }
    function closeSheet() { var c = document.getElementById('sheet-close'); if (c && document.getElementById('sdl-sheet').classList.contains('open')) c.click(); }

    // ---- step 2: filter
    function filterAnchor() {
      if (isPhone()) { var pane = document.getElementById('msheet-filters'); return (pane && !pane.hidden && visible(pane)) ? pane : document.getElementById('msheet-tab-filters'); }
      var aside = document.querySelector('aside.left');
      if (aside && aside.classList.contains('open')) return aside;
      return document.getElementById('mob-filters') || aside;
    }
    function nActive() { var f = window.__sdlGetFilters ? window.__sdlGetFilters() : {}; return Object.keys(f).reduce(function (a, k) { return a + (f[k] ? f[k].length : 0); }, 0); }
    function step2() {
      stopWatch();
      show(3, tx('s2'), filterAnchor, []);
      var base = nActive();
      st.watch = setInterval(function () {
        if (nActive() > base) { stopWatch(); setTimeout(step2b, 500); }
      }, 250);
    }
    function step2b() {
      var n = window.__sdlGetFiltered ? window.__sdlGetFiltered().length : 0;
      show(3, tx('s2b', { n: n }), filterAnchor, [{ label: tx('clear'), fn: function () {
        var r = document.getElementById('reset'); if (r) r.click();
        var aside = document.querySelector('aside.left');
        if (aside && aside.classList.contains('open') && !isPhone()) { var tab = document.getElementById('mob-filters'); if (tab) tab.click(); }
        if (aside && aside.classList.contains('open')) { aside.classList.remove('open'); document.body.classList.remove('left-open', 'drawer-open'); }
        if (isPhone()) { var lt = document.getElementById('msheet-tab-list'); if (lt) lt.click(); }
        step4();
      } }]);
    }

    // ---- step 4: take the data
    function dataBtn() {
      if (isPhone()) { var a = document.querySelector('#msheet [data-act="data"]'); return visible(a) ? a : document.getElementById('msheet-head'); }
      return document.getElementById('sdl-data-floating');
    }
    function step4() {
      stopWatch();
      show(4, tx('s4'), dataBtn, [
        { label: tx('open'), fn: function () {
          var bd = document.getElementById('exp-data-backdrop');
          var b = document.getElementById('sdl-data-floating') || document.querySelector('#msheet [data-act="data"]');
          if (b) b.click();
          tip.hidden = true; spot.hidden = true;
          st.watch = setInterval(function () {
            if (!bd || !bd.classList.contains('open')) { stopWatch(); step5(); }
          }, 300);
        } },
        { label: tx('next'), fn: function () { step5(); } },
      ]);
    }

    // ---- step 5: go further
    function step5() {
      stopWatch();
      var play = document.getElementById('sdl-story-play');
      show(5, tx('s3'), play, [
        { label: tx('play'), fn: function () { finish(); setTimeout(function () { play && play.click(); }, 60); } },
        { label: tx('done'), fn: function () { finish(); } },
      ]);
    }

    function start() {
      if (st.on) return;
      st.on = true; document.body.classList.add('coach-on');
      loop(); step1();
    }
    function finish() {
      stopWatch(); st.on = false; tip.hidden = true; spot.hidden = true; tip.classList.remove('in');
      document.body.classList.remove('coach-on', 'coach-step3');
      if (st.raf) cancelAnimationFrame(st.raf);
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st.on && !document.querySelector('.cc-backdrop.open, .exp-backdrop.open')) finish(); });
    window.addEventListener('resize', place);
    window.__sdlCoach = { start: start, finish: finish };

    // "Take the quick tour" in the About card replays it.
    (function addReplay() {
      var foot = document.querySelector('#wmBackdrop .wm-foot');
      if (!foot) { setTimeout(addReplay, 200); return; }
      if (document.getElementById('wmTour')) return;
      var b = document.createElement('button'); b.type = 'button'; b.id = 'wmTour'; b.className = 'wm-tour'; b.textContent = tx('replay');
      b.addEventListener('click', function () {
        var c = document.getElementById('wmClose'); if (c) c.click();
        setTimeout(start, 500);
      });
      foot.insertBefore(b, foot.lastElementChild);
    })();

    // ---- trigger: first visit, after the welcome card closes and the arrival plays
    var done = false; try { done = localStorage.getItem(KEY) === '1'; } catch (e) {}
    if (FORCE) { setTimeout(start, 1500); return; }
    if (done) return;
    var waited = 0;
    var poll = setInterval(function () {
      waited += 150;
      var bd = document.getElementById('wmBackdrop');
      if (!bd) { if (waited > 5000) clearInterval(poll); return; }
      clearInterval(poll);
      var wasOpen = bd.classList.contains('is-open') || !bd.hidden;
      if (!wasOpen) {
        // the card did not open on this load → not a first visit; stay quiet
        setTimeout(function () { if (bd.classList.contains('is-open')) watchClose(bd); }, 2000);
        return;
      }
      watchClose(bd);
    }, 150);
    function watchClose(bd) {
      var mo = new MutationObserver(function () {
        if (!bd.classList.contains('is-open')) { mo.disconnect(); setTimeout(function () { if (!API.uiOpen() || document.body.classList.contains('coach-on')) start(); }, API.reduced ? 300 : 2800); }
      });
      mo.observe(bd, { attributes: true, attributeFilter: ['class'] });
    }
  }
})();
