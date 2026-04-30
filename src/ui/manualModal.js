// ════════════════════════════════════════
//  수동 매핑 모달 (PHASE 2-6)
// ════════════════════════════════════════
function openManualModal(defaultArea) {
  const ov = document.getElementById('manual-modal-ov');
  if (!ov) return;
  if (defaultArea) {
    const sel = document.getElementById('manual-area-sel');
    if (sel) sel.value = defaultArea;
  }
  document.getElementById('manual-textarea').value = '';
  ov.classList.add('open');
}

function closeManualModal() {
  const ov = document.getElementById('manual-modal-ov');
  if (ov) ov.classList.remove('open');
}

function applyManualMapping() {
  const area = document.getElementById('manual-area-sel').value;
  const raw  = (document.getElementById('manual-textarea').value || '').trim();
  if (!raw) { alert('내용을 입력해주세요.'); return; }
  if (!parsedData) { alert('먼저 PDF를 업로드해주세요.'); return; }

  // 문장 단위로 분리해 레코드 생성
  const sents = raw.split(/(?<=[가-힣a-zA-Z0-9\)])\.\s+|\n{2,}/).map(s => s.trim()).filter(s => s.length >= 8);
  if (!sents.length) { alert('유효한 문장을 찾지 못했습니다. 마침표(.)로 문장을 구분해주세요.'); return; }

  let added = 0;
  for (const s of sents) {
    const title   = mkTitle(s);
    if (!title || title.length < 3) continue;

    if (area === 'subject') {
      // 과목세특: "과목명: 내용" 패턴 우선 시도
      const sm = s.match(/^([가-힣A-Za-z\s·\d]{2,20}?)\s*[:：]\s*/);
      const subj = sm ? sm[1].trim() : '기타';
      const grp  = getGroup(subj) || '기타';
      if (!parsedData.subject[grp]) parsedData.subject[grp] = [];
      parsedData.subject[grp].push({
        title, summary: mkSummary(s, title), full: s,
        subject: subj, grade: '수동입력', area: 'subject',
        field: classField(s), page: 0, _manual: true,
      });
    } else if (area === 'behav') {
      parsedData.behav.push({
        title, summary: mkSummary(s, title), full: s,
        grade: '수동입력', area: 'behav', field: classField(s), page: 0, _manual: true,
      });
    } else {
      parsedData[area].push({
        title, summary: mkSummary(s, title), full: s,
        grade: '수동입력', area, field: classField(s), page: 0, _manual: true,
      });
    }
    added++;
  }

  if (added === 0) { alert('추가된 레코드가 없습니다. 내용을 확인해주세요.'); return; }

  // 화면 갱신
  renderAll(parsedData);
  if (typeof v6RunAnalysis === 'function' && parsedData) {
    v6Analysis = v6RunAnalysis(parsedData, '');
    const infoObj = {
      name:   (document.getElementById('sb-nm') || {}).textContent || '',
      school: (document.getElementById('sb-sc') || {}).textContent || '',
    };
    if (typeof renderDashboard === 'function') renderDashboard(v6Analysis, infoObj);
  }

  closeManualModal();

  // 성공 토스트
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1aaa6e;color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.18)';
  toast.textContent = `✚ ${added}건 수동 추가 완료`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
