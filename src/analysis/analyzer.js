// ════════════════════════════════════════
//  v6 분석 엔진 (Python → JS 이식)
// ════════════════════════════════════════

const V6_DEPTH_LEVELS = {
  "문제인식":  { level: 2, pattern: /궁금|의문|문제|원인|이유|왜\s|어떻게|고민|관심|발견|착안|주목/ },
  "가설·설계": { level: 3, pattern: /가설|설계|계획|방법|절차|변인|조건|실험\s*설계|탐구\s*설계/ },
  "탐구·실험": { level: 5, pattern: /실험|측정|관찰|조사|분석|비교|수집|수행|탐구|검토|데이터\s*수집/ },
  "결과·해석": { level: 7, pattern: /결과|도출|확인|검증|해석|결론|발견|밝혀|증명|규명|산출/ },
  "확장·적용": { level: 9, pattern: /확장|응용|적용|연계|발전|개선|제안|나아가|더\s*나아가|심화|연구/ },
};

const V6_DEPTH_BONUS_OUTPUT   = /보고서|발표|제작|구현|개발|논문|시제품|포스터|UCC|앱|코드|프로그램|작품/;
const V6_DEPTH_BONUS_SELF     = /스스로|자기주도|자발적|직접|주도적|자체적|능동적/;
const V6_DEPTH_BONUS_INTERDIS = /융합|연계|교과|수학적|물리적|화학적|생물학적|사회적|인문학적|통합적/;
const V6_DEPTH_BONUS_QUANT    = /\d+[\s]*(?:%|배|점|회|명|개|건|km|m|g|kg|ml|L|초|분|시간)|자료\s*정리|그래프|시각화|수치|정량|데이터\s*분석|오차|잔차|파라미터|통계|회귀|상관관계|표준편차/;
const V6_DEPTH_BASIC_ACTIVITY = /자료|정리|그래프|시각화|수치|비교|데이터|정량|조사|발표|보고/;

// ── PHASE 3: v6ScoreInquiryDepth — 구조 점수 70% + 키워드 점수 30% ──
// 문장 구조 패턴 (On-device AI 없이 맥락 점수 추가)
const STRUCTURE_PATTERNS = {
  problemHypothesis: {
    pattern: /(궁금|의문|문제|왜|어떻게|고민).{0,50}(가설|예상|추측|~라면|라면)/,
    score: 2
  },
  hypothesisAction: {
    pattern: /(가설|예상|추측).{0,50}(실험|조사|측정|분석|제작|설계)/,
    score: 2
  },
  actionResult: {
    pattern: /(실험|조사|측정|분석).{0,100}(결과|발견|확인|검증|증명)/,
    score: 2
  },
  resultExtension: {
    pattern: /(결과|발견|확인).{0,100}(한계|개선|응용|발전|추가|더 나아가|향후|심화)/,
    score: 3
  },
  quantitative: {
    pattern: /\d+[\s]*(배|%|점|회|명|개|건|km|m|g|kg|ml).{0,30}(분석|비교|측정|계산)/,
    score: 2
  },
};

function v6ScoreInquiryDepth(text) {
  const detected = [];

  // ── 1. 키워드 점수 (기존 로직, 가중치 30%) ──
  let maxLevel = 0;
  for (const [label, cfg] of Object.entries(V6_DEPTH_LEVELS)) {
    if (cfg.pattern.test(text)) {
      detected.push(label);
      maxLevel = Math.max(maxLevel, cfg.level);
    }
  }
  let kwScore = maxLevel;
  if (kwScore === 0 && V6_DEPTH_BASIC_ACTIVITY.test(text)) { kwScore = 1; detected.push('기초활동인정'); }
  if (V6_DEPTH_BONUS_OUTPUT.test(text))   { kwScore += 1.5; detected.push('결과물산출'); }
  if (V6_DEPTH_BONUS_SELF.test(text))     { kwScore += 1.0; detected.push('자기주도'); }
  if (V6_DEPTH_BONUS_INTERDIS.test(text)) { kwScore += 1.5; detected.push('교과융합'); }
  if (V6_DEPTH_BONUS_QUANT.test(text))    { kwScore += 0.5; detected.push('정량수치'); }
  kwScore = Math.min(10.0, kwScore);

  // ── 2. 구조 점수 (문장 구조 패턴, 가중치 70%) ──
  let structScore = 0;
  for (const [key, cfg] of Object.entries(STRUCTURE_PATTERNS)) {
    if (cfg.pattern.test(text)) {
      structScore += cfg.score;
      detected.push('구조:' + key);
    }
  }
  // 구조 점수 최대 10점 정규화 (최대 합산 11점 → 10점 스케일)
  structScore = Math.min(10.0, structScore);

  // ── 3. 최종 점수 = 키워드 × 0.3 + 구조 × 0.7 ──
  const finalScore = Math.min(10.0, Math.round((kwScore * 0.3 + structScore * 0.7) * 10) / 10);

  return {
    score: finalScore,
    detected,
    _kwScore:     Math.round(kwScore * 10) / 10,
    _structScore: Math.round(structScore * 10) / 10,
    _breakdown:   `키워드 점수: ${Math.round(kwScore * 10) / 10} | 구조 점수: ${Math.round(structScore * 10) / 10} | 최종: ${finalScore}`,
  };
}

