/* Translation + embed-mode patch for map-legacy.html.
   Loaded after window.SDL_CATEGORIES is defined, before the main app script
   reads it, so chip labels get mutated in place.

   Reads URL params:
     ?lang=en|zh|ja|ko       Switches all visible strings.
     ?script=Hans|Hant       Sub-variant for zh (Simplified vs Traditional).
     ?embed=1                Hides the legacy header + footer + counter chips
                             (used when nested inside the Astro v2 shell).
*/
(function () {
  var params = new URLSearchParams(window.location.search);
  var lang = params.get('lang') || 'en';
  var embed = params.get('embed') === '1';

  // ZH script: localStorage is the source of truth in embed mode (the parent
  // shell writes it synchronously in <head> from its own URL ?script= param
  // before the iframe starts loading). Standalone view falls back to URL.
  var script = null;
  try {
    var ls = localStorage.getItem('sdl-zh-script');
    if (ls === 'Hans' || ls === 'Hant') script = ls;
  } catch (e) {}
  if (!script) {
    var urlScript = params.get('script');
    if (urlScript === 'Hans' || urlScript === 'Hant') script = urlScript;
  }
  if (!script) script = 'Hans';

  window.SDL_LANG = lang;
  window.SDL_ZH_SCRIPT = script;
  window.SDL_EMBED = embed;

  var I18N = {
    en: null, // english is source

    'zh-Hans': {
      cat: {
        tier: {
          label: '类型',
          options: {
            national: '国家级 / 联盟',
            academic: '学术 / 单一机构',
            commercial: '商业 / 工业',
            labos: 'Lab OS / 编排',
          },
        },
        maturity: {
          label: '成熟度',
          options: {
            concept: '概念 / 提案',
            prototype: '原型',
            operational: '运营中',
            industrial: '工业规模',
          },
        },
        domain: {
          label: '领域',
          options: {
            materials: '材料',
            chemistry: '化学',
            batteries: '电池',
            energy: '能源 / P2X',
            'drug-discovery': '药物发现',
            biology: '生物',
            'cross-domain': '跨领域',
            orchestration: '编排',
          },
        },
        charact: {
          label: '回路中的表征',
          options: {
            'synthesis-only': '仅合成',
            'single-technique': '单一技术',
            'multi-technique': '多技术',
            'advanced-multimodal': '先进多模态集成',
          },
        },
      },
      section: {
        Type: '类型',
        Maturity: '成熟度',
        Domain: '领域',
        'Characterisation in Loop': '回路中的表征',
      },
      resetBtn: '清除所有筛选',
      mobToggle: { Filters: '筛选', Selected: '已选' },
      counts: { Initiatives: '项目', Highlighted: '已筛选', Countries: '国家' },
      zoomHint: '拖动平移 · 滚动缩放 · 双击放大',
      region: { 'r-eu': '前往欧洲', 'r-us': '前往美国', 'r-ea': '前往东亚' },
      eyebrow: '荷兰国家材料发现实验室 · 实时追踪',
      brandH1Pre: '全球自驱动实验室',
      brandH1Post: '版图',
      modal: {
        eyebrow: '关于这张图',
        titlePre: '全球',
        titleDim: '自驱动实验室',
        titlePost: '版图',
        intro:
          '欢迎来到「全球自驱动实验室版图」。你看到的，是我根据公开资料整理的一张全球自驱动实验室地图，覆盖国家计划、学术团队、商业公司，以及开放的实验室操作系统。完整代码已在 <a href="https://github.com/yetiswang/sdl-map" target="_blank" rel="noopener" style="color:var(--ink-2);border-bottom:1px dotted var(--ink-3);">github.com/yetiswang/sdl-map</a> 开源，非常欢迎你来纠错或补充——可以提 issue，也可以在 GitHub 上联系我。',
        howTo: '怎么用',
        controls: [
          { k: '筛选', v: '点击侧边栏里的类型按钮（国家 / 学术 / 商业 / LabOS），把视图缩小到你关心的部分。' },
          { k: '查看', v: '点击地图上任意一个标记，看那个团队或项目的简介。' },
          { k: '重置', v: '点重置按钮，清空所有筛选，让地图回到初始状态。' },
          { k: '主题', v: '标题旁的太阳-月亮按钮，切换浅色 / 深色。' },
        ],
        foot: '由王昱扬维护。',
        cta: '开始探索 →',
      },
      sheet: {
        Org: '组织',
        Domain: '领域',
        Maturity: '成熟度',
        Characterisation: '表征',
        AI: 'AI',
        Scale: '规模',
        Investment: '投资',
      },
    },

    'zh-Hant': {
      cat: {
        tier: {
          label: '類型',
          options: {
            national: '國家級 / 聯盟',
            academic: '學術 / 單一機構',
            commercial: '商業 / 工業',
            labos: 'Lab OS / 編排',
          },
        },
        maturity: {
          label: '成熟度',
          options: {
            concept: '概念 / 提案',
            prototype: '原型',
            operational: '營運中',
            industrial: '工業規模',
          },
        },
        domain: {
          label: '領域',
          options: {
            materials: '材料',
            chemistry: '化學',
            batteries: '電池',
            energy: '能源 / P2X',
            'drug-discovery': '藥物發現',
            biology: '生物',
            'cross-domain': '跨領域',
            orchestration: '編排',
          },
        },
        charact: {
          label: '迴路中的表徵',
          options: {
            'synthesis-only': '僅合成',
            'single-technique': '單一技術',
            'multi-technique': '多技術',
            'advanced-multimodal': '先進多模態整合',
          },
        },
      },
      section: {
        Type: '類型',
        Maturity: '成熟度',
        Domain: '領域',
        'Characterisation in Loop': '迴路中的表徵',
      },
      resetBtn: '清除所有篩選',
      mobToggle: { Filters: '篩選', Selected: '已選' },
      counts: { Initiatives: '項目', Highlighted: '已篩選', Countries: '國家' },
      zoomHint: '拖動平移 · 滾動縮放 · 雙擊放大',
      region: { 'r-eu': '前往歐洲', 'r-us': '前往美國', 'r-ea': '前往東亞' },
      eyebrow: '荷蘭國家材料發現實驗室 · 即時追蹤',
      brandH1Pre: '全球自驅動實驗室',
      brandH1Post: '版圖',
      modal: {
        eyebrow: '關於這張圖',
        titlePre: '全球',
        titleDim: '自驅動實驗室',
        titlePost: '版圖',
        intro:
          '歡迎來到「全球自驅動實驗室版圖」。你看到的，是我根據公開資料整理的一張全球自驅動實驗室地圖，涵蓋國家計畫、學術團隊、商業公司，以及開放的實驗室作業系統。完整原始碼已在 <a href="https://github.com/yetiswang/sdl-map" target="_blank" rel="noopener" style="color:var(--ink-2);border-bottom:1px dotted var(--ink-3);">github.com/yetiswang/sdl-map</a> 開源，非常歡迎你來指正或補充——可以開 issue，也可以在 GitHub 上聯絡我。',
        howTo: '怎麼用',
        controls: [
          { k: '篩選', v: '點側邊欄裡的類型按鈕（國家 / 學術 / 商業 / LabOS），把視圖收斂到你關心的部分。' },
          { k: '查看', v: '點地圖上任一標記，看那個團隊或計畫的簡介。' },
          { k: '重置', v: '點重置鈕，清掉所有篩選，地圖回到初始狀態。' },
          { k: '主題', v: '標題旁的太陽-月亮鈕，切換淺色 / 深色。' },
        ],
        foot: '由王昱揚維護。',
        cta: '開始探索 →',
      },
      sheet: {
        Org: '組織',
        Domain: '領域',
        Maturity: '成熟度',
        Characterisation: '表徵',
        AI: 'AI',
        Scale: '規模',
        Investment: '投資',
      },
    },

    ja: {
      cat: {
        tier: {
          label: '区分',
          options: {
            national: '国家 / コンソーシアム',
            academic: '学術 / 単一機関',
            commercial: '商業 / 産業',
            labos: 'Lab OS / オーケストレーション',
          },
        },
        maturity: {
          label: '成熟度',
          options: {
            concept: '構想 / 提案',
            prototype: 'プロトタイプ',
            operational: '運用中',
            industrial: '産業規模',
          },
        },
        domain: {
          label: '分野',
          options: {
            materials: '材料',
            chemistry: '化学',
            batteries: '電池',
            energy: 'エネルギー / P2X',
            'drug-discovery': '創薬',
            biology: '生物学',
            'cross-domain': '横断',
            orchestration: 'オーケストレーション',
          },
        },
        charact: {
          label: 'ループ内キャラクタリゼーション',
          options: {
            'synthesis-only': '合成のみ',
            'single-technique': '単一手法',
            'multi-technique': '複数手法',
            'advanced-multimodal': '先進マルチモーダル統合',
          },
        },
      },
      section: {
        Type: '区分',
        Maturity: '成熟度',
        Domain: '分野',
        'Characterisation in Loop': 'ループ内キャラクタリゼーション',
      },
      resetBtn: 'すべてのフィルタをクリア',
      mobToggle: { Filters: 'フィルタ', Selected: '選択' },
      counts: { Initiatives: 'プロジェクト', Highlighted: '選択中', Countries: '国' },
      zoomHint: 'ドラッグで移動 · スクロールでズーム · ダブルクリックで拡大',
      region: { 'r-eu': '欧州へ', 'r-us': '米国へ', 'r-ea': '東アジアへ' },
      eyebrow: 'オランダ国家材料発見研究所 · ライブ追跡',
      brandH1Pre: 'グローバル自動実験室',
      brandH1Post: 'ランドスケープ',
      modal: {
        eyebrow: 'このマップについて',
        titlePre: '世界の',
        titleDim: '自動化実験室',
        titlePost: 'マップ',
        intro:
          '「世界の自動化実験室マップ」へようこそ。お見せしているのは、公開情報をもとに私自身が手で集めた世界中の自動化実験室の分布図です。国家プロジェクト、研究グループ、企業、オープンなラボOSまで含めています。ソースコードはすべて <a href="https://github.com/yetiswang/sdl-map" target="_blank" rel="noopener" style="color:var(--ink-2);border-bottom:1px dotted var(--ink-3);">github.com/yetiswang/sdl-map</a> で公開しています。誤りの指摘や追加情報は大歓迎です。Issue を立てるか、GitHub からご連絡ください。',
        howTo: '使い方',
        controls: [
          { k: '絞り込み', v: 'サイドバーの種別ボタン（国家 / 学術 / 商業 / LabOS）を押すと、表示を絞れます。' },
          { k: '詳細', v: 'マップ上のマーカーを押すと、そのグループや計画の概要が出ます。' },
          { k: 'リセット', v: 'リセットボタンを押すと、絞り込みが解除されてマップが元の位置に戻ります。' },
          { k: 'テーマ', v: 'タイトル横の太陽 / 月のボタンで、明るい / 暗いを切り替えます。' },
        ],
        foot: '王昱揚が運営しています。',
        cta: 'マップを開く →',
      },
      sheet: {
        Org: '所属',
        Domain: '分野',
        Maturity: '成熟度',
        Characterisation: 'キャラクタリゼーション',
        AI: 'AI',
        Scale: '規模',
        Investment: '投資',
      },
    },

    ko: {
      cat: {
        tier: {
          label: '구분',
          options: {
            national: '국가 / 컨소시엄',
            academic: '학술 / 단일 기관',
            commercial: '상업 / 산업',
            labos: 'Lab OS / 오케스트레이션',
          },
        },
        maturity: {
          label: '성숙도',
          options: {
            concept: '구상 / 제안',
            prototype: '프로토타입',
            operational: '운영 중',
            industrial: '산업 규모',
          },
        },
        domain: {
          label: '분야',
          options: {
            materials: '재료',
            chemistry: '화학',
            batteries: '배터리',
            energy: '에너지 / P2X',
            'drug-discovery': '신약 개발',
            biology: '생물학',
            'cross-domain': '교차 분야',
            orchestration: '오케스트레이션',
          },
        },
        charact: {
          label: '루프 내 캐릭터라이제이션',
          options: {
            'synthesis-only': '합성만',
            'single-technique': '단일 기법',
            'multi-technique': '복수 기법',
            'advanced-multimodal': '고급 멀티모달 통합',
          },
        },
      },
      section: {
        Type: '구분',
        Maturity: '성숙도',
        Domain: '분야',
        'Characterisation in Loop': '루프 내 캐릭터라이제이션',
      },
      resetBtn: '모든 필터 지우기',
      mobToggle: { Filters: '필터', Selected: '선택' },
      counts: { Initiatives: '프로젝트', Highlighted: '선택', Countries: '국가' },
      zoomHint: '드래그로 이동 · 스크롤로 줌 · 더블클릭으로 확대',
      region: { 'r-eu': '유럽으로', 'r-us': '미국으로', 'r-ea': '동아시아로' },
      eyebrow: '네덜란드 국가재료발견연구소 · 실시간 추적',
      brandH1Pre: '글로벌 자율실험실',
      brandH1Post: '랜드스케이프',
      modal: {
        eyebrow: '이 지도에 대해',
        titlePre: '전 세계',
        titleDim: '자율실험실',
        titlePost: '지도',
        intro:
          '「전 세계 자율실험실 지도」에 오신 것을 환영합니다. 보고 계신 것은 제가 공개된 정보를 바탕으로 직접 정리한 세계 자율실험실 분포도입니다. 국가 프로젝트, 연구 그룹, 기업, 오픈 랩 OS까지 포함했습니다. 전체 소스코드는 <a href="https://github.com/yetiswang/sdl-map" target="_blank" rel="noopener" style="color:var(--ink-2);border-bottom:1px dotted var(--ink-3);">github.com/yetiswang/sdl-map</a> 에 공개되어 있습니다. 정정이나 추가 정보는 언제든 환영합니다. Issue를 올리거나 GitHub로 연락 주세요.',
        howTo: '쓰는 법',
        controls: [
          { k: '필터', v: '사이드바의 분류 버튼(국가 / 학술 / 상업 / LabOS)을 눌러 화면을 좁히세요.' },
          { k: '상세', v: '지도의 마커를 누르면 그 그룹이나 프로젝트의 간단한 소개가 뜹니다.' },
          { k: '초기화', v: '초기화 버튼을 누르면 필터가 풀리고 지도가 원래 위치로 돌아갑니다.' },
          { k: '테마', v: '제목 옆의 해 / 달 버튼으로 밝은 / 어두운 테마를 바꿉니다.' },
        ],
        foot: '왕욱양이 관리합니다.',
        cta: '지도 열기 →',
      },
      sheet: {
        Org: '소속',
        Domain: '분야',
        Maturity: '성숙도',
        Characterisation: '캐릭터라이제이션',
        AI: 'AI',
        Scale: '규모',
        Investment: '투자',
      },
    },
  };

  // Resolve dictionary
  var key = lang;
  if (lang === 'zh') key = script === 'Hant' ? 'zh-Hant' : 'zh-Hans';
  var t = I18N[key];
  window.SDL_T = t;

  // === Per-language welcome modal ===
  // Monkey-patch localStorage so the legacy's single 'sdlmap.welcomeSeen' key
  // transparently hits a per-language slot. Each language gets its own
  // first-visit modal — no migration from prior EN visits, the user should
  // see the translated modal once for every language they visit.
  if (embed) {
    var seenKey = 'sdlmap.welcomeSeen.' + key;
    try {
      // Clear the legacy universal key so old values don't shadow the
      // per-language slot via the proxy.
      localStorage.removeItem('sdlmap.welcomeSeen');
    } catch (e) {}

    var _origSet = Storage.prototype.setItem;
    var _origGet = Storage.prototype.getItem;
    var _origRem = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'sdlmap.welcomeSeen') k = seenKey;
      return _origSet.call(this, k, v);
    };
    Storage.prototype.getItem = function (k) {
      if (k === 'sdlmap.welcomeSeen') k = seenKey;
      return _origGet.call(this, k);
    };
    Storage.prototype.removeItem = function (k) {
      if (k === 'sdlmap.welcomeSeen') k = seenKey;
      return _origRem.call(this, k);
    };
  }

  // Mutate SDL_CATEGORIES in place so chip rendering picks up translated labels.
  if (t && window.SDL_CATEGORIES) {
    Object.keys(t.cat).forEach(function (grp) {
      var src = window.SDL_CATEGORIES[grp];
      if (!src) return;
      var def = t.cat[grp];
      if (def.label) src.label = def.label;
      if (def.options && src.options) {
        src.options.forEach(function (opt) {
          if (def.options[opt.id]) opt.label = def.options[opt.id];
        });
      }
    });
  }

  // Chinese entity name/org overrides — applied to the 11 entries that ARE
  // Chinese. Mutates SDL_DATA before the main app reads it, so tooltip and
  // selected-card both show the right name.
  var CHINA_NAMES = {
    ustc:      { 'zh-Hans': { name: '江俊团队 / 机器化学家',          org: '中国科学技术大学（江俊）' },
                 'zh-Hant': { name: '江俊團隊 / 機器化學家',          org: '中國科學技術大學（江俊）' } },
    xtalpi:    { 'zh-Hans': { name: '晶泰科技',                        org: '晶泰科技（港交所上市）' },
                 'zh-Hant': { name: '晶泰科技',                        org: '晶泰科技（港交所上市）' } },
    deepp:     { 'zh-Hans': { name: '深度原理',                        org: '深度原理（Deep Principle）' },
                 'zh-Hant': { name: '深度原理',                        org: '深度原理（Deep Principle）' } },
    qingkui:   { 'zh-Hans': { name: '青葵智造',                        org: '青葵智造' },
                 'zh-Hant': { name: '青葵智造',                        org: '青葵智造' } },
    yong:      { 'zh-Hans': { name: '甬江实验室',                      org: '宁波省级实验室' },
                 'zh-Hant': { name: '甬江實驗室',                      org: '寧波省級實驗室' } },
    dpt:       { 'zh-Hans': { name: '深势科技 / Bohrium',              org: '深势科技（DP Technology）' },
                 'zh-Hant': { name: '深勢科技 / Bohrium',              org: '深勢科技（DP Technology）' } },
    jiageng:   { 'zh-Hans': { name: '嘉庚创新实验室',                  org: '厦门大学 / 福建省' },
                 'zh-Hant': { name: '嘉庚創新實驗室',                  org: '廈門大學 / 福建省' } },
    shailab:   { 'zh-Hans': { name: '上海人工智能实验室',              org: '国家人工智能实验室' },
                 'zh-Hant': { name: '上海人工智能實驗室',              org: '國家人工智能實驗室' } },
    bytedance: { 'zh-Hans': { name: '字节跳动 Seed AI4S',              org: '字节跳动' },
                 'zh-Hant': { name: '字節跳動 Seed AI4S',              org: '字節跳動' } },
    deeph:     { 'zh-Hans': { name: 'DeepH（段路明团队）',             org: '清华大学' },
                 'zh-Hant': { name: 'DeepH（段路明團隊）',             org: '清華大學' } },
    surff:     { 'zh-Hans': { name: 'SurFF / Uni-MOF（王笑楠团队）',   org: '清华大学' },
                 'zh-Hant': { name: 'SurFF / Uni-MOF（王笑楠團隊）',   org: '清華大學' } },
  };
  if (lang === 'zh' && Array.isArray(window.SDL_DATA)) {
    var scriptKey = script === 'Hant' ? 'zh-Hant' : 'zh-Hans';
    window.SDL_DATA.forEach(function (entry) {
      var override = CHINA_NAMES[entry.id];
      if (override && override[scriptKey]) {
        if (override[scriptKey].name) entry.name = override[scriptKey].name;
        if (override[scriptKey].org) entry.org = override[scriptKey].org;
      }
    });
  }

  // Mark the body so the embed-mode CSS below actually matches.
  function applyEmbedClass() {
    if (embed) document.body.classList.add('embed-mode');
    if (lang) document.body.classList.add('lang-' + lang);
  }
  if (document.body) applyEmbedClass();
  else document.addEventListener('DOMContentLoaded', applyEmbedClass);

  // Theme: when embedded, inherit shell's preference via localStorage (we share
  // the origin so localStorage is shared). Default to dark to match the shell.
  // The legacy's own theme IIFE later reads the same key.
  if (embed) {
    try {
      // NB: distinct variable name — `t` further down is the i18n dictionary
      // and JS `var` is function-scoped, so reusing the name here would
      // silently shadow the dictionary inside translateModal et al.
      var savedTheme = localStorage.getItem('sdl-map-theme');
      if (savedTheme !== 'dark' && savedTheme !== 'light') {
        localStorage.setItem('sdl-map-theme', 'dark');
      }
    } catch (e) {}
  }

  // Inject embed-mode CSS BEFORE the legacy header renders so it never paints.
  // Keep the legacy `<header class="top">` element in the DOM so its mobile
  // .mob-toggle children stay reachable — just collapse the header to a
  // zero-height floating bar and re-pin the toggles to the viewport corners.
  function injectStyles() {
    if (!embed) return;
    var s = document.createElement('style');
    s.id = 'sdl-embed-style';
    s.textContent = [
      ':root { --header-h: 0px !important; }',
      'body.embed-mode header.top {',
      '  position: absolute !important;',
      '  top: 0 !important; left: 0 !important; right: 0 !important;',
      '  height: 0 !important; padding: 0 !important; margin: 0 !important;',
      '  border: none !important; background: transparent !important;',
      '  z-index: 50 !important; overflow: visible !important;',
      '}',
      'body.embed-mode header.top > *:not(.mob-toggle) { display: none !important; }',
      // Don\'t move the .mob-toggle pull tabs — the legacy CSS pins them at
      // left:0/right:0, top:50% with translateY(-50%). Just bump z-index so
      // they sit above the map canvas.
      'body.embed-mode .mob-toggle.mob-only { z-index: 55 !important; }',
      'body.embed-mode footer.bot { display: none !important; }',
      'body.embed-mode aside.left, body.embed-mode aside.right { top: 0 !important; }',
      'body.embed-mode .map-wrap { top: 0 !important; }',
      'body.embed-mode .wm-reopen { top: 14px !important; }',
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  }
  injectStyles();

  // Translate static elements + welcome modal + sheet. Re-runs whenever the
  // dynamic UI (welcome modal, sheet) appears. Every dictionary lookup is
  // defensive — a missing subkey must NOT crash translateStatic, otherwise
  // translateModal never gets a chance to run.
  function translateStatic() {
    if (!t) return;
    // Section headings
    document.querySelectorAll('.section-h').forEach(function (el) {
      var orig = (el.textContent || '').trim();
      if (t.section && t.section[orig]) el.textContent = t.section[orig];
    });
    // Reset button
    var reset = document.getElementById('reset');
    if (reset && t.resetBtn) reset.textContent = t.resetBtn;
    // Mobile toggles (the .lbl span inside)
    document.querySelectorAll('.mob-toggle .lbl').forEach(function (el) {
      var orig = (el.textContent || '').trim();
      if (t.mobToggle && t.mobToggle[orig]) el.textContent = t.mobToggle[orig];
    });
    // Counter labels
    document.querySelectorAll('.counts .lbl').forEach(function (el) {
      var orig = (el.textContent || '').trim();
      if (t.counts && t.counts[orig]) el.textContent = t.counts[orig];
    });
    // Zoom hint
    var zhint = document.getElementById('z-hint');
    if (zhint && t.zoomHint) zhint.textContent = t.zoomHint;
    // Region nav titles
    ['r-eu', 'r-us', 'r-ea'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && t.region && t.region[id]) el.title = t.region[id];
    });
    // Brand strings — only matter when not in embed mode
    if (!embed) {
      var eyebrow = document.querySelector('.brand .eyebrow');
      if (eyebrow && t.eyebrow) eyebrow.textContent = t.eyebrow;
      var h1 = document.querySelector('.brand h1');
      if (h1 && t.brandH1Pre) {
        h1.innerHTML =
          t.brandH1Pre + ' <span class="dim">' + (t.brandH1Post || '') + '</span>';
      }
    }
  }

  function translateModal() {
    if (!t) return false;
    var modal = document.getElementById('wmBackdrop');
    if (!modal) return false;
    if (modal.dataset.i18nDone === '1') return false;
    var m = t.modal;
    if (!m) return false;
    var eyebrow = modal.querySelector('.wm-eyebrow');
    if (eyebrow) eyebrow.textContent = m.eyebrow;
    var title = modal.querySelector('.wm-title');
    if (title) {
      title.innerHTML =
        m.titlePre +
        ' <span class="dim">' +
        m.titleDim +
        '</span> ' +
        m.titlePost;
    }
    var intro = modal.querySelector('.wm-intro');
    if (intro) intro.innerHTML = m.intro; // innerHTML so the GitHub link in m.intro renders as an anchor
    var secH = modal.querySelector('.wm-sec-h');
    if (secH) secH.textContent = m.howTo;
    var ctrls = modal.querySelectorAll('.wm-ctrl');
    if (m.controls && ctrls.length) {
      ctrls.forEach(function (c, i) {
        var def = m.controls[i];
        if (!def) return;
        var k = c.querySelector('.wm-ctrl-k');
        var v = c.querySelector('.wm-ctrl-v');
        if (k) k.textContent = def.k;
        if (v) v.textContent = def.v;
      });
    }
    var foot = modal.querySelector('.wm-foot span');
    if (foot) foot.textContent = m.foot;
    var cta = modal.querySelector('.wm-cta');
    if (cta) cta.textContent = m.cta;
    modal.dataset.i18nDone = '1';
    return true;
  }

  function translateSheet() {
    if (!t) return false;
    var sheet = document.getElementById('sdl-sheet');
    if (!sheet) return false;
    var rows = sheet.querySelectorAll('.sheet-row .k');
    var any = false;
    rows.forEach(function (k) {
      var orig = (k.textContent || '').trim();
      if (t.sheet && t.sheet[orig]) {
        k.textContent = t.sheet[orig];
        any = true;
      }
    });
    return any;
  }

  function runTranslate() {
    if (!t) return; // English source
    try { translateStatic(); } catch (e) { console.error('[i18n] translateStatic:', e); }
    try { translateModal(); } catch (e) { console.error('[i18n] translateModal:', e); }
    try { translateSheet(); } catch (e) { console.error('[i18n] translateSheet:', e); }
  }
  // Expose for debugging + so cross-frame code can force a re-translate.
  window.SDL_runTranslate = runTranslate;
  window.SDL_translateModal = translateModal;

  // === Cross-frame theme listener ===
  // The Astro shell posts a message on every theme toggle. We respond by
  // invoking the legacy's applyTheme which does the full reflow + canvas
  // redraw. PostMessage is more reliable than the shell's direct call
  // because its delivery doesn't race with iframe boot or async fetches.
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || d.type !== 'sdl-theme') return;
    if (d.theme !== 'light' && d.theme !== 'dark') return;
    function apply() {
      if (typeof window.__sdlApplyTheme === 'function') {
        window.__sdlApplyTheme(d.theme);
        return true;
      }
      return false;
    }
    if (!apply()) {
      // Legacy theme IIFE may not have run yet. Poll briefly.
      var tries = 0;
      var iv = setInterval(function () {
        if (apply() || ++tries > 40) clearInterval(iv);
      }, 100);
    }
  });

  // Storage event fallback: another tab (or the shell's localStorage write
  // before postMessage lands) can wake this iframe up.
  window.addEventListener('storage', function (ev) {
    if (ev.key !== 'sdl-map-theme') return;
    var v = ev.newValue;
    if ((v === 'light' || v === 'dark') && typeof window.__sdlApplyTheme === 'function') {
      window.__sdlApplyTheme(v);
    }
  });

  // === Floating "Clear filters + selected" button (next to the ⓘ reopen) ===
  // Injected in embed mode only. Style mirrors the wm-reopen pill: same size,
  // same backdrop blur, sitting 8px to the right of the ⓘ button.
  function injectClearButton() {
    if (!embed) return;
    if (document.getElementById('sdl-clear-floating')) return;
    var btn = document.createElement('button');
    btn.id = 'sdl-clear-floating';
    btn.type = 'button';
    var labelByLang = {
      en: 'Clear filters & selected',
      'zh-Hans': '清除筛选与已选',
      'zh-Hant': '清除篩選與已選',
      ja: 'フィルタと選択を解除',
      ko: '필터 및 선택 해제',
    };
    var label = labelByLang[key] || labelByLang.en;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 6h18"/>' +
      '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
      '<path d="M19 6l-1.5 14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2L5 6"/>' +
      '<line x1="10" y1="11" x2="10" y2="17"/>' +
      '<line x1="14" y1="11" x2="14" y2="17"/>' +
      '</svg>';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      // Full "restore to original map view":
      // 1. Clear filter chips via legacy reset button
      var resetBtn = document.getElementById('reset');
      if (resetBtn) resetBtn.click();
      // 2. Reset zoom + pan via legacy zoom-reset button
      var zReset = document.getElementById('z-reset');
      if (zReset) zReset.click();
      // 3. Close the detail sheet
      var sheet = document.getElementById('sdl-sheet');
      if (sheet) {
        sheet.classList.remove('open');
        document.body.classList.remove('sheet-open');
      }
      // 4. Close the left/right drawer asides (mobile / responsive)
      ['aside.left', 'aside.right'].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el && el.classList.contains('open')) {
          el.classList.remove('open');
          document.body.classList.remove('drawer-open');
          document.body.classList.remove('left-open');
          document.body.classList.remove('right-open');
        }
      });
    });
    document.body.appendChild(btn);
  }

  // Style the floating clear button to match wm-reopen.
  function injectClearStyles() {
    if (!embed) return;
    var s = document.createElement('style');
    s.id = 'sdl-clear-style';
    s.textContent = [
      '#sdl-clear-floating {',
      '  position: fixed;',
      '  top: 14px; left: 70px;', // wm-reopen sits at left:14px-ish; 8px gap to its right edge
      '  width: 44px; height: 44px;',
      '  display: inline-flex; align-items: center; justify-content: center;',
      '  background: oklch(from var(--bg) l c h / 0.65);',
      '  border: 1px solid var(--rule);',
      '  color: var(--ink-2);',
      '  border-radius: 50%;',
      '  cursor: pointer; padding: 0;',
      '  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);',
      '  box-shadow: 0 2px 8px oklch(0 0 0 / 0.12);',
      '  z-index: 35;',
      '  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;',
      '}',
      '#sdl-clear-floating:hover {',
      '  background: var(--bg);',
      '  color: var(--ink);',
      '  transform: translateY(-1px);',
      '}',
      '#sdl-clear-floating:focus-visible {',
      '  outline: 2px solid var(--ink);',
      '  outline-offset: 3px;',
      '}',
      '@media (max-width: 768px) {',
      '  #sdl-clear-floating { left: 76px; width: 53px; height: 53px; }',
      '}',
      '@media (max-width: 480px) {',
      '  #sdl-clear-floating { left: 68px; width: 49px; height: 49px; }',
      '}',
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  }

  function bootstrap() {
    injectClearStyles();
    injectClearButton();
    // Run NOW (modal may already be in DOM) + a couple of follow-ups for
    // any element that gets added later by async paths.
    runTranslate();
    [80, 400, 1200].forEach(function (ms) { setTimeout(runTranslate, ms); });

    // Debounced observer: the legacy app fires a flood of DOM mutations on
    // marker hovers, filter clicks and drawer animations. Without debouncing
    // we'd re-run the entire translate pass dozens of times per second,
    // freezing the UI on language switch and other interactions.
    var debounceTimer = null;
    var observer = new MutationObserver(function () {
      if (debounceTimer) return;
      debounceTimer = setTimeout(function () {
        debounceTimer = null;
        runTranslate();
      }, 180);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
