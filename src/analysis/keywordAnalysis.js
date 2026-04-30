// ════════════════════════════════════════
//  키워드 분석 — 고도화 (TF-IDF + n-gram + 레이더 + 트렌드)
// ════════════════════════════════════════

// ── 불용어 ──
const STOP = new Set([
  // 조사/접속사/어미
  '하여','하고','하며','했','하는','있다','있으며','없다','이다','이며',
  '것이','것은','것을','등의','등을','대한','대해','통해','위한',
  '이러한','또한','그리고','하지만','그러나','따라서','이에','해당',
  '위해','까지','부터','보다','에서의','에서도','에도','이를','으로',
  '에서','에게','수있','있는','통하여','함으로','하였으며','하였고',
  '하였다','하였음','됩니다','됩','했다','했으며','했고','한다',
  '한다고','한다는','한다면','한다며','한다고도','받았으며','받았다',
  '시작하여','시작해','시작했','참여하여','참여해','참여했','통해서',
  '이라고','이라는','이라며','이라면','이라고도','이라는것','이라는데',
  // 일반 서술어 (동사화된 형태 — 토큰으로 잘못 잘린 것)
  '활동에서','조사함','발표함','분석함','탐구함','설명함','표현함',
  '참여함','수행함','제작함','설계함','조사하여','발표하여','분석하여',
  '탐구하여','이해하여','적용하여','확인하여','파악하여','탐색하여',
  '조사하고','발표하고','분석하고','탐구하고','이해하고','적용하고',
  '하였으며','하였고','하였다','활동으로','활동을','활동이','활동에',
  '활동의','수업에서','수업을','수업의','수업이','수업에','수업으로',
  // 생기부 헤더/개인정보 노이즈
  '번호','성명','학번','주민','생년월일','발급','출력일시','페이지',
  '학교명','학교생활','기록부','세부사항','출결상황','수상경력',
  // 의미없는 일반어
  '학생','활동','탐구','수업','시간','과정','내용','결과','방법',
  '모습','바탕','기반','관점','의미','역할','영향','특성','이후',
  '이번','관심','이해','능력','분야','계획','주제','자료','제시',
  '설명','발표','제작','설계','파악','수행','수행평가','학습',
  '관련','생각','경험','스스로','통한','자신','중요','필요',
  '다양','다양한','여러','함께','더욱','매우','특히','더','가장',
  '이후','이전','현재','미래','오늘','우리','그것','이것','저것',
  '때문','경우','위하여','하기','하기도','하기위해','하기위한',
  // 조사 붙은 잘못 잘린 토큰 필터는 tokenize에서 처리
]);

// ── 동적 불용어 관리 (학생별로 초기화) ──
// STOP은 기본 불용어(const), dynamicStop은 학생별 이름/학교명 임시 추가분
const dynamicStop = new Set();

function addDynamicStop(word) {
  if (!word || word === '—') return;
  dynamicStop.add(word);
  STOP.add(word);
}

function clearDynamicStop() {
  for (const w of dynamicStop) STOP.delete(w);
  dynamicStop.clear();
}
// ── 역량별 동사 신호어 (맥락 분류용) ──
// 생기부 텍스트에서 키워드 주변에 이 단어들이 있으면 해당 역량으로 분류
const COMPETENCY_VERB_SIGNALS = {
  학업역량: ['탐구','분석','실험','검증','이해','적용','도출','고찰','심화','발견','관찰','측정',
             '증명','계산','비교','추론','연구','습득','학습','파악','정리','고안','수식','증명',
             '원리','개념','이론','공식','법칙','메커니즘','가설','변인'],
  진로역량: ['진로','관심','탐색','연계','연결','목표','지망','희망','전공','계획','설계','꿈',
             '직업','분야','역량','역할','실무','현장','직무','전문','준비','방향'],
  공동체역량: ['협력','소통','기여','이끌','조율','도움','배려','함께','팀원','모둠','친구',
               '협업','나눔','봉사','리더','대표','임원','반장','토론','공동','상호','협동'],
  성장역량: ['극복','개선','성찰','반성','도전','변화','스스로','주도','자발','노력','시도',
             '시행착오','실패','발전','성장','각오','의지','깨달','깨닫','보완','오류'],
};

// ── 진로역량 하위 분야 사전 (2차 분류용) ──
const SUBJECT_FIELD_DICT = {
  과학기술: ['과학','물리','화학','생명','지구','실험','에너지','반응','세포','유전','물질',
             '우주','역학','전자기','기후','환경','생태','나노','양자','소재','재료'],
  수학통계: ['수학','함수','방정식','미분','적분','통계','확률','기하','대수','벡터','행렬',
             '수열','극한','알고리즘','데이터'],
  사회인문: ['사회','역사','문화','정치','경제','법','윤리','철학','지리','인간','심리',
             '교육','언론','미디어','복지','행정','국제'],
  언어문학: ['국어','문학','독서','글쓰기','화법','언어','작문','소설','수필','표현','독해','어휘'],
  공학정보: ['공학','정보','코딩','프로그래밍','인공지능','로봇','컴퓨터','소프트웨어',
             '개발','디지털','네트워크','반도체','전자','기계','건축'],
  예체능: ['미술','음악','체육','운동','스포츠','그림','디자인','창작','연주','공연','전시','영상'],
};

