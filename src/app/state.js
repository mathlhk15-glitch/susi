// ════════════════════════════════════════
//  Global State
// ════════════════════════════════════════
let pdfDoc = null, pdfScale = 1.0, pdfFitScale = 1.0;
let currentPage = 1, totalPages = 0;
let currentAct = null, currentHLs = [], selTxt = '';
let memos = [], finalMemoSaved = null;
let parsedData = null, allLines = [], takenSubjects = {};
let v6Analysis = null; // v6 분석 엔진 결과 저장
let gradeScoreData = null; // 내신 성적 분석 데이터
let infoObj = null; // 학생 정보 (name, school, grade, major)

// 대학자료 분석 상태
let currentUniMaterial = null;           // 현재 선택/분석된 대학자료 요약 객체
let currentUniMaterialComparison = null; // 현재 생기부↔대학자료 비교 결과 객체
let uniMaterialAnalysisLines = [];       // 대학자료 PDF에서 추출한 lines (임시, 저장 안 함)

// ════════════════════════════════════════
//  전역 토스트 알림 (utils — 로드 순서 독립)
// ════════════════════════════════════════
window.showToast = function (msg, color, duration) {
  const t = document.createElement('div');
  t.style.cssText =
    'position:fixed;bottom:24px;right:24px;background:' + (color || '#1aaa6e') +
    ';color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;' +
    'font-weight:700;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.2);max-width:320px;line-height:1.5';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration || 3500);
};
