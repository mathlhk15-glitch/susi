// ════════════════════════════════════════
//  Tab Switch
// ════════════════════════════════════════
const TAB_IDX = {subject:0,auto:1,club:2,career:3,behav:4,credit:5,keyword:6,memos:7,dashboard:8,aiprompt:9,unimaterial:10,parentview:11,admission5:12,admission9:13};
const TAB_PRINT_LABELS = {
  subject: '교과 탐구활동 분석',
  auto: '자율활동 분석',
  club: '동아리활동 분석',
  career: '진로활동 분석',
  behav: '행동특성 및 종합의견',
  credit: '과목 이수현황',
  keyword: '키워드 분석',
  memos: '상담록',
  dashboard: '정량 대시보드',
  aiprompt: 'AI 분석 프롬프트',
  unimaterial: '대학자료 분석',
  parentview: '학부모용 화면',
  admission5: '1·2학년 5등급 기준 입시 탐색기',
  admission9: '3학년 9등급 기준 입시 탐색기',
};


// admission5.html, admission9.html은 public/ 폴더에 별도 파일로 분리됨
const ADMISSION_FILE_PATHS = {
  admission5: 'public/admission5.html',
  admission9: 'public/admission9.html',
};

function loadAdmissionFrame(tabName, forceReload) {
  const frame = document.getElementById(tabName + '-frame');
  if (!frame) return;
  const src = ADMISSION_FILE_PATHS[tabName];
  if (!src) return;
  if (forceReload || frame.dataset.loaded !== '1') {
    frame.src = src;
    frame.dataset.loaded = '1';
  }
}

function openAdmissionInNewWindow(tabName) {
  const src = ADMISSION_FILE_PATHS[tabName];
  if (src) window.open(src, '_blank', 'noopener');
}


function switchTab(nm) {
  document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', i===TAB_IDX[nm]));
  document.querySelectorAll('.sb-ni').forEach((n,i) => n.classList.toggle('active', i===TAB_IDX[nm]));
  document.querySelectorAll('.vp').forEach(p => p.classList.remove('active'));
  const vpEl = document.getElementById('vp-'+nm);
  if (vpEl) vpEl.classList.add('active');
  const sj = document.getElementById('subj-jump');
  if (sj) sj.style.display = (nm === 'subject' && sj.innerHTML.trim()) ? 'flex' : 'none';
  if (nm==='keyword' && window._kwData) setTimeout(() => drawWC(window._kwData), 60);
  // v13: AI 프롬프트 탭 전환 시 프롬프트 갱신
  if (nm==='aiprompt' && parsedData && v6Analysis) setTimeout(() => {
    updatePromptPreview();
    if (typeof updateUniAddonSection === 'function') updateUniAddonSection();
  }, 100);
  // 대학자료 미업로드 상태에서도 섹션 자체는 갱신 (안내 문구 표시)
  if (nm==='aiprompt' && (!parsedData || !v6Analysis)) setTimeout(() => {
    if (typeof updateUniAddonSection === 'function') updateUniAddonSection();
  }, 150);
  if (nm==='unimaterial') setTimeout(() => {
    const bd = document.getElementById('bd-unimaterial');
    if (bd) bd.style.display = 'block';
    const lock = document.getElementById('uni-admin-lock');
    if (lock) lock.style.display = 'none';
    if (typeof renderUniMaterialTab === 'function') renderUniMaterialTab();
  }, 50);
  if (nm==='parentview') setTimeout(() => { if (typeof renderParentView === 'function') renderParentView(); }, 80);
  if (nm==='admission5' || nm==='admission9') setTimeout(() => loadAdmissionFrame(nm), 50);
  // 대시보드 탭 전환 시 꺾은선 차트 재그리기
  if (nm==='dashboard') requestAnimationFrame(() => requestAnimationFrame(initGradeCharts));
  // 인쇄용 제목 갱신
  const resScr = document.getElementById('res-scr');
  const stuNm = document.getElementById('sb-nm')?.textContent || '';
  if (resScr) resScr.setAttribute('data-print-title',
    (stuNm && stuNm !== '—' ? stuNm + ' — ' : '') + (TAB_PRINT_LABELS[nm] || nm));
  // 인쇄 버튼 표시
  const pb = document.getElementById('tab-print-btn');
  if (pb) { pb.style.display = (nm==='admission5' || nm==='admission9') ? 'none' : 'inline-flex'; pb.dataset.tab = nm; }
  const psel = document.getElementById('print-preset-sel');
  if (psel) { psel.style.display = (nm==='admission5' || nm==='admission9') ? 'none' : 'inline-block'; psel.value = 'detail'; applyPrintPresetPreview('detail'); }
  const pdesc = document.getElementById('print-preset-desc');
  if (pdesc) pdesc.style.display = 'none';
  const frb = document.getElementById('full-report-btn');
  if (frb) frb.style.display = 'inline-flex';
  const pmw = document.getElementById('print-mask-wrap');
  if (pmw) pmw.style.display = (nm==='admission5' || nm==='admission9') ? 'none' : 'inline-flex';
  const pmsw = document.getElementById('print-mask-school-wrap');
  if (pmsw) pmsw.style.display = (nm==='admission5' || nm==='admission9') ? 'none' : 'inline-flex';
  if (typeof applyPrivacyMaskToScreen === 'function') applyPrivacyMaskToScreen();
  // 빠른 접근 버튼 표시 (결과 화면에서만)
  const qbar = document.getElementById('quick-access-bar');
  if (qbar) qbar.style.display = 'flex';
}
