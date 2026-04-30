// ════════════════════════════════════════
//  v13 — Dashboard Rendering
// ════════════════════════════════════════
function renderDashboard(analysis, info) {
  const body = document.getElementById('bd-dashboard');
  if (!analysis || !analysis.dashboard || !analysis.dashboard.totalRecords) {
    body.innerHTML = `<div class="empty"><div class="ei">📊</div><p>분석 데이터가 없습니다</p>
      <div style="margin-top:12px;padding:12px 16px;background:var(--sur2);border-radius:var(--r);text-align:left;font-size:12px;color:var(--tx2);line-height:2">
        <b>확인해 주세요</b><br>
        ① 업로드한 파일이 <b>학교생활기록부Ⅱ</b>인지 확인하세요<br>
        ② 스캔 이미지 PDF가 아닌 <b>텍스트 PDF</b>인지 확인하세요<br>
        ③ 파일에 <b>암호(잠금)</b>가 걸려 있지 않은지 확인하세요<br>
        ④ 정부24 또는 나이스에서 <b>직접 다운로드</b>한 파일인지 확인하세요
      </div></div>`;
    return;
  }
  const db = analysis.dashboard;
  const e = s => esc(String(s));

  let html = '';

  // 학생 유형 표시
  html += `<div style="margin-bottom:20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">`;
  html += `<span class="student-type-display">🎓 ${e(analysis.studentType?.label || '—')}</span>`;
  html += `<span style="font-size:14px;font-weight:700;color:var(--tx2)">${e(analysis.trend)}</span>`;
  html += `</div>`;

  // KPI 카드 그리드
  html += `<div class="dash-grid">`;
  html += `<div class="dash-card"><div class="dash-card-label">총 활동</div><div class="dash-card-value">${db.totalRecords}<span style="font-size:14px;font-weight:400">건</span></div></div>`;
  html += `<div class="dash-card"><div class="dash-card-label">탐구깊이 평균</div><div class="dash-card-value">${db.avgDepth}<span style="font-size:14px;font-weight:400">/10</span></div></div>`;
  html += `<div class="dash-card"><div class="dash-card-label">데이터 신뢰도</div><div class="dash-card-value" style="font-size:18px">${e(db.trustGrade)}</div></div>`;
  html += `<div class="dash-card"><div class="dash-card-label">객관적 기록 비율</div><div class="dash-card-value">${db.factRatio}<span style="font-size:14px;font-weight:400">%</span></div></div>`;
  html += `</div>`;
  // ── 지표 해석 안내 (오해 방지) ──
  html += `<div style="margin:-8px 0 20px;padding:8px 12px;background:var(--sur2);border-left:3px solid var(--gold);border-radius:var(--rs);font-size:11px;color:var(--tx3);line-height:1.7">
    ⚠️ <b>지표 해석 주의</b>: 탐구깊이·신뢰도는 <b>텍스트 통계적 특징 추출</b>이며 학생 역량의 우수성 평가가 아닙니다. 수치가 높더라도 입시 유리를 보장하지 않으며, 상담·세특 작성의 참고 자료로만 활용하세요.
  </div>`;

  // 학년별 / 영역별 분포
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">`;
  html += `<div class="dash-card"><div class="dash-card-label">학년별 활동 수</div>`;
  for (const [g, c] of Object.entries(db.gradeCount).sort()) {
    const pct = Math.round(c / db.totalRecords * 100);
    html += `<div style="display:flex;align-items:center;gap:8px;margin-top:8px"><span style="font-size:12px;font-weight:700;min-width:55px">${e(g)}</span><div style="flex:1;height:18px;background:var(--sur3);border-radius:9px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--gold);border-radius:9px;transition:width .5s"></div></div><span style="font-size:11px;font-weight:700;color:var(--tx2)">${c}건</span></div>`;
  }
  html += `</div>`;
  html += `<div class="dash-card"><div class="dash-card-label">영역별 활동 수</div>`;
  for (const [a, c] of Object.entries(db.areaCount).sort()) {
    const pct = Math.round(c / db.totalRecords * 100);
    html += `<div style="display:flex;align-items:center;gap:8px;margin-top:8px"><span style="font-size:12px;font-weight:700;min-width:65px">${e(a)}</span><div style="flex:1;height:18px;background:var(--sur3);border-radius:9px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--cs);border-radius:9px;transition:width .5s"></div></div><span style="font-size:11px;font-weight:700;color:var(--tx2)">${c}건</span></div>`;
  }
  html += `</div></div>`;

  // 학년별 탐구깊이 성장
  html += `<div class="dash-section"><div class="dash-section-title">📈 학년별 탐구깊이 성장</div>`;
  for (const [g, v] of Object.entries(analysis.growth).sort()) {
    const gl = v6ClassifyGrowthLevel(v.avg);
    const glName = V6_GROWTH_LEVELS[gl] || '';
    const barW = Math.round(v.avg / 10 * 100);
    html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">`;
    html += `<span style="font-size:13px;font-weight:700;min-width:55px">${e(g)}</span>`;
    html += `<div style="flex:1;height:24px;background:var(--sur3);border-radius:12px;overflow:hidden;position:relative"><div style="height:100%;width:${barW}%;background:linear-gradient(90deg,var(--gold),var(--cs));border-radius:12px;transition:width .6s"></div><span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:11px;font-weight:800;color:var(--tx)">${v.avg}/10</span></div>`;
    html += `<span class="growth-level-chip">Lv${gl} ${glName}</span>`;
    html += `<span style="font-size:11px;color:var(--tx3)">${v.count}건 · 최고 ${v.max}</span>`;
    html += `</div>`;
  }
  html += `</div>`;

  // 강점
  html += `<div class="dash-section"><div class="dash-section-title">💪 자동 탐지 강점 (상위 5개)</div><div class="dash-str-list">`;
  for (const s of analysis.strengths) {
    html += `<div class="dash-str-item"><div><div class="dash-str-name"><span class="str-badge">💪 ${e(s.name)}</span> <span class="dash-str-score">점수 ${s.score}</span></div>`;
    if (s.evidence?.length) html += `<div class="dash-str-evidence">${s.evidence.map(ev => e(ev)).join('<br>')}</div>`;
    html += `</div></div>`;
  }
  if (!analysis.strengths.length) html += `<div class="empty" style="padding:20px"><p>탐지된 강점 없음</p></div>`;
  html += `</div></div>`;

  // 리스크
  html += `<div class="dash-section"><div class="dash-section-title">⚠️ 자동 탐지 리스크 (우선순위 순)</div><div class="dash-risk-list">`;
  for (const r of analysis.risks) {
    const pc = r.priority === 1 ? 'p1' : r.priority === 2 ? 'p2' : 'p3';
    const pm = r.priority === 1 ? '🔴' : r.priority === 2 ? '🟡' : '🟢';
    html += `<div class="dash-risk-item"><div><div class="dash-risk-name"><span class="risk-badge ${pc}">${pm} ${e(r.name)}</span></div>`;
    html += `<div style="font-size:12px;color:var(--tx2);margin-top:4px">${e(r.desc)}</div>`;
    html += `<div style="font-size:12px;color:var(--cs);margin-top:4px;font-weight:600">→ ${e(r.fix)}</div>`;
    html += `</div></div>`;
  }
  if (!analysis.risks.length) html += `<div class="empty" style="padding:20px"><p>탐지된 리스크 없음</p></div>`;
  html += `</div></div>`;

  // 내신 성적 분석
  html += renderGradeScoreSection();

  body.innerHTML = html;
}
