// ════════════════════════════════════════
//  Memo Save / List
// ════════════════════════════════════════
async function saveMemo() {
  if (!currentAct) return;
  const memo = document.getElementById('memo-ta').value.trim();
  const idx = memos.findIndex(m => m.title === currentAct.title);
  const rec = {
    title: currentAct.title,
    subject: currentAct.subject || '',
    grade: currentAct.grade,
    area: currentAct.area,
    field: currentAct.field,
    highlights: [...currentHLs],
    memo,
    savedAt: new Date().toLocaleString('ko-KR'),
  };
  if (idx >= 0) memos[idx] = rec; else memos.push(rec);
  renderMemoList();
  document.getElementById('snc-mo').textContent = memos.length;
  await saveConsultToStorage();
  closeModal();
}

async function saveFinalMemo() {
  const text = document.getElementById('final-memo-ta').value.trim();
  if (!text) { alert('피드백 내용을 입력하세요.'); return; }
  finalMemoSaved = {
    teacher: document.getElementById('final-teacher').value.trim() || '담당 교사',
    date: document.getElementById('final-date').value.trim() || new Date().toLocaleDateString('ko-KR'),
    text,
  };
  renderMemoList();
  await saveConsultToStorage();
  alert('최종 피드백이 저장되었습니다. 인쇄 시 상담록 상단에 포함됩니다.');
}

function renderMemoList() {
  const body = document.getElementById('bd-memos');
  const nm = document.getElementById('sb-nm').textContent;
  const sc = document.getElementById('sb-sc').textContent;

  const ph = document.getElementById('print-h');
  const pm = document.getElementById('print-m');
  if (ph) { ph.textContent = nm + ' 학생 상담 기록'; ph.style.display = 'block'; }
  if (pm) { pm.textContent = sc + ' · 작성일: ' + new Date().toLocaleDateString('ko-KR'); pm.style.display = 'block'; }

  body.innerHTML = '';

  // 최종 피드백 카드
  if (finalMemoSaved) {
    const fc = document.createElement('div'); fc.className = 'final-m-card';
    fc.innerHTML = `
      <div class="final-m-title">✍️ 교사 최종 종합 피드백</div>
      <div class="final-m-teacher">작성: ${esc(finalMemoSaved.teacher)} | 일자: ${esc(finalMemoSaved.date)}</div>
      <div class="final-m-txt">${esc(finalMemoSaved.text)}</div>
    `;
    body.appendChild(fc);
  }

  if (!memos.length && !finalMemoSaved) {
    body.innerHTML = '<div class="empty"><div class="ei">📝</div><p>원문 뷰어에서 하이라이트/메모를 저장하면 여기에 모입니다</p></div>';
    return;
  }

  memos.forEach((m, i) => {
    const el = document.createElement('div'); el.className = 'm-card'; el.style.animationDelay = (i*30)+'ms';
    const hlHtml = m.highlights.map(h => `<div class="m-hl">"${esc(h)}"</div>`).join('');
    el.innerHTML = `
      <div class="m-card-top">
        <span class="m-chip">${esc(AREA_LABELS[m.area]||m.area)}</span>
        <span class="m-chip">${esc(m.subject)}</span>
        <span class="grade-chip">${m.grade}</span>
        <span class="m-time">${m.savedAt}</span>
        <button class="btn btn-del" style="padding:3px 9px;font-size:11px;margin-left:6px" onclick="delMemo(${i})">삭제</button>
      </div>
      <div class="m-title">${esc(m.title)}</div>
      ${hlHtml ? `<div class="m-hl-list">${hlHtml}</div>` : ''}
      ${m.memo ? `<div class="m-txt">${esc(m.memo)}</div>` : ''}
    `;
    body.appendChild(el);
  });
}

async function delMemo(i) {
  memos.splice(i, 1);
  document.getElementById('snc-mo').textContent = memos.length;
  await saveConsultToStorage();
  renderMemoList();
}

// ── 저장된 상담 이력 목록 ──
async function initSavedStudentList() {
  const students = await listSavedStudents();
  const btn = document.getElementById('sb-saved-btn');
  if (!students.length) { if(btn) btn.style.display='none'; return; }
  if(btn) btn.style.display='block';
  renderSavedList(students);
  _checkBackupBanner();
}

