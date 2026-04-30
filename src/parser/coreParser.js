// ════════════════════════════════════════
//  CORE PARSER — 실제 생기부 PDF 구조 기반
// ════════════════════════════════════════
/*
  실제 생기부 구조 (pdfplumber 분석 결과):
  
  창체:
  - "1 자율활동 40 [텍스트...]"  ← 학년+영역+시간이 한 줄에 시작
  - "자율활동 40 [텍스트...]"   ← 학년 없이 영역만
  - "동아리활동 38 [텍스트...]"
  - "진로활동 33 [텍스트...]"
  - "2 자율활동 85"             ← 2학년 새 영역 시작
  - "2 진로활동 28"
  
  교과:
  - "[1학년]", "[2학년]"       ← 학년 구분자
  - "(1학기)국어: 텍스트..."   ← 과목 헤더
  - "수학Ⅰ: 텍스트..."
*/

function parseDoc(lines) {
  // ── 1차: 기존 정규식 파싱 (보조 역할) ──
  const dataRegex = { subject: {}, auto: [], club: [], career: [], behav: [] };
  parseCCA(lines, dataRegex);
  parseSubject(lines, dataRegex);
  parseBehav(lines, dataRegex);

  // ── 2차: 좌표 기반 파싱 결과와 비교 ──
  const coordLines = window._coordLines || [];
  const dataCoord  = { subject: {}, auto: [], club: [], career: [], behav: [] };

  if (coordLines.length > 0) {
    // 좌표 기반 lines 배열 재구성 (parseCCA/parseSubject/parseBehav 인터페이스 호환)
    const flatCoordLines = [];
    for (const pg of coordLines) {
      for (const ln of pg.lines) {
        if (ln.text && ln.text.trim()) {
          flatCoordLines.push({ text: ln.text.trim(), page: pg.page, items: ln.items });
        }
      }
    }
    parseCCA(flatCoordLines, dataCoord);
    parseSubject(flatCoordLines, dataCoord);
    parseBehav(flatCoordLines, dataCoord);
  }

  // ── 3차: 신뢰도 비교 ──
  const regexTotal = dataRegex.auto.length + dataRegex.club.length +
                     dataRegex.career.length + dataRegex.behav.length +
                     Object.keys(dataRegex.subject).length;
  const coordTotal = dataCoord.auto.length + dataCoord.club.length +
                     dataCoord.career.length + dataCoord.behav.length +
                     Object.keys(dataCoord.subject).length;

  // 좌표 기반 결과가 정규식 결과보다 레코드 수가 같거나 많으면 좌표 우선 채택
  // 차이가 크면(정규식이 30% 이상 많으면) 정규식 결과 채택
  let data;
  if (coordTotal > 0 && coordTotal >= regexTotal * 0.7) {
    data = dataCoord;
    data._parseMethod  = 'coord';
    data._coordTotal   = coordTotal;
    data._regexTotal   = regexTotal;
    data._confidence   = coordTotal >= regexTotal ? 'high' : 'mid';
  } else {
    data = dataRegex;
    data._parseMethod  = 'regex';
    data._coordTotal   = coordTotal;
    data._regexTotal   = regexTotal;
    data._confidence   = regexTotal > 0 ? 'mid' : 'low';
  }

  console.info(
    `[parseDoc] method=${data._parseMethod} confidence=${data._confidence}` +
    ` coord=${coordTotal} regex=${regexTotal}`
  );

  return data;
}

