// ════════════════════════════════════════
//  Rendering
// ════════════════════════════════════════
function renderAll(data) {
  renderSubject(data);
  renderCCA(data, 'auto',   'bd-auto');
  renderCCA(data, 'club',   'bd-club');
  renderCCA(data, 'career', 'bd-career');
  renderCCA(data, 'behav',  'bd-behav');
  renderKeywords(data);
}

function renderSubject(data) {
  const body = document.getElementById('bd-subject');
  body.innerHTML = '';
  const ORDER = ['국어','수학','영어','한국사','사회','과학','기술·가정','예체능','기타'];
  renderSubjectJump(data, ORDER);
  let total = 0;
  for (const grp of ORDER) {
    const acts = data.subject[grp];
    if (!acts || acts.length === 0) continue;
    total += acts.length;
    const gi = SUBJ_GROUPS.find(g => g.name === grp) || { color: '#888' };
    const sec = mkSec(grp + ' 교과군', '1·2학년 통합 · ' + acts.length + '개 탐구활동', acts.length, gi.color);
    sec.id = 'subj-sec-' + slugSubjectGroup(grp);
    sec.dataset.subjGroup = grp;
    const ab = sec.querySelector('.grp-body');

    // 학년별 그룹
    const byGrade = {};
    for (const a of acts) {
      if (!byGrade[a.grade]) byGrade[a.grade] = {};
      if (!byGrade[a.grade][a.subject]) byGrade[a.grade][a.subject] = [];
      byGrade[a.grade][a.subject].push(a);
    }

    for (const g of ['1학년','2학년','3학년']) {
      if (!byGrade[g]) continue;
      const ghd = document.createElement('div');
      ghd.className = 'grade-hd';
      ghd.innerHTML = `<span class="grade-hd-label">${g}</span>`;
      ab.appendChild(ghd);

      for (const [subj, sa] of Object.entries(byGrade[g])) {
        if (subj && subj !== '공통') {
          const shd = document.createElement('div');
          shd.className = 'subj-hd';
          shd.textContent = subj;
          ab.appendChild(shd);
        }
        sa.forEach((a, i) => ab.appendChild(mkCard(a, i)));
      }
    }
    body.appendChild(sec);
  }
  if (total === 0) body.innerHTML = '<div class="empty"><div class="ei">📚</div><p>교과 탐구활동을 찾지 못했습니다</p></div>';
}


