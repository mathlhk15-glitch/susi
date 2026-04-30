// ════════════════════════════════════════
//  Highlight
// ════════════════════════════════════════
function onSel() {
  const sel = window.getSelection();
  if (sel && sel.toString().trim().length > 2) {
    selTxt = sel.toString().trim();
    document.getElementById('cap-btn').classList.add('rdy');
  }
}

function captureHL() {
  if (!selTxt) { alert('왼쪽 원문에서 중요 구절을 드래그하여 선택하세요!'); return; }
  if (!currentHLs.includes(selTxt)) currentHLs.push(selTxt);
  selTxt = '';
  window.getSelection()?.removeAllRanges();
  document.getElementById('cap-btn').classList.remove('rdy');
  renderHLList();
  const el = document.getElementById('orig-txt');
  applyHLToText(el, currentHLs);
}

function renderHLList() {
  const list = document.getElementById('hl-list');
  if (!currentHLs.length) { list.innerHTML = '<div style="font-size:12px;color:var(--tx3);padding:6px 4px">아직 없습니다</div>'; return; }
  list.innerHTML = '';
  currentHLs.forEach((h, i) => {
    const el = document.createElement('div'); el.className = 'hl-it';
    el.innerHTML = `<div class="hl-it-txt">"${esc(h)}"</div><div class="hl-it-del" onclick="rmHL(${i})">✕</div>`;
    list.appendChild(el);
  });
}

function rmHL(i) {
  currentHLs.splice(i, 1);
  renderHLList();
  const el = document.getElementById('orig-txt');
  applyHLToText(el, currentHLs);
}
