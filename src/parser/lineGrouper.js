// ════════════════════════════════════════
//  groupTextByLine — 좌표 기반 줄 그룹핑 (PHASE 2-1)
// ════════════════════════════════════════
/**
 * pdf.js getTextContent() 결과를 Y좌표 기준으로 줄 단위로 그룹핑한다.
 * @param {Array} textItems  - page.getTextContent().items
 * @param {number} yTolerance - Y좌표 차이가 이 값 이하면 같은 줄로 처리 (기본 3)
 * @returns {Array} [{y, text, items}]  — Y 내림차순(상단→하단) 정렬
 */
function groupTextByLine(textItems, yTolerance = 3) {
  if (!textItems || textItems.length === 0) return [];

  // transform[4] = X, transform[5] = Y (pdf.js 좌표계: 좌하단 기준)
  const lines = [];

  for (const item of textItems) {
    const x = item.transform ? item.transform[4] : 0;
    const y = item.transform ? item.transform[5] : 0;
    const str = item.str || '';
    if (!str.trim()) continue; // 공백 전용 item 제외

    // 기존 줄 중 Y 차이가 yTolerance 이하인 줄 탐색
    let matched = null;
    for (const line of lines) {
      if (Math.abs(line.y - y) <= yTolerance) {
        matched = line;
        break;
      }
    }

    if (matched) {
      matched.items.push({ x, y, str });
    } else {
      lines.push({ y, items: [{ x, y, str }] });
    }
  }

  // 각 줄 내에서 X좌표 오름차순 정렬 후 텍스트 합치기
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.text = line.items.map(it => it.str).join('');
  }

  // Y 내림차순 정렬 (상단 → 하단: pdf.js Y축은 하단=0이므로 Y 큰 것이 위)
  lines.sort((a, b) => b.y - a.y);

  return lines;
}
