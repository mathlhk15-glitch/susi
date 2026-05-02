// ════════════════════════════════════════
//  v6 → Claude 프롬프트 빌더 (JS 이식)
// ════════════════════════════════════════

function v6BuildPromptForClaude(parsedData, info, analysis, hopeText, uniOptions) {
  const L = [];
  const ln = s => L.push(s === undefined ? '' : s);
  const today = new Date().toISOString().slice(0, 10);
  const name = info?.name || '—';
  const major = hopeText || '미기재';

  // ── 역할 지시 ─────────────────────────────────────────
  ln("당신은 대입 학생부종합전형(학종) 전문 컨설턴트입니다.");
  ln("아래 생기부 요약 데이터를 분석하여 지시된 항목을 모두 출력하세요.");
  ln();

  // ── 출력 형식 강제 선택 요청 ─────────────────────────
  ln("【 ⚠️ 응답 전 필수 확인 — 출력 형식을 먼저 선택하세요 】");
  ln("분석을 시작하기 전에 반드시 아래 두 가지 중 하나를 선택하여 응답 첫 줄에 명시하세요.");
  ln("선택 없이 바로 분석을 출력하지 마세요.");
  ln();
  ln("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  ln("  선택 A: 텍스트(Markdown) 출력");
  ln("  선택 B: HTML 보고서 출력");
  ln("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  ln();
  ln("사용자가 형식을 지정하지 않은 경우, 아래 질문을 먼저 출력하고 대기하세요:");
  ln('  → "출력 형식을 선택해 주세요: [A] 텍스트(Markdown) / [B] HTML 보고서"');
  ln("  → 사용자가 A 또는 B를 입력하면 그때 분석을 시작하세요.");
  ln();
  ln("▶▶▶ [선택 A — 텍스트(Markdown) 출력] 선택 시 규칙:");
  ln("  - 응답 첫 줄: '▶ 텍스트(Markdown) 출력 모드로 응답합니다.'");
  ln("  - 제목은 【 】, 항목은 ▶, 번호는 ①②③ 형식으로 작성");
  ln();
  ln("  ⚠️ [텍스트 분할 출력 — 최우선 구조 규칙]");
  ln("  이 프롬프트의 전체 분량은 단일 응답으로 출력할 수 없습니다.");
  ln("  반드시 아래 3단계로 나눠 출력하고, 각 단계 끝에서 멈추세요.");
  ln();
  ln("  ┌─ 첫 번째 응답 ──────────────────────────────────────┐");
  ln("  │ 1~6번 + 7번(활동 1~2, 각 활동 10단계 모두 포함)     │");
  ln("  │ 마지막 줄: '👉 활동 3~5를 보려면 \"계속\"을 입력하세요' │");
  ln("  │ → 여기서 반드시 출력을 멈추고 사용자 입력을 기다림    │");
  ln("  └──────────────────────────────────────────────────────┘");
  ln("  ┌─ 두 번째 응답 ('계속' 입력 후) ──────────────────────┐");
  ln("  │ 7번(활동 3~5, 각 활동 10단계 모두 포함)              │");
  ln("  │ 마지막 줄: '👉 8~15번을 보려면 \"계속\"을 입력하세요'  │");
  ln("  │ → 여기서 반드시 출력을 멈추고 사용자 입력을 기다림    │");
  ln("  └──────────────────────────────────────────────────────┘");
  ln("  ┌─ 세 번째 응답 ('계속' 입력 후) ──────────────────────┐");
  ln("  │ 8~15번 (15번 대학 적합도 분석은 필수 포함)           │");
  ln("  │ 마지막에 Python 코드 블록 추가 (아래 참조)            │");
  ln("  └──────────────────────────────────────────────────────┘");
  ln();
  ln("  절대로 1~15번을 한 번에 출력하지 마세요.");
  ln("  활동을 축약·요약하여 한 응답에 욱여넣는 것을 금지합니다.");
  ln("  각 활동의 10단계(①~⑩)는 단계당 2~3문장(40~80자)으로 상세 서술해야 합니다.");
  ln();
  ln("  [Python 코드 블록 — 세 번째 응답 마지막에 추가]");
  ln("  - 응답 마지막에 반드시 아래 Python 코드 블록을 그대로 추가:");
  ln("    ```python");
  ln("    # DOCX_EXPORT");
  ln('    content = """(위에서 작성한 전체 분석 텍스트를 여기에 그대로 복사)"""');
  ln("    ```");
  ln("  ※ 위 코드 블록을 생략하거나 '실행됨' 처리하지 말 것.");
  ln("  ※ content = \"\"\" ... \"\"\" 안에 전체 분석 텍스트를 반드시 포함할 것.");
  ln();
  ln("▶▶▶ [선택 B — HTML 보고서 출력] 선택 시 규칙:");
  ln("  - 응답 전체가 <!DOCTYPE html>로 시작하고 </html>로 끝나는 단일 HTML 파일");
  ln("  - 마크다운 코드펜스(```)나 설명 텍스트 절대 포함 금지");
  ln("  - 응답을 그대로 복사해 .html로 저장하면 브라우저에서 바로 열려야 함");
  ln("  - ⚠️ 분할 출력(계속) 금지 — 1~15번 전체를 하나의 HTML 파일에 완결");
  ln("  - 섹션 7(탐구활동 5개)은 아래 [HTML 압축 형식]으로 출력:");
  ln();
  ln("  [HTML 압축 형식 — 섹션 7 전용]");
  ln("  활동 1~5 각각에 대해:");
  ln("  · 메타정보(과목/성취기준/역량/연계/활용/결과물/평가/시간)는 그대로 표시");
  ln("  · 10단계는 각 단계를 1~2문장(20~50자)으로 간결하게 서술");
  ln("  · 10단계 전부(①~⑩) 빠짐없이 포함 — 생략·합치기 금지");
  ln("  · 5개 활동 모두 동일 수준으로 완전히 작성 (축약·참조 금지)");
  ln("  · 보고서 하단에 안내 추가: '※ 각 활동의 상세 10단계 설계는 텍스트(A) 모드로 출력하면 확인할 수 있습니다.'");
  ln();
  ln("  [HTML 필수 기능 1 — PDF 저장 버튼]");
  ln("  · 우측 상단 고정 툴바에 '📄 PDF 저장' 버튼 배치");
  ln("  · 클릭 시 window.print() 호출 (CSS @media print 최적화 포함)");
  ln("  · @media print 설정: 버튼/툴바 숨김, 페이지 여백 15mm, 폰트 축소");
  ln("  · page-break-inside: avoid 로 섹션 잘림 방지");
  ln();
  ln("  [HTML 필수 기능 2 — 다크/라이트 모드 토글]");
  ln("  · 우측 상단 고정 툴바에 '🌙 어두운 모드' / '☀️ 밝은 모드' 버튼");
  ln("  · document.body에 'dark-mode' 클래스 토글");
  ln("  · CSS 변수(--bg, --text, --card-bg, --border, --accent) 사용");
  ln("  · 밝은 모드: 흰 배경 / 어두운 텍스트");
  ln("  · 어두운 모드: 배경 #1a1a2e, 텍스트 #e0e0e0, 카드 #16213e, 강조 #4fc3f7");
  ln("  · localStorage에 모드 저장 (페이지 재로드 시 유지)");
  ln();
  ln("  [HTML 스타일 가이드]");
  ln("  · 한국어 폰트: 'Noto Sans KR' (Google Fonts CDN)");
  ln("  · 섹션별 카드 레이아웃, 강점 초록 / 리스크 빨강·주황·노랑 배지");
  ln("  · 반응형 디자인 (모바일/태블릿/PC)");
  ln("  · 목차 클릭 시 해당 섹션으로 스크롤");
  ln();

  // ── 중요 지시사항 ────────────────────────────────────
  ln("【 중요 지시사항 — 반드시 준수 】");
  ln("1. 근거 제시 시 반드시 [근거N / 학년 / 과목 또는 영역 / 활동유형] 형식 사용");
  ln("2. 학년미상 항목을 리스크로 단정 금지 (PDF 파싱 한계 가능)");
  ln("3. 각 보완점에는 실행 가능한 전략까지 포함");
  ln("4. 입학사정관 설득형 보고서 형식으로 작성");
  ln("5. 근거 없는 추론 금지 — 없는 내용은 '근거 없음 — 확인 필요'로 표기");
  ln();

  // ── 학생 기본 정보 ────────────────────────────────────
  ln("=" .repeat(60));
  ln("【 학생 기본 정보 】");
  ln("=" .repeat(60));
  ln(`성명      : ${name}`);
  ln(`희망 학과 : ${major}`);
  ln(`학생 유형 : ${analysis.studentType?.label || '—'}`);
  ln(`성장 추세 : ${analysis.trend}`);
  ln(`분석일    : ${today}`);
  ln();

  // ── 정량 대시보드 ─────────────────────────────────────
  const db = analysis.dashboard;
  if (db && db.totalRecords) {
    ln("【 상담 보조 지수 대시보드 (대학 평가 점수 아님) 】");
    ln(`  총 활동 레코드 : ${db.totalRecords}건`);
    ln(`  탐구깊이 평균  : ${db.avgDepth}/10`);
    ln(`  학년미상 비율  : ${db.unknownRatio}%`);
    ln(`  객관적 기록 비율: ${db.factRatio}%`);
    ln(`  데이터 신뢰도  : ${db.trustGrade}`);
    ln();
    if (db.gradeCount) { ln("  학년별 활동 수:"); for (const [g, c] of Object.entries(db.gradeCount).sort()) ln(`    ${g}: ${c}건`); }
    if (db.areaCount) { ln("  영역별 활동 수:"); for (const [a, c] of Object.entries(db.areaCount).sort()) ln(`    ${a}: ${c}건`); }
    ln();
  }

  // ── 항목2: 핵심 키워드 상위 20개 ──────────────────────
  ln("【 핵심 키워드 상위 20개 】");
  try {
    const kwSource = window._kwAll?.tfidfScores || [];
    if (kwSource.length) {
      const top20 = kwSource.slice(0, 20).map(([w, s]) => `${w}(${Math.round(s * 10)})`).join(' / ');
      ln("  " + top20);
    } else {
      // fallback: allRecords에서 간단 추출
      const allText = (analysis.allRecords || []).map(r => r.full || r.summary || '').join(' ');
      const words = allText.match(/[가-힣]{2,}/g) || [];
      const freq = {};
      for (const w of words) { if (w.length >= 2 && w.length <= 6) freq[w] = (freq[w] || 0) + 1; }
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20);
      if (sorted.length) ln("  " + sorted.map(([w, c]) => `${w}(${c})`).join(' / '));
      else ln("  키워드 데이터 없음");
    }
  } catch(e) { ln("  키워드 데이터 없음"); }
  ln();

  // ── 학년별 탐구깊이 ───────────────────────────────────
  ln("【 학년별 탐구깊이 】");
  for (const [g, v] of Object.entries(analysis.growth).sort()) {
    ln(`  ${g} → 평균 ${v.avg}/10  최고 ${v.max}/10  활동 ${v.count}건`);
  }
  if (!Object.keys(analysis.growth).length) ln("  학년 데이터 없음");
  ln();

  // ── 항목3: 학년 태그 기반 성장 재구성 ─────────────────
  ln("【 학년 태그 기반 성장 재구성 】");
  for (const [g, v] of Object.entries(analysis.growth).sort()) {
    if (g === '학년미상') continue;
    const gl = v6ClassifyGrowthLevel(v.avg);
    const glName = V6_GROWTH_LEVELS[gl] || '';
    ln(`  ${g}: Level ${gl} [${glName}]  평균 ${v.avg}/10  활동 ${v.count}건`);
    try {
      const gradeRecs = (analysis.allRecords || []).filter(r => r.grade === g);
      const gradeText = gradeRecs.map(r => r.full || r.summary || '').join(' ');
      const gradeWords = (typeof tokenize === 'function') ? tokenize(gradeText) : (gradeText.match(/[가-힣]{2,6}/g) || []);
      const gradeFreq = {};
      for (const w of gradeWords) gradeFreq[w] = (gradeFreq[w] || 0) + 1;
      const top5 = Object.entries(gradeFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w).join(', ');
      if (top5) ln(`    핵심 활동 키워드: ${top5}`);
    } catch(e) {}
  }
  ln();

  // ── 교과 세특 근거 ────────────────────────────────────
  ln("=" .repeat(60));
  ln("【 교과 세부능력 및 특기사항 근거 】");
  ln("=" .repeat(60));
  let ref = 1;
  const subjectRecords = Object.values(parsedData.subject).flat();
  if (subjectRecords.length) {
    for (const rec of subjectRecords) {
      const depth = v6ScoreInquiryDepth(rec.full || rec.summary || '');
      const tags = depth.detected.join('/') || '기초';
      ln(`[근거${ref} / ${rec.grade || '학년미상'} / ${rec.subject || '과목미상'} / 교과세특]  탐구깊이 ${depth.score}/10 · ${tags}`);
      const summary = (rec.full || rec.summary || '').slice(0, 70).replace(/\n/g, ' ');
      ln(`  요약: ${summary}${(rec.full || '').length > 70 ? '...' : ''}`);
      ln(`  전문: ${rec.full || rec.summary || ''}`);
      ln();
      ref++;
    }
  } else { ln("  세특 데이터 없음"); }
  ln();

  // ── 창체 근거 ─────────────────────────────────────────
  ln("=" .repeat(60));
  ln("【 창의적 체험활동 근거 】");
  ln("=" .repeat(60));
  const ccaRecords = [...parsedData.auto, ...parsedData.club, ...parsedData.career];
  if (ccaRecords.length) {
    for (const rec of ccaRecords) {
      const depth = v6ScoreInquiryDepth(rec.full || rec.summary || '');
      const areaKr = { auto: "자율활동", club: "동아리활동", career: "진로활동" }[rec.area] || rec.area || '창체';
      ln(`[근거${ref} / ${rec.grade || '학년미상'} / ${areaKr} / 창체]  탐구깊이 ${depth.score}/10`);
      const summary = (rec.full || rec.summary || '').slice(0, 70).replace(/\n/g, ' ');
      ln(`  요약: ${summary}${(rec.full || '').length > 70 ? '...' : ''}`);
      ln(`  전문: ${rec.full || rec.summary || ''}`);
      ln();
      ref++;
    }
  } else { ln("  창체 데이터 없음"); }
  ln();

  // ── 행동특성 ──────────────────────────────────────────
  ln("【 행동특성 및 종합의견 】");
  if (parsedData.behav.length) { ln("  " + parsedData.behav.map(r => r.full || r.summary || '').slice(0, 5).join(' ')); }
  else { ln("  데이터 없음"); }
  ln();

  // ── 항목4: 독서활동 데이터 ────────────────────────────
  ln("【 독서활동 (상위 5건) 】");
  const readings = parsedData.reading || [];
  if (readings.length) {
    readings.slice(0, 5).forEach((r, i) =>
      ln(`  · ${i + 1} ${r.subject || ''} ${r.full || r.summary || ''}`)
    );
  } else {
    // fallback: allRecords에서 독서 관련 키워드가 포함된 활동 추출
    const readingRecs = (analysis.allRecords || []).filter(r =>
      /독서|책을?\s*읽|저자|도서|읽고|논문/.test(r.full || r.summary || '')
    );
    if (readingRecs.length) {
      readingRecs.slice(0, 5).forEach((r, i) => {
        const snippet = (r.full || r.summary || '').slice(0, 80);
        ln(`  · ${i + 1} ${r.subject || r.area || ''} ${snippet}...`);
      });
    } else {
      ln("  독서활동 데이터 없음 (별도 확인 필요)");
    }
  }
  ln();

  // ── 로컬 분석 결과 ────────────────────────────────────
  ln("=" .repeat(60));
  ln("【 로컬 자동 분석 결과 】");
  ln("=" .repeat(60));
  ln("▶ 자동 탐지 강점:");
  for (const s of analysis.strengths) ln(`  · ${s.name} (점수 ${s.score})`);
  if (!analysis.strengths.length) ln("  없음");
  ln();
  ln("▶ 자동 탐지 리스크 (우선순위 순):");
  for (const r of analysis.risks) {
    const pm = r.priority === 1 ? "🔴" : r.priority === 2 ? "🟡" : "🟢";
    ln(`  ${pm} ${r.name}: ${r.desc}`);
    ln(`     → 개선: ${r.fix}`);
  }
  if (!analysis.risks.length) ln("  없음");
  ln();

  // ══════════════════════════════════════════════════════
  // 항목5: 분석 요청 사항 (v6 수준 세분화)
  // ══════════════════════════════════════════════════════
  ln("=" .repeat(60));
  ln("【 분석 요청 사항 — 아래 항목을 모두 순서대로 출력하세요 】");
  ln("=" .repeat(60));
  ln();

  ln("【 1. 핵심 강점 3가지 】");
  ln("  각 강점마다 [근거N / 학년 / 과목 / 유형] 명시 필수");
  ln("  강점명 / 근거 2건 / 면접·자소서 활용 방향 포함");
  ln();

  ln("【 2. 보완점 3가지 (실행 전략 포함) 】");
  ln("  각 보완점: 문제 설명 + 실행 전략(①②③ 단계 구분) + 예상 효과");
  ln();

  ln("【 3. 학년별 성장 흐름 】");
  ln("  1학년 핵심 역량 레벨 → 2학년 도약 → 종합 성장 평가");
  ln("  '초기 혼란→피드백→수정→성장'의 인지 변화 서사 포함");
  ln("  각 학년마다 학생이 깨달은 순간이나 문제 해결 장면 1회 이상 명시");
  ln();

  ln("【 4. 전공 적합성 판정 】");
  ln(`  희망 학과: ${major}`);
  ln("  판정 기준: 상(上) / 중(中) / 하(下)");
  ln("  직접 근거 2문장 + 보조 근거 1문장 + 3학년 보완 방향");
  ln();

  ln("【 5. 학종 리스크 점검 (우선순위 순) 】");
  ln("  최대 3가지, 각 리스크: 🔴우선순위높음/🟡보통/🟢낮음 표시");
  ln("  리스크 설명 + 개선 방향 + 3학년에서 보완 가능 여부");
  ln();

  ln("【 6. 면접 예상 질문 3개 】");
  ln("  활동 맥락 반영, 각 질문에 '예상 답변 핵심 포인트' 2줄 포함");
  ln("  질문 유형: 탐구 동기형 / 심화 개념형 / 성장 서사형 각 1개");
  ln();

  ln("【 7. 맞춤 탐구활동 설계 5개 (3학년 대비) 】");
  ln();
  ln("  · 텍스트 모드: 상단 분할 출력 규칙에 따라 활동 1~2 / 3~5로 나눠 출력");
  ln("  · HTML 모드: 단일 파일에 5개 활동 전부 포함 (10단계 간결 서술)");
  ln();

  // ── 활동별 독립 스캐폴딩 (5회 반복이 아닌 5개 독립 블록) ──
  for (let i = 1; i <= 5; i++) {
    ln(`  ==============================`);
    ln(`  ▶ 활동 ${i}`);
    ln(`  ==============================`);
    ln(`  · 탐구 주제:       (                              )`);
    ln(`  · 과목:            (                              )`);
    ln(`  · 성취기준 코드:   (예: [12물리Ⅱ01-03]            )`);
    ln(`  · 교과 역량:       (                              )`);
    ln(`  · 1학년 생기부 연계: (연계되는 기존 기록 요약 1줄  )`);
    ln(`  · 교내 활용 방식:  (교과 발표/포스터/동아리/캠페인 )`);
    ln(`  · 결과물:          (보고서/발표자료/포스터 등      )`);
    ln(`  · 평가 방법:       (과정 중심 평가 기준            )`);
    ln(`  · 예상 소요 시간:  (예: 3주, 총 12시간            )`);
    ln();
    ln(`  -- 활동 ${i}의 10단계 탐구 흐름 (텍스트: 2~3문장 / HTML: 1~2문장) --`);
    ln(`  ① 문제의식:   (                                    )`);
    ln(`  ② 질문 구체화: (                                    )`);
    ln(`  ③ 탐구 계획:   (                                    )`);
    ln(`  ④ 배경 조사:   (                                    )`);
    ln(`  ⑤ 핵심 활동:   (                                    )`);
    ln(`  ⑥ 교과 분석:   (                                    )`);
    ln(`  ⑦ 성찰:       (                                    )`);
    ln(`  ⑧ 후속 활동:   (                                    )`);
    ln(`  ⑨ 해결 방안:   (                                    )`);
    ln(`  ⑩ 자기 성장:   (                                    )`);
    ln();
  }

  ln("  [10단계 서술 기준]");
  ln("  · 텍스트 모드: 각 단계 2~3문장(40~80자) — 구체적 상황·행동·결과 서술");
  ln("  · HTML 모드:   각 단계 1~2문장(20~50자) — 핵심만 간결하게 서술");
  ln("  · 공통: ①~④ 탐구 배경·설계, ⑤~⑦ 수행·분석, ⑧~⑩ 확산·성장");
  ln("  · 공통: '~함' 같은 1문장 종결 금지 — Why와 How 포함");
  ln("  · 공통: 5개 활동은 서로 다른 교과·주제·역량 (중복 금지)");
  ln();

  ln("【 8. 세특 초안 1개 (희망 전공 연계 과목, 1500바이트/한글 500자) 】");
  ln(`  대상 과목: ${major} 관련 교과 중 탐구깊이 가장 높은 과목 선택`);
  ln("  아래 세특 작성 규칙을 반드시 준수하여 작성:");
  ln();
  ln("  [세특 작성 4단계 구조]");
  ln("  ① 탐구 동기 및 문제의식: 질문의 출발점, 수업 연계 계기, 현실 문제 인식");
  ln("  ② 탐구 전개 – 핵심 장면: 질문 재구성, 개념 적용, 관점 변화를 서사 중심으로");
  ln("  ③ 실천 및 확장: 탐구 결과를 사회적 실천이나 표현으로 확장");
  ln("  ④ 교사 종합 평가: 탐구 흐름·역량·태도를 반영한 개별 강점 마무리");
  ln();
  ln("  [필수 반영 요소]");
  ln("  - 초기 혼란·어려움과 이를 극복한 장면 1회 이상");
  ln("  - 독서 연계 (도서명 + 탐구 방향이 바뀐 장면)");
  ln("  - 토론 또는 발표 장면 (쟁점·주장·근거 포함)");
  ln("  - 탐구 전후 인식 변화 대비 명시");
  ln("  - 공동체 기여 역량 (협업·나눔·리더십 중 1개)");
  ln("  - 모든 문장은 '~함' 계열 종결형, 관찰자 어조로 작성");
  ln("  - 전문용어 나열 금지, 학생의 언어로 풀어 서술");
  ln("  - 대학 평가 요소(학업역량·전공적합성·자기주도성·성장가능성) 2~3개 자연스럽게 반영");
  ln("  - 출력 후 마지막 줄에 (글자수: ○○자) 표시");
  ln();

  ln("【 9. 교과 간 연계 분석 및 통합 서사 】");
  ln("  교과 간 공통 사고 도구 3가지 이상 추출");
  ln("  '하나의 탐구 질문'으로 교과를 묶는 통합 스토리라인 제안");
  ln("  예: 반도체 온실가스(사회문제탐구) → 열팽창(물리) → 모델링(수학) 연결");
  ln();

  ln("【 10. 강점 → 전공 의미 → 면접 활용 연결 구조 】");
  ln("  각 핵심 강점이 희망 전공에서 왜 중요한지 설명");
  ln(`  희망 학과: ${major}`);
  ln("  형식: 강점명 → 전공에서의 의미 → 면접·자소서 활용 시나리오");
  ln("  입학사정관이 그 강점을 어떻게 평가할지 관점 포함");
  ln();

  ln("【 11. 종적 성장 서사 (탐구 계보) 】");
  ln("  1학년 문제의식 → 2학년 심화 → 3학년 해결의 연결 흐름 자동 구성");
  ln("  각 학년 전환의 계기(사건·독서·수업·대화 등) 1개씩 명시");
  ln("  '탐구 계보' 형태로 핵심 키워드 연결: 예) 환경문제→열팽창→반도체 공정 개선");
  ln("  학생을 관통하는 하나의 탐구 스토리라인 한 문장으로 요약");
  ln();

  ln("【 12. 사고 도구 기반 학생 정의 】");
  ln("  이 학생을 대표하는 인지 구조 유형을 명시 (활동 중심이 아닌 사고 방식 중심)");
  ln("  예: '모델링 + 수량화 + 설계형 공학 인재' / '사회문제→공학 해결 융합형'");
  ln("  주요 사고 도구 3가지: 질문 유형, 탐구 방식, 결과 활용 방식");
  ln("  탐구 주제 클러스터 분류: 에너지·환경 / 수학·모델링 / 반도체·AI·HW / 공학설계 / 인문사회 / AI·알고리즘");
  ln();

  ln("【 13. 리스크 → 실행 전략 로드맵 】");
  ln("  각 리스크별 '문제 → 원인 → 해결 행동 → 기대 효과' 4단계 구조로 작성");
  ln("  해결 행동은 고등학생이 3학년 내 실행 가능한 수준으로 구체화");
  ln("  우선순위 1순위 리스크는 반드시 월 단위 실행 일정 포함");
  ln();

  ln("【 14. 상담용 1문단 학생 요약 (교사·학부모용) 】");
  ln("  교사나 학부모가 바로 활용할 수 있는 3~5문장 요약");
  ln("  형식: '이 학생은 ○○을 기반으로 △△을 해결하려는 탐구 흐름을 보이며…'");
  ln("  학업역량·전공적합성·자기주도성·성장가능성 중 2개 이상 자연스럽게 반영");
  ln();

  // ── 항목6: 메타 안내 및 주의사항 강화 ─────────────────
  ln("【 메타 안내 】");
  ln("  - 본 분석은 텍스트 기반 자동 분석이며 실제 대학 평가 점수가 아닙니다.");
  ln("  - 상담 보조자료로 활용하며, 최종 판단은 전문 컨설턴트와 협의하세요.");
  ln("  - 학생의 잠재력과 성장 가능성을 발견하는 데 초점을 맞춘 도구입니다.");
  ln();
  ln("⚠ 학년미상 항목을 리스크로 단정하지 말 것 (PDF 파싱 한계 가능)");
  ln("⚠ 근거 없는 추론 금지 / [근거N / 학년 / 과목 / 유형] 반드시 인용");
  ln("⚠ 고등학생 수준을 벗어난 과잉 해석·용어 사용 금지");
  ln("  요약본에 없는 내용 → '근거 없음 — 확인 필요' 표기");
  ln();
  ln(`※ 본 분석은 상담 보조자료이며 실제 대학 평가를 예측하지 않습니다.`);
  ln(`※ 생성: 모두의 생기부 분석기 v13 · ${today}`);

  // ── 15번: 대학 맞춤 적합도 분석 (항상 출력, 대학 미선택 시 경희대 기본) ──
  const uniOpt = uniOptions || {};
  const uniMat = uniOpt.material || window.currentUniMaterial || window.currentUniMaterialComparison || null;
  const uniName_sel = uniOpt.universityName || (uniMat && uniMat.universityName) || '경희대학교';
  const uniDept_sel = uniOpt.departmentName || (uniMat && uniMat.departmentName) || major;
  const uniDocType_sel = uniOpt.docType || '';

  ln();
  ln("=".repeat(60));
  ln("【 15. 지원 대학 맞춤 적합도 분석 】");
  ln("=".repeat(60));
  ln(`대학명: ${uniName_sel}`);
  ln(`학과명: ${uniDept_sel || '—'}`);
  if (uniMat && uniMat.admissionType) ln(`전형명: ${uniMat.admissionType}`);
  if (uniDocType_sel) ln(`참고 자료: ${uniDocType_sel}`);
  ln();

  if (uniMat && uniMat.evaluationElements?.length) {
    ln(`평가요소: ${uniMat.evaluationElements.join(', ')}`);
  }
  if (uniMat && uniMat.recommendedSubjects?.length) {
    ln(`권장과목: ${uniMat.recommendedSubjects.join(', ')}`);
  }
  if (uniMat && uniMat.cautions?.length) {
    ln(`유의사항: ${uniMat.cautions.join(' / ')}`);
  }
  if (uniMat && uniMat.extractedSummary) {
    ln();
    ln("[ 대학 자료 요약 ]");
    ln(uniMat.extractedSummary.slice(0, 3000));
  }

  ln();
  ln("【 위 대학자료를 반영하여 다음 4가지를 분석하세요 】");
  ln("  ① 이 학생의 활동이 해당 대학 평가요소에 얼마나 부합하는지 — 상/중/하로 판정 + 근거 제시");
  ln("  ② 권장과목 이수 여부와 세특 연계성 확인 후 미이수·연계 부족 gap 명시");
  ln("  ③ 유의사항(수능최저·면접 등)이 있다면 학생 현황과 비교하여 전략적 보완 방향 제시");
  ln("  ④ 이 대학·전형 기준으로 [4. 전공 적합성 판정]과 [5. 리스크 점검]을 재조정한 최종 지원 적합도 — 상/중/하 + 한 줄 총평");
  ln();
  ln("  HTML 보고서 출력 시: 이 섹션을 별도 카드(파란 테두리)로 렌더링하고 섹션 번호 15로 표기");
  // ── 대학자료 삽입 끝 ────────────────────────────────────────────────────────

  return L.join('\n');
}

// ── 상담 저장/복원 (IndexedDB) ──
const IDB_NAME = 'saenggibu_db';
const IDB_VER  = 1;
const IDB_STORE = 'students';
let _idb = null;

function _openIDB() {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: 'name' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
        store.createIndex('grade',   'grade',   { unique: false });
      }
    };
    req.onsuccess = e => { _idb = e.target.result; resolve(_idb); };
    req.onerror   = e => reject(e.target.error);
  });
}

