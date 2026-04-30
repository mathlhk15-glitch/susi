// ════════════════════════════════════════
//  parentView.js — 학부모용 화면 렌더러
//  학년별 탐구깊이 성장 + 자동 탐지 강점 + 교과별 내신 성적 분석
// ════════════════════════════════════════
(function () {
  'use strict';

  function _e(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _card(icon, title, color, bodyHtml) {
    return `
      <div style="background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r);
                  margin-bottom:24px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
        <div style="padding:14px 20px;background:var(--sur2);border-bottom:1px solid var(--bdr);
                    border-left:4px solid ${color};display:flex;align-items:center;gap:10px">
          <span style="font-size:22px">${icon}</span>
          <span style="font-weight:800;font-size:16px;color:var(--tx)">${_e(title)}</span>
        </div>
        <div style="padding:20px 20px">${bodyHtml}</div>
      </div>`;
  }

  window.renderParentView = function () {
    const body = document.getElementById('bd-parentview');
    if (!body) return;

    // 분석 데이터 없을 때
    if (typeof v6Analysis === 'undefined' || !v6Analysis || !v6Analysis.dashboard) {
      body.innerHTML = `
        <div class="empty">
          <div class="ei">👨‍👩‍👧</div>
          <p style="font-size:15px;font-weight:700;margin-bottom:8px">학부모용 화면</p>
          <p style="color:var(--tx3)">생기부 PDF를 업로드하면<br>학부모용 요약 화면이 표시됩니다.</p>
        </div>`;
      return;
    }

    const analysis = v6Analysis;
    const db = analysis.dashboard;
    const info = typeof parsedData !== 'undefined' && parsedData ? parsedData.info || {} : {};
    const studentName = (typeof document !== 'undefined' && document.getElementById('sb-nm')?.dataset?.raw) || info.name || '학생';

    let html = '';

    // ── 헤더 ──
    html += `
      <div style="margin-bottom:24px;padding:20px 24px;background:linear-gradient(135deg,var(--sur2) 0%,var(--sur) 100%);
                  border-radius:var(--r);border:1px solid var(--bdr)">
        <div style="font-size:12px;color:var(--tx3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">학부모용 화면</div>
        <div style="font-size:22px;font-weight:800;color:var(--tx)">
          ${_e(studentName)} 학생 생활기록부 요약
        </div>
        <div style="margin-top:8px;font-size:13px;color:var(--tx2)">
          총 활동 <b>${db.totalRecords}건</b> · 탐구깊이 평균 <b>${db.avgDepth}/10</b> · 데이터 신뢰도 <b>${_e(db.trustGrade)}</b>
        </div>
        <div style="margin-top:10px;font-size:11px;color:var(--tx3);padding:8px 12px;
                    background:var(--sur3);border-radius:var(--rs);line-height:1.7">
          ⚠️ 이 자료는 생활기록부 텍스트를 통계적으로 분석한 참고자료이며, 학생의 역량 평가나 입시 결과를 예측하지 않습니다.
        </div>
      </div>`;

    // ── ① 학년별 탐구깊이 성장 ──
    let growthHtml = '';
    if (analysis.growth && Object.keys(analysis.growth).length > 0) {
      for (const [g, v] of Object.entries(analysis.growth).sort()) {
        const barW = Math.round(v.avg / 10 * 100);
        const color = v.avg >= 7 ? '#1aaa6e' : v.avg >= 4 ? '#c9871f' : '#d44060';
        growthHtml += `
          <div style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-size:14px;font-weight:700;color:var(--tx)">${_e(g)}</span>
              <span style="font-size:13px;font-weight:800;color:${color}">${v.avg}/10점</span>
            </div>
            <div style="height:20px;background:var(--sur3);border-radius:10px;overflow:hidden;position:relative">
              <div style="height:100%;width:${barW}%;background:${color};border-radius:10px;transition:width .7s ease"></div>
            </div>
            <div style="margin-top:4px;font-size:11px;color:var(--tx3)">
              활동 ${v.count}건 · 최고 ${v.max}점 · 평균 ${v.avg}점
            </div>
          </div>`;
      }
      growthHtml += `
        <div style="margin-top:14px;padding:10px 14px;background:var(--sur2);border-radius:var(--rs);
                    font-size:12px;color:var(--tx3);line-height:1.7">
          📌 탐구깊이 점수는 기록의 구체성·논리적 연결성·어휘 수준을 종합한 지표입니다.<br>
          학년이 올라갈수록 점수가 높아지면 탐구의 깊이가 성장하고 있다는 신호입니다.
        </div>`;
    } else {
      growthHtml = '<div style="color:var(--tx3);font-size:13px;text-align:center;padding:20px">데이터가 없습니다.</div>';
    }
    html += _card('📈', '학년별 탐구깊이 성장', '#f39c12', growthHtml);

    // ── ② 자동 탐지 강점 ──
    let strengthHtml = '';
    if (analysis.strengths && analysis.strengths.length > 0) {
      strengthHtml += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">`;
      for (const s of analysis.strengths) {
        strengthHtml += `
          <div style="padding:14px 16px;background:var(--sur2);border:1px solid var(--bdr);
                      border-radius:var(--rs);border-left:3px solid #1aaa6e">
            <div style="font-size:14px;font-weight:800;color:var(--tx);margin-bottom:4px">
              💪 ${_e(s.name)}
            </div>
            <div style="font-size:12px;color:var(--tx3);margin-bottom:6px">강점 점수: ${s.score}</div>`;
        if (s.evidence && s.evidence.length > 0) {
          strengthHtml += `<div style="font-size:12px;color:var(--tx2);line-height:1.6">`;
          for (const ev of s.evidence.slice(0, 2)) {
            strengthHtml += `<div style="margin-bottom:3px">• ${_e(ev)}</div>`;
          }
          strengthHtml += `</div>`;
        }
        strengthHtml += `</div>`;
      }
      strengthHtml += `</div>`;
      strengthHtml += `
        <div style="margin-top:14px;padding:10px 14px;background:var(--sur2);border-radius:var(--rs);
                    font-size:12px;color:var(--tx3);line-height:1.7">
          📌 강점은 생활기록부 전체에서 반복적으로 등장하는 역량 키워드를 자동 추출한 결과입니다.<br>
          입시에서 어필할 수 있는 핵심 역량을 파악하는 데 활용하세요.
        </div>`;
    } else {
      strengthHtml = '<div style="color:var(--tx3);font-size:13px;text-align:center;padding:20px">탐지된 강점이 없습니다.</div>';
    }
    html += _card('💪', '자동 탐지 강점', '#1aaa6e', strengthHtml);

    // ── ③ 교과별 내신 성적 분석 ──
    let gradeHtml = '';
    const gradeData = (typeof gradeScoreData !== 'undefined' && gradeScoreData) ? gradeScoreData : 
                      ((typeof parsedData !== 'undefined' && parsedData) ? parsedData.grades : null);
    if (gradeData && gradeData.subjects && gradeData.subjects.length > 0) {
      // 교과별 평균 계산 (gradeScoreData: subj.group, subj.rank / 구형: subj.area, subj.grade)
      const byArea = {};
      for (const subj of gradeData.subjects) {
        const area = subj.group || subj.area || '기타';
        const rankVal = subj.rank || subj.grade;
        if (!byArea[area]) byArea[area] = { sum: 0, cnt: 0, min: 9 };
        if (rankVal && rankVal >= 1 && rankVal <= 9) {
          byArea[area].sum += rankVal;
          byArea[area].cnt++;
          if (rankVal < byArea[area].min) byArea[area].min = rankVal;
        }
      }

      const AREA_COLORS = { '국어': '#3498db', '수학': '#e74c3c', '영어': '#1aaa6e', '사회': '#f39c12', '과학': '#9b59b6', '기타': '#888' };

      gradeHtml += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:16px">`;
      for (const [area, d] of Object.entries(byArea)) {
        if (d.cnt === 0) continue;
        const avg = Math.round(d.sum / d.cnt * 10) / 10;
        const color = AREA_COLORS[area] || '#888';
        const pct = Math.round((9 - avg) / 8 * 100);
        gradeHtml += `
          <div style="padding:14px 16px;background:var(--sur2);border:1px solid var(--bdr);
                      border-radius:var(--rs);border-top:3px solid ${color}">
            <div style="font-size:14px;font-weight:800;color:var(--tx);margin-bottom:8px">${_e(area)}</div>
            <div style="font-size:22px;font-weight:900;color:${color};margin-bottom:4px">${avg}<span style="font-size:13px;font-weight:400">등급</span></div>
            <div style="height:6px;background:var(--sur3);border-radius:3px;overflow:hidden;margin-bottom:4px">
              <div style="height:100%;width:${pct}%;background:${color};border-radius:3px"></div>
            </div>
            <div style="font-size:11px;color:var(--tx3)">${d.cnt}과목 · 최고 ${d.min}등급</div>
          </div>`;
      }
      gradeHtml += `</div>`;

      // 전체 평균
      let totalSum = 0, totalCnt = 0;
      for (const d of Object.values(byArea)) { totalSum += d.sum; totalCnt += d.cnt; }
      const totalAvg = totalCnt ? Math.round(totalSum / totalCnt * 10) / 10 : '—';
      gradeHtml += `
        <div style="padding:14px 18px;background:var(--sur2);border:1px solid var(--bdr);
                    border-radius:var(--rs);display:flex;align-items:center;gap:16px;margin-bottom:12px">
          <div>
            <div style="font-size:12px;color:var(--tx3);margin-bottom:2px">전 교과 종합평균</div>
            <div style="font-size:26px;font-weight:900;color:var(--gold)">${totalAvg}<span style="font-size:14px;font-weight:400">등급</span></div>
          </div>
          <div style="flex:1;font-size:12px;color:var(--tx2);line-height:1.7">
            총 ${totalCnt}과목 분석<br>
            ※ 일반선택 과목 기준 (석차등급 1~9등급)
          </div>
        </div>
        <div style="padding:10px 14px;background:var(--sur2);border-radius:var(--rs);
                    font-size:12px;color:var(--tx3);line-height:1.7">
          📌 등급 숫자가 낮을수록 높은 성적입니다. (1등급 = 최상위 4%)
        </div>`;
    } else {
      gradeHtml = `
        <div style="color:var(--tx3);font-size:13px;text-align:center;padding:20px;line-height:1.8">
          성적 데이터가 없습니다.<br>
          <span style="font-size:12px">일반선택 과목(석차등급)이 포함된 생기부에서만 표시됩니다.</span>
        </div>`;
    }
    html += _card('📊', '교과별 내신 성적 분석', '#3498db', gradeHtml);

    body.innerHTML = html;
  };

})();