const V6_STRENGTH_RULES = [
  { name: "자기주도 탐구력",  pattern: /스스로|자기주도|자발적|직접|주도적|능동적/, weight: 2 },
  { name: "수리·논리 역량",   pattern: /수학적|통계|모델링|수식|정량|계산|논리적|수치|정적분|미분|방정식/, weight: 2 },
  { name: "실험·관찰 역량",   pattern: /실험|관찰|측정|데이터\s*수집|샘플|시료|변인/, weight: 2 },
  { name: "결과물 산출",      pattern: /보고서|발표|제작|구현|개발|논문|시제품|포스터|앱|코드/, weight: 2 },
  { name: "융합·연계 사고",   pattern: /융합|연계|교과|수학적|물리적|화학적|인문학적|통합적/, weight: 2 },
  { name: "탐구 지속성",      pattern: /심화|확장|후속|이어서|연속|지속|발전시|이를\s*바탕/, weight: 1 },
  { name: "협력·소통",        pattern: /협력|협업|팀|모둠|공동|함께|토론|발표|설득|소통/, weight: 1 },
  { name: "문제해결력",       pattern: /해결|극복|개선|보완|수정|오류\s*수정|문제\s*해결|대안/, weight: 2 },
  { name: "공학적 구현력",    pattern: /아두이노|회로|센서|코드|프로그램|구현|제작|시작품|설계/, weight: 3 },
];

function v6DetectStrengths(records) {
  const results = [];
  for (const rule of V6_STRENGTH_RULES) {
    const matchedTexts = [];
    let total = 0;
    for (const rec of records) {
      const text = rec.full || rec.summary || '';
      const hits = (text.match(new RegExp(rule.pattern.source, 'g')) || []).length;
      if (hits > 0) {
        total += hits * rule.weight;
        if (matchedTexts.length < 2) matchedTexts.push(text.slice(0, 80) + (text.length > 80 ? '...' : ''));
      }
    }
    if (total > 0) results.push({ name: rule.name, score: total, evidence: matchedTexts });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5);
}

const V6_RISK_RULES = [
  {
    name: "창체 활동 기록 부족",
    check: recs => recs.filter(x => x.area !== 'subject').length < 3,
    desc: "창의적 체험활동(자율·동아리·진로) 기록이 3건 미만으로 적습니다.",
    fix:  "남은 학기 동아리·진로활동 기록을 구체적으로 보강하세요.",
    priority: 2,
  },
  {
    name: "독서활동 연계 부족",
    check: recs => !recs.some(x => /독서|책|읽|저자|논문/.test(x.full || x.summary || '')),
    desc: "세특·창체에서 독서나 논문 연계 언급이 없습니다.",
    fix:  "세특 서술 시 관련 도서·논문을 탐구 동기나 심화 근거로 연결하세요.",
    priority: 3,
  },
  {
    name: "학년별 성장 흐름 보완 필요",
    check: recs => {
      const grades = new Set(recs.map(x => x.grade).filter(g => g && g !== '학년미상'));
      return grades.size < 2;
    },
    desc: "학년 정보가 확인된 활동이 1개 학년에 편중되어 있습니다.",
    fix:  "원본 생기부와 비교하여 1·2학년 기록을 고르게 정리하고 성장 흐름을 명시하세요.",
    priority: 1,
  },
  {
    name: "전공 연계 심층 활동 부족",
    check: recs => recs.filter(x => v6ScoreInquiryDepth(x.full || x.summary || '').score >= 7).length < 2,
    desc: "탐구깊이 7점 이상의 심층 활동이 2건 미만입니다.",
    fix:  "희망 전공과 직접 연결되는 심층 탐구활동을 최소 2건 이상 확보하세요.",
    priority: 2,
  },
  {
    name: "결과물 부재",
    check: recs => !recs.some(x => V6_DEPTH_BONUS_OUTPUT.test(x.full || x.summary || '')),
    desc: "보고서·발표·제작물 등 구체적 결과물 언급이 없습니다.",
    fix:  "탐구 결과를 보고서, 발표, 제작물 형태로 정리하고 세특에 명시하세요.",
    priority: 2,
  },
];