// ── 역량별 핵심 명사 (동사 신호 없을 때 폴백 분류용) ──
const COMPETENCY_NOUN_DICT = {
  학업역량: ['원리','개념','이론','공식','법칙','정리','증명','논문','보고서','실험',
             '탐구','메커니즘','가설','변인','성취','오답','개념도'],
  진로역량: ['진로','직업','전공','계열','분야','로드맵','직무','현장','실무','관심사'],
  공동체역량: ['팀원','조원','모둠','학급','반장','부장','봉사','임원','리더','공동체'],
  성장역량: ['자기주도','어려움','도전','시행착오','극복','성찰','반성','의지','목표의식'],
};

// ── 복합어 사전 (자주 쓰이는 탐구 주제어 보정) ──
const COMPOUND_DICT = [
  '인공지능','기후변화','생명과학','지구과학','환경문제','사회문제','경제성장',
  '데이터분석','물리학','화학반응','유전자','세포분열','광합성','대기오염',
  '민주주의','인권문제','역사적','과학기술','정보통신','미디어리터러시',
  '진로탐색','자기주도','창의적','비판적','논리적','협동학습',
];

// ── 전체 텍스트 추출 ──
function getAllText(data) {
  const all = [...Object.values(data.subject).flat(), ...data.auto, ...data.club, ...data.career, ...data.behav];
  return { all, texts: all.map(a => a.full || a.title + ' ' + a.summary) };
}

// ── 토크나이저 (고도화) ──
// 조사 붙은 잘못 잘린 토큰, 서술어형, 개인정보 패턴 모두 필터링
const JOSA_END = /(?:에서|에게|으로|이라|이며|이고|이다|이란|에도|에만|에는|이면|이나|하고|하여|하며|하는|하면|해서|해도|해야|됩니다|됩|겠다|겠고|겠으며|겠습|겠지|겠는|겠어|겠죠|겠네|겠군|ㄴ다|ㄴ데|ㄴ지|ㄴ가|ㄴ고|를통|을통|과함께|와함께|있음|없음|있음을|없음을|보임|보여줌|나타남|드러남|드러냄|이루어짐|이뤄짐|밝힘|제시함|관찰됨)$/;
const VERB_SUFFIX = /(?:하여|하고|하며|했으며|했고|했다|하였고|하였으며|하였다|하였음|함으로|함께|탐구함|조사함|발표함|분석함|수행함|참여함|제작함|설계함|설명함|표현함|이해함|적용함|확인함|파악함|탐색함|정리함|기록함|작성함)$/;
const INFO_NOISE = /^(?:\d{6}|[가-힣]{2,4}(?:고등학교|중학교|초등학교)|(?:담임|담당)교사|학년반번호|반번호성명|성명|번호|학년|반|담임)$/;
// 의미있는 명사/주제어인지 판별 (내용어 최소 조건)
const isContentWord = w => {
  if (w.length < 2 || w.length > 12) return false;
  if (STOP.has(w)) return false;
  if (JOSA_END.test(w)) return false;
  if (VERB_SUFFIX.test(w)) return false;
  if (INFO_NOISE.test(w)) return false;
  // 순수 숫자+한글 조합 노이즈
  if (/^\d+[가-힣]$|^[가-힣]\d+$/.test(w)) return false;
  // 1글자 반복 노이즈
  if (/^(.)+$/.test(w)) return false;
  return true;
};

function tokenize(text) {
  // 숫자·특수문자 제거 후 한글만 추출
  const t = text.replace(/[^가-힣]/g, ' ');
  const words = t.match(/[가-힣]{2,}/g) || [];
  return words.filter(isContentWord);
}

// ── n-gram 추출 (2~3어절 복합 키워드) ──
function extractNgrams(texts) {
  const bigrams = {}, trigrams = {};
  for (const text of texts) {
    const words = tokenize(text);
    for (let i = 0; i < words.length - 1; i++) {
      const bi = words[i] + ' ' + words[i+1];
      if (words[i].length >= 2 && words[i+1].length >= 2)
        bigrams[bi] = (bigrams[bi] || 0) + 1;
      if (i < words.length - 2) {
        const tri = words[i] + ' ' + words[i+1] + ' ' + words[i+2];
        if (words[i+2].length >= 2)
          trigrams[tri] = (trigrams[tri] || 0) + 1;
      }
    }
  }
  // 빈도 2 이상, 의미있는 조합만
  const result = [];
  for (const [k, v] of Object.entries(bigrams)) {
    if (v >= 2) result.push({ text: k, cnt: v, type: 'bi' });
  }
  for (const [k, v] of Object.entries(trigrams)) {
    if (v >= 2) result.push({ text: k, cnt: v, type: 'tri' });
  }
  return result.sort((a, b) => b.cnt - a.cnt).slice(0, 40);
}

