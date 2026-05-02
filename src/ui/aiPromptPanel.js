// ════════════════════════════════════════
//  v13 — AI Prompt Panel Rendering
// ════════════════════════════════════════
function renderAIPrompt(parsedData, info, analysis) {
  const body = document.getElementById('bd-aiprompt');

  let html = `<div class="prompt-panel">`;

  html += `<div class="prompt-header">`;
  html += `<div class="prompt-title">🤖 Claude/GPT 분석 프롬프트 생성기</div>`;
  html += `<div class="prompt-actions">
  <button class="btn-copy-prompt" onclick="copyPromptToClipboard()">📋 복사 → GPT/Claude에 붙여넣기</button>
  <button onclick="togglePromptExample()" id="prompt-example-btn" style="margin-left:8px;padding:5px 12px;background:var(--sur3);border:1px solid var(--bdr2);border-radius:var(--rs);font-size:11px;color:var(--tx2);cursor:pointer;font-weight:700">💡 출력 예시 보기</button>
  <div id="prompt-example-box" style="display:none;margin-top:10px;padding:10px 14px;background:var(--sur2);border:1px solid var(--bdr);border-radius:var(--r);font-size:11px;color:var(--tx2);line-height:1.8">
    ① [강점] 수학적 모델링 능력 (3학년 물리 세특 근거)<br>
    ② [리스크] 3학년 진로활동 기록이 1학년 대비 감소<br>
    ③ [대학별] 서울대형: 탐구 과정의 논리 흐름 보완 필요
  </div>
</div>`;
  html += `</div>`;

  // ── 자주 가는 대학 빠른선택 ──
  html += `<div style="margin-bottom:14px">`;
  html += `<div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:6px">🏫 자주 가는 대학 빠른선택</div>`;
  html += `<div style="display:flex;flex-wrap:wrap;gap:6px">`;
  const QUICK_UNIS = ['창원대','부산대','경상국립대','경북대','충남대','부경대'];
  for (const u of QUICK_UNIS) {
    html += `<button onclick="(function(){var sel=document.getElementById('prompt-uni-select');if(sel){sel.value=${JSON.stringify(u)};if(!sel.querySelector('option[value=&quot;'+${JSON.stringify(u)}+'&quot;]')){var o=document.createElement('option');o.value=${JSON.stringify(u)};o.textContent=${JSON.stringify(u)};sel.appendChild(o);}sel.value=${JSON.stringify(u)};onPromptUniChange();}})()"
      style="padding:5px 12px;background:var(--sur2);border:1px solid var(--bdr2);border-radius:16px;
             font-size:12px;font-weight:700;color:var(--tx2);cursor:pointer;transition:all .15s"
      onmouseenter="this.style.background='var(--cs-bg)';this.style.borderColor='var(--cs)';this.style.color='var(--cs)'"
      onmouseleave="this.style.background='var(--sur2)';this.style.borderColor='var(--bdr2)';this.style.color='var(--tx2)'"
      >${u}</button>`;
  }
  html += `</div></div>`;

  // ── 대학 선택 (프롬프트 15번 섹션 연동) ──
  html += `<div style="margin-bottom:14px;padding:14px 18px;background:var(--sur2);border:1px solid var(--bdr);border-radius:var(--r)">`;
  html += `<div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:10px;display:flex;align-items:center;gap:6px">
    🏫 대학별 맞춤 분석 (선택 시 프롬프트에 반영)
  </div>`;

  // 대학 선택 드롭다운
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">`;
  html += `<div>`;
  html += `<label style="font-size:11px;font-weight:700;color:var(--tx3);display:block;margin-bottom:4px">대학 선택(미선택시 부산대학교로 임의 지정)</label>`;
  html += `<select id="prompt-uni-select" onchange="onPromptUniChange()" style="width:100%;padding:8px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12px;background:var(--sur);color:var(--tx);outline:none;cursor:pointer">`;
  html += `<option value="">— 선택 안 함 —</option>`;

  // 업로드된 대학자료에서 대학 목록 추출
  const savedMats = (typeof getSavedUniMaterials === 'function') ? getSavedUniMaterials() : [];
  const uniNames = [...new Set(savedMats.filter(m => m.universityName).map(m => m.universityName))];
  for (const u of uniNames) {
    html += `<option value="${u.replace(/"/g,'&quot;')}">${u.replace(/</g,'&lt;')}</option>`;
  }
  html += `</select>`;
  html += `</div>`;

  // 학과 입력
  html += `<div>`;
  html += `<label style="font-size:11px;font-weight:700;color:var(--tx3);display:block;margin-bottom:4px">희망 학과 (프롬프트에 반영)</label>`;
  html += `<input type="text" id="prompt-uni-dept" placeholder="예: 기계공학과, 신소재공학과" oninput="updatePromptPreview()" style="width:100%;padding:8px 10px;border:1.5px solid var(--bdr);border-radius:6px;font-size:12px;background:var(--sur);color:var(--tx);outline:none;box-sizing:border-box">`;
  html += `</div>`;
  html += `</div>`;

  // 자료 유형 선택 (대학 선택 시에만 표시)
  html += `<div id="prompt-uni-doctype-wrap" style="display:none;margin-top:8px">`;
  html += `<label style="font-size:11px;font-weight:700;color:var(--tx3);display:block;margin-bottom:6px">참고 자료 선택</label>`;
  html += `<div style="display:flex;gap:8px;flex-wrap:wrap">`;
  html += `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;padding:6px 12px;background:var(--sur);border:1.5px solid var(--bdr);border-radius:6px;font-size:12px;font-weight:600;color:var(--tx2)" id="lbl-prompt-doctype-seonhaeng">
    <input type="radio" name="prompt-uni-doctype" value="선행학습영향평가보고서" style="accent-color:#3498db" checked onchange="updatePromptPreview()"> 📋 선행학습평가계획
  </label>`;
  html += `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;padding:6px 12px;background:var(--sur);border:1.5px solid var(--bdr);border-radius:6px;font-size:12px;font-weight:600;color:var(--tx2)" id="lbl-prompt-doctype-daeip">
    <input type="radio" name="prompt-uni-doctype" value="2028대입시행계획" style="accent-color:#9b59b6" onchange="updatePromptPreview()"> 📖 2028대입시행계획
  </label>`;
  html += `</div>`;
  html += `</div>`;

  html += `<div id="prompt-uni-status" style="margin-top:8px;font-size:11px;color:var(--tx3)"></div>`;
  html += `</div>`;

  html += `<div class="prompt-note">`;
  html += `📌 <b>사용 방법 안내</b><br>`;
  html += `1️⃣ 희망 분야를 입력합니다.<br>`;
  html += `2️⃣ <b>'복사 → GPT/Claude에 붙여넣기'</b> 버튼을 클릭합니다.<br>`;
  html += `3️⃣ GPT 또는 Claude를 실행하여 <b>붙여넣기</b>합니다. <b>HTML 문서 생성을 원하면 Claude 사용을 권장합니다.</b><br>`;
  html += `4️⃣ 그대로 실행하면 <b>입시 분석 보고서</b>가 생성됩니다.<br><br>`;
  html += `⚠️ 출력 형식 질문이 나오면 반드시 <b>[A] 텍스트</b> 또는 <b>[B] HTML</b>을 입력하세요.<br>`;
  html += `<span style="font-size:11px;color:#888">※ Claude 사용 시 가장 안정적인 결과가 출력됩니다.</span>`;
  html += `</div>`;
html += `<div class="prompt-output" id="prompt-output"></div>`;

  // ── 대학자료 평가요소 반영 문장 섹션 ──
  html += `
    <div id="uni-addon-section" style="margin-top:20px;border-top:1px solid var(--bdr);padding-top:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">🏫</span>
          <span style="font-weight:800;font-size:14px;color:var(--tx)">대학자료 평가요소 반영 문장</span>
          <span style="font-size:11px;color:var(--tx3);font-weight:400">(AI 프롬프트에 이어 붙여넣기용)</span>
        </div>
        <button id="uni-addon-copy-btn"
                onclick="copyUniAddonToClipboard()"
                style="display:none;padding:6px 14px;background:#9b59b622;border:1px solid #9b59b644;
                       border-radius:var(--rs);font-size:12px;font-weight:700;color:#9b59b6;cursor:pointer">
          📋 복사
        </button>
      </div>
      <div id="uni-addon-body"></div>
    </div>`;

html += `</div>`;

body.innerHTML = html;

setTimeout(() => updatePromptPreview(), 100);
}