// ─── CCA (창체) 파서 — 2015/2022 통합 ───
function parseCCA(lines, data) {
  let inCCA = false;
  let curGrade = '1학년';
  let curArea = null;
  let buf = '', bufPage = 1;

  // 2022 개정: '자율활동' → '자율·자치활동' / '동아리활동' 유지 / '진로활동' 유지
  const AREA_MAP = {
    '자율활동': 'auto', '자율·자치활동': 'auto', '자율자치활동': 'auto',
    '동아리활동': 'club',
    '진로활동': 'career',
  };
  const AREA_NAMES = '자율·?자치활동|자율활동|동아리활동|진로활동';

  const NOISE_RE = [
    /창의적\s*체험활동상황/,
    /^영역\s*(시간|특기)/,
    /^특기\s*사항$/,
    /^학년\s*영역/,
    /^봉\s*사\s*활\s*동/,
    /^일자.*기간/,
    /\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}/,
    /\d{1,3}\.\d{1,3}\.\*+/,
    /학교생활(세부사항|기록부)/,
    /출력일시|발급일/,
    /^희망분야$/,
  ];
  const isNoise = t => NOISE_RE.some(r => r.test(t)) || isPageFooter(t) || t.length < 3;

  const flush = () => {
    if (!buf.trim() || !curArea) { buf = ''; return; }
    const sents = buf.split(/(?<=[가-힣a-zA-Z0-9\)])\.\s+/);
    for (const raw of sents) {
      const s = raw.trim();
      if (!s || s.length < 12) continue;
      if (/^[\d\s,.:·]+$/.test(s)) continue;
      if (!/[가-힣]{3,}/.test(s)) continue;
      const title = mkTitle(s);
      if (!title || title.length < 3) continue;
      const pool = data[curArea];
      if (pool.some(a => cSim(a.title, title) > 0.75)) continue;
      pool.push({ title, summary: mkSummary(s, title), full: s,
        grade: curGrade, area: curArea, field: classField(s), page: bufPage });
    }
    buf = '';
  };

  const AREA_RE = new RegExp(`^([123]학년\\s*)?([123]\\s*)?(${AREA_NAMES})(\\s*\\d+\\s*시간?)?(.*)$`);
  const AREA_BRACKET_RE = new RegExp(`^\\[?(${AREA_NAMES})\\]?(\\s*\\d+)?(\\s*시간)?$`);
  const GRADE_LINE = /^(?:\[)?([123])(?:학년)?(?:\])?\s*$/;
  const NUM_ONLY = /^\d{1,4}\s*$/;
  const SKIP_LINE = /^자기소개서|^학교명|^학번/;

  // ── 좌표 기반 우선 탐색 ──
  // window._coordLines가 있으면 좌표 기반으로 영역 구분을 강화한다.
  // 좌표 기반 결과를 먼저 시도하고, 실패 시 기존 정규식 fallback 사용
  let workLines = lines;

  if (window._coordLines && window._coordLines.length > 0 && lines[0] && lines[0].items) {
    // 이미 flatCoordLines로 변환된 경우 — 그대로 사용 (parseDoc에서 전달된 경우)
    workLines = lines;
  }

  // 영역 구분 강화: 좌표 기반으로 영역 헤더 X좌표가 본문보다 왼쪽에 있는 경우 감지
  // (생기부 PDF 특성: 영역명은 왼쪽 고정 컬럼, 내용은 오른쪽)
  const detectAreaByCoord = (lineObj) => {
    if (!lineObj.items || lineObj.items.length === 0) return null;
    const minX = Math.min(...lineObj.items.map(it => it.x || it.tx?.[4] || 0));
    // X좌표 50 이하(왼쪽 컬럼)에서 영역명 패턴이 나오면 영역 헤더로 강제 인식
    if (minX <= 60) {
      const txt = lineObj.text || lineObj.items.map(i => i.str || i.text || '').join('');
      const am = txt.trim().match(AREA_RE);
      const ambr = !am && txt.trim().match(AREA_BRACKET_RE);
      if (am || ambr) return { am, ambr };
    }
    return null;
  };

  for (let i = 0; i < workLines.length; i++) {
    const lineObj = workLines[i];
    const raw = lineObj.text || '';
    const page = lineObj.page || 1;
    const ln = raw.trim();

    // 섹션 진입
    if (/[6６][\.．]?\s*창의적\s*체험활동상황/.test(ln) ||
        /^창의적\s*체험활동상황$/.test(ln) ||
        /창의적\s*체험활동상황\s*$/.test(ln)) {
      inCCA = true; continue;
    }
    // 섹션 종료
    if (/[7７][\.．]?\s*교과학습발달상황/.test(ln) ||
        /^교과학습발달상황$/.test(ln)) {
      flush(); inCCA = false; continue;
    }
    if (!inCCA) continue;

    // 봉사활동 실적 스킵
    if (/봉\s*사\s*활\s*동\s*실\s*적/.test(ln) ||
        /^일자\s*(또는|or)\s*기간/.test(ln) ||
        /^장소.*주관기관/.test(ln) ||
        /^\d{4}\.\d{2}\.\d{2}.*\(학교\)/.test(ln) ||
        /누계시간$/.test(ln)) {
      flush(); curArea = null; continue;
    }

    if (isNoise(ln)) { flush(); continue; }

    // 좌표 기반 영역 헤더 강화 감지 (일반 패턴 매칭 전 우선 시도)
    const coordAreaMatch = detectAreaByCoord(lineObj);

    const am   = coordAreaMatch ? coordAreaMatch.am   : ln.match(AREA_RE);
    const ambr = coordAreaMatch ? coordAreaMatch.ambr : (!am && ln.match(AREA_BRACKET_RE));

    if (am || ambr) {
      flush();
      let areaName, grNum, rest = '';
      if (am) {
        areaName = am[3];
        grNum = ((am[1]||'') + (am[2]||'')).match(/[123]/);
        rest = (am[5] || '').trim();
      } else {
        areaName = ambr[1];
        grNum = null;
        rest = '';
      }
      // 2022 명칭 정규화
      const areaKey = areaName.replace(/·?자치/, '');
      const mappedArea = AREA_MAP[areaName] || AREA_MAP[areaKey];
      if (!mappedArea) continue;
      if (grNum) curGrade = grNum[0] + '학년';
      curArea = mappedArea;
      bufPage = page;
      if (rest && !NUM_ONLY.test(rest) && rest.length > 3) buf += rest + ' ';
      continue;
    }

    // 학년 단독 줄
    const gm = ln.match(GRADE_LINE);
    if (gm) { flush(); curGrade = gm[1] + '학년'; continue; }

    if (NUM_ONLY.test(ln) || SKIP_LINE.test(ln)) continue;

    if (curArea) {
      if (buf && !buf.endsWith(' ')) buf += ' ';
      buf += ln;
      bufPage = page;
      if (/[.。]\s*$/.test(ln)) flush();
    }
  }
  flush();
}