// ── TF-IDF 가중치 계산 ──
// 생기부 특성상 "문서 = 각 활동 항목"으로 계산
function calcTfIdf(all) {
  const docs = all.map(a => tokenize(a.full || a.title + ' ' + a.summary));
  const N = docs.length || 1;
  // DF 계산
  const df = {};
  for (const doc of docs) {
    const seen = new Set(doc);
    for (const w of seen) df[w] = (df[w] || 0) + 1;
  }
  // TF-IDF 합산
  const scores = {};
  for (const doc of docs) {
    const tf = {};
    for (const w of doc) tf[w] = (tf[w] || 0) + 1;
    const len = doc.length || 1;
    for (const [w, cnt] of Object.entries(tf)) {
      const idf = Math.log((N + 1) / ((df[w] || 1) + 1)) + 1;
      scores[w] = (scores[w] || 0) + (cnt / len) * idf;
    }
  }
  return Object.entries(scores)
    .filter(([w]) => !STOP.has(w) && w.length >= 2)
    .sort((a, b) => b[1] - a[1]);
}

// ── 분야 분류 ──
// ── 맥락 기반 역량 분류 ──
// word가 등장하는 주변 ±70자 윈도우에서 역량 동사 신호를 탐지
function classifyCompetencyWithContext(word, allTexts) {
  const votes = { 학업역량: 0, 진로역량: 0, 공동체역량: 0, 성장역량: 0 };

  for (const text of allTexts) {
    let idx = text.indexOf(word);
    while (idx !== -1) {
      const start = Math.max(0, idx - 70);
      const end = Math.min(text.length, idx + word.length + 70);
      const ctx = text.slice(start, end);
      for (const [comp, signals] of Object.entries(COMPETENCY_VERB_SIGNALS)) {
        const hit = signals.filter(s => ctx.includes(s)).length;
        if (hit > 0) votes[comp] += hit;
      }
      idx = text.indexOf(word, idx + 1);
    }
  }

  const maxVotes = Math.max(...Object.values(votes));
  if (maxVotes === 0) return classifyCompetencyByNoun(word); // 폴백

  // 동점 시: 학업>진로>공동체>성장 우선 (가장 변별력 있는 순)
  return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
}

// ── 폴백: 명사 기반 역량 분류 ──
function classifyCompetencyByNoun(word) {
  for (const [comp, kws] of Object.entries(COMPETENCY_NOUN_DICT)) {
    if (kws.some(k => word.includes(k) || k.includes(word))) return comp;
  }
  // 분야 사전과 대조해 진로역량으로 분류
  for (const kws of Object.values(SUBJECT_FIELD_DICT)) {
    if (kws.some(k => word.includes(k) || k.includes(word))) return '진로역량';
  }
  return null;
}

// ── 진로역량 하위 분야 분류 ──
function classifySubjectField(word) {
  for (const [field, kws] of Object.entries(SUBJECT_FIELD_DICT)) {
    if (kws.some(k => word.includes(k) || k.includes(word))) return field;
  }
  return null;
}

// ── 역량별 점수 집계 (맥락 기반) ──
function calcFieldScores(all, texts) {
  const scores = { 학업역량: 0, 진로역량: 0, 공동체역량: 0, 성장역량: 0 };
  const allTexts = texts || all.map(a => a.full || a.title + ' ' + (a.summary || ''));

  // 1) 모든 텍스트를 합쳐서 역량 동사 신호 빈도로 집계
  const fullText = allTexts.join(' ');
  for (const [comp, signals] of Object.entries(COMPETENCY_VERB_SIGNALS)) {
    for (const sig of signals) {
      let idx = fullText.indexOf(sig);
      while (idx !== -1) { scores[comp]++; idx = fullText.indexOf(sig, idx + 1); }
    }
  }

  // 2) 명사 보정: 분야 사전 명사가 등장하면 진로역량 점수 추가
  for (const a of all) {
    const words = tokenize(a.full || a.title + ' ' + (a.summary || ''));
    for (const w of words) {
      if (classifySubjectField(w)) scores['진로역량'] += 0.5;
    }
  }

  return scores;
}

// ── 학년별 키워드 집계 ──
function calcGradeTrend(all) {
  const byGrade = { '1학년': [], '2학년': [], '3학년': [] };
  for (const a of all) {
    const grade = a.grade || '1학년';
    if (byGrade[grade]) {
      const words = tokenize(a.full || a.title + ' ' + a.summary);
      byGrade[grade].push(...words);
    }
  }
  const result = {};
  for (const [grade, words] of Object.entries(byGrade)) {
    if (!words.length) continue;
    const freq = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;
    result[grade] = Object.entries(freq)
      .filter(([w]) => !STOP.has(w))
      .sort((a, b) => b[1] - a[1]).slice(0, 15);
  }
  return result;
}