function renderSavedList(students) {
  const list = document.getElementById('sb-saved-list');
  if (!list) return;
  list.innerHTML = '';
  students.sort((a,b) => (b.savedAt||'').localeCompare(a.savedAt||'')).forEach(st => {
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 4px;border-bottom:1px solid var(--bdr);font-size:11px';
    const dt = st.savedAt ? new Date(st.savedAt).toLocaleDateString('ko-KR') : '';
    d.innerHTML = `
      <span style="flex:1;color:var(--tx);font-weight:700">${esc(st.name)}</span>
      <span style="color:var(--tx3)">${dt}</span>
      <span style="background:var(--gold-bg);color:var(--gold);border:1px solid var(--gold-bdr);padding:1px 6px;border-radius:10px;font-size:10px">${st.memoCount}건</span>
      <button onclick="deleteSavedStudent('${esc(st.name)}')" style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:12px;padding:0 2px" title="삭제">🗑</button>
    `;
    list.appendChild(d);
  });
}

async function toggleSavedList() {
  const wrap = document.getElementById('sb-saved-wrap');
  if (!wrap) return;
  const visible = wrap.style.display !== 'none';
  wrap.style.display = visible ? 'none' : 'block';
  if (!visible) renderSavedList(await listSavedStudents());
}

async function deleteSavedStudent(nm) {
  if (!confirm(nm + ' 학생의 상담 이력을 삭제할까요?')) return;
  try {
    const db = await _openIDB();
    await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(nm);
      tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
    });
  } catch(e) {}
  const students = await listSavedStudents();
  const btn = document.getElementById('sb-saved-btn');
  if (!students.length) {
    document.getElementById('sb-saved-wrap').style.display = 'none';
    if(btn) btn.style.display='none';
  } else {
    renderSavedList(students);
  }
  _checkBackupBanner();
}

// ── CSS 수집: <style> 태그 + <link rel="stylesheet"> 외부 파일 모두 수집 ──
async function _collectAllCss() {
  // 1. 인라인 <style> 태그
  const inlineStyles = Array.from(document.querySelectorAll('style'))
    .map(s => s.innerHTML).join('\n');

  // 2. <link rel="stylesheet"> 외부 CSS 파일을 fetch로 읽어오기
  const linkEls = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  const fetchedStyles = await Promise.all(linkEls.map(async (el) => {
    try {
      const res = await fetch(el.href);
      return res.ok ? await res.text() : '';
    } catch (e) { return ''; }
  }));

  const combined = inlineStyles + '\n' + fetchedStyles.join('\n');

  // 레이아웃 관련 규칙 제거 (팝업 창에선 불필요)
  return combined
    .replace(/html\s*\{[^}]*\}/g, '')
    .replace(/\bbody\s*\{[^}]*\}/g, '')
    .replace(/\.app\s*\{[^}]*\}/g, '')
    .replace(/@media\s+print\s*\{([\s\S]*?\})\s*\}/g, '');
}