function v6DetectRisks(records) {
  const results = [];
  for (const rule of V6_RISK_RULES) {
    try {
      if (rule.check(records)) {
        results.push({ name: rule.name, desc: rule.desc, fix: rule.fix, priority: rule.priority });
      }
    } catch(e) {}
  }
  results.sort((a, b) => a.priority - b.priority);
  return results;
}

const V6_STUDENT_TYPE_KW = {
  "공학·SW형":     ["프로그래밍","코딩","알고리즘","소프트웨어","아두이노","회로","설계","시스템","개발","구현","SW","IT","컴퓨터","기계공학","전기공학","전자공학","메카트로닉스","반도체","센서","제어","임베디드","NPU","HBM","칩","공학","엔지니어","기계","로봇","자동화","드론"],
  "수학·모델링형":  ["수학","미적분","확률","통계","수식","모델링","방정식","함수","행렬","벡터","최적화","정적분","미분방정식","푸리에","라플라스","급수","수열","기하","선형대수"],
  "자연과학형":     ["실험","관찰","가설","물리","화학","생명","지구","천문","생물","유전","분자","원자","열역학","열전달","열팽창","압전","광학","전자기","역학","유체","파동","에너지","신소재","나노","양자"],
  "의생명·보건형":  ["의학","생명","바이오","약학","보건","의료","세포","유전자","DNA","단백질","질환","치료"],
  "인문·사회형":    ["문학","역사","철학","사회","경제","정치","법","윤리","문화","언어","사상","비판적"],
  "경영·경제형":    ["경제","경영","마케팅","창업","스타트업","기업","투자","금융","비즈니스","시장"],
  "예술·디자인형":  ["미술","음악","영상","공연","심미","그림","악기","연주","합창","오케스트라","미술관","전시"],
};

const V6_ENG_HOPE_KW = /기계공학|전기공학|전자공학|반도체|AI|인공지능|메카트로닉스|컴퓨터|소프트웨어|정보통신|로봇|항공|우주|화학공학|재료공학|신소재|물리|공학|엔지니어|기계|시스템|임베디드|하드웨어/;

function v6EstimateStudentType(records, hopeText) {
  const allText = records.map(r => r.full || r.summary || '').join(' ');
  const combined = allText;
  const scores = {};
  for (const [typeName, kwList] of Object.entries(V6_STUDENT_TYPE_KW)) {
    scores[typeName] = kwList.reduce((sum, kw) => sum + (combined.split(kw).length - 1), 0);
  }
  if (V6_ENG_HOPE_KW.test(hopeText || '')) {
    scores["공학·SW형"]    = (scores["공학·SW형"] || 0) + 20;
    scores["수학·모델링형"] = (scores["수학·모델링형"] || 0) + 10;
    scores["자연과학형"]   = (scores["자연과학형"] || 0) + 5;
    scores["예술·디자인형"] = Math.floor((scores["예술·디자인형"] || 0) / 2);
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0]?.[0] || "유형미상";
  const secondary = (sorted[1]?.[1] > 0) ? sorted[1][0] : null;
  const label = (secondary && secondary !== primary) ? `${primary}-${secondary}` : primary;
  return { label, primary, secondary, scores };
}