function togglePromptExample() {
  const box = document.getElementById('prompt-example-box');
  const btn = document.getElementById('prompt-example-btn');
  if (!box) return;
  const visible = box.style.display !== 'none';
  box.style.display = visible ? 'none' : 'block';
  if (btn) btn.textContent = visible ? '💡 출력 예시 보기' : '💡 예시 닫기';
}

function onPromptUniChange() {
  const sel = document.getElementById('prompt-uni-select');
  const doctypeWrap = document.getElementById('prompt-uni-doctype-wrap');
  const statusEl = document.getElementById('prompt-uni-status');
  if (!sel) return;

  const uniName = sel.value;
  if (doctypeWrap) doctypeWrap.style.display = uniName ? 'block' : 'none';

  // 선택된 대학에 해당하는 자료 매칭 상태 표시
  if (statusEl) {
    if (!uniName) {
      statusEl.textContent = '';
    } else {
      const savedMats = (typeof getSavedUniMaterials === 'function') ? getSavedUniMaterials() : [];
      const matched = savedMats.filter(m => m.universityName === uniName);
      statusEl.innerHTML = matched.length
        ? `✅ ${uniName} 자료 ${matched.length}건 연동됨`
        : `⚠️ ${uniName} 업로드 자료 없음 — 대학자료 탭에서 PDF를 먼저 업로드하세요`;
    }
  }

  updatePromptPreview();
}

