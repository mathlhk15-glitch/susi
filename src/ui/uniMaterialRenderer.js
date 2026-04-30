// ════════════════════════════════════════
//  uniMaterialRenderer.js
//  대학자료 분석 탭 UI 렌더러
//  수정사항:
//   [BUG-1] _processUpload에 관리자 인증 체크 추가
//   [BUG-2] saveUniMaterialSummary 반환값 처리 오류 수정
//   [BUG-3] _currentMaterialId 초기화 위치 버그 수정
//   [FEAT]  GitHub Gist 연동 — 관리자 업로드 → 전체 공유
//           Gist 설정 UI, 동기화 버튼, 자동 pull 추가
// ════════════════════════════════════════
(function () {
  'use strict';

  // ── 관심 대학 목록 ──────────────────────────────────────
  const TARGET_UNIS = [
    '서울대학교','연세대학교','고려대학교','서강대학교','성균관대학교',
    '한양대학교','중앙대학교','경희대학교','한국외국어대학교','서울시립대학교',
    '건국대학교','동국대학교','홍익대학교','광운대학교','상명대학교',
    '명지대학교','가천대학교','인하대학교','아주대학교','인천대학교',
    '경북대학교','부산대학교','부경대학교','창원대학교','경상국립대학교',
    '충남대학교','충북대학교',
  ];

  function _shortName(name) {
    return name.replace('대학교','대').replace('한국외국어대','한국외대');
  }

  // ── 내부 상태 ─────────────────────────────────────────
  let _currentMaterialId = null;
  let _uploading = false;

  // ── HTML 이스케이프 ──────────────────────────────────
  function _e(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── 토스트 메시지 ─────────────────────────────────────
  function _toast(msg, color) {
    const t = document.createElement('div');
    t.style.cssText =
      'position:fixed;bottom:24px;right:24px;background:' + (color||'#1aaa6e') +
      ';color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;' +
      'font-weight:700;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.2);max-width:320px;line-height:1.5';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ── Gist 설정 UI ──────────────────────────────────────
  function _renderGistPanel(isAdmin) {
    const cfg = (typeof getGistConfig === 'function') ? getGistConfig() : null;
    const hasGist = cfg && cfg.gistId;

    if (!isAdmin) {
      // 일반 사용자: Gist가 설정돼 있으면 동기화 버튼만
      if (!hasGist) return '';
      return `
      <div style="margin-bottom:16px;padding:12px 16px;background:var(--sur2);
        border:1px solid var(--bdr);border-radius:var(--rs);display:flex;
        align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="font-size:12px;color:var(--tx3)">
          🌐 공유 자료 연동됨 <span style="color:var(--tx2);font-weight:600">${_e(cfg.gistId.slice(0,8))}…</span>
        </div>
        <button onclick="window._uniSyncFromGist()"
          style="padding:6px 14px;background:#3498db;border:none;border-radius:6px;
                 font-size:12px;font-weight:700;color:#fff;cursor:pointer">
          🔄 최신 자료 불러오기
        </button>
      </div>`;
    }

    // 관리자: 설정 패널 + 동기화
    return `
    <div id="gist-panel" style="margin-bottom:20px;padding:16px 20px;background:var(--sur2);
      border:1px solid var(--bdr);border-radius:var(--r)">
      <div style="font-size:14px;font-weight:800;color:var(--tx);margin-bottom:12px;
        display:flex;align-items:center;gap:8px">
        🌐 GitHub Gist 공유 설정
        <span style="font-size:11px;font-weight:400;color:var(--tx3)">
          — 업로드한 자료를 인터넷 어디서든 공유
        </span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--tx3);margin-bottom:4px">
            Gist ID <span style="color:#e74c3c">*</span>
          </div>
          <input id="gist-id-input" type="text"
            placeholder="예: a1b2c3d4e5f6… (32자)"
            value="${_e(cfg && cfg.gistId ? cfg.gistId : '')}"
            style="width:100%;box-sizing:border-box;padding:8px 10px;
              border:1.5px solid var(--bdr);border-radius:6px;font-size:12px;
              background:var(--sur);color:var(--tx);outline:none;font-family:monospace">
        </div>
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--tx3);margin-bottom:4px">
            GitHub Token <span style="color:#e74c3c">*</span>
            <span style="font-size:10px;font-weight:400"> (gist 권한 필요)</span>
          </div>
          <input id="gist-token-input" type="password"
            placeholder="ghp_xxxxxxxxxxxx"
            value="${_e(cfg && cfg.token ? cfg.token : '')}"
            style="width:100%;box-sizing:border-box;padding:8px 10px;
              border:1.5px solid var(--bdr);border-radius:6px;font-size:12px;
              background:var(--sur);color:var(--tx);outline:none;font-family:monospace">
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="window._uniSaveGistConfig()"
          style="padding:8px 16px;background:#2ecc71;border:none;border-radius:6px;
                 font-size:12px;font-weight:700;color:#fff;cursor:pointer">
          💾 설정 저장
        </button>
        <button onclick="window._uniCreateGist()"
          style="padding:8px 16px;background:#9b59b6;border:none;border-radius:6px;
                 font-size:12px;font-weight:700;color:#fff;cursor:pointer">
          ✨ 새 Gist 생성
        </button>
        <button onclick="window._uniSyncFromGist()"
          style="padding:8px 16px;background:#3498db;border:none;border-radius:6px;
                 font-size:12px;font-weight:700;color:#fff;cursor:pointer">
          🔄 Gist에서 불러오기
        </button>
        <button onclick="window._uniPushToGist()"
          style="padding:8px 16px;background:#e67e22;border:none;border-radius:6px;
                 font-size:12px;font-weight:700;color:#fff;cursor:pointer">
          ☁️ 전체 Gist 업로드
        </button>
        ${hasGist ? `
        <button onclick="window._uniClearGistConfig()"
          style="padding:8px 16px;background:none;border:1px solid #e74c3c;border-radius:6px;
                 font-size:12px;font-weight:700;color:#e74c3c;cursor:pointer">
          🗑 설정 초기화
        </button>` : ''}
      </div>

      ${hasGist ? `
      <div style="margin-top:10px;font-size:11px;color:var(--tx3);line-height:1.8">
        ✅ Gist 연결됨:
        <a href="https://gist.github.com/${_e(cfg.gistId)}" target="_blank"
          style="color:#3498db;font-family:monospace">${_e(cfg.gistId.slice(0,16))}…</a>
        &nbsp;|&nbsp; 업로드 시 자동으로 Gist에 반영됩니다.
      </div>` : `
      <div style="margin-top:10px;padding:10px 12px;background:#fff8e1;border-radius:6px;
        font-size:11px;color:#7a5800;line-height:1.8;border:1px solid #f0c040">
        💡 <b>처음 설정 방법:</b><br>
        1. <a href="https://github.com/settings/tokens/new" target="_blank" style="color:#3498db">
           GitHub → Settings → Developer settings → Personal access tokens</a>에서
           <b>gist</b> 권한으로 토큰 발급<br>
        2. 토큰 입력 후 <b>✨ 새 Gist 생성</b> 클릭 → Gist ID 자동 입력됨<br>
        3. 이후 업로드할 때마다 자동으로 Gist에 동기화됩니다.
      </div>`}
    </div>`;
  }

  // ── 업로드 영역 HTML ──────────────────────────────────
  function _renderUploadZone() {
    return `
    <div id="uni-upload-zone" style="margin-bottom:24px">
      <div style="font-size:16px;font-weight:800;color:var(--tx);margin-bottom:12px;
                  display:flex;align-items:center;gap:8px">
        <span>📂</span> 대학자료 업로드
      </div>

      <!-- 자료 유형 선택 -->
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;
          padding:8px 14px;background:var(--sur2);border:2px solid var(--bdr);
          border-radius:8px;font-size:13px;font-weight:600;color:var(--tx2)"
          id="lbl-type-seonhaeng">
          <input type="radio" name="uni-doc-type" value="선행학습영향평가보고서"
            id="type-seonhaeng" style="accent-color:#3498db" checked>
          📋 선행학습영향평가보고서
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;
          padding:8px 14px;background:var(--sur2);border:2px solid var(--bdr);
          border-radius:8px;font-size:13px;font-weight:600;color:var(--tx2)"
          id="lbl-type-guide">
          <input type="radio" name="uni-doc-type" value="학생부종합전형 가이드북"
            id="type-guide" style="accent-color:#9b59b6">
          📖 학생부종합전형 가이드북
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;
          padding:8px 14px;background:var(--sur2);border:2px solid var(--bdr);
          border-radius:8px;font-size:13px;font-weight:600;color:var(--tx2)"
          id="lbl-type-other">
          <input type="radio" name="uni-doc-type" value="기타입학자료"
            id="type-other" style="accent-color:#e67e22">
          📄 기타 입학자료
        </label>
      </div>

      <!-- 파일 드롭존 -->
      <label id="uni-file-drop" style="display:flex;flex-direction:column;align-items:center;
        justify-content:center;padding:32px 24px;background:var(--sur2);
        border:2px dashed var(--bdr2);border-radius:var(--r);cursor:pointer;
        gap:8px;transition:background .2s" for="uni-file-input">
        <div style="font-size:36px">📄</div>
        <div style="font-size:14px;font-weight:700;color:var(--tx2)">PDF 파일을 클릭하거나 드래그해서 업로드</div>
        <div style="font-size:12px;color:var(--tx3)">대용량 PDF도 지원 (자동으로 앞부분 100페이지 분석)</div>
        <input id="uni-file-input" type="file" accept=".pdf"
          style="display:none" onchange="window._uniHandleFileSelect(this)">
      </label>

      <!-- 업로드 진행 표시 -->
      <div id="uni-upload-progress" style="display:none;margin-top:12px">
        <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;
          background:var(--sur2);border-radius:8px;border:1px solid var(--bdr)">
          <div style="width:20px;height:20px;border:3px solid var(--bdr2);
            border-top-color:#3498db;border-radius:50%;animation:spin .8s linear infinite"></div>
          <span id="uni-upload-msg" style="font-size:13px;color:var(--tx2);font-weight:600">
            PDF 분석 중...
          </span>
        </div>
      </div>
    </div>`;
  }

  // ── 관심 대학 업로드 현황 표시 ───────────────────────
  function _renderTargetUniStatus(savedMaterials) {
    const rows = TARGET_UNIS.map(u => {
      const short = _shortName(u);
      const has = savedMaterials.some(m =>
        m.universityName && (
          m.universityName.includes(u.replace('대학교','')) ||
          u.includes(m.universityName.replace('대학교',''))
        )
      );
      return `<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;
        background:var(--sur2);border-radius:6px;border:1px solid ${has ? '#1aaa6e' : 'var(--bdr)'};
        font-size:12px;font-weight:600;color:${has ? '#1aaa6e' : 'var(--tx3)'}">
        ${has ? '✅' : '⬜'} ${_e(short)}
      </div>`;
    }).join('');

    const uploaded = TARGET_UNIS.filter(u =>
      savedMaterials.some(m => m.universityName && (
        m.universityName.includes(u.replace('대학교','')) ||
        u.includes(m.universityName.replace('대학교',''))
      ))
    ).length;

    return `
    <div style="margin-bottom:24px;padding:16px 20px;background:var(--sur2);
      border:1px solid var(--bdr);border-radius:var(--r)">
      <div style="font-size:14px;font-weight:800;color:var(--tx);margin-bottom:4px">
        🎯 관심 대학 자료 업로드 현황
        <span style="font-size:12px;font-weight:400;color:var(--tx3);margin-left:8px">
          ${uploaded}/${TARGET_UNIS.length}개 업로드 완료
        </span>
      </div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:12px">
        선행학습영향평가보고서 또는 가이드북 PDF를 업로드하면 자동으로 체크됩니다
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${rows}</div>
    </div>`;
  }

  // ── 저장된 자료 목록 ──────────────────────────────────
  function _renderSavedList(savedMaterials, isAdmin) {
    if (!savedMaterials.length) {
      return `<div style="color:var(--tx3);font-size:13px;text-align:center;padding:24px">
        저장된 대학자료가 없습니다.<br>
        ${isAdmin ? 'PDF를 업로드해주세요.' : '관리자가 자료를 업로드하거나<br>위의 <b>최신 자료 불러오기</b>를 눌러주세요.'}
      </div>`;
    }

    return savedMaterials.map(m => {
      const isSelected = m.id === _currentMaterialId;
      const typeLabel  = m.sourceTitle && m.sourceTitle.includes('선행학습') ? '📋 선행학습' :
                         m.sourceTitle && m.sourceTitle.includes('가이드') ? '📖 가이드북' : '📄';
      return `
      <div onclick="window._uniSelectMaterial('${_e(m.id)}')"
        style="padding:12px 16px;background:var(--sur);border-radius:8px;cursor:pointer;
          border:2px solid ${isSelected ? '#3498db' : 'var(--bdr)'};margin-bottom:8px;
          transition:border-color .15s;${isSelected ? 'background:var(--sur2)' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:2px">
              ${_e(m.universityName || '대학 미상')}
              ${m.departmentName ? `<span style="font-size:11px;font-weight:400;color:var(--tx3)"> · ${_e(m.departmentName)}</span>` : ''}
            </div>
            <div style="font-size:11px;color:var(--tx3);display:flex;gap:6px;flex-wrap:wrap">
              <span>${typeLabel} ${_e(m.admissionType || '전형 미상')}</span>
              ${m.sourceYear ? `<span>· ${_e(m.sourceYear)}년도</span>` : ''}
              ${m.evaluationElements && m.evaluationElements.length ?
                `<span>· 평가요소: ${_e(m.evaluationElements.slice(0,3).join(', '))}</span>` : ''}
            </div>
          </div>
          ${isAdmin ? `
          <button onclick="event.stopPropagation();window._uniDeleteMaterial('${_e(m.id)}')"
            style="padding:4px 8px;background:none;border:1px solid #e74c3c;border-radius:5px;
              font-size:11px;color:#e74c3c;cursor:pointer;white-space:nowrap;flex-shrink:0">
            삭제
          </button>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  // ── 비교 결과 카드 ────────────────────────────────────
  function _renderCompareResult(cmp) {
    if (!cmp) return '';
    const ratio = cmp.referenceMatchRatio || 0;
    const lvColor = ratio >= 60 ? '#1aaa6e' : ratio >= 30 ? '#c9871f' : '#d44060';
    const barW = Math.min(100, ratio);

    const strengths  = (cmp.strengths  || []).slice(0,5);
    const weaknesses = (cmp.weaknesses || []).slice(0,5);
    const recs       = (cmp.recommendedActivities || []).slice(0,4);
    const matched    = (cmp.matchedKeywords || []).slice(0,8);
    const missing    = (cmp.missingKeywords  || []).slice(0,6);

    return `
    <div id="uni-compare-result" style="margin-top:24px">
      <div style="font-size:15px;font-weight:800;color:var(--tx);margin-bottom:12px;
        display:flex;align-items:center;gap:8px">
        🔍 매칭 프레임 분석 결과
        <span style="font-size:11px;font-weight:400;color:var(--tx3)">
          — ${_e(cmp.sourceText || cmp.universityName)}
        </span>
      </div>

      <!-- 일치도 바 -->
      <div style="padding:14px 18px;background:var(--sur2);border-radius:var(--rs);
        border:1px solid var(--bdr);margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:13px;font-weight:700;color:var(--tx)">
            참고용 키워드 일치도
          </span>
          <span style="font-size:20px;font-weight:900;color:${lvColor}">
            ${ratio}%
            <span style="font-size:12px;font-weight:600">(${_e(cmp.matchLevel)})</span>
          </span>
        </div>
        <div style="height:8px;background:var(--sur3);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${barW}%;background:${lvColor};border-radius:4px;transition:width .7s"></div>
        </div>
        <div style="font-size:11px;color:var(--tx3);margin-top:6px">
          ※ 합격 가능성과 무관한 키워드 참고 수치입니다
        </div>
      </div>

      ${matched.length ? `
      <div style="margin-bottom:14px">
        <div style="font-size:12px;font-weight:700;color:#1aaa6e;margin-bottom:6px">
          ✅ 학생부에서 확인된 관련 키워드
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${matched.map(k => `<span style="padding:3px 9px;background:#e8f8f2;border:1px solid #1aaa6e;
            border-radius:12px;font-size:11px;font-weight:600;color:#1aaa6e">${_e(k)}</span>`).join('')}
        </div>
      </div>` : ''}

      ${missing.length ? `
      <div style="margin-bottom:14px">
        <div style="font-size:12px;font-weight:700;color:#e67e22;margin-bottom:6px">
          ⚠️ 보완이 필요한 키워드
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${missing.map(k => `<span style="padding:3px 9px;background:#fef3e6;border:1px solid #e67e22;
            border-radius:12px;font-size:11px;font-weight:600;color:#e67e22">${_e(k)}</span>`).join('')}
        </div>
      </div>` : ''}

      ${strengths.length ? `
      <div style="margin-bottom:14px;padding:14px 16px;background:var(--sur2);
        border-radius:var(--rs);border-left:4px solid #1aaa6e">
        <div style="font-size:12px;font-weight:700;color:var(--tx);margin-bottom:8px">
          💪 학생부 강점 (대학자료 기준)
        </div>
        ${strengths.map(s => `<div style="font-size:12px;color:var(--tx2);margin-bottom:5px;
          padding-left:8px;line-height:1.6">• ${_e(s)}</div>`).join('')}
      </div>` : ''}

      ${weaknesses.length ? `
      <div style="margin-bottom:14px;padding:14px 16px;background:var(--sur2);
        border-radius:var(--rs);border-left:4px solid #e67e22">
        <div style="font-size:12px;font-weight:700;color:var(--tx);margin-bottom:8px">
          📌 보완 필요 항목
        </div>
        ${weaknesses.map(w => `<div style="font-size:12px;color:var(--tx2);margin-bottom:5px;
          padding-left:8px;line-height:1.6">• ${_e(w)}</div>`).join('')}
      </div>` : ''}

      ${recs.length ? `
      <div style="margin-bottom:14px;padding:14px 16px;background:var(--sur2);
        border-radius:var(--rs);border-left:4px solid #3498db">
        <div style="font-size:12px;font-weight:700;color:var(--tx);margin-bottom:8px">
          🚀 추천 탐구 방향
        </div>
        ${recs.map(r => `<div style="font-size:12px;color:var(--tx2);margin-bottom:5px;
          padding-left:8px;line-height:1.6">• ${_e(r)}</div>`).join('')}
      </div>` : ''}

      <div style="padding:10px 14px;background:var(--sur3);border-radius:var(--rs);
        font-size:11px;color:var(--tx3);line-height:1.6">
        ⚠️ ${_e(cmp.notice || '본 분석은 참고용이며 실제 입학 결과를 예측하지 않습니다.')}
      </div>
    </div>`;
  }

  // ── 메인 렌더 함수 ─────────────────────────────────────
  window.renderUniMaterialTab = function () {
    const bd = document.getElementById('bd-unimaterial');
    if (!bd) return;

    bd.style.display = 'block';

    // 업로드 UI는 항상 표시 (접속 비밀번호로 1차 필터링됨)
    // 실제 업로드/삭제 실행 시 관리자 체크
    const isAdmin = true;

    const savedMaterials = (typeof getSavedUniMaterials === 'function')
      ? getSavedUniMaterials() : [];

    // [BUG-3 FIX] _currentMaterialId 초기화를 조건문 밖으로 이동
    if (!_currentMaterialId && savedMaterials.length) {
      _currentMaterialId = savedMaterials[0].id;
    }

    // 비교 결과 계산
    let compareResult = null;
    if (_currentMaterialId && savedMaterials.length) {
      const mat = savedMaterials.find(m => m.id === _currentMaterialId) || savedMaterials[0];
      if (mat && typeof compareStudentWithUniMaterial === 'function') {
        compareResult = compareStudentWithUniMaterial(
          mat,
          typeof parsedData !== 'undefined' ? parsedData : null,
          typeof v6Analysis !== 'undefined' ? v6Analysis : null,
          typeof takenSubjects !== 'undefined' ? takenSubjects : null
        );
      }
    }

    bd.innerHTML = `
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
        #uni-file-drop:hover { background: var(--sur3) !important; border-color: #3498db !important; }
        #uni-file-drop.drag-over { background: var(--sur3) !important; border-color: #3498db !important; border-style: solid !important; }
      </style>

      ${_renderGistPanel(isAdmin)}
      ${isAdmin ? _renderUploadZone() : ''}
      ${_renderTargetUniStatus(savedMaterials)}

      <!-- 저장 목록 + 비교 결과 -->
      <div style="display:grid;grid-template-columns:280px 1fr;gap:20px;align-items:start">
        <!-- 왼쪽: 저장 목록 -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:14px;font-weight:800;color:var(--tx)">
              📁 저장된 자료 <span style="font-size:12px;color:var(--tx3)">(${savedMaterials.length}건)</span>
            </div>
            ${isAdmin && savedMaterials.length ? `
            <button onclick="if(confirm('모든 대학자료를 삭제할까요?\\n로컬과 Gist 모두 삭제됩니다.')) { window._uniClearAll(); }"
              style="font-size:11px;color:#e74c3c;background:none;border:none;cursor:pointer;padding:2px 6px">
              전체삭제
            </button>` : ''}
          </div>
          <div id="uni-saved-list">
            ${_renderSavedList(savedMaterials, isAdmin)}
          </div>
        </div>

        <!-- 오른쪽: 비교 결과 -->
        <div>
          ${_currentMaterialId && compareResult
            ? _renderCompareResult(compareResult)
            : savedMaterials.length
              ? `<div style="padding:32px;text-align:center;color:var(--tx3);font-size:13px;
                  background:var(--sur2);border-radius:var(--r);border:1px dashed var(--bdr)">
                  왼쪽 목록에서 대학자료를 선택하면<br>학생부와의 매칭 프레임 분석 결과가 표시됩니다.
                </div>`
              : `<div style="padding:32px;text-align:center;color:var(--tx3);font-size:13px;
                  background:var(--sur2);border-radius:var(--r);border:1px dashed var(--bdr)">
                  대학자료 PDF를 업로드하면<br>매칭 프레임을 자동으로 분석합니다.
                </div>`
          }
        </div>
      </div>
    `;

    // 관리자일 때만 이벤트 연결
    if (isAdmin) {
      const dropZone = document.getElementById('uni-file-drop');
      if (dropZone) {
        dropZone.addEventListener('dragover', e => {
          e.preventDefault();
          dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', e => {
          e.preventDefault();
          dropZone.classList.remove('drag-over');
          const file = e.dataTransfer.files[0];
          if (file && file.name.toLowerCase().endsWith('.pdf')) {
            _processUpload(file);
          } else {
            _toast('PDF 파일만 업로드할 수 있습니다.', '#e74c3c');
          }
        });
      }

      // 라디오 버튼 스타일
      document.querySelectorAll('input[name="uni-doc-type"]').forEach(radio => {
        radio.addEventListener('change', () => {
          document.querySelectorAll('input[name="uni-doc-type"]').forEach(r => {
            const l = r.closest('label');
            if (l) {
              l.style.borderColor = r.checked ? '#3498db' : 'var(--bdr)';
              l.style.color       = r.checked ? '#3498db' : 'var(--tx2)';
            }
          });
        });
      });
    }
  };

  // ── 자료 선택 ──────────────────────────────────────────
  window._uniSelectMaterial = function (id) {
    _currentMaterialId = id;
    renderUniMaterialTab();
  };

  // ── 자료 삭제 (관리자 전용) ────────────────────────────
  window._uniDeleteMaterial = async function (id) {
    // [BUG-1 FIX] 관리자 인증 체크
    if (!window.isAdminLoggedIn || !window.isAdminLoggedIn()) {
      _toast('❌ 관리자 로그인 후 삭제할 수 있습니다.', '#e74c3c');
      return;
    }
    if (!confirm('이 대학자료를 삭제할까요?\n로컬과 Gist 모두에서 삭제됩니다.')) return;

    const cfg = (typeof getGistConfig === 'function') ? getGistConfig() : null;
    if (cfg && cfg.gistId && cfg.token) {
      const result = await deleteAndSyncUniMaterial(id);
      if (!result.ok) { _toast('❌ ' + result.message, '#e74c3c'); return; }
      if (!result.synced) _toast('⚠️ 로컬 삭제 완료. Gist 동기화 실패: ' + result.syncMessage, '#e67e22');
      else _toast('🗑 삭제 및 Gist 동기화 완료', '#888');
    } else {
      if (typeof deleteUniMaterialSummary === 'function') deleteUniMaterialSummary(id);
      _toast('🗑 로컬에서 삭제되었습니다.', '#888');
    }
    if (_currentMaterialId === id) _currentMaterialId = null;
    renderUniMaterialTab();
  };

  // ── 전체 삭제 ──────────────────────────────────────────
  window._uniClearAll = async function () {
    if (!window.isAdminLoggedIn || !window.isAdminLoggedIn()) {
      _toast('❌ 관리자 로그인 후 삭제할 수 있습니다.', '#e74c3c');
      return;
    }
    if (typeof clearUniMaterials === 'function') clearUniMaterials();
    const cfg = (typeof getGistConfig === 'function') ? getGistConfig() : null;
    if (cfg && cfg.gistId && cfg.token) {
      const result = await pushToGist([]);
      if (!result.ok) _toast('⚠️ 로컬 삭제 완료. Gist 동기화 실패: ' + result.message, '#e67e22');
      else _toast('🗑 전체 삭제 및 Gist 동기화 완료', '#888');
    } else {
      _toast('🗑 전체 삭제 완료', '#888');
    }
    _currentMaterialId = null;
    renderUniMaterialTab();
  };

  // ── 파일 선택 핸들러 ──────────────────────────────────
  window._uniHandleFileSelect = function (input) {
    const file = input.files && input.files[0];
    if (!file) return;
    input.value = '';
    _processUpload(file);
  };

  // ── Gist 설정 저장 ────────────────────────────────────
  window._uniSaveGistConfig = function () {
    const gistId = (document.getElementById('gist-id-input') || {}).value || '';
    const token  = (document.getElementById('gist-token-input') || {}).value || '';
    if (!gistId.trim()) { _toast('Gist ID를 입력하세요.', '#e74c3c'); return; }
    setGistConfig(gistId.trim(), token.trim());
    _toast('✅ Gist 설정이 저장되었습니다.', '#1aaa6e');
    renderUniMaterialTab();
  };

  // ── 새 Gist 생성 ──────────────────────────────────────
  window._uniCreateGist = async function () {
    const token = (document.getElementById('gist-token-input') || {}).value || '';
    if (!token.trim()) { _toast('GitHub 토큰을 먼저 입력하세요.', '#e74c3c'); return; }
    _toast('⏳ Gist 생성 중...', '#3498db');
    const result = await createGist(token.trim());
    if (!result.ok) { _toast('❌ ' + result.message, '#e74c3c'); return; }
    setGistConfig(result.gistId, token.trim());
    _toast(`✅ Gist 생성 완료! ID: ${result.gistId.slice(0,12)}…`, '#1aaa6e');
    renderUniMaterialTab();
  };

  // ── Gist 설정 초기화 ──────────────────────────────────
  window._uniClearGistConfig = function () {
    if (!confirm('Gist 연결 설정을 초기화하시겠습니까?\n(로컬 자료는 유지됩니다)')) return;
    if (typeof clearGistConfig === 'function') clearGistConfig();
    _toast('Gist 설정이 초기화되었습니다.', '#888');
    renderUniMaterialTab();
  };

  // ── Gist에서 자료 불러오기 ────────────────────────────
  window._uniSyncFromGist = async function () {
    _toast('⏳ Gist에서 자료 불러오는 중...', '#3498db');
    const result = await syncFromGist();
    if (!result.ok) { _toast('❌ ' + result.message, '#e74c3c'); return; }
    if (result.added === 0 && result.updated === 0) {
      _toast('✅ 이미 최신 상태입니다.', '#1aaa6e');
    } else {
      _toast(`✅ 동기화 완료: ${result.added}건 추가, ${result.updated}건 업데이트`, '#1aaa6e');
    }
    renderUniMaterialTab();
  };

  // ── 전체 Gist 업로드 (수동) ───────────────────────────
  window._uniPushToGist = async function () {
    if (!window.isAdminLoggedIn || !window.isAdminLoggedIn()) {
      _toast('❌ 관리자 로그인 후 업로드할 수 있습니다.', '#e74c3c');
      return;
    }
    _toast('⏳ Gist에 업로드 중...', '#e67e22');
    const list = (typeof getSavedUniMaterials === 'function') ? getSavedUniMaterials() : [];
    const result = await pushToGist(list);
    if (!result.ok) { _toast('❌ ' + result.message, '#e74c3c'); return; }
    _toast(`✅ ${list.length}건을 Gist에 업로드했습니다.`, '#1aaa6e');
  };

  // ── PDF 업로드 & 분석 파이프라인 ─────────────────────
  async function _processUpload(file) {
    // [BUG-1 FIX] 관리자 인증 체크 — UI 우회 방어
    if (!window.isAdminLoggedIn || !window.isAdminLoggedIn()) {
      _toast('❌ 관리자 로그인 후 업로드할 수 있습니다.', '#e74c3c');
      return;
    }

    if (_uploading) { _toast('이미 업로드 중입니다. 잠시 기다려주세요.', '#e67e22'); return; }
    _uploading = true;

    const typeRadio = document.querySelector('input[name="uni-doc-type"]:checked');
    const docType   = typeRadio ? typeRadio.value : '기타입학자료';

    const progEl = document.getElementById('uni-upload-progress');
    const msgEl  = document.getElementById('uni-upload-msg');
    if (progEl) progEl.style.display = 'block';
    const setMsg = m => { if (msgEl) msgEl.textContent = m; };

    try {
      setMsg('PDF 파일 읽는 중...');
      if (typeof loadPdf !== 'function') {
        throw new Error('PDF 로더가 초기화되지 않았습니다. 페이지를 새로고침해주세요.');
      }

      const lines = await loadPdf(file);
      setMsg('텍스트 추출 중...');

      if (!lines || lines.length === 0) {
        throw new Error('PDF에서 텍스트를 추출할 수 없습니다. 스캔 이미지 PDF는 지원되지 않습니다.');
      }

      setMsg('대학 정보 분석 중...');
      const analyzed = analyzeUniMaterialLines(lines, {
        sourceTitle: `[${docType}] ${file.name}`,
        pageLimit: 100,
        textLimit: 8000,
      });

      if (!analyzed.admissionType) analyzed.admissionType = docType;
      if (!analyzed.sourceTitle.startsWith('[')) {
        analyzed.sourceTitle = `[${docType}] ${file.name}`;
      }

      setMsg('키워드 정리 중...');
      const summary = buildUniMaterialSummary(analyzed);

      // Gist 연동 여부에 따라 저장 방식 분기
      const cfg = (typeof getGistConfig === 'function') ? getGistConfig() : null;
      const hasGist = cfg && cfg.gistId && cfg.token;

      let saveResult;
      if (hasGist) {
        setMsg('로컬 저장 및 Gist 업로드 중...');
        saveResult = await saveAndSyncUniMaterial(summary);
      } else {
        saveResult = saveUniMaterialSummary(summary);
      }

      // [BUG-2 FIX] 반환값이 객체이므로 ok 프로퍼티로 확인
      if (!saveResult.ok) {
        throw new Error(saveResult.message || '저장 중 오류가 발생했습니다.');
      }

      const uniName = summary.universityName || '(대학명 미확인)';
      if (hasGist) {
        if (!saveResult.synced) {
          _toast(`✅ "${uniName}" 저장됨. ⚠️ Gist 동기화 실패: ${saveResult.syncMessage}`, '#e67e22');
        } else {
          _toast(`✅ "${uniName}" 저장 및 Gist 업로드 완료`, '#1aaa6e');
        }
      } else {
        _toast(`✅ "${uniName}" 자료가 저장되었습니다. (Gist 미설정 — 로컬만 저장)`, '#1aaa6e');
      }

      // 방금 저장된 자료를 선택 상태로
      _currentMaterialId = saveResult.id;

    } catch (err) {
      console.error('[uniMaterialRenderer] 업로드 오류:', err);
      _toast('❌ ' + (err.message || '업로드 중 오류가 발생했습니다.'), '#e74c3c');
    } finally {
      _uploading = false;
      if (progEl) progEl.style.display = 'none';
      renderUniMaterialTab();
    }
  }

  // ── 페이지 로드 시 Gist 자동 동기화 ──────────────────
  // (DOMContentLoaded 이후 다른 스크립트 로딩 완료를 기다려 실행)
  function _autoSyncOnLoad() {
    const cfg = (typeof getGistConfig === 'function') ? getGistConfig() : null;
    if (!cfg || !cfg.gistId) return;
    syncFromGist().then(result => {
      if (result.ok && (result.added > 0 || result.updated > 0)) {
        console.log(`[uniMaterial] Gist 자동 동기화: +${result.added} ~${result.updated}`);
        // 현재 대학자료 탭이 열려 있으면 리렌더
        const bd = document.getElementById('bd-unimaterial');
        if (bd && bd.style.display !== 'none') renderUniMaterialTab();
      }
    }).catch(() => {}); // 네트워크 오류 무시
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(_autoSyncOnLoad, 1500));
  } else {
    setTimeout(_autoSyncOnLoad, 1500);
  }

})();