// ── 메인 렌더 ──
function renderKeywords(data) {
  const { all, texts } = getAllText(data);
  if (!all.length) return;

  // TF-IDF
  const tfidfScores = calcTfIdf(all);
  const topKws = tfidfScores.slice(0, 60);

  // n-gram
  const ngrams = extractNgrams(texts);

  // 역량 점수 (맥락 기반)
  const fieldScores = calcFieldScores(all, texts);

  // 6분야 점수 (탐구 분야 관점)
  const subjectScores = calcSubjectFieldScores(all);

  // 학년 트렌드
  const trend = calcGradeTrend(all);

  // 빈도 (워드클라우드용)
  const freqMap = {};
  for (const t of texts) {
    const words = tokenize(t);
    for (const w of words) freqMap[w] = (freqMap[w] || 0) + 1;
  }
  const freqKws = Object.entries(freqMap).filter(([,v]) => v >= 2).sort((a,b) => b[1]-a[1]).slice(0, 60);

  window._kwData = freqKws;
  window._kwAll = { tfidfScores: topKws, ngrams, fieldScores, subjectScores, trend, freqKws, all, texts };

  document.getElementById('snc-kw').textContent = topKws.length + '개';

  renderKwSummary(topKws, ngrams, fieldScores);
  renderKwRank(topKws, all);
  renderKwNgram(ngrams);
  renderKwRadar(fieldScores, subjectScores, all);
  renderKwTrend(trend);
  switchKwTab('rank');
}

function switchKwTab(tab) {
  document.querySelectorAll('.kw-tab-btn').forEach((b, i) => {
    b.classList.toggle('active', ['rank','ngram','radar','trend','cloud'][i] === tab);
  });
  document.querySelectorAll('.kw-vp').forEach(v => v.classList.remove('active'));
  document.getElementById('kwvp-' + tab)?.classList.add('active');
  if (tab === 'cloud' && window._kwData) setTimeout(() => drawWC(window._kwData), 60);
  if (tab === 'radar' && window._kwAll) setTimeout(() => {
    drawRadar(window._kwAll.fieldScores);
    drawRadarField(window._kwAll.subjectScores || {});
  }, 60);
}

// ── 요약 카드 ──
function renderKwSummary(tfidf, ngrams, fieldScores) {
  const wrap = document.getElementById('kw-summary-row');
  if (!wrap) return;
  const topField = Object.entries(fieldScores).sort((a,b) => b[1]-a[1])[0];
  const topKw = tfidf[0]?.[0] || '—';
  const topNg = ngrams[0]?.text || '—';
  const total = Object.values(fieldScores).reduce((a,b) => a+b, 0) || 1;
  const topPct = topField ? Math.round(topField[1] / total * 100) : 0;
  const COMP_ICON = { 학업역량:'📚', 진로역량:'🎯', 공동체역량:'🤝', 성장역량:'🌱' };

  wrap.innerHTML = `
    <div class="kw-sum-card">
      <div class="ksc-n">${tfidf.length}</div>
      <div class="ksc-l">추출된 핵심 키워드</div>
      <div class="ksc-top">대표: ${esc(topKw)}</div>
    </div>
    <div class="kw-sum-card">
      <div class="ksc-n">${ngrams.length}</div>
      <div class="ksc-l">복합 키워드 (n-gram)</div>
      <div class="ksc-top">대표: ${esc(topNg)}</div>
    </div>
    <div class="kw-sum-card">
      <div class="ksc-n">${topField ? (COMP_ICON[topField[0]]||'') + ' ' + esc(topField[0]) : '—'}</div>
      <div class="ksc-l">두드러진 역량</div>
      <div class="ksc-top">${topPct}% 신호 비중</div>
    </div>
    <div class="kw-sum-card">
      <div class="ksc-n">${Object.keys(window._kwAll?.trend || {}).filter(g => (window._kwAll?.trend[g]?.length||0) > 0).length}</div>
      <div class="ksc-l">분석된 학년 수</div>
      <div class="ksc-top">학년별 추이 제공</div>
    </div>
  `;
}

