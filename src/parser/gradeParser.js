// ════════════════════════════════════════
//  내신 성적 파서 — 교과별 석차등급 추출
// ════════════════════════════════════════
/*
  생기부 성적 행 예시:
    "국어 4 92/80.2(12.8) A(151) 3"          → 일반선택: 석차등급=3
    "수학Ⅱ 4 91/69.2(19.5) A(151) 2"
    "사회문제 탐구 2 66/86.9 B(150) A(73.3)..." → 진로선택: 석차등급 없음
    "체육 2 A"                                 → 체예: 석차등급 없음

  파싱 전략:
  - 교과학습발달상황 섹션 진입
  - [N학년] 헤더로 학년 추적
  - 학기(1학기/2학기) 헤더로 학기 추적
  - 성적 행 패턴: 과목명 학점 원점수/평균(표준편차) 성취도(수강자수) 석차등급
  - 석차등급이 1~9 숫자인 경우만 집계
  - 교과 분류: 국어/수학/영어/사회/과학/기타
*/

function parseGradeScores(lines) {
  // 교과 분류 맵
  const SUBJECT_GROUP_MAP = {
    '국어': ['국어','문학','독서','화법','언어','매체','작문','문법','고전'],
    '수학': ['수학','기하','미적분','확률','통계','수학과제'],
    '영어': ['영어','영미문학','영어독해','영어회화','심화영어'],
    '사회': ['사회','한국사','역사','도덕','윤리','정치','법','경제','지리','문화','통합사회'],
    '과학': ['과학','물리','화학','생명','지구','생물','통합과학'],
  };

  function getSubjectGroup(subjectName) {
    const s = subjectName.replace(/\s/g, '').replace(/[ⅠⅡⅢⅣ]/g, '').replace(/[0-9]/g, '');
    for (const [grp, keywords] of Object.entries(SUBJECT_GROUP_MAP)) {
      if (keywords.some(k => s.includes(k))) return grp;
    }
    return '기타';
  }

  // 결과 구조: { subjects: [{grade, semester, subject, group, credits, rank}], ... }
  const subjects = [];

  // 성적 행 패턴들
  // 일반선택: "과목명 학점 원점수/평균(표준편차) 성취도(수강자수) 석차등급"
  // 예: "국어 4 92/80.2(12.8) A(151) 3"
  // 예: "수학Ⅱ 4 91/69.2(19.5) A(151) 2"
  const SCORE_RE = /^([가-힣A-Za-zⅠⅡⅢⅣ·\s\d]{1,25}?)\s+([1-8])\s+[\d.]+\/[\d.]+(?:\([\d.]+\))?\s+[A-EP]\(?\d*\)?\s+([1-9])(?:\s|$)/;

  let inScore = false;
  let curGrade = 1;
  let curSemester = 1;

  const GRADE_HDR = /^\[([123])학년\]/;
  const SEMESTER_HDR = /^([12])학기$/;
  const SKIP = /^(?:학년|학기|교과|이수|합계|비고|원점수|석차|성취도|이수학점|수업일수|결석|봉사|과목세부|해당\s*사항|창의적|행동|독서|수상|자격|진로|자율|동아|출결|인적|학적|학교폭력)/;
  const END_SECTION = /행동특성\s*및\s*종합의견|독서활동상황|9\.\s*행동/;

  for (const { text: raw } of lines) {
    const ln = raw.trim();
    if (!ln) continue;

    if (/교과학습발달상황/.test(ln)) { inScore = true; continue; }
    if (END_SECTION.test(ln)) { inScore = false; continue; }
    if (!inScore) continue;

    // 학년 헤더
    const gm = ln.match(GRADE_HDR);
    if (gm) { curGrade = parseInt(gm[1]); curSemester = 1; continue; }

    // 학기 헤더
    const sm = ln.match(SEMESTER_HDR);
    if (sm) { curSemester = parseInt(sm[1]); continue; }

    if (SKIP.test(ln)) continue;

    // 성적 행 매칭
    const rm = ln.match(SCORE_RE);
    if (rm) {
      const subjectRaw = rm[1].trim();
      const credits    = parseInt(rm[2]);
      const rankGrade  = parseInt(rm[3]);

      // 과목명 최소 검증
      if (subjectRaw.length < 2) continue;
      // 석차등급 1~9 범위
      if (rankGrade < 1 || rankGrade > 9) continue;

      const group = getSubjectGroup(subjectRaw);

      subjects.push({
        grade: curGrade,
        semester: curSemester,
        subject: subjectRaw,
        group,
        credits,
        rank: rankGrade,
      });
    }
  }

  if (subjects.length === 0) return null;

  // 교과별 가중 평균 계산
  function calcAvg(list) {
    if (!list.length) return null;
    const totalCredits = list.reduce((s, r) => s + r.credits, 0);
    if (!totalCredits) return null;
    const weightedSum  = list.reduce((s, r) => s + r.credits * r.rank, 0);
    return Math.round(weightedSum / totalCredits * 100) / 100;
  }

  const GROUPS = ['국어','수학','영어','사회','과학'];
  const groupAvg = {};
  for (const g of GROUPS) {
    const list = subjects.filter(s => s.group === g);
    groupAvg[g] = { avg: calcAvg(list), list };
  }
  const allList = subjects.filter(s => s.group !== '기타');
  const totalAvg = calcAvg(allList);

  // 학년별 전체 평균
  const gradeAvg = {};
  for (const gr of [1,2,3]) {
    const list = subjects.filter(s => s.grade === gr && s.group !== '기타');
    if (list.length) gradeAvg[gr] = calcAvg(list);
  }

  return { subjects, groupAvg, totalAvg, gradeAvg };
}
