// ════════════════════════════════════════
//  Main Pipeline
// ════════════════════════════════════════
async function processPdf(file) {
  document.getElementById('err').style.display = 'none';
  document.getElementById('prog').style.display = 'block';
  setP(3, 'PDF 파일 불러오는 중...');
  pdfScale = 1.0; // 리셋

  try {
    clearDynamicStop(); // 이전 학생 이름/학교명 STOP에서 제거
    allLines = await loadPdf(file);
    setP(50, '영역별 구조 분석 중...');
    const info = extractInfo(allLines);
    takenSubjects = extractTaken(allLines);

    // 학생 이름·학교명·담임 등 개인명을 불용어에 동적 추가
    if (info.name && info.name !== '—') {
      addDynamicStop(info.name);
      for (let i = 0; i < info.name.length - 1; i++) {
        addDynamicStop(info.name.slice(i, i + 2));
      }
    }
    if (info.school && info.school !== '—') {
      addDynamicStop(info.school);
      addDynamicStop(info.school.replace(/(?:고등|중|초등)?학교$/, ''));
    }
    // 담임·출력자 등 추가 개인명
    for (const n of (info.extraNames || [])) {
      addDynamicStop(n);
      for (let i = 0; i < n.length - 1; i++) {
        addDynamicStop(n.slice(i, i + 2));
      }
    }
    setP(65, '탐구활동 추출 중...');
    parsedData = parseDoc(allLines);
    gradeScoreData = parseGradeScores(allLines);
    setP(88, '결과 렌더링 중...');

    document.getElementById('sb-nm').dataset.raw = info.name;
    document.getElementById('sb-sc').dataset.raw = info.school;
    document.getElementById('sb-nm').textContent = info.name;
    document.getElementById('sb-sc').textContent = info.school;
    document.getElementById('sb-stu').style.display = 'block';
    document.getElementById('sb-nav').style.display = 'block';

    // 이전 상담 데이터 복원
    const hadSaved = await loadConsultFromStorage(info.name);
    if (hadSaved && memos.length > 0) {
      setTimeout(() => {
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1aaa6e;color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.18)';
        toast.textContent = `💾 ${info.name} 학생의 이전 상담 기록 ${memos.length}건을 불러왔습니다`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
      }, 1500);
    }
    // 사이드바 저장 목록 갱신
    await initSavedStudentList();

    const cs = Object.values(parsedData.subject).flat().length;
    const ca = parsedData.auto.length, cl = parsedData.club.length;
    const cc = parsedData.career.length, cb = parsedData.behav.length;

    // 파싱 결과 0건 시 수동 매핑 모달 자동 표시 (PHASE 2-6)
    if (cs + ca + cl + cc + cb === 0) {
      setTimeout(() => openManualModal('subject'), 800);
    }

    const set = (id, v) => { const e = document.getElementById(id); if(e) e.textContent = v; };
    set('cnt-s',cs); set('cnt-a',ca); set('cnt-l',cl); set('cnt-c',cc); set('cnt-b',cb);
    set('snc-s',cs); set('snc-a',ca); set('snc-l',cl); set('snc-c',cc); set('snc-b',cb);

    document.getElementById('up-scr').style.display = 'none';
    document.getElementById('res-scr').style.display = 'block';

    renderAll(parsedData);

    // v13: Run v6 analysis engine
    setP(92, 'v6 분석 엔진 실행 중...');
    v6Analysis = v6RunAnalysis(parsedData, '');
    const infoObj = { name: info.name, school: info.school };

    // v13: Render dashboard
    setP(95, '대시보드 렌더링 중...');
    renderDashboard(v6Analysis, infoObj);
    set('snc-db', '✓');
    // 꺾은선 차트 초기화 (DOM 삽입 직후 requestAnimationFrame으로 크기 확보)
    requestAnimationFrame(() => requestAnimationFrame(initGradeCharts));

    // v13: Render AI prompt panel
    setP(97, 'AI 프롬프트 생성 중...');
    renderAIPrompt(parsedData, infoObj, v6Analysis);
    set('snc-ai', '✓');

    // 학부모용 화면 렌더링
    if (typeof renderParentView === 'function') setTimeout(renderParentView, 200);

    // 빠른 접근 버튼 표시
    const qbar = document.getElementById('quick-access-bar');
    if (qbar) qbar.style.display = 'flex';

    // 분석 완료 즉시 인쇄 버튼 표시 (switchTab을 거치지 않아도)
    const pb = document.getElementById('tab-print-btn');
    if (pb) { pb.style.display = 'inline-flex'; pb.dataset.tab = 'subject'; }
    const frb = document.getElementById('full-report-btn');
    if (frb) frb.style.display = 'inline-flex';
    const pmw = document.getElementById('print-mask-wrap');
    if (pmw) pmw.style.display = 'inline-flex';
    const pmsw = document.getElementById('print-mask-school-wrap');
    if (pmsw) pmsw.style.display = 'inline-flex';
    applyPrivacyMaskToScreen();

    setP(100, `완료 — 총 ${cs+ca+cl+cc+cb}개 활동 추출`);
    setTimeout(() => {
      document.getElementById('prog').style.display = 'none';
      // 스캔 PDF 안내 배너
      if (window._isScannedPdf) {
        let banner = document.getElementById('scanned-banner');
        if (!banner) {
          banner = document.createElement('div');
          banner.id = 'scanned-banner';
          banner.style.cssText = 'margin:0 0 18px 0;padding:16px 20px;background:#fff8e1;border:1px solid #f0c040;border-left:4px solid #f09840;border-radius:10px;font-size:13px;color:#7a5800;line-height:1.8';
          banner.innerHTML = `
            <strong>⚠️ OCR 미처리 PDF가 감지되었습니다</strong><br>
            이 PDF는 이미지 스캔본이라 텍스트 추출이 불가능합니다.<br>
            <b>해결 방법:</b><br>
            &nbsp;① NEIS(학교생활기록부 발급 시스템)에서 직접 <b>텍스트 포함 PDF</b>로 다시 내려받기<br>
            &nbsp;② 어도비 Acrobat / 한글 OCR 기능으로 텍스트 인식 후 저장<br>
            &nbsp;③ 인쇄 후 카메라 OCR 앱 사용 (Adobe Scan, 카카오렌즈 등)<br>
            <br>
            📄 PDF 뷰어는 정상 작동합니다 — 카드에서 <b>원문 보기</b> 버튼으로 원본을 열 수 있습니다.
          `;
          const resScr = document.getElementById('res-scr');
          resScr.insertBefore(banner, resScr.firstChild);
        }
      }
    }, 1200);

  } catch(e) {
    document.getElementById('prog').style.display = 'none';
    const el = document.getElementById('err');
    const msg = e.message || '';
    const name = e.name || '';

    // ── 오류 유형 분류 ──
    if (name === 'PasswordException' || msg.toLowerCase().includes('password')) {
      // 암호 PDF
      el.innerHTML = '🔒 <b>암호로 보호된 PDF입니다.</b><br>정부24/나이스에서 출력한 <b>암호 없는 생기부Ⅱ</b>를 사용해 주세요.<br><span style="font-size:11px;color:#888">※ 암호 해제 후 다시 업로드하거나, 인쇄 → PDF 저장 후 시도하세요.</span>';
    } else if (name === 'InvalidPDFException' || msg.includes('Invalid PDF')) {
      // 손상된 파일
      el.innerHTML = '❌ <b>유효하지 않은 PDF 파일입니다.</b><br>파일이 손상되었거나 PDF 형식이 아닐 수 있습니다.';
    } else {
      // 기타 오류
      el.innerHTML = '⚠️ <b>PDF 분석 중 오류가 발생했습니다.</b><br>정부24/나이스에서 발급한 <b>학교생활기록부Ⅱ</b>를 사용해 주세요.<br><span style="font-size:11px;color:#888">오류: ' + (msg || '알 수 없는 오류') + '</span>';
    }
    el.style.display = 'block';
    console.error(e);
  }
}

function setP(pct, lbl) {
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-lbl').textContent = lbl;
}

function esc(s='') {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