// ─── Subject 파서 ───
function parseSubject(lines, data) {
  let inS = false, grade = '1학년', subject = '';
  let buf = '', bufPage = 1;

  const GRADE_HDR = /^\[([123])학년\]/;
  // 2022 과목명은 숫자(1,2)와 로마숫자(Ⅰ,Ⅱ) 포함
  const SUBJ_HDR = /^[\(（]?(?:[12]학기[\)）]\s*)?([가-힣A-Za-zⅠⅡ·\s\d]{2,25}?)\s*[:：]\s*/;
  const NOT_S = /학년|학기|교과|이수|합계|비고|탐구|조사|발표|참여|수행|활동|시간|특기|기사|희망|학교|고등|봉사|일자/;
  const SCORE = /^\S+\s+\d{1,2}\s+[\d.]+\//;
  const NOISE = [
    /강원대학교사범대학부설/, /\d+\s*\/\s*\d+\s*반/,
    /원점수.*과목평균/, /석차등급|성취도\(수강자수\)/,
    /이수학점\s*합계/, /수업일수|결석일수/,
    /학교생활(세부사항|기록부)/,
    /^과\s*목\s*세부능력\s*및\s*특기사항$/,
  ];
  const isNL = t => NOISE.some(r => r.test(t)) || isPageFooter(t) || SCORE.test(t) || t.trim().length < 4;

  const flush = () => {
    if (!buf.trim() || !subject) { buf = ''; return; }
    const sents = buf.split(/(?<=[가-힣a-zA-Z0-9])\.\s+/);
    for (const raw of sents) {
      const s = raw.trim();
      if (!isGoodSent(s)) continue;
      const title = mkTitle(s);
      if (!title || title.length < 4) continue;
      const grp = getGroup(subject);
      if (grp === '기타' && !subject) continue;
      if (!data.subject[grp]) data.subject[grp] = [];
      const pool = data.subject[grp];
      if (pool.some(a => cSim(a.title, title) > 0.72)) continue;
      pool.push({
        title, summary: mkSummary(s, title), full: s,
        subject, grade, area: 'subject',
        field: classField(s + ' ' + subject), page: bufPage,
      });
    }
    buf = '';
  };

  // ── 좌표 기반 과목명 헤더 감지 헬퍼 ──
  // 생기부 PDF 특성: 과목명 헤더는 왼쪽 컬럼(X ≤ 80)에 단독으로 짧게 등장
  // 세특 본문은 오른쪽으로 이어지거나 다음 줄로 들여쓰기됨
  const detectSubjectByCoord = (lineObj) => {
    if (!lineObj.items || lineObj.items.length === 0) return null;
    const minX = Math.min(...lineObj.items.map(it => it.x || it.tx?.[4] || 0));
    const maxX = Math.max(...lineObj.items.map(it => it.x || it.tx?.[4] || 0));
    const txt = (lineObj.text || '').trim();
    // 짧고 왼쪽에 있으며 콜론(:)으로 끝나거나 과목명 패턴인 경우
    if (minX <= 80 && txt.length <= 30) {
      const sm = txt.match(SUBJ_HDR);
      if (sm) {
        const cand = sm[1].trim();
        if (cand.length >= 2 && cand.length <= 24 && !NOT_S.test(cand)) {
          return { subject: cand, rest: txt.replace(SUBJ_HDR, '').trim() };
        }
      }
    }
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const lineObj = lines[i];
    const raw = lineObj.text || '';
    const page = lineObj.page || 1;
    const ln = raw.trim();

    // 섹션 진입/종료
    if (/교과학습발달상황/.test(ln)) { inS = true; continue; }
    if (/행동특성\s*및\s*종합의견|독서활동상황/.test(ln)) { flush(); inS = false; continue; }
    if (!inS) continue;

    // 학년 헤더
    const gm = ln.match(GRADE_HDR);
    if (gm) { flush(); grade = gm[1] + '학년'; subject = ''; continue; }

    if (isNL(ln)) continue;

    // ── 좌표 기반 과목명 감지 우선 시도 ──
    const coordSubj = detectSubjectByCoord(lineObj);
    if (coordSubj) {
      flush();
      subject = coordSubj.subject;
      bufPage = page;
      if (coordSubj.rest) buf += coordSubj.rest + ' ';
      continue;
    }

    // ── 정규식 기반 과목명 감지 (fallback) ──
    const sm = ln.match(SUBJ_HDR);
    if (sm) {
      const cand = sm[1].trim();
      if (cand.length >= 2 && cand.length <= 24 && !NOT_S.test(cand)) {
        flush();
        subject = cand;
        bufPage = page;
        const rest = ln.replace(SUBJ_HDR, '').trim();
        if (rest) buf += rest + ' ';
        continue;
      }
    }

    // ── 세특 본문 누적 ──
    if (buf && !buf.endsWith(' ')) buf += ' ';
    buf += ln;
    bufPage = page;
    if (/[.。]\s*$/.test(ln)) flush();
  }
  flush();
}