// localStorage → IndexedDB 1회 마이그레이션
async function _migrateFromLocalStorage() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('sangdam_')) keys.push(k);
  }
  if (!keys.length) return;
  const db = await _openIDB();
  for (const k of keys) {
    try {
      const d = JSON.parse(localStorage.getItem(k));
      const nm = k.replace('sangdam_', '');
      await new Promise((res, rej) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put({ name: nm, ...d });
        tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
      });
      localStorage.removeItem(k);
    } catch(e) {}
  }
}

// 앱 시작 시 마이그레이션 실행
_openIDB().then(() => _migrateFromLocalStorage()).catch(() => {});

// ── 백업 배너 표시 ──
async function _checkBackupBanner() {
  try {
    const students = await listSavedStudents();
    const banner = document.getElementById('backup-banner');
    if (!banner) return;
    if (students.length >= 10) {
      banner.textContent = `💾 데이터가 ${students.length}명 저장되어 있습니다. 백업하기 버튼을 눌러 JSON으로 저장하세요.`;
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  } catch(e) {}
}

// ── 레거시 키 헬퍼 (deleteSavedStudent에서 localStorage 직접 호출 제거용) ──
function _storageKey(nm) { return 'sangdam_' + (nm || 'default'); }

async function saveConsultToStorage() {
  const nm = document.getElementById('sb-nm').textContent || '';
  if (!nm || nm === '—') return;
  const payload = { name: nm, memos, finalMemoSaved, savedAt: new Date().toISOString() };
  try {
    const db = await _openIDB();
    await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(payload);
      tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
    });
    _checkBackupBanner();
  } catch(e) {}
}

