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
    fi.addEventListener('change', e => { if(e.target.files[0]) { processPdf(e.target.files[0]); fi.value = ''; } });
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

// ── admin:logout UI 처리 (adminAuth.js 에서 이벤트로 분리) ──
window.addEventListener('admin:logout', function () {
  // 분석 결과가 없는 경우에만 업로드 화면으로 복귀
  const upScr = document.getElementById('up-scr');
  const resScr = document.getElementById('res-scr');
  const isResultVisible = resScr && resScr.style.display !== 'none';
  if (!isResultVisible && upScr) upScr.style.display = 'block';

  // 관리자 전용 사이드바 숨김
  const sbNavAdmin = document.getElementById('sb-nav-admin');
  if (sbNavAdmin) sbNavAdmin.style.display = 'none';

  // sb-nav 내 대학자료 항목 복원 (중복 방지용으로 숨겼던 항목)
  const uniInMain = document.getElementById('sb-ni-uni-main');
  if (uniInMain) uniInMain.style.display = '';

  // 대학자료 탭 리렌더
  if (typeof window.renderUniMaterialTab === 'function') {
    setTimeout(window.renderUniMaterialTab, 50);
  }
});

// ── 사이드바 메뉴 접고 펴기 ──
function toggleNav(lbl) {
  const nav = lbl.parentElement;
  nav.classList.toggle('collapsed');
}

// ── admin:login UI 처리 ──
window.addEventListener('admin:login', function () {
  // sb-nav 내 대학자료 항목 숨김 (sb-nav-admin 에서 이미 표시 중)
  const uniInMain = document.getElementById('sb-ni-uni-main');
  if (uniInMain) uniInMain.style.display = 'none';
});

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

// ── 공용 PC 모드: 탭/브라우저 종료 시 세션 데이터 자동 삭제 ──
// sendBeacon 기반으로 동기적 삭제는 불가능하므로, 페이지 로드 시
// sessionStorage 플래그로 "직전 세션이 삭제 없이 종료됐는지" 감지해 정리.
(function _initSessionOnlyMode() {
  const SESSION_ONLY_KEY = 'saenggibu_session_only';
  const DIRTY_KEY        = 'saenggibu_session_dirty';

  // 직전 세션이 공용 PC 모드였고 비정상 종료됐으면 → IDB 전체 정리
  const wasDirty = sessionStorage.getItem(DIRTY_KEY);
  if (wasDirty) {
    sessionStorage.removeItem(DIRTY_KEY);
    // _clearSessionData는 promptBuilder.js 로드 후 사용 가능
    // DOMContentLoaded 이후 실행 보장
    window.addEventListener('DOMContentLoaded', () => {
      if (typeof _clearSessionData === 'function') _clearSessionData();
    }, { once: true });
  }

  // 탭 종료 시: sessionStorage에 dirty 플래그 기록 + 즉시 삭제 시도
  window.addEventListener('pagehide', () => {
    if (!_sessionOnlyMode) return;
    // pagehide는 동기 코드만 보장. IDB 삭제는 비동기라 다음 로드 시 정리.
    sessionStorage.setItem(DIRTY_KEY, '1');
    // 빠른 환경에서는 즉시 삭제도 시도 (성공 여부 무관)
    if (typeof _clearSessionData === 'function') _clearSessionData();
  });

  // 페이지 로드 시 체크박스 상태 복원 (sessionStorage 기준)
  // — 새 탭이면 항상 OFF로 시작 (sessionStorage는 탭 단위)
  const chk = document.getElementById('session-only-chk');
  if (chk) {
    // sessionStorage가 살아있으면(= 새로고침) 이전 설정 복원
    const prev = sessionStorage.getItem(SESSION_ONLY_KEY);
    if (prev === '1') {
      chk.checked = true;
      if (typeof window.toggleSessionOnlyMode === 'function') {
        window.toggleSessionOnlyMode(true);
      }
    }
  }
})();