// ─── Behav 파서 ───
function parseBehav(lines, data) {
  let inB = false, buf = '', bufPage = 1, grade = '1학년';
  const GRADE_ONLY = /^([123])\s*$/;
  const NOISE = [/강원대학교|학교생활기록부|\d+\/\d+\s*반/];

  const addBuf = () => {
    if (!buf.trim()) { buf = ''; return; }
    const sents = buf.split(/(?<=[가-힣a-zA-Z0-9])\.\s+/);
    for (const s of sents) {
      const t = s.trim();
      if (t.length < 20) continue;
      // 행동특성은 길이 기준 완화 — 최소한의 한국어 문장이면 포함
      if (!/[가-힣]{5,}/.test(t)) continue;
      const title = mkTitle(t);
      if (!title || title.length < 4) continue;
      data.behav.push({ title, summary: mkSummary(t, title), full: t, grade, area: 'behav', field: 'general', page: bufPage });
    }
    buf = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const { text: raw, page } = lines[i];
    const ln = raw.trim();
    if (/행동특성\s*및\s*종합의견/.test(ln)) { inB = true; continue; }
    if (/독서활동상황/.test(ln)) { addBuf(); inB = false; continue; }
    if (!inB) continue;
    const gm = ln.match(GRADE_ONLY);
    if (gm) { addBuf(); grade = gm[1] + '학년'; continue; }
    if (NOISE.some(r => r.test(ln)) || isPageFooter(ln) || ln.length < 3) continue;
    if (buf && !buf.endsWith(' ')) buf += ' ';
    buf += ln; bufPage = page;
  }
  addBuf();
}