function updatePromptPreview() {
  const deptInput = document.getElementById('prompt-uni-dept');
  const output = document.getElementById('prompt-output');
  if (!output || !parsedData || !v6Analysis) return;

  const hopeText = deptInput?.value || '';
  // 희망학과가 바뀌면 분석도 일부 재실행
  const analysis = hopeText ? {
    ...v6Analysis,
    studentType: v6EstimateStudentType(v6Analysis.allRecords, hopeText),
    univFrames: v6BuildUnivFrameAnalysis(v6Analysis.allRecords, v6Analysis.strengths, v6Analysis.risks, hopeText, v6Analysis.growth),
  } : v6Analysis;

  const rawInfo = _getPrivacyInfo();
  const maskName = document.getElementById('print-mask-name')?.checked || false;
  const maskSchool = document.getElementById('print-mask-school')?.checked || false;
  const info = {
    name: maskName ? _makeMaskedName(rawInfo.name) : (rawInfo.name || '—'),
    school: maskSchool ? _makeMaskedSchool(rawInfo.school) : (rawInfo.school || '—'),
  };

  // ── 대학 선택 옵션 수집 ──
  const uniSelect = document.getElementById('prompt-uni-select');
  const uniDept = document.getElementById('prompt-uni-dept');
  const docTypeRadio = document.querySelector('input[name="prompt-uni-doctype"]:checked');
  const selectedUniName = uniSelect?.value || '';

  let uniOptions = null;
  if (selectedUniName) {
    // 선택된 대학에 매칭되는 저장 자료 찾기
    const savedMats = (typeof getSavedUniMaterials === 'function') ? getSavedUniMaterials() : [];
    const matchedMat = savedMats.find(m => m.universityName === selectedUniName) || null;

    // 선택된 자료를 window에도 반영 (대학자료 섹션 렌더링용)
    if (matchedMat) {
      window.currentUniMaterial = matchedMat;
      if (typeof compareStudentWithUniMaterial === 'function') {
        window.currentUniMaterialComparison = compareStudentWithUniMaterial(
          matchedMat,
          typeof parsedData !== 'undefined' ? parsedData : null,
          typeof v6Analysis !== 'undefined' ? v6Analysis : null,
          typeof takenSubjects !== 'undefined' ? takenSubjects : null
        );
      }
    }

    uniOptions = {
      universityName: selectedUniName,
      departmentName: uniDept?.value || '',
      docType: docTypeRadio?.value || '',
      material: matchedMat,
    };
  }

  const prompt = v6BuildPromptForClaude(parsedData, info, analysis, hopeText, uniOptions);
  output.textContent = prompt;

  // 대학자료 섹션도 함께 갱신
  updateUniAddonSection();
}