// ── 인쇄용 팝업 공통 함수 ──
async function openPrintPopup(title, bodyHtml, extraCss = '') {
  const stuNm = document.getElementById('sb-nm')?.textContent || '';
  const fullTitle = (stuNm && stuNm !== '—' ? stuNm + ' — ' : '') + title;
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim() || '';

  // 인라인 + 외부 CSS 파일 모두 수집
  const rawStyles = await _collectAllCss();

  const win = window.open('', '_blank', 'width=960,height=800,scrollbars=yes,resizable=yes');
  if (!win) { alert('팝업이 차단되었습니다. 주소창 옆 팝업 허용 버튼을 클릭해주세요.'); return; }

  win.document.write(`<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${fullTitle}</title>
<style>
:root{--bg:${v('--bg')||'#f4f5f8'};--sur:${v('--sur')||'#fff'};--sur2:${v('--sur2')||'#f8f9fb'};--sur3:${v('--sur3')||'#f0f2f5'};--tx:${v('--tx')||'#1a1d2e'};--tx2:${v('--tx2')||'#4a5068'};--tx3:${v('--tx3')||'#8892a4'};--bdr:${v('--bdr')||'#e2e5ec'};--bdr2:${v('--bdr2')||'#c8cdd8'};--gold:${v('--gold')||'#c9871f'};--gold-bg:${v('--gold-bg')||'#fdf6ec'};--gold-bdr:${v('--gold-bdr')||'#f0c878'};--cs:${v('--cs')||'#2b7fe8'};--ca:${v('--ca')||'#1aaa6e'};--cl:${v('--cl')||'#7c3fe4'};--cc:${v('--cc')||'#f09840'};--cb:${v('--cb')||'#e84060'};--r:${v('--r')||'12px'};--rs:${v('--rs')||'8px'};--shadow:0 2px 8px rgba(0,0,0,.06);--depth-low:#e74c3c;--depth-mid:#f39c12;--depth-high:#27ae60;--depth-top:#2980b9}
*,*::before,*::after{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}
${rawStyles}
html{font-size:10pt!important}
body{display:block!important;font-size:10pt!important;margin:0!important;padding:0!important;background:#fff!important;color:#1a1d2e!important;font-family:'Malgun Gothic','Apple SD Gothic Neo',system-ui,sans-serif!important;line-height:1.55!important}
.sb,.tab-bar,.stats-row,.subj-jump,.orig-btn,.cap-btn,.btn,.btn-print,.btn-gold,.btn-sec,.modal-ov,.feat-g,.local-secure-box,.memo-pg-hd .btn-gold,.memo-pg-hd .btn-sec,.final-memo-area,#curr-toggle,#full-report-btn,#tab-print-btn,.kw-tab-bar,.prompt-actions,.prompt-hope-input,.prompt-note,.btn-copy-prompt{display:none!important}
.vp{display:block!important;width:100%!important}
.app{display:block!important}
.main{display:block!important;overflow:visible!important;width:100%!important}
.kw-vp{display:block!important;margin-bottom:12pt}
.act-card,.m-card,.final-m-card,.grp-sec,.cr-grp,.kw-item{break-inside:avoid!important;box-shadow:none!important}
.cr-grid{grid-template-columns:repeat(2,1fr)!important}
.kw-wrap{grid-template-columns:1fr!important}
.print-section-break{page-break-before:always}
@page{size:A4 portrait;margin:15mm 12mm}
</style></head><body>
<div style="font-size:15pt;font-weight:900;border-bottom:3px solid #c9871f;padding-bottom:6pt;margin:0 0 14pt;color:#1a1d2e">${fullTitle}</div>
${bodyHtml}
<style>${extraCss}<\/style>
<script>window.onload=function(){setTimeout(function(){window.print()},600)}<\/script>
</body></html>`);
  win.document.close();
}

// ── 인쇄 프리셋 CSS ──
const PRINT_PRESET_CSS = {
  // 교사용 상세: 기본값 — 전체 출력
  detail: ``,
  // 학부모용 1페이지: 핵심 KPI + 강점/리스크만, 상세 테이블 숨김
  parent: `
    .dash-section > *:not(:first-child):not(.dash-grid) { display:none!important; }
    table { display:none!important; }
    .act-card .act-raw, .act-card .orig-btn { display:none!important; }
    .act-card { break-inside:avoid!important; }
    .vp > * + * + * + * + * { display:none!important; }
    @page { size:A4 portrait; margin:12mm 10mm; }
  `,
  // 하이라이트 중심: 상담록 하이라이트 + 최종피드백만
  highlight: `
    .act-card, .cr-grp, .grp-sec { display:none!important; }
    .m-card, .final-m-card { display:block!important; break-inside:avoid!important; }
    .kw-wrap, .kw-tab-bar, #kwvp-cloud, #kwvp-trend { display:none!important; }
    .dash-grid .kpi-card:nth-child(n+5) { display:none!important; }
    @page { size:A4 portrait; margin:15mm 12mm; }
  `
};

// ── 인쇄 프리셋 설명 ──
const PRINT_PRESET_DESC = {
  detail:    '전체 항목 출력 (기본)',
  parent:    'KPI·강점·리스크 중심 요약',
  highlight: '상담 하이라이트·최종피드백 중심'
};

