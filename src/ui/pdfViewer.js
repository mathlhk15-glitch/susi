// ════════════════════════════════════════
//  PDF Viewer — High Quality
// ════════════════════════════════════════
let _act = null;

async function openModal(act) {
  _act = act;
  currentAct = act;
  currentHLs = [];
  selTxt = '';

  document.getElementById('modal-title').textContent = act.title;
  document.getElementById('memo-ta').value = '';
  document.getElementById('cap-btn').classList.remove('rdy');
  document.getElementById('txt-search').value = '';
  document.getElementById('search-cnt').textContent = '';

  // 기존 메모 복원
  const ex = memos.find(m => m.title === act.title);
  if (ex) {
    document.getElementById('memo-ta').value = ex.memo || '';
    currentHLs = [...(ex.highlights || [])];
  }

  renderHLList();

  // 원문 텍스트 세팅 (더 긴 컨텍스트)
  const fullText = getWiderContext(act);
  renderOrigText(fullText, act);

  document.getElementById('modal-ov').classList.add('open');

  // PDF 고화질 렌더링
  if (pdfDoc && act.page) {
    currentPage = act.page;
    await renderPdfPage(act);
  } else {
    document.getElementById('pdf-scroll').innerHTML =
      '<div style="padding:20px;color:var(--tx3);font-size:13px;text-align:center">PDF를 로드할 수 없습니다</div>';
  }
}

// 해당 탐구 내용에서 정확히 3문장만 발췌
function getWiderContext(act) {
  const src = act.full || act.summary || '';
  if (!src) return '';

  // 마침표 기준으로 문장 분리
  const sentences = src
    .split(/(?<=[가-힣a-zA-Z0-9])\.\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 8);

  if (sentences.length === 0) return src.slice(0, 300);

  // 탐구 핵심 동사가 있는 문장을 우선 선택
  const KEYWD = /탐구|조사|분석|연구|실험|발표|결과|발견|규명|도출|추론|이해|파악|설명|비교|적용/;
  const keyIdx = sentences.findIndex(s => KEYWD.test(s));

  // 핵심 문장 기준으로 앞뒤 포함해 최대 3문장
  let picks = [];
  if (keyIdx >= 0) {
    const start = Math.max(0, keyIdx - 1);
    picks = sentences.slice(start, start + 3);
  } else {
    picks = sentences.slice(0, 3);
  }

  return picks.join(' ').trim();
}

// ─── PDF 페이지 고화질 렌더 ───
async function renderPdfPage(act) {
  const scroll = document.getElementById('pdf-scroll');
  scroll.innerHTML = '<div style="padding:20px;color:#666;font-size:13px;text-align:center">렌더링 중...</div>';

  try {
    const page = await pdfDoc.getPage(currentPage);
    const vp0 = page.getViewport({ scale: 1 });
    const containerW = scroll.clientWidth - 32;
    pdfFitScale = containerW / vp0.width;
    if (pdfScale === 1.0) pdfScale = pdfFitScale * 1.25;

    await _renderPdfCanvas(scroll, page, pdfScale, act);
    updatePdfUI();
  } catch(e) {
    scroll.innerHTML = `<div style="padding:20px;color:#dc2626">PDF 렌더링 오류: ${e.message}</div>`;
  }
}

async function _renderPdfCanvas(scroll, page, scale, act) {
  scroll.innerHTML = '';
  const dpr = Math.min(window.devicePixelRatio || 1, 3); // 최대 3x
  const vp = page.getViewport({ scale: scale * dpr });

  const wrap = document.createElement('div');
  wrap.className = 'pdf-page-wrap';
  wrap.style.position = 'relative';

  const canvas = document.createElement('canvas');
  canvas.className = 'pdf-canvas';

  // 고화질: canvas 실제 크기는 dpr배, CSS 크기는 원래 크기
  canvas.width = vp.width;
  canvas.height = vp.height;
  canvas.style.width = (vp.width / dpr) + 'px';
  canvas.style.height = (vp.height / dpr) + 'px';

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  wrap.appendChild(canvas);

  // 관련 텍스트 하이라이트 오버레이
  if (act) {
    const tc = await page.getTextContent();
    await drawPdfHighlight(wrap, tc, vp, dpr, act);
  }

  scroll.appendChild(wrap);
}

// PDF 위에 하이라이트 그리기
async function drawPdfHighlight(wrap, textContent, vp, dpr, act) {
  const overlay = document.createElement('div');
  overlay.className = 'pdf-hl-overlay';
  overlay.style.cssText = `
    position: absolute; top: 0; left: 0;
    width: ${vp.width/dpr}px; height: ${vp.height/dpr}px;
    pointer-events: none;
  `;

  // 키워드 추출 (탐구 제목 + 요약의 핵심 단어)
  const srcText = (act.title + ' ' + act.full).replace(/[^가-힣a-zA-Z0-9\s]/g, ' ');
  const keywords = srcText.split(/\s+/)
    .filter(w => w.length >= 2 && !STOP.has(w))
    .slice(0, 12);

  for (const item of textContent.items) {
    if (!item.str.trim()) continue;
    const matched = keywords.some(kw => item.str.includes(kw));
    if (!matched) continue;

    // PDF 좌표 → CSS 픽셀 (DPR 고려)
    const tx = item.transform;
    const x = tx[4] * (vp.scale / dpr);
    const y_pdf = tx[5];
    const h = (item.height || 12) * (vp.scale / dpr);
    const w = (item.width || item.str.length * 8) * (vp.scale / dpr);
    // PDF 좌표는 아래서 위 → CSS는 위에서 아래
    const y_css = (vp.height / dpr) - y_pdf * (vp.scale / dpr) - h;

    const rect = document.createElement('div');
    rect.className = 'pdf-hl-rect';
    rect.style.cssText = `left:${x}px;top:${y_css}px;width:${w}px;height:${h}px`;
    overlay.appendChild(rect);
  }

  wrap.appendChild(overlay);
}

function updatePdfUI() {
  document.getElementById('pdf-scale-lbl').textContent = Math.round(pdfScale / pdfFitScale * 100) + '%';
  document.getElementById('pdf-pg-lbl').textContent = `${currentPage} / ${totalPages}`;
}

async function pdfZoom(delta) {
  pdfScale = Math.max(pdfFitScale * 0.5, Math.min(pdfFitScale * 8, pdfScale + delta * pdfFitScale));
  const page = await pdfDoc.getPage(currentPage);
  await _renderPdfCanvas(document.getElementById('pdf-scroll'), page, pdfScale, _act);
  updatePdfUI();
}

async function pdfFit() {
  pdfScale = pdfFitScale;
  const page = await pdfDoc.getPage(currentPage);
  await _renderPdfCanvas(document.getElementById('pdf-scroll'), page, pdfScale, _act);
  updatePdfUI();
}

async function pdfPrev() {
  if (currentPage > 1) { currentPage--; const p = await pdfDoc.getPage(currentPage); await _renderPdfCanvas(document.getElementById('pdf-scroll'), p, pdfScale, _act); updatePdfUI(); }
}

async function pdfNext() {
  if (currentPage < totalPages) { currentPage++; const p = await pdfDoc.getPage(currentPage); await _renderPdfCanvas(document.getElementById('pdf-scroll'), p, pdfScale, _act); updatePdfUI(); }
}