// ── TF-IDF 키워드 랭킹 ──
function renderKwRank(tfidf, all) {
  const list = document.getElementById('kw-list');
  if (!list) return;
  list.innerHTML = '';
  const maxScore = tfidf[0]?.[1] || 1;

  const COMP_COLOR = {
    학업역량: { bg:'#eaf2fd', border:'#2b7fe8', text:'#2b7fe8' },
    진로역량: { bg:'#fff3e0', border:'#c9871f', text:'#c9871f' },
    공동체역량: { bg:'#e8f8f2', border:'#1aaa6e', text:'#1aaa6e' },
    성장역량: { bg:'#f0ebfd', border:'#7c3fe4', text:'#7c3fe4' },
  };
  const SOURCE_COLOR = {
    교과탐구: '#2b7fe8', 자율활동: '#1aaa6e', 동아리: '#7c3fe4',
    진로활동: '#c9871f', 행동특성: '#d44060',
  };
  const areaMap = { subject:'교과탐구', auto:'자율활동', club:'동아리', career:'진로활동', behav:'행동특성' };

  // 전체 텍스트 목록 (맥락 분류용)
  const allTexts = all.map(a => a.full || a.title + ' ' + (a.summary || ''));

  // 영역별 분포 계산
  const areaDist = { '교과탐구': 0, '자율활동': 0, '동아리': 0, '진로활동': 0, '행동특성': 0 };

  tfidf.slice(0, 20).forEach(([w, score], i) => {
    const pct = Math.round(score / maxScore * 100);
    const tfidfDisp = score.toFixed(2);

    // 맥락 기반 역량 분류
    const comp = classifyCompetencyWithContext(w, allTexts) || classifyCompetencyByNoun(w);
    const cc = comp ? COMP_COLOR[comp] : { bg:'#f0f0f0', border:'#aaa', text:'#666' };

    // 진로역량이면 분야 레이블도 추출
    const subField = comp === '진로역량' ? classifySubjectField(w) : null;

    // 출처 분포 확인
    const areaFreq = {};
    for (const a of all) {
      if ((a.full||'').includes(w) || (a.title||'').includes(w)) {
        const ar = areaMap[a.area] || '기타';
        areaFreq[ar] = (areaFreq[ar] || 0) + 1;
      }
    }
    const topArea = Object.entries(areaFreq).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';
    const srcCol = SOURCE_COLOR[topArea] || '#999';

    const compBadge = comp
      ? `<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:${cc.bg};color:${cc.text};border:1px solid ${cc.border};white-space:nowrap">${comp.replace('역량','')}</span>`
      : '';
    const subBadge = subField
      ? `<span style="font-size:9px;padding:1px 4px;border-radius:3px;background:#f5f5f5;color:#666;border:1px solid #ddd">${subField}</span>`
      : '';
    const srcBadge = topArea
      ? `<span style="font-size:9px;padding:1px 4px;border-radius:3px;color:#fff;background:${srcCol};white-space:nowrap">${topArea}</span>`
      : '';

    const d = document.createElement('div');
    d.className = 'kw-item';
    d.innerHTML = `
      <span class="kw-rank">${i+1}</span>
      <span class="kw-word">${esc(w)}</span>
      <div class="kw-bg"><div class="kw-fill" style="width:${pct}%;background:${cc.border}"></div></div>
      <span class="kw-tfidf">${tfidfDisp}</span>
      <span style="display:flex;gap:3px;align-items:center;flex-wrap:wrap">${compBadge}${subBadge}${srcBadge}</span>
    `;
    list.appendChild(d);
  });

  // 영역 분포
  for (const a of all) {
    const ar = areaMap[a.area];
    if (ar) areaDist[ar]++;
  }
  const distEl = document.getElementById('kw-area-dist');
  if (!distEl) return;
  distEl.innerHTML = '';
  const maxDist = Math.max(...Object.values(areaDist), 1);
  Object.entries(areaDist).forEach(([lbl, cnt]) => {
    const pct = Math.round(cnt / maxDist * 100);
    const col = SOURCE_COLOR[lbl] || '#999';
    const d = document.createElement('div');
    d.className = 'area-dist-item';
    d.innerHTML = `
      <span class="area-dist-lbl">${esc(lbl)}</span>
      <div class="area-dist-bg"><div class="area-dist-fill" style="width:${pct}%;background:${col}"></div></div>
      <span class="area-dist-cnt">${cnt}</span>
    `;
    distEl.appendChild(d);
  });
}

// ── n-gram 렌더 ──
function renderKwNgram(ngrams) {
  const el = document.getElementById('kw-ngram-list');
  if (!el) return;
  const CLRS = [
    {bg:'#eaf2fd',border:'#2b7fe8',text:'#2b7fe8'},
    {bg:'#e8f8f2',border:'#1aaa6e',text:'#1aaa6e'},
    {bg:'#f0ebfd',border:'#7c3fe4',text:'#7c3fe4'},
    {bg:'#fdf3e3',border:'#c9871f',text:'#c9871f'},
    {bg:'#fdeaee',border:'#d44060',text:'#d44060'},
  ];
  el.innerHTML = '<div class="ngram-grid">' +
    ngrams.slice(0, 36).map((ng, i) => {
      const c = CLRS[i % CLRS.length];
      const size = ng.type === 'tri' ? 13 : 12;
      return `<span class="ngram-tag" style="background:${c.bg};border-color:${c.border};color:${c.text};font-size:${size}px">
        ${esc(ng.text)} <span class="ngram-cnt">×${ng.cnt}</span>
      </span>`;
    }).join('') + '</div>';
}

// ── 6분야 점수 집계 (탐구 분야 관점) ──
function calcSubjectFieldScores(all) {
  const scores = { 과학기술:0, 수학통계:0, 사회인문:0, 언어문학:0, 공학정보:0, 예체능:0 };
  for (const a of all) {
    const words = tokenize(a.full || a.title + ' ' + (a.summary||''));
    for (const w of words) {
      const sf = classifySubjectField(w);
      if (sf) scores[sf] = (scores[sf]||0) + 1;
    }
    if (a.area === 'subject') {
      const grp = a.field || '';
      if (grp === 'science')  scores['과학기술'] += 3;
      if (grp === 'math')     scores['수학통계'] += 3;
      if (grp === 'social')   scores['사회인문'] += 3;
      if (grp === 'history')  scores['사회인문'] += 2;
    }
  }
  return scores;
}