function v6AnalyzeGrowth(records) {
  const gradeScores = {};
  for (const rec of records) {
    const text = rec.full || rec.summary || '';
    const depth = v6ScoreInquiryDepth(text);
    const grade = rec.grade || '학년미상';
    if (!gradeScores[grade]) gradeScores[grade] = [];
    gradeScores[grade].push(depth.score);
  }
  const summary = {};
  for (const g of Object.keys(gradeScores).sort()) {
    const s = gradeScores[g];
    summary[g] = { avg: Math.round(s.reduce((a, b) => a + b, 0) / s.length * 10) / 10, max: Math.max(...s), count: s.length };
  }
  return summary;
}

function v6JudgeGrowthTrend(growth) {
  const gradeKeys = Object.keys(growth).filter(g => g !== '학년미상').sort();
  if (gradeKeys.length < 2) return "➡️ 유지 (데이터 부족)";
  const avgs = gradeKeys.map(g => growth[g].avg);
  const deltas = avgs.slice(1).map((v, i) => v - avgs[i]);
  const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  if (meanDelta >= 1.0) return "📈 뚜렷한 성장";
  if (meanDelta >= 0.3) return "📊 완만한 성장";
  if (meanDelta <= -0.5) return "⚠️ 점검 필요";
  return "➡️ 유지";
}

function v6ClassifyGrowthLevel(score) {
  if (score >= 8.5) return 5;
  if (score >= 6.5) return 4;
  if (score >= 4.5) return 3;
  if (score >= 2.5) return 2;
  return 1;
}

const V6_GROWTH_LEVELS = { 1: "관심 형성", 2: "교과 개념 이해", 3: "자료 조사·분석", 4: "수학적 모델링·실험 설계", 5: "실제 구현·검증·확장" };

const V6_UNIVERSITY_FRAMES = {
  "서울대형":       { points: ["학업역량","탐구 지속성","지적 호기심","자기주도 학습"], focus: "학년별 성장이 뚜렷하고, 동일 주제를 심화 탐구한 흔적" },
  "KAIST/POSTECH형": { points: ["수학·과학 심화","문제 정의력","실험·모델링","결과물 구현"], focus: "수치 기반 분석, 실험 설계, 코드/회로 구현 등 공학적 접근" },
  "한양대형":       { points: ["실용적 문제해결","공학적 구현","사회문제 해결 의식"], focus: "실제 장치 제작, 사회 연계 탐구, 팀 프로젝트 경험" },
  "국립대 공학계열형": { points: ["전공기초역량","공동체역량","성실성","교과 내신"], focus: "기초 교과 성실 이수, 동아리·봉사 활동, 진로 연계 일관성" },
};

function v6BuildUnivFrameAnalysis(records, strengths, risks, hopeText, growth) {
  const result = {};
  const strengthNames = strengths.map(s => s.name);
  const isEng = V6_ENG_HOPE_KW.test(hopeText || '');
  for (const [univ, frame] of Object.entries(V6_UNIVERSITY_FRAMES)) {
    const evidence = [], caution = [], strategy = [];
    if (univ === "서울대형") {
      if (strengthNames.includes("탐구 지속성") || strengthNames.includes("자기주도 탐구력")) evidence.push("자기주도 탐구 및 지속적 심화 기록 확인됨");
      else caution.push("동일 주제 반복 탐구 기록이 부족함");
      if (Object.keys(growth).length >= 2) evidence.push(`${Object.keys(growth).length}개 학년 성장 데이터 존재`);
      strategy.push("학년별 동일 주제 심화 흔적을 면접 스토리로 구성");
      strategy.push("지적 호기심이 드러나는 탐구 동기 정리 필요");
    } else if (univ === "KAIST/POSTECH형") {
      if (strengthNames.includes("수리·논리 역량")) evidence.push("수학적 모델링·정량 분석 활동 확인됨");
      if (strengthNames.includes("공학적 구현력")) evidence.push("아두이노·회로·코드 등 실제 구현 활동 확인됨");
      if (strengthNames.includes("실험·관찰 역량")) evidence.push("실험 설계 및 데이터 분석 역량 확인됨");
      if (!evidence.length) caution.push("수치 기반 분석·실험 구현 기록이 부족함");
      strategy.push("수식·데이터·코드 중심 탐구활동을 면접에서 구체적으로 설명");
      strategy.push("결과물(보고서·시작품) 준비 권장");
    } else if (univ === "한양대형") {
      if (strengthNames.includes("결과물 산출")) evidence.push("구체적 제작·구현 결과물 확인됨");
      if (strengthNames.includes("문제해결력")) evidence.push("문제해결 중심 활동 확인됨");
      if (isEng) evidence.push("공학 진로 일관성 확인됨");
      strategy.push("사회 문제와 연결된 공학적 해결 시나리오 준비");
      strategy.push("팀 프로젝트 경험이 있으면 면접에서 강조");
    } else if (univ === "국립대 공학계열형") {
      if (strengthNames.includes("탐구 지속성") || strengthNames.includes("협력·소통")) evidence.push("성실성·공동체 활동 확인됨");
      strategy.push("교과 성적과 동아리 활동의 일관성을 강조");
      strategy.push("진로 연계 활동의 구체성을 보강하면 유리");
    }
    result[univ] = { points: frame.points, focus: frame.focus, evidence: evidence.length ? evidence : ["데이터 분석 중 — 원본 확인 필요"], caution: caution.length ? caution : ["특별한 주의점 없음"], strategy };
  }
  return result;
}

