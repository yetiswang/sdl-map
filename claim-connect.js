/* Claim & Connect (2026-10-06) — owner-maintained entries and curated
   introductions. Design: vault 30-Projects/SDL-Map/2026-10-06-claim-and-connect-design.

   Loaded synchronously after map-i18n.js and before the main app script, so
   it can add the "Open to" filter group to SDL_CATEGORIES with labels already
   in the page language. Exposes window.SDL_CC for the detail card.

   Invariants kept: one dataset (sdl_data.json gains optional `claimed` and
   `open`), no third-party runtime origins (links only), no personal data on
   the site (updates go to public GitHub issues without contact details;
   introduction requests go by email to the curator, never to GitHub). */
(function () {
  // Curator mailbox (2026-10-06: the curator's TU/e address for now;
  // discoverylabs.nl has no MX record — move to a project address when it exists).
  var CURATOR_EMAIL = 'y.wang8@tue.nl';
  var REPO = 'https://github.com/yetiswang/sdl-map';

  var OFFERS = ['collaboration', 'lab-access', 'software', 'data', 'training', 'visits'];
  var SEEKS = ['academic-partners', 'industry-partners', 'use-cases', 'datasets', 'hardware', 'software', 'consortium'];
  var PURPOSES = ['collab', 'access', 'software', 'data', 'consortium', 'other'];

  var EN = {
    openTo: 'Open to', seeks: 'Seeks', stack: 'Stack',
    v: {
      collaboration: 'Collaboration', 'lab-access': 'Lab access', software: 'Software / platform', data: 'Data sharing',
      training: 'Training', visits: 'Visits', 'academic-partners': 'Academic partners', 'industry-partners': 'Industry partners',
      'use-cases': 'Use-cases', datasets: 'Datasets', hardware: 'Hardware', consortium: 'Consortium partners',
    },
    intro: 'Request an introduction', update: 'Update this entry', claim: 'This is my lab',
    noGit: 'No GitHub? Email the curator',
    maintained: 'Maintained with the lab',
    dlgTitle: 'Request an introduction', dlgTo: 'to',
    fName: 'Your name', fOrg: 'Organisation', fEmail: 'Email', fPurpose: 'Purpose', fContext: 'Context (three lines)',
    p: { collab: 'Research collaboration', access: 'Lab or instrument access', software: 'Software or platform', data: 'Data', consortium: 'Consortium or funding call', other: 'Other' },
    consent: 'I agree that the curator contacts {name} on my behalf.',
    send: 'Prepare email',
    dlgNote: 'This opens your email app with the request addressed to the curator. We ask {name} first; nothing is published, only anonymous totals.',
    need: 'Please fill in your name, organisation, email and the consent box.',
  };
  var L10N = {
    'zh-Hans': {
      openTo: '可提供', seeks: '寻求', stack: '技术栈',
      v: { collaboration: '研究合作', 'lab-access': '实验室开放使用', software: '软件 / 平台', data: '数据共享', training: '培训', visits: '参观交流', 'academic-partners': '学术伙伴', 'industry-partners': '产业伙伴', 'use-cases': '应用场景', datasets: '数据集', hardware: '硬件', consortium: '联合申请伙伴' },
      intro: '申请引荐', update: '更新此条目', claim: '这是我的实验室', noGit: '没有 GitHub？给策展人发邮件',
      maintained: '由实验室共同维护', dlgTitle: '申请引荐', dlgTo: '对象：',
      fName: '姓名', fOrg: '机构', fEmail: '邮箱', fPurpose: '目的', fContext: '背景（三行以内）',
      p: { collab: '研究合作', access: '实验室或仪器使用', software: '软件或平台', data: '数据', consortium: '联合申请或资助项目', other: '其他' },
      consent: '我同意由策展人代我联系 {name}。', send: '生成邮件',
      dlgNote: '将打开你的邮件应用，邮件发给策展人。我们会先征得 {name} 同意；内容不会公开，只公布匿名汇总。',
      need: '请填写姓名、机构、邮箱，并勾选同意。',
    },
    'zh-Hant': {
      openTo: '可提供', seeks: '尋求', stack: '技術棧',
      v: { collaboration: '研究合作', 'lab-access': '實驗室開放使用', software: '軟體 / 平台', data: '數據共享', training: '培訓', visits: '參觀交流', 'academic-partners': '學術夥伴', 'industry-partners': '產業夥伴', 'use-cases': '應用場景', datasets: '數據集', hardware: '硬體', consortium: '聯合申請夥伴' },
      intro: '申請引薦', update: '更新此條目', claim: '這是我的實驗室', noGit: '沒有 GitHub？寄信給策展人',
      maintained: '由實驗室共同維護', dlgTitle: '申請引薦', dlgTo: '對象：',
      fName: '姓名', fOrg: '機構', fEmail: '電子郵件', fPurpose: '目的', fContext: '背景（三行以內）',
      p: { collab: '研究合作', access: '實驗室或儀器使用', software: '軟體或平台', data: '數據', consortium: '聯合申請或資助計畫', other: '其他' },
      consent: '我同意由策展人代我聯繫 {name}。', send: '產生郵件',
      dlgNote: '將開啟你的郵件應用，郵件寄給策展人。我們會先徵得 {name} 同意；內容不會公開，只公布匿名統計。',
      need: '請填寫姓名、機構、電子郵件，並勾選同意。',
    },
    ja: {
      openTo: '提供できること', seeks: '求めていること', stack: '技術スタック',
      v: { collaboration: '共同研究', 'lab-access': 'ラボ利用', software: 'ソフトウェア / プラットフォーム', data: 'データ共有', training: 'トレーニング', visits: '見学', 'academic-partners': '学術パートナー', 'industry-partners': '産業パートナー', 'use-cases': 'ユースケース', datasets: 'データセット', hardware: 'ハードウェア', consortium: 'コンソーシアム' },
      intro: '紹介を依頼', update: 'この項目を更新', claim: '自分のラボです', noGit: 'GitHub がない場合はメールで',
      maintained: 'ラボと共同で更新', dlgTitle: '紹介を依頼', dlgTo: '宛先：',
      fName: '氏名', fOrg: '所属', fEmail: 'メール', fPurpose: '目的', fContext: '背景（3 行以内）',
      p: { collab: '共同研究', access: 'ラボ・装置の利用', software: 'ソフトウェア・プラットフォーム', data: 'データ', consortium: 'コンソーシアム・公募', other: 'その他' },
      consent: 'キュレーターが私に代わって {name} に連絡することに同意します。', send: 'メールを作成',
      dlgNote: 'メールアプリが開き、キュレーター宛ての依頼が作成されます。まず {name} の了承を得ます。内容は公開せず、匿名の集計のみ公開します。',
      need: '氏名、所属、メールを入力し、同意にチェックしてください。',
    },
    ko: {
      openTo: '제공 가능', seeks: '찾는 것', stack: '기술 스택',
      v: { collaboration: '연구 협력', 'lab-access': '실험실 이용', software: '소프트웨어 / 플랫폼', data: '데이터 공유', training: '교육', visits: '방문', 'academic-partners': '학계 파트너', 'industry-partners': '산업 파트너', 'use-cases': '활용 사례', datasets: '데이터셋', hardware: '하드웨어', consortium: '컨소시엄 파트너' },
      intro: '소개 요청', update: '항목 업데이트', claim: '우리 연구실입니다', noGit: 'GitHub가 없나요? 큐레이터에게 이메일',
      maintained: '연구실과 함께 관리', dlgTitle: '소개 요청', dlgTo: '대상:',
      fName: '이름', fOrg: '소속', fEmail: '이메일', fPurpose: '목적', fContext: '배경 (세 줄 이내)',
      p: { collab: '연구 협력', access: '실험실 또는 장비 이용', software: '소프트웨어 또는 플랫폼', data: '데이터', consortium: '컨소시엄 또는 공모', other: '기타' },
      consent: '큐레이터가 저를 대신해 {name}에 연락하는 데 동의합니다.', send: '이메일 작성',
      dlgNote: '이메일 앱이 열리고 큐레이터에게 보내는 요청이 작성됩니다. 먼저 {name}의 동의를 구하며, 내용은 공개되지 않고 익명 집계만 공개됩니다.',
      need: '이름, 소속, 이메일을 입력하고 동의에 체크해 주세요.',
    },
  };

  var lang = window.SDL_LANG || 'en';
  var key = lang === 'zh' ? ('zh-' + (window.SDL_ZH_SCRIPT || 'Hans')) : lang;
  var T = L10N[key] || null;
  function t(k) { return (T && T[k] != null) ? T[k] : EN[k]; }
  function tv(id) { return (T && T.v[id]) || EN.v[id] || id; }
  function tp(id) { return (T && T.p[id]) || EN.p[id] || id; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function monthLabel(ym) {
    if (!/^\d{4}-\d{2}$/.test(ym || '')) return '';
    var d = new Date(ym + '-01T00:00:00Z');
    try { return d.toLocaleDateString(lang === 'en' ? 'en-GB' : (key || lang), { month: 'short', year: 'numeric', timeZone: 'UTC' }); }
    catch (e) { return ym; }
  }

  // ---- "Open to" filter group (static vocabulary, hidden while no entry uses it)
  if (window.SDL_CATEGORIES) {
    window.SDL_CATEGORIES.open = { label: t('openTo'), multi: true, options: OFFERS.map(function (id) { return { id: id, label: tv(id) }; }) };
  }
  // Multi-valued groups read an array; single-valued groups read d[group].
  function valuesOf(d, group) {
    if (group === 'open') return (d.open && Array.isArray(d.open.offers)) ? d.open.offers : [];
    return [d[group]];
  }

  // ---- update / claim links
  function issueUrl(d, kind) {
    var q = new URLSearchParams({
      template: 'update-lab.yml',
      title: (kind === 'claim' ? '[Claim] ' : '[Update] ') + d.name,
      entry_id: d.id,
      entry_name: d.name,
    });
    return REPO + '/issues/new?' + q.toString();
  }
  function mailUpdateUrl(d) {
    var body = 'Entry: ' + d.name + ' (' + d.id + ')\n\nWhat should change (with a public source for each fact):\n\n\nOpen to (collaboration / lab access / software / data / training / visits):\nSeeks:\nStack (hardware, software, standards):\n\nTo claim the entry, send this from an address on your lab or company domain.';
    return 'mailto:' + CURATOR_EMAIL + '?subject=' + encodeURIComponent('[SDL map] Update: ' + d.name) + '&body=' + encodeURIComponent(body);
  }

  // ---- card block
  function chips(list, isVocab) {
    return '<div class="cc-chips">' + list.map(function (v) { return '<span class="cc-chip">' + esc(isVocab ? tv(v) : v) + '</span>'; }).join('') + '</div>';
  }
  function cardHtml(d) {
    var o = d.open || {};
    var stack = [].concat((o.stack && o.stack.hardware) || [], (o.stack && o.stack.software) || []);
    var hasOpen = (o.offers && o.offers.length) || (o.seeks && o.seeks.length) || stack.length || o.note;
    var html = '';
    if (hasOpen) {
      html += '<div class="sheet-open">';
      if (o.offers && o.offers.length) html += '<span class="lbl">' + esc(t('openTo')) + '</span>' + chips(o.offers, true);
      if (o.seeks && o.seeks.length) html += '<span class="lbl">' + esc(t('seeks')) + '</span>' + chips(o.seeks, true);
      if (stack.length) html += '<span class="lbl">' + esc(t('stack')) + '</span>' + chips(stack, false);
      if (o.note) html += '<p class="cc-note">' + esc(o.note) + '</p>';
      html += '</div>';
    }
    var canIntro = !!(d.claimed || (o.offers && o.offers.length));
    html += '<div class="sheet-cc">';
    if (canIntro) html += '<button type="button" class="cc-intro" data-cc-intro="' + esc(d.id) + '">' + esc(t('intro')) + '</button>';
    html += '<div class="cc-links"><a href="' + esc(issueUrl(d, 'update')) + '" target="_blank" rel="noopener noreferrer">' + esc(t('update')) + '</a>';
    if (!d.claimed) html += '<span class="sep">·</span><a href="' + esc(issueUrl(d, 'claim')) + '" target="_blank" rel="noopener noreferrer">' + esc(t('claim')) + '</a>';
    html += '</div><div class="cc-links"><a class="cc-mail" href="' + esc(mailUpdateUrl(d)) + '">' + esc(t('noGit')) + '</a></div>';
    if (d.claimed) html += '<div class="cc-claimed">' + esc(t('maintained')) + (d.claimed.since ? ' · ' + esc(monthLabel(d.claimed.since)) : '') + '</div>';
    html += '</div>';
    return html;
  }

  // ---- introduction dialog (same material and vocabulary as the export dialogs)
  var STYLE = '' +
    '.cc-backdrop{position:fixed;inset:0;z-index:420;display:none;align-items:center;justify-content:center;background:oklch(0.1 0.01 240/0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);}' +
    '.cc-backdrop.open{display:flex;}' +
    '.cc-card{position:relative;width:min(460px,92vw);max-height:90vh;overflow:auto;background:var(--surface-overlay,var(--bg-2));border:1px solid var(--rule);border-radius:12px;padding:22px 24px;color:var(--ink);font-family:var(--font-sans);}' +
    '.cc-card .eyebrow{font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-3);margin:0 0 4px;}' +
    '.cc-card h2{margin:0 0 14px;font-size:17px;font-weight:650;}' +
    '.cc-card label{display:block;margin:0 0 10px;}' +
    '.cc-card label > span{display:block;font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px;}' +
    '.cc-card input[type=text],.cc-card input[type=email],.cc-card select,.cc-card textarea{width:100%;box-sizing:border-box;font:13px var(--font-sans);color:var(--ink);background:var(--bg-2);border:1px solid var(--rule);border-radius:7px;padding:8px 10px;}' +
    '.cc-card textarea{min-height:66px;resize:vertical;line-height:1.45;}' +
    '.cc-card input:focus,.cc-card select:focus,.cc-card textarea:focus{outline:none;border-color:var(--ink-3);}' +
    '.cc-card .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
    '.cc-card .consent{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--ink-2);line-height:1.45;margin:4px 0 14px;}' +
    '.cc-card .consent input{margin-top:2px;}' +
    '.cc-card .go{padding:8px 14px;font:600 13px var(--font-sans);background:var(--bg-3);color:var(--ink);border:1px solid var(--ink-3);border-radius:7px;cursor:pointer;}' +
    '.cc-card .go:hover{background:var(--surface-hover);}' +
    '.cc-card .note{font-size:11.5px;color:var(--ink-3);margin-top:12px;line-height:1.5;}' +
    '.cc-card .err{font-size:12px;color:var(--c-commercial);margin-top:8px;display:none;}' +
    '.cc-close{position:absolute;top:10px;right:12px;background:none;border:none;color:var(--ink-3);font-size:20px;cursor:pointer;}' +
    '@media (max-width:520px){.cc-card .row2{grid-template-columns:1fr;}}';

  var current = null;
  function ensureDialog() {
    if (document.getElementById('cc-backdrop')) return;
    var st = document.createElement('style'); st.textContent = STYLE; document.head.appendChild(st);
    var bd = document.createElement('div'); bd.className = 'cc-backdrop'; bd.id = 'cc-backdrop';
    bd.innerHTML =
      '<div class="cc-card" role="dialog" aria-modal="true" aria-labelledby="cc-title">' +
      '<button class="cc-close" type="button" aria-label="Close">×</button>' +
      '<p class="eyebrow">' + esc(t('dlgTitle')) + '</p>' +
      '<h2 id="cc-title"></h2>' +
      '<form id="cc-form" novalidate>' +
      '<div class="row2"><label><span>' + esc(t('fName')) + '</span><input type="text" name="name" autocomplete="name"></label>' +
      '<label><span>' + esc(t('fOrg')) + '</span><input type="text" name="org" autocomplete="organization"></label></div>' +
      '<label><span>' + esc(t('fEmail')) + '</span><input type="email" name="email" autocomplete="email"></label>' +
      '<label><span>' + esc(t('fPurpose')) + '</span><select name="purpose">' + PURPOSES.map(function (p) { return '<option value="' + p + '">' + esc(tp(p)) + '</option>'; }).join('') + '</select></label>' +
      '<label><span>' + esc(t('fContext')) + '</span><textarea name="context" rows="3" maxlength="600"></textarea></label>' +
      '<div class="consent"><input type="checkbox" name="consent" id="cc-consent"><label for="cc-consent" id="cc-consent-lbl" style="margin:0"></label></div>' +
      '<button class="go" type="submit">' + esc(t('send')) + '</button>' +
      '<div class="err" id="cc-err">' + esc(t('need')) + '</div>' +
      '<div class="note" id="cc-note"></div>' +
      '</form></div>';
    document.body.appendChild(bd);
    function close() { bd.classList.remove('open'); }
    bd.querySelector('.cc-close').onclick = close;
    bd.addEventListener('click', function (e) { if (e.target === bd) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && bd.classList.contains('open')) close(); });
    document.getElementById('cc-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, v = function (n) { return (f.elements[n].value || '').trim(); };
      var ok = v('name') && v('org') && /.+@.+\..+/.test(v('email')) && f.elements.consent.checked;
      document.getElementById('cc-err').style.display = ok ? 'none' : 'block';
      if (!ok || !current) return;
      var body = 'Introduction request via the SDL map\n\n' +
        'To: ' + current.name + ' (' + current.id + ')\n' +
        'From: ' + v('name') + ', ' + v('org') + ' <' + v('email') + '>\n' +
        'Purpose: ' + EN.p[v('purpose')] + '\n\n' +
        'Context:\n' + v('context') + '\n\n' +
        'Consent: the requester agrees that the curator contacts ' + current.name + ' on their behalf.';
      window.location.href = 'mailto:' + CURATOR_EMAIL +
        '?subject=' + encodeURIComponent('[SDL map] Introduction request: ' + current.name) +
        '&body=' + encodeURIComponent(body);
    });
  }
  function openIntro(d) {
    ensureDialog();
    current = d;
    document.getElementById('cc-title').textContent = t('dlgTo') + (lang === 'en' ? ' ' : '') + d.name;
    document.getElementById('cc-consent-lbl').textContent = t('consent').replace('{name}', d.name);
    document.getElementById('cc-note').textContent = t('dlgNote').replace('{name}', d.name);
    document.getElementById('cc-err').style.display = 'none';
    document.getElementById('cc-backdrop').classList.add('open');
    setTimeout(function () { var n = document.querySelector('#cc-form input[name=name]'); if (n) n.focus(); }, 30);
  }
  // Delegated: the card is re-rendered on every open.
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-cc-intro]');
    if (!b) return;
    var id = b.getAttribute('data-cc-intro');
    var d = (window.SDL_DATA || []).find(function (x) { return x.id === id; });
    if (d) openIntro(d);
  });

  window.SDL_CC = { t: t, cardHtml: cardHtml, valuesOf: valuesOf, issueUrl: issueUrl, mailUpdateUrl: mailUpdateUrl, openIntro: openIntro, OFFERS: OFFERS, SEEKS: SEEKS, CURATOR_EMAIL: CURATOR_EMAIL };
})();