// ── 6분야 레이더 차트 ──
function drawRadarField(subjectScores, fixedSize) {
  const canvas = document.getElementById('radar-canvas-field');
  if (!canvas) return;
  const FIELDS = ['과학기술','수학통계','사회인문','언어문학','공학정보','예체능'];
  const COLORS = ['#d44060','#1aaa6e','#f09840','#2b7fe8','#7c3fe4','#8060c0'];
  const dpr = window.devicePixelRatio || 1;
  const size = fixedSize || Math.min(canvas.offsetWidth || 360, 360);
  canvas.width = size * dpr; canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const cx = size/2, cy = size/2, R = size * 0.34;
  const n = FIELDS.length;
  const vals = FIELDS.map(f => subjectScores[f] || 0);
  const maxV = Math.max(...vals, 1);

  ctx.clearRect(0, 0, size, size);

  // 배경 그리드
  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI*2*i/n) - Math.PI/2;
      const r = R * ring / 4;
      ctx.lineTo ? null : null;
      const x = cx + r*Math.cos(angle), y = cy + r*Math.sin(angle);
      i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = ring%2===0 ? 'rgba(0,0,0,0.02)' : 'transparent'; ctx.fill();
  }
  // 축
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI*2*i/n) - Math.PI/2;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.lineTo(cx+R*Math.cos(angle), cy+R*Math.sin(angle));
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth=1; ctx.stroke();
  }
  // 데이터 폴리곤
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI*2*i/n) - Math.PI/2;
    const r = R * (vals[i]/maxV) * 0.92 + R*0.08;
    const x = cx+r*Math.cos(angle), y = cy+r*Math.sin(angle);
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(43,127,232,0.13)'; ctx.fill();
  ctx.strokeStyle = '#2b7fe8'; ctx.lineWidth = 2.5; ctx.stroke();
  // 점
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI*2*i/n) - Math.PI/2;
    const r = R * (vals[i]/maxV) * 0.92 + R*0.08;
    const x = cx+r*Math.cos(angle), y = cy+r*Math.sin(angle);
    ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2);
    ctx.fillStyle = COLORS[i]; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth=2; ctx.stroke();
  }
  // 레이블
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI*2*i/n) - Math.PI/2;
    const labelR = R + 28;
    const x = cx+labelR*Math.cos(angle), y = cy+labelR*Math.sin(angle);
    const pct = Math.round(vals[i]/maxV*100);
    ctx.font = `bold ${size<300?10:12}px 'Malgun Gothic',sans-serif`;
    ctx.fillStyle = COLORS[i];
    ctx.fillText(FIELDS[i], x, y-7);
    ctx.font = `${size<300?9:10}px monospace`;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText(pct+'%', x, y+8);
  }
}
function drawRadar(fieldScores, fixedSize) {
  const canvas = document.getElementById('radar-canvas');
  if (!canvas) return;
  const FIELDS = ['학업역량','진로역량','공동체역량','성장역량'];
  const COLORS = ['#2b7fe8','#c9871f','#1aaa6e','#7c3fe4'];
  const ICONS  = ['📚','🎯','🤝','🌱'];
  const dpr = window.devicePixelRatio || 1;
  const size = fixedSize || Math.min(canvas.offsetWidth || 380, 380);
  canvas.width = size * dpr; canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const cx = size / 2, cy = size / 2, R = size * 0.34;
  const n = FIELDS.length;
  const vals = FIELDS.map(f => fieldScores[f] || 0);
  const maxV = Math.max(...vals, 1);

  ctx.clearRect(0, 0, size, size);

  // 배경 그리드
  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      const r = R * ring / 4;
      const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = ring % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent';
    ctx.fill();
  }

  // 축
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 데이터 폴리곤
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const r = R * (vals[i] / maxV) * 0.92 + R * 0.08;
    const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(201,135,31,0.15)';
  ctx.fill();
  ctx.strokeStyle = '#c9871f';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 점
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const r = R * (vals[i] / maxV) * 0.92 + R * 0.08;
    const x = cx + r * Math.cos(angle), y = cy + r * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS[i];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 레이블
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const labelR = R + 30;
    const x = cx + labelR * Math.cos(angle), y = cy + labelR * Math.sin(angle);
    const pct = Math.round(vals[i] / maxV * 100);
    ctx.font = `bold ${size < 300 ? 10 : 12}px 'Malgun Gothic',sans-serif`;
    ctx.fillStyle = COLORS[i];
    ctx.fillText(ICONS[i] + ' ' + FIELDS[i], x, y - 7);
    ctx.font = `${size < 300 ? 9 : 10}px monospace`;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText(pct + '%', x, y + 8);
  }
}