function v6ComputeDashboard(records) {
  const total = records.length;
  if (total === 0) return {};
  const gradeCount = {}, areaCount = {};
  for (const r of records) {
    const g = r.grade || '학년미상';
    gradeCount[g] = (gradeCount[g] || 0) + 1;
    const areaMap = { subject: "교과세특", auto: "자율활동", club: "동아리활동", career: "진로활동", behav: "행동특성" };
    const aKr = areaMap[r.area] || r.area || '기타';
    areaCount[aKr] = (areaCount[aKr] || 0) + 1;
  }
  const scores = records.map(r => v6ScoreInquiryDepth(r.full || r.summary || '').score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;
  const unknownCount = gradeCount['학년미상'] || 0;
  const unknownRatio = Math.round(unknownCount / total * 1000) / 10;
  const factPat = /\d+|실험|측정|관찰|제작|구현|분석|설계|조사|개발/g;
  const absPat = /우수|탁월|뛰어|훌륭|성실|모범|적극적|열정|창의적/g;
  let factCount = 0, absCount = 0;
  for (const r of records) { const t = r.full || r.summary || ''; factCount += (t.match(factPat) || []).length; absCount += (t.match(absPat) || []).length; }
  const totalTokens = factCount + absCount;
  const factRatio = totalTokens > 0 ? Math.round(factCount / totalTokens * 1000) / 10 : 50;
  let trustGrade = "C (낮음 — 원본 확인 권장)";
  if (unknownRatio < 20 && factRatio > 60) trustGrade = "A (높음)";
  else if (unknownRatio < 40 && factRatio > 40) trustGrade = "B (보통)";
  return { totalRecords: total, gradeCount, areaCount, avgDepth: avgScore, unknownRatio, factRatio, trustGrade };
}

function v6RunAnalysis(parsedData, hopeText) {
  const allRecords = [
    ...Object.values(parsedData.subject).flat(),
    ...parsedData.auto,
    ...parsedData.club,
    ...parsedData.career,
    ...parsedData.behav
  ];
  const strengths = v6DetectStrengths(allRecords);
  const risks = v6DetectRisks(allRecords);
  const studentType = v6EstimateStudentType(allRecords, hopeText);
  const growth = v6AnalyzeGrowth(allRecords);
  const trend = v6JudgeGrowthTrend(growth);
  const dashboard = v6ComputeDashboard(allRecords);
  const univFrames = v6BuildUnivFrameAnalysis(allRecords, strengths, risks, hopeText, growth);
  // 각 레코드에 depth score 첨부
  for (const rec of allRecords) {
    const d = v6ScoreInquiryDepth(rec.full || rec.summary || '');
    rec._depthScore = d.score;
    rec._depthDetected = d.detected;
    rec._growthLevel = v6ClassifyGrowthLevel(d.score);
  }
  return { strengths, risks, studentType, growth, trend, dashboard, univFrames, allRecords };
}
