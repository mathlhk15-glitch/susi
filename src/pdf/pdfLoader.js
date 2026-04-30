// ════════════════════════════════════════
//  PDF Loading — High Quality
// ════════════════════════════════════════

// PDF.js Worker 경로 설정 (pdf.min.js 로드 직후 실행)
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'public/pdf.worker.min.js';
}

async function loadPdf(file) {
  // ── PDF.js 로드 확인 (로컬 전용, CDN 없음) ──
  if (!window.pdfjsLib) {
    throw new Error('PDF.js를 로드할 수 없습니다.\nPDF.js 초기화에 실패했습니다. 브라우저를 새로고침 후 다시 시도해주세요.');
  }
  // workerSrc 재확인
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'public/pdf.worker.min.js';
  }

  // ── 단계 1: PDF 읽기 ──
  setP(5, '📄 PDF 읽는 중...');
  const ab = await file.arrayBuffer();
  // ── PDF 로드 ──
  pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
  totalPages = pdfDoc.numPages;

  const lines = [];          // 기존 호환: { text, page, items }
  const coordLines = [];     // 신규: groupTextByLine() 결과 페이지별 배열
  let totalTextChars = 0;

  // ── 단계 2: 페이지별 텍스트 추출 ──
  for (let p = 1; p <= totalPages; p++) {
    const pct = Math.round(5 + (p / totalPages) * 55); // 5~60%
    setP(pct, `📄 PDF 읽는 중... (${p}/${totalPages})`);

    const page = await pdfDoc.getPage(p);
    const ct = await page.getTextContent();

    // ── 좌표 기반 줄 그룹핑 (groupTextByLine 활용) ──
    const pageCoordLines = groupTextByLine(ct.items, 3);
    coordLines.push({ page: p, lines: pageCoordLines });

    // ── 기존 호환 lines 배열 병행 생성 ──
    const rowMap = {};
    for (const it of ct.items) {
      const y = Math.round(it.transform[5]);
      if (!rowMap[y]) rowMap[y] = [];
      rowMap[y].push({ x: it.transform[4], text: it.str, w: it.width, h: it.height, tx: it.transform });
      totalTextChars += (it.str || '').length;
    }
    const sortedY = Object.keys(rowMap).map(Number).sort((a, b) => b - a);
    for (const y of sortedY) {
      const items = rowMap[y].sort((a, b) => a.x - b.x);
      const txt = items.map(i => i.text).join('').trim();
      if (txt) lines.push({ text: txt, page: p, items });
    }
  }

  // ── 단계 3: 텍스트 구조 분석 ──
  setP(65, '🔍 텍스트 구조 분석 중...');
  await new Promise(r => setTimeout(r, 0)); // UI 업데이트 허용

  // 좌표 기반 결과를 전역 보존 (이후 파서에서 활용)
  window._coordLines = coordLines;

  // ── 단계 4: 결과 생성 ──
  setP(75, '📊 결과 생성 중...');
  await new Promise(r => setTimeout(r, 0));

  // OCR 안 된 PDF 감지
  if (totalTextChars < 200) {
    setP(80, '이미지 스캔 PDF 감지 — 페이지 렌더링 후 안내 제공...');
    window._isScannedPdf = true;
    lines.push({ text: '__SCANNED_PDF__', page: 1, items: [] });
  } else {
    window._isScannedPdf = false;
  }

  return lines;
}
