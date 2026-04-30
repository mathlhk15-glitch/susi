// ════════════════════════════════════════
//  학년별 성적 변화 — 꺾은선 그래프 엔진
// ════════════════════════════════════════
function drawGradeLineChart(canvasId, series, grades) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 620;
  const H   = 340;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // ── 유효 데이터만 추려 Y축 범위 자동 계산 ──
  const allVals = series.flatMap(s => s.data).filter(v => v !== null);
  if (!allVals.length) return;
  const dataMin = Math.min(...allVals);
  const dataMax = Math.max(...allVals);
  // 0.5 여유를 주되 1~9 범위 내로 clamp
  const yMin = Math.max(1,   Math.floor((dataMin - 0.7) * 2) / 2);
  const yMax = Math.min(9,   Math.ceil ((dataMax + 0.7) * 2) / 2);
  // 눈금: 0.5 단위로 생성
  const ticks = [];
  for (let t = yMin; t <= yMax + 0.001; t = Math.round((t + 0.5) * 100) / 100) ticks.push(t);

  // 여백 — 오른쪽에 계열 레이블 공간 확보
  const pad = { top: 20, right: 130, bottom: 40, left: 58 };
  const cW  = W - pad.left - pad.right;
  const cH  = H - pad.top  - pad.bottom;

  const toX = i   => pad.left + (grades.length < 2 ? cW / 2 : i / (grades.length - 1) * cW);
  const toY = val => pad.top  + (val - yMin) / (yMax - yMin) * cH;

  ctx.clearRect(0, 0, W, H);

  // ── 등급 구간 배경 ──
  const zoneBands = [
    { from: 1,   to: 3,   color: 'rgba(43,127,232,0.06)'  },
    { from: 3,   to: 6,   color: 'rgba(243,156,18,0.06)'  },
    { from: 6,   to: 9,   color: 'rgba(231,76,60,0.06)'   },
  ];
  for (const b of zoneBands) {
    const y1 = toY(Math.max(b.from, yMin));
    const y2 = toY(Math.min(b.to,   yMax));
    if (y2 > y1) {
      ctx.fillStyle = b.color;
      ctx.fillRect(pad.left, y1, cW, y2 - y1);
    }
  }

  // ── 그리드 + Y축 눈금 ──
  ctx.save();
  for (const t of ticks) {
    const y = toY(t);
    ctx.strokeStyle = Number.isInteger(t) ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.04)';
    ctx.lineWidth   = Number.isInteger(t) ? 1 : 0.7;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();

    if (Number.isInteger(t)) {
      ctx.fillStyle = '#8890aa';
      ctx.font      = '10px system-ui,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(t + '등급', pad.left - 7, y + 3.5);
    }
  }
  ctx.restore();

  // ── X축 레이블 ──
  ctx.fillStyle = '#4a5068';
  ctx.font      = 'bold 11px system-ui,sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < grades.length; i++) {
    ctx.fillText(grades[i] + '학년', toX(i), H - pad.bottom + 18);
  }

  // ── X축 수직선 ──
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 1;
  for (let i = 0; i < grades.length; i++) {
    ctx.beginPath(); ctx.moveTo(toX(i), pad.top); ctx.lineTo(toX(i), pad.top + cH); ctx.stroke();
  }
  ctx.restore();

  // ── 계열 그리기 ──
  // 마지막 포인트 Y값 수집 → 레이블 충돌 방지
  const labelSlots = []; // {y, text, color}

  for (const s of series) {
    const pts = s.data.map((v, i) => v !== null ? { x: toX(i), y: toY(v), v } : null);
    const validPts = pts.filter(Boolean);
    if (!validPts.length) continue;

    // 선 그리기
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    if (s.dash?.length) ctx.setLineDash(s.dash);
    ctx.beginPath();
    let started = false;
    for (const pt of pts) {
      if (!pt) { started = false; continue; }
      if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
      else            ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    ctx.restore();

    // 점 + 수치
    for (const pt of pts) {
      if (!pt) continue;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle   = s.color; ctx.fill();
      ctx.strokeStyle = '#fff';  ctx.lineWidth = 2; ctx.stroke();

      // 수치 레이블 (점 바로 위)
      ctx.fillStyle   = s.color;
      ctx.font        = 'bold 10.5px system-ui,sans-serif';
      ctx.textAlign   = 'center';
      const lbY = pt.y < pad.top + 16 ? pt.y + 16 : pt.y - 9;
      ctx.fillText(pt.v.toFixed(2), pt.x, lbY);
    }

    // 오른쪽 인라인 레이블용 슬롯 등록
    const last = validPts[validPts.length - 1];
    labelSlots.push({ y: last.y, text: s.label, color: s.color });
  }

  // ── 오른쪽 인라인 계열 레이블 (겹침 방지) ──
  const LH = 14; // 최소 줄 간격
  // y 기준 정렬
  labelSlots.sort((a, b) => a.y - b.y);
  // 겹침 밀어내기
  for (let i = 1; i < labelSlots.length; i++) {
    if (labelSlots[i].y - labelSlots[i-1].y < LH) {
      labelSlots[i].y = labelSlots[i-1].y + LH;
    }
  }
  ctx.font      = 'bold 10px system-ui,sans-serif';
  ctx.textAlign = 'left';
  for (const sl of labelSlots) {
    // 작은 원 마커
    ctx.beginPath();
    ctx.arc(pad.left + cW + 9, sl.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = sl.color; ctx.fill();
    ctx.fillStyle = sl.color;
    ctx.fillText(sl.text, pad.left + cW + 17, sl.y + 3.5);
  }

  // ── 외곽선 ──
  ctx.strokeStyle = 'rgba(0,0,0,0.09)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(pad.left, pad.top, cW, cH);
}

function initGradeCharts() {
  // 페이지에 삽입된 chart-init 스크립트 태그를 모두 찾아 실행
  document.querySelectorAll('script.grade-chart-init').forEach(el => {
    try {
      const cfg = JSON.parse(el.dataset.gradeChart.replace(/&#39;/g, "'"));
      if (Array.isArray(cfg.charts)) {
        cfg.charts.forEach(ch => drawGradeLineChart(ch.id, ch.series || [], cfg.grades));
        return;
      }
      // 이전 구조 호환
      const comboSeries   = cfg.series.filter(s => s.group === 'combo');
      const subjectSeries = cfg.series.filter(s => s.group === 'subject');
      drawGradeLineChart(cfg.comboId,   comboSeries,   cfg.grades);
      drawGradeLineChart(cfg.subjectId, subjectSeries, cfg.grades);
    } catch(err) { console.warn('grade chart init error', err); }
  });
}

function switchGradeTab(baseId, tab) {
  const comboPanel   = document.getElementById('panel-combo-'   + baseId);
  const subjectPanel = document.getElementById('panel-subj-'    + baseId);
  const comboBtn     = document.getElementById('tab-combo-'     + baseId);
  const subjBtn      = document.getElementById('tab-subj-'      + baseId);
  if (!comboPanel || !subjectPanel) return;

  const ON  = 'padding:5px 14px;border-radius:20px;border:1.5px solid #5b6af0;background:#5b6af0;color:#fff;font-size:12px;font-weight:700;cursor:pointer';
  const OFF = 'padding:5px 14px;border-radius:20px;border:1.5px solid var(--bdr2);background:var(--sur3);color:var(--tx2);font-size:12px;font-weight:700;cursor:pointer';

  if (tab === 'combo') {
    comboPanel.style.display   = '';
    subjectPanel.style.display = 'none';
    if (comboBtn)  comboBtn.style.cssText  = ON;
    if (subjBtn)   subjBtn.style.cssText   = OFF;
  } else {
    comboPanel.style.display   = 'none';
    subjectPanel.style.display = '';
    if (comboBtn)  comboBtn.style.cssText  = OFF;
    if (subjBtn)   subjBtn.style.cssText   = ON;
    // 교과별 탭은 처음 보일 때 그려야 크기를 정확히 잡음
    try {
      document.querySelectorAll('script.grade-chart-init').forEach(el => {
        const cfg = JSON.parse(el.dataset.gradeChart.replace(/&#39;/g, "'"));
        if (cfg.subjectId) drawGradeLineChart(cfg.subjectId, cfg.series.filter(s=>s.group==='subject'), cfg.grades);
      });
    } catch(e) {}
  }
}