function copyPromptToClipboard() {
  const output  = document.getElementById('prompt-output');
  if (!output || !output.textContent) return;

  // ── 옵션 C: 대학자료 추가문 자동 합치기 ──────────────────────────────────
  const uniAddonEl = document.getElementById('uni-addon-text');
  const mainPrompt = output.textContent;
  const uniAddon   = uniAddonEl?.value?.trim() || '';
  const combined   = uniAddon
    ? mainPrompt + '\n\n' + uniAddon
    : mainPrompt;
  const hasUni     = !!uniAddon;
  // ── 합치기 끝 ──────────────────────────────────────────────────────────────

  const successMsg = hasUni
    ? '✅ 프롬프트 + 대학자료가 함께 복사되었습니다! Claude에 붙여넣기 하세요.'
    : '✅ 프롬프트가 클립보드에 복사되었습니다! Claude에 붙여넣기 하세요.';

  navigator.clipboard.writeText(combined).then(() => {
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = successMsg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = combined;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = hasUni ? '✅ 프롬프트 + 대학자료 복사 완료!' : '✅ 프롬프트가 복사되었습니다!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  });
}

// ════════════════════════════════════════
//  대학자료 평가요소 반영 문장 섹션 렌더링
//  window.currentUniMaterialComparison / window.currentUniMaterial 참조
// ════════════════════════════════════════

function updateUniAddonSection() {
  const body    = document.getElementById('uni-addon-body');
  const copyBtn = document.getElementById('uni-addon-copy-btn');
  if (!body) return;

  const comparison = window.currentUniMaterialComparison || null;
  const material   = window.currentUniMaterial   || null;

  // ── 대학자료 없는 경우 ──
  if (!comparison && !material) {
    body.innerHTML = `
      <div style="padding:14px 18px;background:var(--sur2);border:1px solid var(--bdr);
                  border-radius:var(--rs);font-size:13px;color:var(--tx3);line-height:1.8">
        📂 대학자료 분석 탭에서 대학자료를 선택하거나 업로드하면,
        이곳에 대학 평가요소 반영 문장이 추가됩니다.
      </div>`;
    if (copyBtn) copyBtn.style.display = 'none';
    return;
  }

  // ── 대학자료 메타 정보 수집 ──
  const src = material || comparison;
  const uniName   = src.universityName  || '';
  const deptName  = src.departmentName  || '';
  const admType   = src.admissionType   || '';
  const evalElems = (
    (material && material.evaluationElements) ||
    (comparison && comparison.evaluationElements) || []
  );
  const recSubjs  = (
    (material && material.recommendedSubjects) ||
    (comparison && comparison.recommendedSubjects) || []
  );

  // ── promptAddon 텍스트 (이미 buildUniPromptAddon이 만들어둔 것) ──
  const addonText = (comparison && comparison.promptAddon) || '';

  // ── 강점·보완 분석 관점 ──
  const strengths  = (comparison && comparison.strengths)  || [];
  const weaknesses = (comparison && comparison.weaknesses) || [];
  const missing    = (comparison && comparison.missingKeywords) || [];
  const matched    = (comparison && comparison.matchedKeywords)  || [];

  // ── 화면 렌더링 ──
  let html = '';

  // 메타 정보 칩
  const chips = [uniName, deptName, admType].filter(Boolean);
  if (chips.length) {
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">`;
    for (const c of chips) {
      html += `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;
                            font-weight:700;background:var(--cs-bg);color:var(--cs);
                            border:1px solid #c3daf8">${_esc(c)}</span>`;
    }
    html += `</div>`;
  }

  // 평가요소 뱃지
  if (evalElems.length) {
    html += `<div style="margin-bottom:10px">
      <span style="font-size:12px;font-weight:700;color:var(--tx3);margin-right:6px">평가요소</span>`;
    for (const e of evalElems) {
      html += `<span style="display:inline-block;padding:2px 9px;margin:2px 3px 2px 0;
                            border-radius:20px;font-size:12px;font-weight:600;
                            background:var(--cs-bg);color:var(--cs);border:1px solid #c3daf8">${_esc(e)}</span>`;
    }
    html += `</div>`;
  }

  // 권장과목
  if (recSubjs.length) {
    html += `<div style="margin-bottom:10px">
      <span style="font-size:12px;font-weight:700;color:var(--tx3);margin-right:6px">권장과목</span>`;
    for (const s of recSubjs) {
      html += `<span style="display:inline-block;padding:2px 9px;margin:2px 3px 2px 0;
                            border-radius:20px;font-size:12px;font-weight:600;
                            background:#e8f8f222;color:#1aaa6e;border:1px solid #1aaa6e44">${_esc(s)}</span>`;
    }
    html += `</div>`;
  }

  // 일치 / 보완 키워드 한 줄 요약
  if (matched.length || missing.length) {
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">`;
    if (matched.length) {
      html += `<div style="padding:8px 12px;background:#e8f8f2;border:1px solid #b8e6d0;
                           border-radius:var(--rs);font-size:12px;color:#0d7a52">
        <b>✅ 연관 키워드</b><br>${matched.slice(0,5).map(_esc).join(' · ')}
      </div>`;
    }
    if (missing.length) {
      html += `<div style="padding:8px 12px;background:#fdeaee;border:1px solid #f5c6cb;
                           border-radius:var(--rs);font-size:12px;color:#b02a37">
        <b>📌 보완 키워드</b><br>${missing.slice(0,5).map(_esc).join(' · ')}
      </div>`;
    }
    html += `</div>`;
  }

  // 강점 분석 관점 (최대 2개)
  if (strengths.length) {
    html += `<div style="margin-bottom:10px;padding:10px 14px;background:var(--sur2);
                         border:1px solid var(--bdr);border-radius:var(--rs)">
      <div style="font-size:12px;font-weight:700;color:var(--tx);margin-bottom:6px">강점 분석 관점</div>`;
    for (const s of strengths.slice(0, 2)) {
      html += `<div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:4px">
                 <span style="color:#1aaa6e;margin-right:4px">•</span>${_esc(s)}</div>`;
    }
    html += `</div>`;
  }

  // 보완점 (최대 2개)
  if (weaknesses.length) {
    html += `<div style="margin-bottom:12px;padding:10px 14px;background:var(--sur2);
                         border:1px solid var(--bdr);border-radius:var(--rs)">
      <div style="font-size:12px;font-weight:700;color:var(--tx);margin-bottom:6px">보완 고려사항</div>`;
    for (const w of weaknesses.slice(0, 2)) {
      html += `<div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:4px">
                 <span style="color:#c9871f;margin-right:4px">•</span>${_esc(w)}</div>`;
    }
    html += `</div>`;
  }

  // promptAddon 전문 (복사용 textarea)
  if (addonText) {
    html += `
      <div style="margin-bottom:8px">
        <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:6px">
          📋 AI 프롬프트에 이어 붙여넣을 추가 문장
        </div>
        <textarea id="uni-addon-text" readonly
                  style="width:100%;min-height:140px;resize:vertical;padding:10px;
                         font-size:12px;font-family:'D2Coding',Consolas,'Courier New',monospace;
                         line-height:1.6;background:var(--sur2);border:1px solid var(--bdr);
                         border-radius:var(--rs);color:var(--tx);box-sizing:border-box;
                         white-space:pre-wrap;word-break:break-all;overflow-wrap:break-word"
        >${_esc(addonText)}</textarea>
      </div>`;
  }

  // 면책 고지
  html += `
    <div style="padding:8px 12px;background:#fef2f2;border:1px solid #f8b4b4;border-left:3px solid #d44060;
                border-radius:var(--rs);font-size:11px;color:#c0392b;font-weight:600;margin-top:4px">
      ⚠️ 본 분석은 대학 공개자료와 학생부 기록의 참고용 비교이며, 실제 입학 결과를 예측하지 않습니다.
    </div>`;

  body.innerHTML = html;
  if (copyBtn) copyBtn.style.display = addonText ? 'inline-block' : 'none';
}

/** HTML 이스케이프 (aiPromptPanel 내부용) */
function _esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 대학자료 추가문 복사 */
function copyUniAddonToClipboard() {
  const ta = document.getElementById('uni-addon-text');
  if (!ta || !ta.value) return;
  navigator.clipboard.writeText(ta.value).then(() => {
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = '✅ 대학자료 반영 문장이 복사되었습니다! 프롬프트 뒤에 붙여넣으세요.';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }).catch(() => {
    ta.select();
    document.execCommand('copy');
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = '✅ 복사되었습니다!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  });
}
