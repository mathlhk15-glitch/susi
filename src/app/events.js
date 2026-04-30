// ════════════════════════════════════════
//  Events
// ════════════════════════════════════════
try {
  const upZone = document.getElementById('up-zone');
  const fi = document.getElementById('fi');
  if (!upZone || !fi) {
    console.error('v13: up-zone or fi element not found!');
  } else {
    upZone.addEventListener('click', () => fi.click());
    fi.addEventListener('change', e => { if(e.target.files[0]) processPdf(e.target.files[0]); });
    upZone.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); upZone.classList.add('drag-over'); });
    upZone.addEventListener('dragleave', () => upZone.classList.remove('drag-over'));
    upZone.addEventListener('drop', e => {
      e.preventDefault(); upZone.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (!f) return;
      // Accept PDF by MIME type OR file extension (some browsers/OS report different MIME)
      const isPdf = f.type === 'application/pdf'
        || f.type === 'application/x-pdf'
        || f.type === ''  // some systems don't set MIME for local files
        || (f.name && f.name.toLowerCase().endsWith('.pdf'));
      if (isPdf) processPdf(f);
      else { const el=document.getElementById('err'); el.textContent='PDF 파일만 업로드 가능합니다. (감지된 타입: ' + (f.type || '없음') + ', 파일명: ' + (f.name || '알수없음') + ')'; el.style.display='block'; }
    });
    // Prevent browser default PDF open on drag anywhere on page
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', e => e.preventDefault());
    console.log('v13: Event handlers registered successfully');
  }
} catch(evtErr) {
  console.error('v13: Event handler registration failed:', evtErr);
}

document.getElementById('modal-ov').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-ov')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// 페이지 로드 시 저장된 상담 이력 확인
initSavedStudentList().catch(() => {});

// ── 모바일 사이드바 토글 ──────────────────────────────
window.toggleSidebar = function () {
  const sb = document.getElementById('sb-aside');
  const ov = document.getElementById('sb-overlay');
  const btn = document.getElementById('mob-menu-btn');
  if (!sb) return;
  const isOpen = sb.classList.contains('open');
  if (isOpen) {
    sb.classList.remove('open');
    if (ov) ov.classList.remove('open');
    if (btn) btn.textContent = '☰';
  } else {
    sb.classList.add('open');
    if (ov) ov.classList.add('open');
    if (btn) btn.textContent = '✕';
  }
};

window.closeSidebar = function () {
  const sb = document.getElementById('sb-aside');
  const ov = document.getElementById('sb-overlay');
  const btn = document.getElementById('mob-menu-btn');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
  if (btn) btn.textContent = '☰';
};

// 사이드바 메뉴 클릭 시 모바일에서 자동 닫기
document.querySelectorAll('.sb-ni').forEach(ni => {
  ni.addEventListener('click', () => {
    if (window.innerWidth <= 960) window.closeSidebar();
  });
});