// ─── 탐구 문장 판별 ───
function isGoodSent(s) {
  if (!s || s.length < 18) return false;
  const INQR = /탐구|조사|분석|발표|연구|실험|수행|탐색|고찰|검토|설계|구현|제작|비교|규명|추론|도출|심화/;
  if (!INQR.test(s)) return false;
  if (/주제로|에 대해|에 대한|을 탐구|를 탐구|을 조사|를 조사|을 분석|를 분석/.test(s)) return true;
  if (/수행평가|프로젝트|보고서|심화탐구|심층탐구/.test(s)) return true;
  if (/(탐구|조사|분석|실험|연구|고찰|검토|설계|구현|심화)(하여|하고|하며|했|한 결과|한 후|한 내용|함)/.test(s)) return true;
  if (/발표(하여|하고|하며|했|함)/.test(s)) return true;
  if (/보고서(를 작성|로 작성|를 제출)/.test(s)) return true;
  if (/\[.{5,50}\]/.test(s) && INQR.test(s)) return true;
  return false;
}

// ─── 제목 추출 ───
function mkTitle(s) {
  let m;
  m = s.match(/\[([^\]]{5,60})\]/);                    if (m) return cl(m[1]);
  m = s.match(/[「『"']([^「『"']{5,60})[」』"']/);    if (m) return cl(m[1]);
  m = s.match(/(.{5,55}?)(?:을|를)\s*주제로/);         if (m) return cl(m[1]);
  m = s.match(/(.{5,55}?)(?:에 대해|에 대한)\s*(?:탐구|조사|분석|발표|연구|실험|심화|고찰)/); if (m) return cl(m[1]);
  m = s.match(/(.{5,55}?)(?:을|를)\s*(?:탐구|조사|분석|발표|연구|실험|심화)/); if (m) return cl(m[1]);
  m = s.match(/(.{5,55}?)(?:을|를)\s*(?:주제로\s*)?선정(?:하여|하고)/);        if (m) return cl(m[1]);
  const ci = s.indexOf(','); if (ci > 12 && ci < 55) return cl(s.slice(0, ci));
  const t = s.replace(/\s+/g, ' ').trim();
  return t.slice(0, Math.min(54, t.length)) + (t.length > 54 ? '…' : '');
}

// ─── 요약 (원문 전체에서 핵심 문장 추출) ───
function mkSummary(full, title) {
  const sents = full.split(/(?<=[가-힣a-zA-Z0-9])\.\s+/).map(s => s.trim()).filter(s => s.length > 10);
  const KWRE = /탐구|조사|분석|연구|실험|발표|결과|발견|규명|도출|추론|이해|파악|적용|확인|설명|표현|비교/;
  // 관련 문장 우선
  const good = sents.filter(s => KWRE.test(s));
  const picks = good.length >= 2 ? good.slice(0, 3) : sents.slice(0, 3);
  let summary = picks.join(' ').trim();
  if (summary.length > 280) summary = summary.slice(0, 277) + '...';
  return summary || full.slice(0, 250) + '...';
}

function cl(s) { return s.replace(/^[,.\s·]+|[,.\s·]+$/g, '').replace(/\s+/g, ' ').trim(); }

// ─── 분야 분류 ───
const FMAP = [
  ['history', /역사|한국사|세계사|고고학|문화재|유물|국가유산|독립|일제|근현대|조선|고려|신라|고구려|백제|사료|역사학|비문|탁본|민주주의|항쟁|제주|여순|동학/],
  ['science', /과학|지구과학|물리|화학|생물|유전|방사성|탄소|마그마|암석|기후|환경|인공지능|AI|데이터|기술|공학|뇌|유전자|생태|천문|지질|실험|에너지|반감기|동위원소/],
  ['social',  /사회|정치|법|경제|지리|세계지리|통합사회|지정학|헌법|판례|재산권|갈등|외교|미디어|언론|복지|시사|선거|민법|형법|국제/],
  ['math',    /수학|함수|방정식|미분|부피|통계|알고리즘|로그|삼각|수열|확률|기하|벡터|행렬|귀납법|증명|적분|극한|부등식/],
];
function classField(t) { for (const [f, r] of FMAP) if (r.test(t)) return f; return 'general'; }

function cSim(a, b) {
  const sa = new Set(a.replace(/\s/g,'').split(''));
  const sb = new Set(b.replace(/\s/g,'').split(''));
  const inter = [...sa].filter(c => sb.has(c)).length;
  const union = new Set([...sa,...sb]).size;
  return union ? inter/union : 0;
}
