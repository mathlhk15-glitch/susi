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

// 대학자료 분석 상태
let currentUniMaterial = null;           // 현재 선택/분석된 대학자료 요약 객체
let currentUniMaterialComparison = null; // 현재 생기부↔대학자료 비교 결과 객체
let uniMaterialAnalysisLines = [];       // 대학자료 PDF에서 추출한 lines (임시, 저장 안 함)