function slugSubjectGroup(grp) {
  return grp.replace(/[^가-힣A-Za-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function renderSubjectJump(data, order) {
  const wrap = document.getElementById('subj-jump');
  if (!wrap) return;
  const available = order.map(grp => {
    const acts = data.subject[grp] || [];
    const gi = SUBJ_GROUPS.find(g => g.name === grp) || { color: '#888' };
    return { grp, count: acts.length, color: gi.color };
  }).filter(x => x.count > 0);
  if (available.length === 0) { wrap.classList.remove('show'); wrap.innerHTML = ''; return; }
  wrap.classList.add('show');
  wrap.innerHTML = `
    <div class="subj-jump-head">
      <span class="subj-jump-title">📚 교과군 바로가기</span>
      <span class="subj-jump-sub">버튼을 누르면 해당 교과군 분석 위치로 바로 이동합니다.</span>
      <div class="subj-jump-tools">
        <button class="subj-tool-btn" onclick="jumpSubjectTop()">맨 위</button>
        <button class="subj-tool-btn" onclick="jumpSubjectNext()">다음 교과군</button>
      </div>
    </div>
    <select class="subj-mobile-select" onchange="if(this.value) jumpSubjectGroup(this.value)">
      <option value="">교과군 선택해서 이동</option>
      ${available.map(x => `<option value="${x.grp}">${x.grp} · ${x.count}개</option>`).join('')}
    </select>
    <div class="subj-jump-list">
      ${available.map((x, idx) => `
        <button class="subj-jump-btn" onclick="jumpSubjectGroup('${x.grp}')" data-jump-grp="${x.grp}" data-jump-idx="${idx}">
          <span class="subj-jump-dot" style="background:${x.color}"></span>
          ${x.grp}<span class="subj-jump-count">${x.count}</span>
        </button>
      `).join('')}
    </div>`;
  window._subjectJumpOrder = available.map(x => x.grp);
  setActiveSubjectJump(available[0].grp);
  setTimeout(setupSubjectScrollSpy, 80);
}

function setActiveSubjectJump(grp) {
  document.querySelectorAll('.subj-jump-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.jumpGrp === grp));
  const sel = document.querySelector('.subj-mobile-select');
  if (sel) sel.value = grp || '';
  window._activeSubjectGroup = grp;
}

function jumpSubjectTop() {
  switchTab('subject');
  const wrap = document.getElementById('subj-jump');
  if (wrap) wrap.scrollIntoView({ behavior:'smooth', block:'start' });
}

function jumpSubjectNext() {
  const order = window._subjectJumpOrder || [];
  if (!order.length) return;
  const cur = window._activeSubjectGroup || order[0];
  const idx = Math.max(0, order.indexOf(cur));
  jumpSubjectGroup(order[(idx + 1) % order.length]);
}

function jumpSubjectGroup(grp) {
  switchTab('subject');
  const target = document.getElementById('subj-sec-' + slugSubjectGroup(grp));
  if (!target) return;
  setActiveSubjectJump(grp);
  const btn = [...document.querySelectorAll('.subj-jump-btn')].find(b => b.dataset.jumpGrp === grp);
  if (btn) { btn.classList.remove('done-pulse'); void btn.offsetWidth; btn.classList.add('done-pulse'); }
  setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
}

function setupSubjectScrollSpy() {
  if (window._subjectSpy) window._subjectSpy.disconnect();
  const secs = [...document.querySelectorAll('#bd-subject .grp-sec[data-subj-group]')];
  if (!secs.length) return;
  window._subjectSpy = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActiveSubjectJump(visible.target.dataset.subjGroup);
  }, { root: null, rootMargin: '-120px 0px -55% 0px', threshold: [0.05, 0.2, 0.45] });
  secs.forEach(sec => window._subjectSpy.observe(sec));
}

function renderCCA(data, area, bodyId) {
  const body = document.getElementById(bodyId);
  body.innerHTML = '';
  const acts = data[area];
  if (!acts || acts.length === 0) {
    body.innerHTML = `<div class="empty"><div class="ei">🔍</div><p>${AREA_LABELS[area]} 활동을 찾지 못했습니다</p></div>`;
    return;
  }
  const CLR = { auto: '#1aaa6e', club: '#7c3fe4', career: '#c9871f', behav: '#d44060' };
  const sec = mkSec(AREA_LABELS[area], '1·2학년 통합 · ' + acts.length + '개 활동', acts.length, CLR[area]);
  const ab = sec.querySelector('.grp-body');

  const byGrade = {};
  for (const a of acts) {
    if (!byGrade[a.grade]) byGrade[a.grade] = [];
    byGrade[a.grade].push(a);
  }

  for (const g of ['1학년','2학년','3학년']) {
    const ga = byGrade[g];
    if (!ga || ga.length === 0) continue;
    const ghd = document.createElement('div');
    ghd.className = 'grade-hd';
    ghd.innerHTML = `<span class="grade-hd-label">${g}</span>`;
    ab.appendChild(ghd);
    ga.forEach((a, i) => ab.appendChild(mkCard(a, i)));
  }
  body.appendChild(sec);
}

function mkSec(title, sub, cnt, color) {
  const el = document.createElement('div');
  el.className = 'grp-sec';
  el.innerHTML = `
    <div class="grp-hd">
      <div class="grp-bar" style="background:${color}"></div>
      <div class="grp-tw">
        <div class="grp-title">${esc(title)}</div>
        <div class="grp-sub">${esc(sub)}</div>
      </div>
      <div class="grp-cnt">${cnt}개</div>
    </div>
    <div class="grp-body"></div>
  `;
  return el;
}

function mkCard(act, i) {
  const el = document.createElement('div');
  el.className = 'act-card';
  el.style.animationDelay = (i * 22) + 'ms';
  const subjSpan = (act.subject && act.subject !== '공통' && act.area === 'subject')
    ? `<span style="font-size:11px;color:var(--tx3);font-weight:600">${esc(act.subject)}</span>` : '';

  // v13: depth score badge
  const depth = v6ScoreInquiryDepth(act.full || act.summary || '');
  const ds = depth.score;
  const dClass = ds >= 8 ? 'd-top' : ds >= 6 ? 'd-high' : ds >= 3 ? 'd-mid' : 'd-low';
  const depthBadge = `<span class="depth-badge ${dClass}" title="탐구깊이 ${ds}/10\n${depth._breakdown || ''}">🔬 ${ds}/10</span>`;
  const gl = v6ClassifyGrowthLevel(ds);
  const glName = V6_GROWTH_LEVELS[gl] || '';
  const glChip = `<span class="growth-level-chip" title="성장 Level ${gl}">Lv${gl} ${glName}</span>`;
  const breakdownHtml = depth._breakdown
    ? `<div class="depth-breakdown">${esc(depth._breakdown)}</div>` : '';
  const detectedHtml = depth.detected.length
    ? `<div class="depth-detected">${depth.detected.map(d => `<span class="depth-tag">${d}</span>`).join('')}</div>` : '';

  el.innerHTML = `
    <div class="act-top">
      <div class="act-num">${String(i+1).padStart(2,'0')}</div>
      <div class="act-title">${esc(act.title)}</div>
      ${depthBadge}
    </div>
    <div class="act-summary">${esc(act.summary)}</div>
    ${breakdownHtml}
    ${detectedHtml}
    <div class="act-meta">
      <span class="tag tag-${act.field}">${FIELD_LABELS[act.field]}</span>
      <span class="grade-chip">${act.grade}</span>
      ${glChip}
      ${subjSpan}
      <button class="orig-btn">📄 원문 보기</button>
    </div>
  `;
  el.querySelector('.orig-btn').addEventListener('click', e => { e.stopPropagation(); openModal(act); });
  return el;
}