async function loadConsultFromStorage(nm) {
  try {
    const db = await _openIDB();
    const record = await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(nm);
      req.onsuccess = e => res(e.target.result);
      req.onerror   = e => rej(e.target.error);
    });
    if (!record) return false;
    if (record.memos) memos = record.memos;
    if (record.finalMemoSaved) finalMemoSaved = record.finalMemoSaved;
    return true;
  } catch(e) { return false; }
}

async function listSavedStudents() {
  try {
    const db = await _openIDB();
    return await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = e => res((e.target.result || []).map(r => ({
        name: r.name, savedAt: r.savedAt, memoCount: (r.memos || []).length
      })));
      req.onerror = e => rej(e.target.error);
    });
  } catch(e) { return []; }
}

// ── JSON Export ──
async function exportStudentsJSON() {
  try {
    const db = await _openIDB();
    const all = await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = e => res(e.target.result || []);
      req.onerror   = e => rej(e.target.error);
    });
    const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `students_backup_${today}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch(e) { alert('내보내기 실패: ' + e.message); }
}

// ── JSON Import ──
function importStudentsJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('올바른 형식이 아닙니다.');
      const db = await _openIDB();
      let count = 0;
      for (const rec of data) {
        if (!rec.name) continue;
        await new Promise((res, rej) => {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(rec);
          tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
        });
        count++;
      }
      alert(`${count}명 데이터를 가져왔습니다.`);
      initSavedStudentList();
      _checkBackupBanner();
    } catch(e) { alert('가져오기 실패: ' + e.message); }
  };
  input.click();
}

const AREA_LABELS = {
  subject: '교과 탐구활동', auto: '자율활동', club: '동아리활동',
  career: '진로활동', behav: '행동특성 및 종합의견'
};

const FIELD_LABELS = {
  history: '역사·인문', science: '과학·기술',
  social: '사회·법', math: '수학', general: '기타'
};

// 교과군 정보 (2015+2022 통합)
const SUBJ_GROUPS = [
  { name: '국어', color: '#2b7fe8', keys: [
    '국어','공통국어',
    '독서','문학','화법과 작문','언어와 매체','실용 국어','심화 국어','고전 읽기',
    '화법과 언어','독서와 작문','주제 탐구 독서','문학과 영상','직무 의사소통',
    '독서 토론과 글쓰기','매체 의사소통','언어생활 탐구',
  ]},
  { name: '수학', color: '#1aaa6e', keys: [
    '수학','공통수학','기본수학',
    '수학Ⅰ','수학Ⅱ','미적분','확률과 통계','기하',
    '실용 수학','경제 수학','수학과제 탐구','기본 수학','인공지능 수학',
    '대수','미적분Ⅰ','미적분Ⅱ','직무 수학','수학과 문화','실용 통계',
  ]},
  { name: '영어', color: '#7c3fe4', keys: [
    '영어','공통영어','기본영어',
    '영어회화','영어Ⅰ','영어Ⅱ','영어 독해와 작문',
    '실용 영어','영어권 문화','진로 영어','영미 문학 읽기',
    '영어 발표와 토론','심화 영어 독해와 작문','직무 영어',
    '실생활 영어 회화','미디어 영어','세계 문화와 영어',
  ]},
  { name: '한국사', color: '#c9871f', keys: ['한국사','한국사1','한국사2']},
  { name: '사회', color: '#f09840', keys: [
    '통합사회','통합사회1','통합사회2',
    '생활과 윤리','윤리와 사상','한국지리','세계지리','여행지리',
    '세계사','동아시아사','경제','정치와 법','사회·문화','사회문화','사회문제 탐구',
    '세계시민과 지리','한국지리 탐구','도시의 미래 탐구','역사로 탐구하는 현대 세계',
    '사회와 문화','현대사회와 윤리','정치','법과 사회','인문학과 윤리',
    '금융과 경제생활','윤리문제 탐구','국제 관계의 이해','기후변화와 지속가능한 세계',
  ]},
  { name: '과학', color: '#d44060', keys: [
    '통합과학','통합과학1','통합과학2',
    '과학탐구실험','과학탐구실험1','과학탐구실험2',
    '물리학Ⅰ','물리학Ⅱ','화학Ⅰ','화학Ⅱ',
    '생명과학Ⅰ','생명과학Ⅱ','지구과학Ⅰ','지구과학Ⅱ',
    '생활과 과학','융합과학','과학사',
    '역학과 에너지','전자기와 빛','화학 반응의 세계','물질의 성질','물질의 변화',
    '세포와 물질대사','생물의 유전','지구시스템과학','행성우주과학',
    '기후변화와 환경생태','융합과학 탐구','과학의 역사와 문화',
    '물리학','화학','생명과학','지구과학', // 2022 일반선택 단독 과목명
    '전자기와 양자','화학 반응의 세계','생물의 유전','역학과 에너지',
  ]},
  { name: '기술·가정', color: '#6080b0', keys: [
    '기술·가정','정보','환경','한문','진로와 직업',
    '농업 생명 과학','공학 일반','창의 경영','가정과학','지식 재산 일반',
    '인공지능 기초','빅데이터 분석',
    '소프트웨어와 생활','데이터 과학','로봇과 공학세계',
    '창의 공학 설계','생활과학 탐구','미디어 콘텐츠 제작',
    '아동발달과 부모','생애설계와 자립',
  ]},
  { name: '예체능', color: '#8060c0', keys: [
    '체육','운동과 건강','음악','미술',
    '스포츠 생활','체육 탐구','음악 감상과 비평','음악 연주','미술 감상과 비평','미술 창작',
    '스포츠 생활1','스포츠 생활2','체력 운동','스포츠 경기 체험','스포츠 경기 실습',
    '음악 연주와 창작','음악과 미디어','미술과 매체',
  ]},
];

function getGroup(nm) {
  if (!nm || nm === '공통') return '기타'; // '공통' 자체는 기타로
  const nmC = nm.replace(/\s/g,'');
  for (const g of SUBJ_GROUPS) {
    if (g.keys.some(k => {
      const kc = k.replace(/\s/g,'');
      // 완전 일치 또는 과목명이 key로 시작 (예: '공통국어1' → key '공통국어' 포함)
      // kc.startsWith(nmC)는 nmC가 너무 짧으면 오작동 → 최소 3자 이상만 허용
      return nmC === kc || nmC.startsWith(kc) || (nmC.length >= 3 && kc.startsWith(nmC));
    })) return g.name;
  }
  const canon = normalizeSubjName(nm);
  if (canon !== nm) return getGroup(canon);
  if (/국어|독서|문학|화법|언어|작문|매체/.test(nm)) return '국어';
  if (/수학|미적분|확률|기하|대수/.test(nm)) return '수학';
  if (/영어/.test(nm)) return '영어';
  if (/한국사/.test(nm)) return '한국사';
  if (/과학|물리|화학|생명|지구|역학|전자기|세포|유전|행성/.test(nm)) return '과학';
  if (/융합과학|과학탐구|과학사/.test(nm)) return '과학';
  if (/사회|지리|역사|정치|경제|윤리|금융|국제/.test(nm)) return '사회';
  if (/기술|가정|정보|인공지능|환경|한문|로봇|소프트웨어|데이터|공학|진로/.test(nm)) return '기술·가정';
  if (/체육|음악|미술|운동|스포츠|예술/.test(nm)) return '예체능';
  return '기타';
}