// ── 프리셋 미리보기: 화면에 즉시 반영 ──
let _presetStyleEl = null;
function applyPrintPresetPreview(preset) {
  // 설명 표시
  const descEl = document.getElementById('print-preset-desc');
  if (descEl) {
    if (preset && preset !== 'detail') {
      descEl.textContent = '📋 ' + (PRINT_PRESET_DESC[preset] || '');
      descEl.style.display = 'inline';
    } else {
      descEl.style.display = 'none';
    }
  }

  // 기존 미리보기 스타일 제거
  if (_presetStyleEl) { _presetStyleEl.remove(); _presetStyleEl = null; }

  if (!preset || preset === 'detail') return;

  // 화면에 즉시 적용 (인쇄 전 미리보기)
  const PREVIEW_CSS = {
    parent: `
      /* ── 학부모용 1페이지 미리보기 ── */
      #vp-subject .act-raw, #vp-auto .act-raw, #vp-club .act-raw, #vp-career .act-raw { display:none!important; }
      #vp-subject .orig-btn, #vp-auto .orig-btn, #vp-club .orig-btn, #vp-career .orig-btn { display:none!important; }
      .cr-grp:nth-child(n+4) { display:none!important; }
      #bd-dashboard .dash-section:nth-child(n+4) > *:not(:first-child) { display:none!important; }
      #vp-parent-notice { display:block!important; }
    `,
    highlight: `
      /* ── 하이라이트 중심 미리보기 ── */
      #vp-subject .act-card:not(.has-memo), #vp-auto .act-card:not(.has-memo),
      #vp-club .act-card:not(.has-memo), #vp-career .act-card:not(.has-memo) { opacity:0.35; }
      #bd-memos .m-card { border-left:4px solid var(--gold)!important; }
      #vp-highlight-notice { display:block!important; }
    `
  };

  const css = PREVIEW_CSS[preset];
  if (!css) return;

  _presetStyleEl = document.createElement('style');
  _presetStyleEl.id = 'print-preset-preview-style';
  _presetStyleEl.textContent = css;
  document.head.appendChild(_presetStyleEl);
}


function _getMaskCss(maskName, maskSchool) {
  let css = '';
  if (maskName) {
    css += `
      /* 이름 마스킹 — JS로 처리, CSS는 폴백 */
      .sb-nm-print { visibility:hidden; }
    `;
  }
  if (maskSchool) {
    css += `.school-info, .school-name { display:none!important; }`;
  }
  return css;
}