// ── 역량별 상세 렌더 ──
function renderKwRadar(fieldScores, subjectScores, all) {
  // ① 4역량 레이더 그리기
  setTimeout(() => drawRadar(fieldScores), 30);
  // ② 6분야 레이더 그리기
  setTimeout(() => drawRadarField(subjectScores || {}), 30);

  const COMPS = ['학업역량','진로역량','공동체역량','성장역량'];
  const COLORS = { 학업역량:'#2b7fe8', 진로역량:'#c9871f', 공동체역량:'#1aaa6e', 성장역량:'#7c3fe4' };
  const ICONS  = { 학업역량:'📚', 진로역량:'🎯', 공동체역량:'🤝', 성장역량:'🌱' };
  const DESC   = {
    학업역량: '개념 이해·탐구·실험·분석 등 교과 기반 지적 활동',
    진로역량: '계열·분야 연계 활동 및 과목 선택 일관성',
    공동체역량: '협력·배려·기여·리더십 등 관계 기반 활동',
    성장역량: '자기주도·도전·성찰·극복 등 내면 변화 흔적',
  };
  const SOURCE_COLOR = {
    교과탐구:'#2b7fe8', 자율활동:'#1aaa6e', 동아리:'#7c3fe4', 진로활동:'#c9871f', 행동특성:'#d44060',
  };
  const areaMap = { subject:'교과탐구', auto:'자율활동', club:'동아리', career:'진로활동', behav:'행동특성' };
  const allTexts = all.map(a => a.full || a.title + ' ' + (a.summary || ''));

  // ── 역량별 상세 ──
  const el = document.getElementById('kw-field-detail');
  if (el) {
    el.innerHTML = '';
    const total = Object.values(fieldScores).reduce((a,b)=>a+b,0)||1;
    COMPS.forEach(comp => {
      const score = fieldScores[comp]||0;
      const col = COLORS[comp];
      const pct = Math.round(score/total*100);
      const topKws = (window._kwAll?.tfidfScores||[]).slice(0,60);
      const compKws = topKws
        .filter(([w]) => classifyCompetencyWithContext(w,allTexts)===comp || classifyCompetencyByNoun(w)===comp)
        .slice(0,10)
        .map(([w]) => {
          const areaFreq = {};
          for (const a of all) {
            if ((a.full||'').includes(w)||(a.title||'').includes(w)) {
              const ar = areaMap[a.area]; if(ar) areaFreq[ar]=(areaFreq[ar]||0)+1;
            }
          }
          const topSrc = Object.entries(areaFreq).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
          const srcStyle = topSrc ? `background:${SOURCE_COLOR[topSrc]||'#999'};color:#fff;` : `background:${col}22;color:${col};`;
          const sub = comp==='진로역량' ? classifySubjectField(w) : null;
          return `<span style="font-size:11px;padding:2px 7px;border-radius:4px;${srcStyle}border:1px solid ${col}33;white-space:nowrap">
            ${esc(w)}${sub?` <span style="opacity:.7;font-size:9px">(${sub})</span>`:''}
            ${topSrc?` <span style="opacity:.65;font-size:9px">${topSrc}</span>`:''}
          </span>`;
        });
      let subFieldBar = '';
      if (comp==='진로역량') {
        const subSc={};
        for(const a of all){const words=tokenize(a.full||a.title+' '+(a.summary||''));for(const w of words){const sf=classifySubjectField(w);if(sf)subSc[sf]=(subSc[sf]||0)+1;}}
        const sfTotal=Object.values(subSc).reduce((a,b)=>a+b,0)||1;
        const sfSorted=Object.entries(subSc).sort((a,b)=>b[1]-a[1]).slice(0,4);
        if(sfSorted.length) subFieldBar=`<div style="margin-top:8px;font-size:10px;color:var(--tx3)">분야: `+sfSorted.map(([sf,cnt])=>`<span style="margin-right:6px;color:${col}">${sf} ${Math.round(cnt/sfTotal*100)}%</span>`).join('')+'</div>';
      }
      const sec = document.createElement('div');
      sec.className='field-detail-sec';
      sec.innerHTML=`
        <div class="field-detail-hd" style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:15px">${ICONS[comp]}</span>
          <span style="font-weight:700;color:${col}">${comp}</span>
          <span style="font-size:10px;color:var(--tx3)">(신호 ${pct}%)</span>
        </div>
        <div style="font-size:10px;color:var(--tx3);margin-bottom:8px">${DESC[comp]}</div>
        <div class="field-tags" style="display:flex;flex-wrap:wrap;gap:5px">
          ${compKws.length?compKws.join(''):'<span style="font-size:11px;color:var(--tx3)">관련 키워드 없음</span>'}
        </div>
        ${subFieldBar}
      `;
      el.appendChild(sec);
    });
  }

  // ── 6분야 상세 ──
  const el2 = document.getElementById('kw-subject-detail');
  if (el2) {
    el2.innerHTML = '';
    const SFIELDS = ['과학기술','수학통계','사회인문','언어문학','공학정보','예체능'];
    const SCOLORS = { 과학기술:'#d44060', 수학통계:'#1aaa6e', 사회인문:'#f09840', 언어문학:'#2b7fe8', 공학정보:'#7c3fe4', 예체능:'#8060c0' };
    const stotal = Object.values(subjectScores||{}).reduce((a,b)=>a+b,0)||1;
    SFIELDS.forEach(f => {
      const score = (subjectScores||{})[f]||0;
      if (!score) return;
      const col = SCOLORS[f];
      const pct = Math.round(score/stotal*100);
      const kws = SUBJECT_FIELD_DICT[f]||[];
      const freq={};
      for(const a of all){
        const words=tokenize(a.full||a.title+' '+(a.summary||''));
        for(const w of words){ if(kws.some(k=>w.includes(k)||k.includes(w))) freq[w]=(freq[w]||0)+1; }
      }
      const top=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([w])=>w);
      const sec=document.createElement('div');
      sec.className='field-detail-sec';
      sec.innerHTML=`
        <div class="field-detail-hd" style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span class="field-dot" style="background:${col}"></span>
          <span style="font-weight:700;color:${col}">${f}</span>
          <span style="font-size:10px;color:var(--tx3)">(${pct}%)</span>
        </div>
        <div class="field-tags" style="display:flex;flex-wrap:wrap;gap:4px">
          ${top.map(w=>`<span class="field-tag" style="background:${col}22;color:${col};border:1px solid ${col}44">${esc(w)}</span>`).join('')}
        </div>
      `;
      el2.appendChild(sec);
    });
  }
}

