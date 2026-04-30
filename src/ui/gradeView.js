// ════════════════════════════════════════
//  내신 성적 분석 렌더링
// ════════════════════════════════════════
function renderGradeScoreSection() {
  const e = s => esc(String(s));
  const d = gradeScoreData;

  let html = `<div class="dash-section">`;
  html += `<div class="dash-section-title">📋 교과별 내신 성적 분석</div>`;

  if (!d || !d.subjects || d.subjects.length === 0) {
    html += `<div style="padding:16px;text-align:center;color:var(--tx3);font-size:13px">성적 데이터를 파싱하지 못했습니다.<br><span style="font-size:11px">일반선택 과목(석차등급 1~9)이 있는 생기부에서만 표시됩니다.</span></div>`;
    html += `</div>`;
    return html;
  }

  const GROUPS = ['국어','수학','영어','사회','과학'];
  const GROUP_COLORS = {
    '국어': '#7c3fe4', '수학': '#2b7fe8', '영어': '#1aaa6e',
    '사회': '#c9871f', '과학': '#d44060'
  };

  function rankColor(avg) {
    if (avg == null) return '#8890aa';
    if (avg <= 3) return '#2b7fe8';
    if (avg <= 6) return '#f39c12';
    return '#e74c3c';
  }
  function rankBg(avg) {
    if (avg == null) return '#f4f5f7';
    if (avg <= 3) return '#eaf2fd';
    if (avg <= 6) return '#fef9ee';
    return '#fdeaee';
  }
  function rankLabel(avg) {
    if (avg == null) return '—';
    if (avg <= 1.5) return '최상위';
    if (avg <= 2.5) return '상위권';
    if (avg <= 3.5) return '상위중';
    if (avg <= 4.5) return '중상위';
    if (avg <= 5.5) return '중위권';
    if (avg <= 6.5) return '중하위';
    return '하위권';
  }
  // 특정 그룹 목록에 속한 과목만 가중평균
  function calcCombo(groups) {
    const list = d.subjects.filter(s => groups.includes(s.group));
    if (!list.length) return null;
    const tw = list.reduce((s, r) => s + r.credits, 0);
    if (!tw) return null;
    return Math.round(list.reduce((s, r) => s + r.credits * r.rank, 0) / tw * 100) / 100;
  }
  // 특정 그룹 목록 + 특정 학년에 속한 과목만 가중평균
  function calcComboGrade(groups, grade) {
    const list = d.subjects.filter(s => groups.includes(s.group) && s.grade === grade);
    if (!list.length) return null;
    const tw = list.reduce((s, r) => s + r.credits, 0);
    if (!tw) return null;
    return Math.round(list.reduce((s, r) => s + r.credits * r.rank, 0) / tw * 100) / 100;
  }

  // ══════════════════════════════════════
  // ① 교과별 요약 카드 (국어·수학·영어·사회·과학)
  // ══════════════════════════════════════
  html += `<div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;letter-spacing:0.3px">▸ 교과별 평균</div>`;
  html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">`;
  for (const grp of GROUPS) {
    const info = d.groupAvg[grp];
    const avg  = info?.avg ?? null;
    const cnt  = info?.list?.length || 0;
    const col  = GROUP_COLORS[grp] || '#8890aa';
    const rc   = rankColor(avg);
    const rb   = rankBg(avg);
    html += `<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r);padding:14px 12px;box-shadow:var(--shadow);border-top:3px solid ${col}">`;
    html += `<div style="font-size:11px;font-weight:700;color:${col};margin-bottom:6px;letter-spacing:0.5px">${e(grp)}</div>`;
    if (avg !== null) {
      html += `<div style="font-size:26px;font-weight:900;color:${rc};line-height:1">${avg.toFixed(2)}<span style="font-size:12px;font-weight:400;color:var(--tx3)"> 등급</span></div>`;
      html += `<div style="margin-top:6px;font-size:11px;font-weight:700;background:${rb};color:${rc};display:inline-block;padding:2px 8px;border-radius:10px">${rankLabel(avg)}</div>`;
      html += `<div style="margin-top:5px;font-size:10px;color:var(--tx3)">${cnt}과목 반영</div>`;
    } else {
      html += `<div style="font-size:20px;font-weight:700;color:var(--tx3)">—</div>`;
      html += `<div style="font-size:10px;color:var(--tx3);margin-top:4px">해당 과목 없음</div>`;
    }
    html += `</div>`;
  }
  html += `</div>`; // end 교과별 grid

  // ══════════════════════════════════════
  // ② 조합 평균 카드 (3교과 / 4교과(사회) / 4교과(과학) / 전교과)
  // ══════════════════════════════════════
  const COMBOS = [
    { label: '국·영·수 (3교과)', groups: ['국어','영어','수학'], color: '#5b6af0' },
    { label: '국·영·수·사 (4교과)', groups: ['국어','영어','수학','사회'], color: '#c9871f' },
    { label: '국·영·수·과 (4교과)', groups: ['국어','영어','수학','과학'], color: '#d44060' },
    { label: '전 교과', groups: ['국어','영어','수학','사회','과학'], color: '#c9871f', isTotal: true },
  ];

  html += `<div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;letter-spacing:0.3px">▸ 조합별 평균</div>`;
  html += `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px">`;
  for (const combo of COMBOS) {
    const avg = combo.isTotal ? d.totalAvg : calcCombo(combo.groups);
    const rc  = combo.isTotal ? combo.color : rankColor(avg);
    const rb  = combo.isTotal ? (avg !== null ? '#fdf3e3' : '#f4f5f7') : rankBg(avg);
    const borderCol = combo.isTotal ? 'var(--gold)' : combo.color;
    const bgStyle   = combo.isTotal ? 'background:var(--gold-bg);border:1px solid var(--gold-bdr)' : 'background:var(--sur);border:1px solid var(--bdr)';
    const cnt = combo.groups.reduce((s, g) => s + (d.groupAvg[g]?.list?.length || 0), 0);
    html += `<div style="${bgStyle};border-radius:var(--r);padding:14px 16px;box-shadow:var(--shadow);border-top:3px solid ${borderCol}">`;
    html += `<div style="font-size:11px;font-weight:700;color:${borderCol};margin-bottom:6px">${e(combo.label)}</div>`;
    if (avg !== null) {
      const avgColor = combo.isTotal ? combo.color : rankColor(avg);
      html += `<div style="font-size:28px;font-weight:900;color:${avgColor};line-height:1">${avg.toFixed(2)}<span style="font-size:12px;font-weight:400;color:var(--tx3)"> 등급</span></div>`;
      html += `<div style="margin-top:6px;font-size:11px;font-weight:700;background:${rb};color:${avgColor};display:inline-block;padding:2px 10px;border-radius:10px">${rankLabel(avg)}</div>`;
      html += `<div style="margin-top:5px;font-size:10px;color:var(--tx3)">${cnt}과목 반영</div>`;
    } else {
      html += `<div style="font-size:20px;font-weight:700;color:var(--tx3)">—</div>`;
    }
    html += `</div>`;
  }
  html += `</div>`; // end 조합 grid

  // ══════════════════════════════════════
  // ③ 학년별 성적 변화 — 분리형 꺾은선 그래프 (Canvas)
  // ══════════════════════════════════════
  const availGrades = [1,2,3].filter(g => d.subjects.some(s => s.grade === g));

  if (availGrades.length > 0) {
    const comboChartDefs = [];
    const subjectChartDefs = [];

    function hasAnyValue(dataObj) {
      return Object.values(dataObj).some(v => v !== null && v !== undefined);
    }
    function makeSeries(label, color, dataObj, dash=[]) {
      return [{
        label,
        color,
        dash,
        data: availGrades.map(g => dataObj[g] ?? null)
      }];
    }

    const comboDefs = [
      { label: '국·영·수', sub: '3교과 조합평균', groups: ['국어','영어','수학'], color: '#5b6af0', dash: [] },
      { label: '국·영·수·사', sub: '4교과 조합평균', groups: ['국어','영어','수학','사회'], color: '#e8a830', dash: [] },
      { label: '국·영·수·과', sub: '4교과 조합평균', groups: ['국어','영어','수학','과학'], color: '#d44060', dash: [] },
      { label: '전 교과', sub: '전체 반영 교과 평균', groups: ['국어','영어','수학','사회','과학'], color: '#c9871f', dash: [] },
    ];

    for (let i = 0; i < comboDefs.length; i++) {
      const def = comboDefs[i];
      const byGrade = {};
      for (const gr of availGrades) {
        byGrade[gr] = def.label === '전 교과' ? (d.gradeAvg[gr] ?? null) : calcComboGrade(def.groups, gr);
      }
      if (hasAnyValue(byGrade)) {
        comboChartDefs.push({
          id: `grade-combo-${i}-${Date.now()}`,
          title: def.label,
          sub: def.sub,
          color: def.color,
          series: makeSeries(def.label, def.color, byGrade, def.dash)
        });
      }
    }

    for (let i = 0; i < GROUPS.length; i++) {
      const grp = GROUPS[i];
      const byGrade = {};
      for (const gr of availGrades) byGrade[gr] = calcComboGrade([grp], gr);
      if (hasAnyValue(byGrade)) {
        subjectChartDefs.push({
          id: `grade-subject-${i}-${Date.now()}`,
          title: grp,
          sub: `${grp} 교과 평균`,
          color: GROUP_COLORS[grp] || '#8890aa',
          series: makeSeries(grp, GROUP_COLORS[grp] || '#8890aa', byGrade, [])
        });
      }
    }

    html += `<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r);padding:18px;margin-bottom:18px;box-shadow:var(--shadow)">`;
    html += `<div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:6px">📈 학년별 성적 변화 추이</div>`;
    html += `<div style="font-size:11px;color:var(--tx3);line-height:1.6;margin-bottom:16px">조합평균과 교과별 평균을 각각 독립 차트로 분리했습니다. 각 차트는 한 지표만 표시하므로 학년별 상승·하락 흐름을 바로 확인할 수 있습니다.</div>`;

    if (comboChartDefs.length) {
      html += `<div style="font-size:12px;font-weight:800;color:var(--tx2);margin:4px 0 10px">▸ 조합평균 변화</div>`;
      html += `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:18px">`;
      for (const ch of comboChartDefs) {
        html += `<div style="background:var(--sur2);border:1px solid var(--bdr);border-radius:var(--r);padding:14px;box-shadow:var(--shadow);border-top:3px solid ${ch.color}">`;
        html += `<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px"><span style="font-size:13px;font-weight:900;color:${ch.color}">${e(ch.title)}</span><span style="font-size:10px;color:var(--tx3)">${e(ch.sub)}</span></div>`;
        html += `<canvas id="${ch.id}" style="width:100%;height:230px;display:block"></canvas>`;
        html += `</div>`;
      }
      html += `</div>`;
    }

    if (subjectChartDefs.length) {
      html += `<div style="font-size:12px;font-weight:800;color:var(--tx2);margin:4px 0 10px">▸ 교과별 변화</div>`;
      html += `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">`;
      for (const ch of subjectChartDefs) {
        html += `<div style="background:var(--sur2);border:1px solid var(--bdr);border-radius:var(--r);padding:14px;box-shadow:var(--shadow);border-top:3px solid ${ch.color}">`;
        html += `<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px"><span style="font-size:13px;font-weight:900;color:${ch.color}">${e(ch.title)}</span><span style="font-size:10px;color:var(--tx3)">${e(ch.sub)}</span></div>`;
        html += `<canvas id="${ch.id}" style="width:100%;height:230px;display:block"></canvas>`;
        html += `</div>`;
      }
      html += `</div>`;
    }

    html += `<div style="font-size:10px;color:var(--tx3);margin-top:10px">※ Y축: 석차등급 (1등급이 위, 9등급이 아래) — 선이 올라갈수록 성적 향상</div>`;
    html += `</div>`;

    const chartData = JSON.stringify({
      grades: availGrades,
      charts: [...comboChartDefs, ...subjectChartDefs].map(ch => ({
        id: ch.id,
        series: ch.series
      }))
    });
    html += `<script data-grade-chart='${chartData.replace(/'/g,"&#39;")}' class="grade-chart-init"><\/script>`;
  }

  // ══════════════════════════════════════
  // ④ 과목별 상세 테이블
  // ══════════════════════════════════════
  html += `<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r);overflow:hidden;box-shadow:var(--shadow)">`;
  html += `<div style="padding:12px 16px;background:var(--sur3);border-bottom:1px solid var(--bdr);font-size:13px;font-weight:700;color:var(--tx)">과목별 상세 내역</div>`;
  html += `<table style="width:100%;border-collapse:collapse;font-size:12px">`;
  html += `<thead><tr style="background:var(--sur2)">`;
  html += `<th style="padding:8px 12px;text-align:left;font-weight:700;color:var(--tx2);border-bottom:1px solid var(--bdr)">교과</th>`;
  html += `<th style="padding:8px 12px;text-align:left;font-weight:700;color:var(--tx2);border-bottom:1px solid var(--bdr)">과목명</th>`;
  html += `<th style="padding:8px 6px;text-align:center;font-weight:700;color:var(--tx2);border-bottom:1px solid var(--bdr)">학년</th>`;
  html += `<th style="padding:8px 6px;text-align:center;font-weight:700;color:var(--tx2);border-bottom:1px solid var(--bdr)">학기</th>`;
  html += `<th style="padding:8px 6px;text-align:center;font-weight:700;color:var(--tx2);border-bottom:1px solid var(--bdr)">학점</th>`;
  html += `<th style="padding:8px 12px;text-align:center;font-weight:700;color:var(--tx2);border-bottom:1px solid var(--bdr)">석차등급</th>`;
  html += `</tr></thead><tbody>`;

  const groupOrder = ['국어','수학','영어','사회','과학','기타'];
  const sorted = [...d.subjects].sort((a, b) => {
    const ga = groupOrder.indexOf(a.group), gb = groupOrder.indexOf(b.group);
    if (ga !== gb) return ga - gb;
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.semester - b.semester;
  });

  let lastGroup = '';
  for (const row of sorted) {
    const isNewGroup = row.group !== lastGroup;
    if (isNewGroup) lastGroup = row.group;
    const rc  = rankColor(row.rank);
    const rb  = rankBg(row.rank);
    const col = GROUP_COLORS[row.group] || '#8890aa';
    html += `<tr style="border-bottom:1px solid var(--bdr)">`;
    html += `<td style="padding:8px 12px;color:${col};font-weight:700;font-size:11px">${isNewGroup ? e(row.group) : ''}</td>`;
    html += `<td style="padding:8px 12px;color:var(--tx);font-weight:500">${e(row.subject)}</td>`;
    html += `<td style="padding:8px 6px;text-align:center;color:var(--tx2)">${row.grade}</td>`;
    html += `<td style="padding:8px 6px;text-align:center;color:var(--tx2)">${row.semester}</td>`;
    html += `<td style="padding:8px 6px;text-align:center;color:var(--tx2)">${row.credits}</td>`;
    html += `<td style="padding:8px 12px;text-align:center"><span style="background:${rb};color:${rc};font-weight:800;font-size:13px;padding:3px 10px;border-radius:8px">${row.rank}등급</span></td>`;
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  html += `<div style="padding:10px 16px;font-size:10px;color:var(--tx3);background:var(--sur2);border-top:1px solid var(--bdr)">※ 석차등급이 있는 일반선택 과목만 집계됩니다. 진로선택·체예 과목은 제외됩니다.</div>`;
  html += `</div>`; // end table card

  html += `</div>`; // end dash-section
  return html;
}