function _escapeRegExp(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _makeMaskedName(stuNm) {
  if (!stuNm || stuNm === '—') return stuNm || '';
  const clean = String(stuNm).trim();
  if (clean.length <= 1) return clean + '○';
  if (clean.length === 2) return clean[0] + '○';
  return clean[0] + '○'.repeat(clean.length - 2) + clean[clean.length - 1];
}

function _makeMaskedSchool(school) {
  if (!school || school === '—') return '';
  return '○○고등학교';
}

function _applyNameMask(html, stuNm) {
  if (!stuNm || stuNm === '—') return html;
  const masked = _makeMaskedName(stuNm);
  const escaped = _escapeRegExp(stuNm);
  if (!escaped) return html;
  return String(html).replace(new RegExp(escaped, 'g'), masked);
}

function _applySchoolMask(html, school) {
  if (!school || school === '—') return html;
  let out = String(html);
  const candidates = new Set([school]);
  const short = String(school).replace(/(?:고등|중|초등)?학교$/, '');
  if (short && short.length >= 2) candidates.add(short);
  for (const s of candidates) {
    const escaped = _escapeRegExp(s);
    if (escaped) out = out.replace(new RegExp(escaped, 'g'), _makeMaskedSchool(school));
  }
  return out;
}

const _privacyTextOriginals = new WeakMap();
const _privacyAttrOriginals = new WeakMap();

function _getPrivacyInfo() {
  const nmEl = document.getElementById('sb-nm');
  const scEl = document.getElementById('sb-sc');
  const rawName = nmEl?.dataset.raw || nmEl?.textContent || '';
  const rawSchool = scEl?.dataset.raw || scEl?.textContent || '';
  return { name: rawName, school: rawSchool };
}

function _maskPlainText(text, maskName, maskSchool, info) {
  let out = String(text ?? '');
  if (maskName && info.name && info.name !== '—') {
    const escaped = _escapeRegExp(info.name);
    if (escaped) out = out.replace(new RegExp(escaped, 'g'), _makeMaskedName(info.name));
  }
  if (maskSchool && info.school && info.school !== '—') {
    const candidates = new Set([info.school]);
    const short = String(info.school).replace(/(?:고등|중|초등)?학교$/, '');
    if (short && short.length >= 2) candidates.add(short);
    for (const s of candidates) {
      const escaped = _escapeRegExp(s);
      if (escaped) out = out.replace(new RegExp(escaped, 'g'), _makeMaskedSchool(info.school));
    }
  }
  return out;
}

function _applyPrivacyMaskInNode(root, maskName, maskSchool, info) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (['SCRIPT','STYLE','TEXTAREA','INPUT'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (!_privacyTextOriginals.has(node)) _privacyTextOriginals.set(node, node.nodeValue);
    const original = _privacyTextOriginals.get(node);
    node.nodeValue = _maskPlainText(original, maskName, maskSchool, info);
  }

  const attrTargets = root.querySelectorAll ? root.querySelectorAll('[title], [data-print-title], input[value], textarea') : [];
  attrTargets.forEach(el => {
    const attrs = ['title','data-print-title','value'];
    attrs.forEach(attr => {
      if (!el.hasAttribute || !el.hasAttribute(attr)) return;
      let map = _privacyAttrOriginals.get(el);
      if (!map) { map = {}; _privacyAttrOriginals.set(el, map); }
      if (!(attr in map)) map[attr] = el.getAttribute(attr);
      el.setAttribute(attr, _maskPlainText(map[attr], maskName, maskSchool, info));
    });
    if (el.tagName === 'TEXTAREA') {
      let map = _privacyAttrOriginals.get(el);
      if (!map) { map = {}; _privacyAttrOriginals.set(el, map); }
      if (!('textareaValue' in map)) map.textareaValue = el.value;
      el.value = _maskPlainText(map.textareaValue, maskName, maskSchool, info);
    }
  });
}

function applyPrivacyMaskToScreen() {
  const maskName = document.getElementById('print-mask-name')?.checked || false;
  const maskSchool = document.getElementById('print-mask-school')?.checked || false;
  const info = _getPrivacyInfo();
  document.body.classList.toggle('privacy-mask-name-on', maskName);
  document.body.classList.toggle('privacy-mask-school-on', maskSchool);

  const roots = [
    document.getElementById('sb-stu'),
    document.getElementById('res-scr'),
    document.getElementById('modal-ov')
  ].filter(Boolean);
  roots.forEach(root => _applyPrivacyMaskInNode(root, maskName, maskSchool, info));

  if (document.getElementById('vp-aiprompt')?.classList.contains('active') && parsedData && v6Analysis) {
    setTimeout(() => updatePromptPreview(), 0);
  }
}


async function printCurrentTab() {
  const tabName = document.getElementById('tab-print-btn')?.dataset.tab || 'subject';
  const label = TAB_PRINT_LABELS[tabName] || tabName;
  const vpEl = document.getElementById('vp-' + tabName);
  if (!vpEl) return;

  const preset = document.getElementById('print-preset-sel')?.value || 'detail';
  const maskName   = document.getElementById('print-mask-name')?.checked   || false;
  const maskSchool = document.getElementById('print-mask-school')?.checked || false;

  const stuNm = document.getElementById('sb-nm')?.textContent || '';
  let bodyHtml = vpEl.innerHTML;
  if (maskName) bodyHtml = _applyNameMask(bodyHtml, stuNm);
  if (maskSchool) {
    const stuSc = document.getElementById('sb-sc')?.dataset.raw || document.getElementById('sb-sc')?.textContent || '';
    bodyHtml = _applySchoolMask(bodyHtml, stuSc);
  }

  const extraCss = (PRINT_PRESET_CSS[preset] || '') + _getMaskCss(maskName, maskSchool);
  await openPrintPopup(label, bodyHtml, extraCss);
}

async function printFullReport() {
  const T = 'font-size:13pt;font-weight:900;color:#c9871f;border-bottom:2px solid #c9871f;padding-bottom:4pt;margin:0 0 10pt;display:block';
  const S = 'font-size:11pt;font-weight:700;color:#4a5068;margin:10pt 0 5pt;display:block';

  // canvas가 숨겨진 상태여도 고정 크기를 직접 전달해서 그림 (offsetWidth 우회)
  const forceDrawCanvas = () => {
    if (window._kwAll?.fieldScores) drawRadar(window._kwAll.fieldScores, 380);
    if (window._kwData) drawWC(window._kwData, 600, 320);
  };

  // canvas → dataURL 이미지 변환
  const toImg = (id, maxW) => {
    const c = document.getElementById(id);
    if (!c || !c.width || !c.height) return '';
    try { return `<img src="${c.toDataURL()}" style="width:100%;max-width:${maxW||500}px;display:block;margin:0 auto">`; } catch(e) { return ''; }
  };

  forceDrawCanvas();

  const radarImg      = toImg('radar-canvas', 380);
  const radarFieldImg = toImg('radar-canvas-field', 380);
  const wcImg    = toImg('wc-canvas', 620);

  // 주요 섹션
  const sections = [
    {key:'dashboard', label:'📊 v6 정량 대시보드'},
    {key:'subject', label:'📚 교과 탐구활동'},
    {key:'auto',    label:'🌱 자율활동'},
    {key:'club',    label:'🎯 동아리활동'},
    {key:'career',  label:'🚀 진로활동'},
    {key:'behav',   label:'💬 행동특성 및 종합의견'},
    {key:'credit',  label:'📊 과목 이수현황'},
  ];
  let bodyHtml = '';
  sections.forEach(({key, label}, i) => {
    const el = document.getElementById('vp-' + key);
    if (!el) return;
    const inner = el.innerHTML.trim();
    if (!inner) return;
    const brk = i === 0 ? '' : ' class="print-section-break"';
    bodyHtml += `<div${brk}><div style="${T}">${label}</div>${inner}</div>`;
  });

  // 키워드 섹션 — 서브탭 전부 수집
  const kwSubs = [
    {id:'kwvp-rank',  label:'🔠 핵심 키워드'},
    {id:'kwvp-ngram', label:'🔗 복합 키워드'},
    {id:'kwvp-radar', label:'🔷 역량 레이더 (4축)', img: radarImg},
    {id:'kwvp-radar', label:'🔹 분야 레이더 (6축)', img: radarFieldImg},
    {id:'kwvp-trend', label:'📈 학년별 변화'},
    {id:'kwvp-cloud', label:'☁️ 워드클라우드', img: wcImg},
  ];
  let kwHtml = '';
  kwSubs.forEach(({id, label, img}) => {
    const el = document.getElementById(id);
    if (!el) return;
    let inner = el.innerHTML.trim();
    if (img) {
      // canvas 태그를 이미지로 교체
      inner = inner.replace(/<canvas[^>]*>[\s\S]*?<\/canvas>/gi, img)
                   .replace(/<canvas[^>]*\/?>/gi, img);
    }
    if (!inner) return;
    kwHtml += `<div style="margin-bottom:8pt"><div style="${S}">${label}</div>${inner}</div>`;
  });
  if (kwHtml) {
    bodyHtml += `<div class="print-section-break"><div style="${T}">☁️ 키워드 분석</div>${kwHtml}</div>`;
  }

  const maskName = document.getElementById('print-mask-name')?.checked || false;
  const maskSchool = document.getElementById('print-mask-school')?.checked || false;
  const info = _getPrivacyInfo();
  if (maskName) bodyHtml = _applyNameMask(bodyHtml, info.name);
  if (maskSchool) bodyHtml = _applySchoolMask(bodyHtml, info.school);
  const extraCss = _getMaskCss(maskName, maskSchool);
  await openPrintPopup('종합 분석 보고서', bodyHtml, extraCss);
}

function exportMemosPdf() {
  // 인쇄 미리보기로 PDF 저장 안내
  const nm = document.getElementById('sb-nm').textContent || '학생';
  const origTitle = document.title;
  document.title = nm + ' 상담록';
  // 상담록 탭으로 이동
  switchTab('memos');
  setTimeout(() => {
    window.print();
    setTimeout(() => { document.title = origTitle; }, 1000);
  }, 300);
}


function toggleModalSize() {
  const ov = document.getElementById('modal-ov');
  ov.classList.toggle('big');
  const btn = ov.querySelector('.modal-size-btn');
  if (btn) btn.textContent = ov.classList.contains('big') ? '↙ 창 보통' : '⛶ 창 크게';
  setTimeout(() => { if ((currentAct || _act) && pdfDoc) pdfFit(); }, 80);
}

function closeModal() {
  document.getElementById('modal-ov').classList.remove('open');
  currentAct = null;
  _act = null;
}