// ── 학년별 트렌드 ──
function renderKwTrend(trend) {
  const el = document.getElementById('kw-trend-body');
  if (!el) return;
  el.innerHTML = '';
  const grades = ['1학년','2학년','3학년'].filter(g => trend[g]?.length);
  if (grades.length < 2) {
    el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:20px 0">2개 학년 이상의 데이터가 있어야 변화 추이를 볼 수 있습니다.</div>';
    return;
  }
  const prev = new Set();
  grades.forEach((grade, gi) => {
    const kws = trend[grade] || [];
    const curSet = new Set(kws.map(([w]) => w));
    const sec = document.createElement('div');
    sec.className = 'trend-grade-row';
    const items = kws.slice(0, 12).map(([w, cnt]) => {
      const isNew = gi > 0 && !prev.has(w);
      // 전 학년 대비 증가 여부
      const prevCnt = gi > 0 ? (trend[grades[gi-1]]?.find(([pw]) => pw === w)?.[1] || 0) : 0;
      const isGrow = gi > 0 && !isNew && cnt > prevCnt;
      return `<div class="trend-kw-row">
        <span style="min-width:80px;font-weight:700;font-size:13px;color:var(--tx)">${esc(w)}</span>
        <div class="kw-bg" style="max-width:120px"><div class="kw-fill" style="width:${Math.round(cnt/kws[0][1]*100)}%;background:#2b7fe8"></div></div>
        <span style="font-size:11px;color:var(--tx3);font-family:monospace">×${cnt}</span>
        ${isNew ? '<span class="trend-new-badge">NEW</span>' : ''}
        ${isGrow ? '<span class="trend-grow-badge">↑증가</span>' : ''}
      </div>`;
    }).join('');
    sec.innerHTML = `<div class="trend-grade-hd">📌 ${grade}</div>${items}`;
    el.appendChild(sec);
    curSet.forEach(w => prev.add(w));
  });
}

function drawWC(kws, fixedW, fixedH) {
  const canvas = document.getElementById('wc-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = (fixedW || canvas.offsetWidth || 600) * dpr;
  const H = (fixedH || 320) * dpr;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f8f9fb'; ctx.fillRect(0, 0, W, H);
  if (!kws.length) return;
  const max = kws[0][1];
  const CLRS = ['#c9871f','#2b7fe8','#1aaa6e','#7c3fe4','#d44060','#f09840','#6080b0'];
  const placed = [];
  const fits = (x, y, w, h) => {
    for (const r of placed) if (x < r.x+r.w && x+w > r.x && y < r.y+r.h && y+h > r.y) return false;
    return x >= 4 && y >= 4 && x+w <= W-4 && y+h <= H-4;
  };
  for (const [word, cnt] of kws.slice(0, 50)) {
    const ratio = cnt / max;
    const fs = Math.round((12 + ratio * 36) * dpr);
    ctx.font = `700 ${fs}px 'Malgun Gothic',sans-serif`;
    const tw = ctx.measureText(word).width, th = fs * 1.3;
    for (let t = 0; t < 400; t++) {
      const x = Math.random()*(W-tw-8)+4, y = Math.random()*(H-th-8)+4+th;
      if (fits(x-2, y-th-2, tw+4, th+4)) {
        ctx.fillStyle = CLRS[Math.floor(Math.random()*CLRS.length)] + Math.floor(ratio*160+95).toString(16).padStart(2,'0');
        ctx.fillText(word, x, y);
        placed.push({ x:x-2, y:y-th-2, w:tw+4, h:th+4 });
        break;
      }
    }
  }
}
