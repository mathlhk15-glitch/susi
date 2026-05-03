// ════════════════════════════════════════
//  uniMaterialAnalyzer.js
//  대학자료(모집요강·전형안내 등) 텍스트 분석 엔진
//  입력 : pdfLoader.js 의 loadPdf() 가 반환하는 lines 배열
//         lines[i] = { text: string, page: number, items: [...] }
//  출력 : 요약 객체 (원문 전체 저장 없음)
// ════════════════════════════════════════

(function () {
  'use strict';

  // ─────────────────────────────────────
  //  상수 사전
  // ─────────────────────────────────────

  /** 대학명 패턴 — 주요 대학 + 일반 접미사 */
  const UNI_SUFFIXES = ['대학교', '대학원대학교', '과학기술원', '교육대학교'];
  const KNOWN_UNIS = [
    '서울대학교','연세대학교','고려대학교','성균관대학교','서강대학교',
    '한양대학교','이화여자대학교','중앙대학교','경희대학교','한국외국어대학교',
    '서울시립대학교','건국대학교','동국대학교','홍익대학교','숙명여자대학교',
    'KAIST','포항공과대학교','POSTECH','울산과학기술원','UNIST',
    'GIST','광주과학기술원','DGIST','대구경북과학기술원',
    '부산대학교','경북대학교','전남대학교','전북대학교','충남대학교',
    '충북대학교','강원대학교','제주대학교','인천대학교','경상국립대학교',
    '아주대학교','인하대학교','세종대학교','국민대학교','숭실대학교',
    '단국대학교','가톨릭대학교','광운대학교','명지대학교','상명대학교',
    '창원대학교','경남대학교','울산대학교','동아대학교','부경대학교',
  ];

  /** 평가요소 후보 */
  const EVAL_ELEMENTS = [
    '학업역량','진로역량','공동체역량','발전가능성',
    '전공적합성','인성','자기주도성','탐구역량',
    '문제해결력','의사소통역량',
  ];

  /** 권장과목 후보 */
  const RECOMMENDED_SUBJECTS = [
    '수학Ⅱ','수학Ⅰ','수학ⅠⅡ','미적분','확률과 통계','기하',
    '물리학Ⅱ','물리학Ⅰ','화학Ⅱ','화학Ⅰ',
    '생명과학Ⅱ','생명과학Ⅰ','지구과학Ⅱ','지구과학Ⅰ',
    '정보','인공지능 기초','사회문제 탐구',
    '경제','정치와 법','사회·문화','사회문화',
    // 수학 단순 표기 (위 항목 없을 때 폴백)
    '수학',
  ];

  /** 유의사항 트리거 키워드 → 표시 레이블 */
  const CAUTION_MAP = [
    { key: '수능최저',      label: '수능 최저학력기준 있음' },
    { key: '최저학력기준',  label: '수능 최저학력기준 있음' },
    { key: '수능최저 없',   label: '수능 최저 없음' },
    { key: '최저 없',       label: '수능 최저 없음' },
    { key: '면접',          label: '면접 포함 전형' },
    { key: '서류평가',      label: '서류 평가' },
    { key: '단계별 전형',   label: '단계별 전형' },
    { key: '단계별전형',    label: '단계별 전형' },
    { key: '제출서류',      label: '별도 제출서류 있음' },
    { key: '학교생활기록부', label: '학교생활기록부 반영' },
    { key: '자기소개서 폐지', label: '자기소개서 폐지' },
    { key: '자기소개서폐지', label: '자기소개서 폐지' },
    { key: '블라인드',      label: '블라인드 평가' },
    { key: '서류 100',      label: '서류 100% 전형' },
    { key: '서류100',       label: '서류 100% 전형' },
  ];

  /** 불용어 — 모집요강 문서에서 자주 나오는 의미없는 어절 */
  const UNI_STOP = new Set([
    // 조사·접속사
    '하여','하고','하며','있다','있으며','없다','이다','이며','것이','것은','것을',
    '등의','등을','대한','대해','통해','위한','이러한','또한','그리고','하지만',
    '그러나','따라서','이에','해당','위해','까지','부터','보다','에서의','에서도',
    '에도','이를','으로','에서','에게','수있','있는','통하여','함으로','됩니다',
    '했다','했으며','했고','한다','한다고','한다는',
    // 행정·문서 노이즈
    '모집','전형','안내','요강','대학교','학교','학과','학부','전공','계열',
    '입학','입시','지원','자격','서류','접수','발표','합격','등록','면접',
    '일정','기간','방법','절차','기준','내용','사항','결과','관련','해당',
    '페이지','홈페이지','참고','문의','제출','확인','실시','적용','포함',
    '이상','이하','이내','이후','이전','다음','경우','따른','따라','통한',
    '및','또는','각','해','년도','학년도','년','월','일',
    // 짧은 노이즈
    '가','나','다','라','마','바','사','아','자','차','카','타','파','하',
  ]);

  const MAX_SUMMARY_LEN = 8000;
  const MAX_KEYWORDS    = 50;

  // ─────────────────────────────────────
  //  내부 유틸
  // ─────────────────────────────────────

  /** lines 배열을 페이지 구분 없이 단순 텍스트로 합침 */
  function linesToText(lines) {
    if (!Array.isArray(lines)) return '';
    return lines.map(l => (typeof l === 'string' ? l : (l.text || ''))).join('\n');
  }

  /** 공백 정규화 */
  function normalizeWS(str) {
    return (str || '').replace(/\s+/g, ' ').trim();
  }

  /** 한글 2자 이상 토큰 추출 (간단 토크나이저) */
  function tokenizeKo(text) {
    const t = (text || '').replace(/[^가-힣a-zA-Z0-9]/g, ' ');
    const tokens = t.match(/[가-힣]{2,}|[a-zA-Z]{3,}/g) || [];
    return tokens.filter(w => !UNI_STOP.has(w) && w.length >= 2 && w.length <= 12);
  }

  /** 빈도 맵 생성 */
  function buildFreqMap(tokens) {
    const freq = {};
    for (const w of tokens) freq[w] = (freq[w] || 0) + 1;
    return freq;
  }

  /** 텍스트에서 패턴 배열 중 포함된 것만 순서대로 반환 (중복 제거) */
  function matchPatterns(text, patterns) {
    const found = [];
    const seen  = new Set();
    for (const p of patterns) {
      // 로마자 포함 과목명은 원본 텍스트에서 직접 검색
      if (text.includes(p) && !seen.has(p)) {
        found.push(p);
        seen.add(p);
      }
    }
    return found;
  }

  // ─────────────────────────────────────
  //  공개 추출 함수
  // ─────────────────────────────────────

  /**
   * extractUniversityNameFromText(text)
   * 알려진 대학명 목록 → 접미사 패턴 → 정규식 순으로 탐지
   */
 function extractUniversityNameFromText(text) {
  if (!text) return '';

  const raw = String(text);
  const len = raw.length || 1;

  // 문서 초반부 가중치 + 입시 문맥 가중치
  const CONTEXT_RE = /(입학|모집요강|전형|수시|정시|학생부종합)/;
  const aroundHasContext = (idx, tokLen) => {
    const s = Math.max(0, idx - 24);
    const e = Math.min(raw.length, idx + tokLen + 24);
    return CONTEXT_RE.test(raw.slice(s, e));
  };

  // 후보 점수판
  const scores = Object.create(null);
  const reasons = Object.create(null);
  const addScore = (name, score, reason) => {
    if (!name) return;
    scores[name] = (scores[name] || 0) + score;
    if (!reasons[name]) reasons[name] = [];
    reasons[name].push(reason);
  };

  // 1) KNOWN_UNIS 다중 수집 + 위치/문맥 점수
  for (const name of KNOWN_UNIS) {
    let from = 0;
    while (true) {
      const idx = raw.indexOf(name, from);
      if (idx === -1) break;

      // 기본점수: 알려진 대학명 정확일치
      let s = 8;

      // 초반부 가중치 (앞 20% 매우 우대, 40% 우대)
      const pos = idx / len;
      if (pos <= 0.20) s += 5;
      else if (pos <= 0.40) s += 2;

      // 입시 문맥 근처 가중치
      if (aroundHasContext(idx, name.length)) s += 4;

      // 반복 등장 보너스(소폭)
      s += 1;

      addScore(name, s, `known@${idx}`);
      from = idx + name.length;
    }
  }

  // 2) 일반 정규식 후보(OO대학교 등) 수집
  const fullRe = /([가-힣]{2,8}(?:대학교|대학원대학교|교육대학교|과학기술원))/g;
  let m1;
  while ((m1 = fullRe.exec(raw)) !== null) {
    const cand = m1[1];
    const idx = m1.index;

    let s = 4; // KNOWN_UNIS보다 낮게 시작
    const pos = idx / len;
    if (pos <= 0.20) s += 3;
    else if (pos <= 0.40) s += 1;
    if (aroundHasContext(idx, cand.length)) s += 3;

    // KNOWN_UNIS에 있으면 신뢰도 추가
    if (KNOWN_UNIS.includes(cand)) s += 2;

    addScore(cand, s, `regexFull@${idx}`);
  }

  // 3) 약칭 후보(OO대) 수집 — 낮은 점수(강확정 금지)
  // 공백/구두점/줄끝 허용
  const shortRe = /(^|\s|[\(\["'“”‘’,.])([가-힣]{2,6}대)(?=\s|$|[\)\]"'“”‘’,.])/g;
  let m2;
  while ((m2 = shortRe.exec(raw)) !== null) {
    const short = m2[2];
    const idx = m2.index + (m2[1] ? m2[1].length : 0);

    let s = 1; // 매우 낮은 시작점
    const pos = idx / len;
    if (pos <= 0.20) s += 1;
    if (aroundHasContext(idx, short.length)) s += 1;

    // 약칭→KNOWN_UNIS 매핑(부분 일치) 시에만 소폭 가점
    const base = short.replace(/대$/, '');
    const mapped = KNOWN_UNIS.find(u => u.startsWith(base) || u.includes(base));
    if (mapped) {
      addScore(mapped, s + 1, `abbr:${short}@${idx}`);
    } else {
      // 매핑 불가 약칭은 추정치로만 보관 (최종 확정 거의 불가)
      addScore(short + '학교(추정)', s, `abbrUnknown:${short}@${idx}`);
    }
  }

  // 후보가 없으면 미확인
  const entries = Object.entries(scores);
  if (!entries.length) return '';

  // 최고점/차점 비교
  entries.sort((a, b) => b[1] - a[1]);
  const [bestName, bestScore] = entries[0];
  const secondScore = entries[1] ? entries[1][1] : -Infinity;

  // 확신도 게이트:
  // - 절대점수가 너무 낮으면 미확인
  // - 1/2위 점수차가 너무 작으면 미확인(오탐 방지)
  const isAbbrGuess = /학교\(추정\)$/.test(bestName);
  const minScore = isAbbrGuess ? 6 : 9;
  const minGap = 2;

  if (bestScore < minScore) return '';
  if (secondScore > -Infinity && (bestScore - secondScore) < minGap) return '';

  return bestName;
}

  /**
   * extractDepartmentNameFromText(text)
   * 학과·학부·전공 표현을 탐지
   */
  function extractDepartmentNameFromText(text) {
    if (!text) return '';

    // "OO학과", "OO학부", "OO전공", "OO계열" 패턴
    const patterns = [
      /([가-힣a-zA-Z·\s]{2,20}(?:학과|학부|전공|계열|대학|학원))/g,
    ];

    const candidates = [];
    for (const re of patterns) {
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) {
        const cand = normalizeWS(m[1]);
        // 너무 길거나 "대학교" 자체가 걸리는 경우 제외
        if (cand.length <= 20 && !cand.endsWith('대학교') && !cand.endsWith('대학원대학교')) {
          candidates.push(cand);
        }
      }
    }

    // 가장 짧고 구체적인 것 선택 (학과 > 학부 > 전공 > 계열 순)
    const priority = ['학과','전공','학부','계열','대학'];
    for (const suffix of priority) {
      const match = candidates.find(c => c.endsWith(suffix));
      if (match) return match;
    }

    return candidates[0] || '';
  }

  /**
   * extractAdmissionTypeFromText(text)
   * 전형명 탐지
   */
  function extractAdmissionTypeFromText(text) {
    if (!text) return '';

    // 알려진 전형 패턴 (우선순위 순)
    const KNOWN_TYPES = [
      '학생부종합전형','학생부교과전형','논술전형','실기전형',
      '학교추천전형','지역인재전형','농어촌학생전형','기회균형전형',
      '특기자전형','소프트웨어특기자','SW특기자',
      '정시모집','수시모집',
    ];

    for (const t of KNOWN_TYPES) {
      if (text.includes(t)) return t;
    }

    // 일반 패턴: "OO전형"
    const m = text.match(/([가-힣a-zA-Z\s·]{2,20}전형)/);
    if (m) return normalizeWS(m[1]);

    return '';
  }

  /**
   * extractSourceYearFromText(text)
   * 학년도·연도 탐지 (예: 2026학년도, 2026년도)
   */
  function extractSourceYearFromText(text) {
    if (!text) return '';

    // "2025학년도", "2026학년도" 등 4자리 연도
    const m1 = text.match(/(20[2-3]\d)학년도/);
    if (m1) return m1[1] + '학년도';

    const m2 = text.match(/(20[2-3]\d)년도/);
    if (m2) return m2[1] + '년도';

    const m3 = text.match(/(20[2-3]\d)년/);
    if (m3) return m3[1] + '년';

    return '';
  }

  /**
   * extractEvaluationElementsFromText(text)
   * 평가요소 후보 목록 중 등장하는 것 반환
   */
  function extractEvaluationElementsFromText(text) {
    if (!text) return [];
    return EVAL_ELEMENTS.filter(e => text.includes(e));
  }

  /**
   * extractRecommendedSubjectsFromText(text)
   * 권장과목 후보 중 등장하는 것 반환
   * 로마자(Ⅰ Ⅱ) 포함 과목명 우선, 단순 "수학"은 마지막에 폴백
   */
  function extractRecommendedSubjectsFromText(text) {
    if (!text) return [];

    // 로마자 포함 과목명 먼저 탐지 (긴 것부터 → 짧은 것 순)
    const sorted = [...RECOMMENDED_SUBJECTS].sort((a, b) => b.length - a.length);
    const found  = matchPatterns(text, sorted);

    // "수학" 단독은 이미 구체적 수학 과목이 있으면 제외
    if (found.some(f => f.startsWith('수학') && f.length > 2)) {
      return found.filter(f => f !== '수학');
    }
    return found;
  }

  /**
   * extractUniMaterialKeywords(text)
   * 빈도 기반 핵심 키워드 추출 (최대 MAX_KEYWORDS개)
   */
  function extractUniMaterialKeywords(text) {
    if (!text) return [];

    const tokens  = tokenizeKo(text);
    const freq    = buildFreqMap(tokens);

    // 빈도 2 이상만, 내림차순 정렬
    const result = Object.entries(freq)
      .filter(([, cnt]) => cnt >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_KEYWORDS)
      .map(([w]) => w);

    return result;
  }

  /**
   * extractCautionsFromText(text)
   * 유의사항 탐지 — CAUTION_MAP 기반 (중복 레이블 제거)
   */
  function extractCautionsFromText(text) {
    if (!text) return [];

    const found  = [];
    const labels = new Set();

    for (const { key, label } of CAUTION_MAP) {
      if (text.includes(key) && !labels.has(label)) {
        found.push(label);
        labels.add(label);
      }
    }

    return found;
  }

  // ─────────────────────────────────────
  //  메인 분석 함수
  // ─────────────────────────────────────

  /**
   * analyzeUniMaterialLines(lines, options)
   *
   * @param {Array}  lines   - pdfLoader.js 반환 lines 배열
   *                           또는 문자열 배열 (테스트용)
   * @param {Object} options - 보조 메타데이터
   *   - sourceTitle  {string} : 자료명 (파일명 등)
   *   - pageLimit    {number} : 처리할 최대 페이지 수 (기본 100)
   *   - textLimit    {number} : 텍스트 최대 글자 수 (기본 8000)
   * @returns {Object} 분석 결과 요약 객체
   */
  function analyzeUniMaterialLines(lines, options) {
    options = options || {};
    const pageLimit = options.pageLimit || 100;
    const textLimit = options.textLimit || MAX_SUMMARY_LEN;

    // ── 기본 결과 스켈레톤 (분석 실패해도 이 구조 반환) ──
    const result = {
      universityName:      '',
      departmentName:      '',
      admissionType:       '',
      sourceTitle:         options.sourceTitle || '',
      sourceYear:          '',
      sourceText:          '',
      evaluationElements:  [],
      recommendedSubjects: [],
      keywords:            [],
      cautions:            [],
      extractedSummary:    '',
      pageCount:           0,
      analyzedAt:          new Date().toISOString(),
    };

    try {
      if (!Array.isArray(lines) || lines.length === 0) return result;

      // ── 페이지 필터링 (pageLimit 초과 시 앞부분만) ──
      const maxPage = Math.max(
        ...lines.map(l => (typeof l === 'object' ? (l.page || 1) : 1))
      );
      result.pageCount = maxPage;

      const filteredLines = pageLimit < maxPage
        ? lines.filter(l => (typeof l === 'object' ? (l.page || 1) : 1) <= pageLimit)
        : lines;

      // ── 전체 텍스트 합치기 ──
      const fullText = linesToText(filteredLines);

      if (!fullText.trim()) return result;

      // ── 각 항목 추출 ──
      result.universityName      = extractUniversityNameFromText(fullText);
      result.departmentName      = extractDepartmentNameFromText(fullText);
      result.admissionType       = extractAdmissionTypeFromText(fullText);
      result.sourceYear          = extractSourceYearFromText(fullText);
      result.evaluationElements  = extractEvaluationElementsFromText(fullText);
      result.recommendedSubjects = extractRecommendedSubjectsFromText(fullText);
      result.keywords            = extractUniMaterialKeywords(fullText);
      result.cautions            = extractCautionsFromText(fullText);

      // ── sourceText: 대학명·학과명·전형명 조합으로 출처 표시용 문자열 생성 ──
      const parts = [
        result.universityName,
        result.departmentName,
        result.admissionType,
        result.sourceYear,
      ].filter(Boolean);
      result.sourceText = parts.join(' ') || (options.sourceTitle || '');

      // ── extractedSummary: 앞 textLimit자로 슬라이스 ──
      result.extractedSummary = fullText.slice(0, textLimit);

    } catch (e) {
      console.error('[uniMaterialAnalyzer] analyzeUniMaterialLines 오류:', e);
      // 스켈레톤 그대로 반환
    }

    return result;
  }

  /**
   * buildUniMaterialSummary(material)
   * analyzeUniMaterialLines 결과를 uniMaterialStore 저장 형식으로 변환.
   * 선택적으로 사용자 입력(universityName 등)을 덮어쓸 수 있음.
   *
   * @param {Object} material - analyzeUniMaterialLines 반환값 + 사용자 보정값
   * @returns {Object} saveUniMaterialSummary() 에 바로 넘길 수 있는 객체
   */
  function buildUniMaterialSummary(material) {
    if (!material || typeof material !== 'object') {
      return window.normalizeUniMaterial ? window.normalizeUniMaterial({}) : {};
    }

    const obj = {
      universityName:      material.universityName      || '',
      departmentName:      material.departmentName      || '',
      admissionType:       material.admissionType       || '',
      sourceTitle:         material.sourceTitle         || '',
      sourceYear:          material.sourceYear          || '',
      sourceText:          material.sourceText          || '',
      evaluationElements:  material.evaluationElements  || [],
      recommendedSubjects: material.recommendedSubjects || [],
      keywords:            (material.keywords || []).slice(0, MAX_KEYWORDS),
      cautions:            material.cautions            || [],
      extractedSummary:    (material.extractedSummary   || '').slice(0, MAX_SUMMARY_LEN),
    };

    // uniMaterialStore가 로드된 경우 normalizeUniMaterial 통과
    return window.normalizeUniMaterial ? window.normalizeUniMaterial(obj) : obj;
  }

  // ─────────────────────────────────────
  //  비교 엔진 — 생기부 ↔ 대학자료
  // ─────────────────────────────────────

  /** 면책 고지 (모든 비교 결과에 포함) */
  const NOTICE_TEXT =
    '본 분석은 대학 공개자료와 학생부 기록의 참고용 비교이며, 실제 입학 결과를 예측하지 않습니다.';

  /**
   * collectStudentKeywords(parsedData, v6Analysis)
   * 생기부의 전체 텍스트에서 의미 키워드를 수집.
   * v6Analysis.allRecords 우선, 없으면 parsedData 직접 순회.
   * @returns {string[]} 중복 제거된 키워드 배열
   */
  function collectStudentKeywords(parsedData, v6Analysis) {
    const tokens = [];

    // ── allRecords 경로 ──
    if (v6Analysis && Array.isArray(v6Analysis.allRecords)) {
      for (const rec of v6Analysis.allRecords) {
        const text = rec.full || rec.summary || rec.title || '';
        tokens.push(...tokenizeKo(text));
      }
    } else if (parsedData) {
      // ── parsedData 직접 순회 (v6Analysis 없을 때 폴백) ──
      const areas = ['auto', 'club', 'career', 'behav'];
      for (const area of areas) {
        const list = parsedData[area];
        if (Array.isArray(list)) {
          for (const rec of list) {
            tokens.push(...tokenizeKo(rec.full || rec.summary || rec.title || ''));
          }
        }
      }
      // subject는 { [과목명]: [...] } 구조
      if (parsedData.subject && typeof parsedData.subject === 'object') {
        for (const recs of Object.values(parsedData.subject)) {
          if (Array.isArray(recs)) {
            for (const rec of recs) {
              tokens.push(...tokenizeKo(rec.full || rec.summary || rec.title || ''));
            }
          }
        }
      }
    }

    // 빈도 맵 → 빈도 1 이상, 내림차순 정렬
    const freq = buildFreqMap(tokens);
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([w]) => w);
  }

  /**
   * collectStudentSubjects(takenSubjects, parsedData)
   * 학생이 이수한 과목명 Set을 반환.
   * takenSubjects 는 { "과목명": true } 형태의 객체.
   * @returns {Set<string>}
   */
  function collectStudentSubjects(takenSubjects, parsedData) {
    const set = new Set();

    // takenSubjects 에서 수집
    if (takenSubjects && typeof takenSubjects === 'object') {
      for (const name of Object.keys(takenSubjects)) {
        if (name && name.length >= 2) set.add(name.trim());
      }
    }

    // parsedData.subject 키에서도 수집 (과목 이름이 키)
    if (parsedData && parsedData.subject && typeof parsedData.subject === 'object') {
      for (const subj of Object.keys(parsedData.subject)) {
        if (subj && subj.length >= 2) set.add(subj.trim());
      }
    }

    return set;
  }

  /**
   * findMatchedKeywords(materialKeywords, studentKeywords)
   * 대학자료 키워드 중 학생 키워드와 일치(포함 관계)하는 것 반환.
   * 완전 일치 우선, 이후 부분 포함 검사.
   * @returns {string[]}
   */
  function findMatchedKeywords(materialKeywords, studentKeywords) {
    if (!Array.isArray(materialKeywords) || !Array.isArray(studentKeywords)) return [];
    const stuSet = new Set(studentKeywords);
    const matched = [];

    for (const mk of materialKeywords) {
      if (!mk) continue;
      // 완전 일치
      if (stuSet.has(mk)) { matched.push(mk); continue; }
      // 부분 포함: 학생 키워드 중 mk를 포함하거나, mk가 학생 키워드를 포함
      const partial = studentKeywords.find(sk =>
        sk.length >= 2 && (sk.includes(mk) || mk.includes(sk))
      );
      if (partial) matched.push(mk);
    }
    return [...new Set(matched)];
  }

  /**
   * findMissingKeywords(materialKeywords, studentKeywords)
   * 대학자료 키워드 중 학생 생기부에 등장하지 않는 것 반환.
   * @returns {string[]}
   */
  function findMissingKeywords(materialKeywords, studentKeywords) {
    if (!Array.isArray(materialKeywords)) return [];
    const matched = new Set(findMatchedKeywords(materialKeywords, studentKeywords));
    return materialKeywords.filter(mk => mk && !matched.has(mk));
  }

  /**
   * buildUniStrengths(material, matchedKeywords, studentSubjects, v6Analysis)
   * 강점 문장 배열 생성.
   * 합격 예측 표현 금지 — "관련", "유사", "확인됨" 등 중립 표현만 사용.
   * @returns {string[]}
   */
  function buildUniStrengths(material, matchedKeywords, studentSubjects, v6Analysis) {
    const strengths = [];

    // ① 키워드 일치
    if (matchedKeywords.length > 0) {
      const sample = matchedKeywords.slice(0, 5).join(', ');
      strengths.push(
        `학생부에서 대학자료의 핵심 키워드(${sample} 등)와 관련된 활동이 확인됩니다.`
      );
    }

    // ② 권장과목 이수 여부
    const recSubjs = material.recommendedSubjects || [];
    const takenRec = recSubjs.filter(s =>
      studentSubjects.has(s) ||
      [...studentSubjects].some(ss => ss.includes(s) || s.includes(ss))
    );
    if (takenRec.length > 0) {
      strengths.push(
        `권장과목 중 ${takenRec.join(', ')}을(를) 이수한 이력이 확인됩니다.`
      );
    }

    // ③ 평가요소 — v6Analysis.strengths 와 교차
    const evalElems = material.evaluationElements || [];
    if (v6Analysis && Array.isArray(v6Analysis.strengths) && evalElems.length > 0) {
      const v6Names = v6Analysis.strengths.map(s => s.name || s.label || '').filter(Boolean);
      const crossElems = evalElems.filter(e =>
        v6Names.some(n => n.includes(e) || e.includes(n))
      );
      if (crossElems.length > 0) {
        strengths.push(
          `${crossElems.join(', ')} 관련 활동이 생기부에 기록되어 있어 참고할 수 있습니다.`
        );
      }
    }

    // ④ 탐구 깊이 — avgDepth 기반
    if (v6Analysis && v6Analysis.dashboard) {
      const avg = v6Analysis.dashboard.avgDepth || 0;
      if (avg >= 7) {
        strengths.push('탐구 깊이 평균 점수가 높아 학업역량 서류 기재에 참고할 만한 자료가 풍부합니다.');
      }
    }

    if (strengths.length === 0) {
      strengths.push('현재 생기부 데이터에서 대학자료와의 명확한 연결 지점을 찾지 못했습니다. 아래 보완점을 참고하세요.');
    }

    return strengths;
  }

  /**
   * buildUniWeaknesses(material, missingKeywords, studentSubjects, v6Analysis)
   * 보완점 문장 배열 생성.
   * 단정적 결론 금지 — 참고·보완 제안 표현만 사용.
   * @returns {string[]}
   */
  function buildUniWeaknesses(material, missingKeywords, studentSubjects, v6Analysis) {
    const weaknesses = [];

    // ① 키워드 미매칭
    if (missingKeywords.length > 0) {
      const sample = missingKeywords.slice(0, 5).join(', ');
      weaknesses.push(
        `대학자료에서 강조하는 키워드(${sample} 등)에 관한 활동 기록이 상대적으로 적어 보완을 고려해볼 수 있습니다.`
      );
    }

    // ② 미이수 권장과목
    const recSubjs = material.recommendedSubjects || [];
    const notTaken = recSubjs.filter(s =>
      !studentSubjects.has(s) &&
      ![...studentSubjects].some(ss => ss.includes(s) || s.includes(ss))
    );
    if (notTaken.length > 0) {
      weaknesses.push(
        `권장과목 중 ${notTaken.join(', ')}의 이수 이력이 확인되지 않습니다. 과목 선택 시 참고하세요.`
      );
    }

    // ③ 평가요소 미매칭
    const evalElems = material.evaluationElements || [];
    if (evalElems.length > 0 && v6Analysis && Array.isArray(v6Analysis.risks)) {
      const riskNames = v6Analysis.risks.map(r => r.name || r.label || '').filter(Boolean);
      const riskElems = evalElems.filter(e =>
        riskNames.some(n => n.includes(e) || e.includes(n))
      );
      if (riskElems.length > 0) {
        weaknesses.push(
          `${riskElems.join(', ')} 영역에서 보강이 필요할 수 있습니다.`
        );
      }
    }

    return weaknesses;
  }

  /**
   * buildRecommendedInquiryActivities(material, missingKeywords)
   * 미매칭 키워드·권장과목 기반 교과 탐구활동 제안.
   * @returns {string[]}
   */
  function buildRecommendedInquiryActivities(material, missingKeywords) {
    const activities = [];

    // ── 권장과목별 탐구 템플릿 ──
    const SUBJ_ACTIVITY_MAP = {
      '미적분':      '미적분 개념을 활용한 실생활 현상(인구 모델, 냉각 법칙 등) 탐구 보고서 작성',
      '수학Ⅱ':      '극한·미분·적분 단원과 연계한 과학·경제 현상 수학적 모델링 탐구',
      '수학Ⅰ':      '수열·지수·로그를 활용한 데이터 분석 또는 현상 예측 탐구',
      '물리학Ⅰ':    '역학·전기 단원 실험 설계 및 오차 분석 보고서 작성',
      '물리학Ⅱ':    '파동·광학·현대물리 분야 심화 실험 및 원리 탐구',
      '화학Ⅰ':      '물질의 구조·반응 원리와 실생활 연결 탐구 활동',
      '화학Ⅱ':      '반응 속도론·평형 개념 심화 실험 및 분석',
      '생명과학Ⅰ':  '세포·유전 단원 연계 생명윤리 또는 바이오테크 관련 탐구',
      '생명과학Ⅱ':  '유전자 발현·진화 원리 심화 탐구 및 최신 연구 사례 분석',
      '지구과학Ⅰ':  '기후·대기·지질 관련 데이터를 활용한 현상 분석 탐구',
      '정보':        '알고리즘 설계 또는 데이터 구조를 활용한 문제 해결 프로젝트',
      '인공지능 기초': 'AI 모델의 원리와 사회적 영향에 대한 비판적 탐구 보고서',
      '경제':        '경제 지표 데이터 분석 및 정책 효과 탐구 보고서',
      '사회·문화':   '사회 현상 분석을 위한 설문 설계 및 통계 해석 탐구',
      '사회문화':    '사회 현상 분석을 위한 설문 설계 및 통계 해석 탐구',
      '확률과 통계': '실제 데이터를 활용한 확률 모델 설계 및 해석 탐구',
      '기하':        '공간 도형·벡터 개념의 공학·물리 연계 탐구 활동',
    };

    // ── 미매칭 키워드별 일반 탐구 제안 ──
    const KW_ACTIVITY_TEMPLATES = [
      { pattern: /인공지능|AI|머신러닝/, suggest: '인공지능 알고리즘 원리 탐구 및 교과 연계 윤리 보고서 작성' },
      { pattern: /데이터|통계|빅데이터/, suggest: '공개 데이터셋을 활용한 통계 분석 및 시각화 탐구 활동' },
      { pattern: /환경|기후|탄소/, suggest: '기후변화 관련 데이터를 교과(과학·수학) 개념으로 분석하는 탐구 보고서' },
      { pattern: /경제|금융|시장/, suggest: '경제 현상을 수학적 모델로 분석하는 융합 탐구 활동' },
      { pattern: /리더십|협력|소통/, suggest: '모둠 프로젝트 또는 학급 활동에서 구체적 협력 과정을 기록한 보고서 작성' },
      { pattern: /글쓰기|논술|작문/, suggest: '교과 탐구 결과를 논리적 구조로 정리한 소논문 또는 보고서 작성' },
      { pattern: /윤리|철학|가치/, suggest: '전공 관련 사회적 쟁점을 윤리적 관점에서 분석하는 탐구 활동' },
      { pattern: /실험|측정|분석/, suggest: '교과 단원과 연계된 실험을 직접 설계하고 오차 분석까지 포함하는 탐구 보고서' },
    ];

    const added = new Set();

    // 권장과목 탐구 제안
    for (const subj of (material.recommendedSubjects || [])) {
      const act = SUBJ_ACTIVITY_MAP[subj];
      if (act && !added.has(act)) {
        activities.push(`[${subj} 연계] ${act}`);
        added.add(act);
      }
    }

    // 미매칭 키워드 탐구 제안
    for (const kw of missingKeywords.slice(0, 8)) {
      for (const { pattern, suggest } of KW_ACTIVITY_TEMPLATES) {
        if (pattern.test(kw) && !added.has(suggest)) {
          activities.push(`[${kw} 관련] ${suggest}`);
          added.add(suggest);
          break;
        }
      }
    }

    // 평가요소별 범용 제안
    for (const elem of (material.evaluationElements || [])) {
      let act = '';
      if (elem === '탐구역량' && !added.has('탐구역량')) {
        act = '교과 개념을 심화 적용한 자기주도 탐구 보고서 작성 (문제 제기 → 가설 → 실험/분석 → 결론 구조)';
      } else if (elem === '공동체역량' && !added.has('공동체역량')) {
        act = '모둠 활동에서 역할 분담, 갈등 해결, 기여도를 구체적으로 기술한 활동 보고서 작성';
      } else if (elem === '의사소통역량' && !added.has('의사소통역량')) {
        act = '탐구 결과를 발표 자료로 제작하고 질의응답 과정을 기록하는 활동';
      }
      if (act && !added.has(elem)) {
        activities.push(`[${elem}] ${act}`);
        added.add(elem);
      }
    }

    return activities.slice(0, 8); // 최대 8개
  }

  /**
   * buildUniPromptAddon(material, comparison)
   * AI 분석 프롬프트에 추가할 대학 맞춤 문단 생성.
   * 대학명, 학과명, 전형명, 평가요소, 보완 키워드를 자연스럽게 포함.
   * @returns {string}
   */
  function buildUniPromptAddon(material, comparison) {
    const uniName   = material.universityName  || '';
    const deptName  = material.departmentName  || '';
    const admType   = material.admissionType   || '';
    const evalElems = (material.evaluationElements || []).join(', ') || '정보 없음';
    const recSubjs  = (material.recommendedSubjects || []).join(', ') || '정보 없음';
    const missing   = ((comparison && comparison.missingKeywords) || []).slice(0, 5).join(', ');
    const matched   = ((comparison && comparison.matchedKeywords) || []).slice(0, 5).join(', ');

    const lines = [];

    lines.push('--- [대학자료 연계 분석 요청] ---');

    if (uniName || deptName) {
      lines.push(
        `대상 대학·학과: ${[uniName, deptName].filter(Boolean).join(' ')}` +
        (admType ? ` (${admType})` : '')
      );
    }

    lines.push(`해당 전형의 주요 평가요소: ${evalElems}`);
    lines.push(`권장 이수과목: ${recSubjs}`);

    if (matched) {
      lines.push(`학생부에서 대학자료 키워드와 관련성이 확인된 항목: ${matched}`);
    }

    if (missing) {
      lines.push(
        `대학자료에서 강조하나 학생부에서 보완이 필요한 키워드: ${missing}. ` +
        `위 키워드와 연결될 수 있는 학생부 내 활동을 발굴하여 서술해주세요.`
      );
    }

    lines.push(
      '위 대학자료 정보를 참고하여, 학생의 생기부 기록 중 해당 전형 평가요소와 연결될 수 있는 활동을 ' +
      '구체적으로 서술하고, 추가 탐구 방향을 제안해주세요. ' +
      '합격 가능성 등 입시 결과에 관한 예측은 포함하지 마세요.'
    );

    lines.push('--- [면책 고지] ---');
    lines.push(NOTICE_TEXT);

    return lines.join('\n');
  }

  /**
   * compareStudentWithUniMaterial(material, parsedData, v6Analysis, takenSubjects)
   * 메인 비교 함수.
   *
   * @param {Object} material      - getSavedUniMaterials() 반환 항목 또는 analyzeUniMaterialLines 결과
   * @param {Object} parsedData    - 전역 parsedData (null 허용)
   * @param {Object} v6Analysis    - 전역 v6Analysis (null 허용)
   * @param {Object} takenSubjects - 전역 takenSubjects (null 허용)
   * @returns {Object} 비교 결과 객체
   */
  function compareStudentWithUniMaterial(material, parsedData, v6Analysis, takenSubjects) {
    // ── 기본 결과 스켈레톤 ──
    const base = {
      materialId:         material.id || '',
      universityName:     material.universityName  || '',
      departmentName:     material.departmentName  || '',
      admissionType:      material.admissionType   || '',
      sourceText:         material.sourceText      || '',
      matchLevel:         '보완 필요',
      referenceMatchRatio: 0,
      matchedKeywords:    [],
      missingKeywords:    [],
      strengths:          [],
      weaknesses:         [],
      recommendedActivities: [],
      promptAddon:        '',
      notice:             NOTICE_TEXT,
      comparedAt:         new Date().toISOString(),
    };

    // parsedData 없으면 비교 불가 안내 반환
    if (!parsedData) {
      base.strengths  = ['학생 생기부 분석 후 비교할 수 있습니다.'];
      base.weaknesses = [];
      base.promptAddon = buildUniPromptAddon(material, base);
      return base;
    }

    try {
      const materialKeywords = material.keywords || [];

      // ── 학생 키워드·이수과목 수집 ──
      const studentKeywords  = collectStudentKeywords(parsedData, v6Analysis);
      const studentSubjects  = collectStudentSubjects(takenSubjects, parsedData);

      // ── 키워드 교차 분석 ──
      const matchedKeywords  = findMatchedKeywords(materialKeywords, studentKeywords);
      const missingKeywords  = findMissingKeywords(materialKeywords, studentKeywords);

      // ── 참고용 일치도 (0~100 정수) ──
      const total = materialKeywords.length || 1;
      const referenceMatchRatio = Math.round((matchedKeywords.length / total) * 100);

      // ── matchLevel (예측 표현 금지) ──
      let matchLevel = '보완 필요';
      if (referenceMatchRatio >= 60)      matchLevel = '높음';
      else if (referenceMatchRatio >= 30) matchLevel = '보통';

      // ── 강점·보완점 생성 ──
      const strengths  = buildUniStrengths(material, matchedKeywords, studentSubjects, v6Analysis);
      const weaknesses = buildUniWeaknesses(material, missingKeywords, studentSubjects, v6Analysis);

      // ── 추천 탐구활동 ──
      const recommendedActivities = buildRecommendedInquiryActivities(material, missingKeywords);

      Object.assign(base, {
        matchLevel,
        referenceMatchRatio,
        matchedKeywords,
        missingKeywords,
        strengths,
        weaknesses,
        recommendedActivities,
      });

      // ── promptAddon ──
      base.promptAddon = buildUniPromptAddon(material, base);

    } catch (e) {
      console.error('[uniMaterialAnalyzer] compareStudentWithUniMaterial 오류:', e);
      base.strengths  = ['비교 분석 중 오류가 발생했습니다. 콘솔을 확인하세요.'];
      base.promptAddon = buildUniPromptAddon(material, base);
    }

    return base;
  }

  // ─────────────────────────────────────
  //  전역 노출
  // ─────────────────────────────────────
  window.analyzeUniMaterialLines            = analyzeUniMaterialLines;
  window.extractUniversityNameFromText      = extractUniversityNameFromText;
  window.extractDepartmentNameFromText      = extractDepartmentNameFromText;
  window.extractAdmissionTypeFromText       = extractAdmissionTypeFromText;
  window.extractSourceYearFromText          = extractSourceYearFromText;
  window.extractEvaluationElementsFromText  = extractEvaluationElementsFromText;
  window.extractRecommendedSubjectsFromText = extractRecommendedSubjectsFromText;
  window.extractUniMaterialKeywords         = extractUniMaterialKeywords;
  window.extractCautionsFromText            = extractCautionsFromText;
  window.buildUniMaterialSummary            = buildUniMaterialSummary;

  // 비교 엔진
  window.collectStudentKeywords             = collectStudentKeywords;
  window.collectStudentSubjects             = collectStudentSubjects;
  window.findMatchedKeywords                = findMatchedKeywords;
  window.findMissingKeywords                = findMissingKeywords;
  window.buildUniStrengths                  = buildUniStrengths;
  window.buildUniWeaknesses                 = buildUniWeaknesses;
  window.buildRecommendedInquiryActivities  = buildRecommendedInquiryActivities;
  window.buildUniPromptAddon                = buildUniPromptAddon;
  window.compareStudentWithUniMaterial      = compareStudentWithUniMaterial;

})();
