// ════════════════════════════════════════
//  uniMaterialStore.js
//  대학자료 저장소
//  - 로컬: localStorage (빠른 읽기용 캐시)
//  - 원격: GitHub Gist (관리자 업로드 → 전체 공유)
//
//  흐름:
//   관리자 업로드 → 로컬 저장 + Gist 업로드(push)
//   일반 사용자   → Gist에서 pull → 로컬 캐시에 병합
// ════════════════════════════════════════

(function () {
  'use strict';

  const STORAGE_KEY    = 'saenggibu_uni_materials_v1';
  const GIST_CFG_KEY   = 'saenggibu_gist_config_v1';   // { gistId, token }
  const MAX_ITEMS      = 200;
  const MAX_TEXT_LEN   = 8000;
  const MAX_KEYWORDS   = 50;
  const GIST_FILENAME  = 'uni_materials.json';
  const DEFAULT_GIST_ID = '9fcf80b13d9ba63696372e70d142f47e'; // 기본 공유 Gist

  // ─────────────────────────────────────
  //  로컬 스토리지 유틸
  // ─────────────────────────────────────

  function _read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('[uniMaterialStore] _read 실패:', e);
      return [];
    }
  }

  function _write(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('[uniMaterialStore] _write 실패:', e);
      if (e.name === 'QuotaExceededError') {
        return '저장 공간이 부족합니다. 오래된 대학자료를 삭제한 후 다시 시도하세요.';
      }
      return '저장 중 오류가 발생했습니다: ' + e.message;
    }
  }

  function _dupKey(m) {
    return [
      (m.universityName  || '').trim().toLowerCase(),
      (m.departmentName  || '').trim().toLowerCase(),
      (m.admissionType   || '').trim().toLowerCase(),
      (m.sourceTitle     || '').trim().toLowerCase(),
      (m.sourceYear      || '').toString().trim()
    ].join('|');
  }

  // ─────────────────────────────────────
  //  Gist 설정 저장/로드
  // ─────────────────────────────────────

  function getGistConfig() {
    try {
      const raw = localStorage.getItem(GIST_CFG_KEY);
      if (!raw) return { gistId: DEFAULT_GIST_ID, token: '' };
      const cfg = JSON.parse(raw);
      if (!cfg || !cfg.gistId) return { gistId: DEFAULT_GIST_ID, token: '' };
      return cfg;
    } catch (e) {
      return { gistId: DEFAULT_GIST_ID, token: '' };
    }
  }

  function setGistConfig(gistId, token) {
    localStorage.setItem(GIST_CFG_KEY, JSON.stringify({ gistId, token: token || '' }));
  }

  function clearGistConfig() {
    localStorage.removeItem(GIST_CFG_KEY);
  }

  // ─────────────────────────────────────
  //  GitHub Gist API
  // ─────────────────────────────────────

  /**
   * Gist에서 대학자료 목록을 가져옴 (공개 읽기, 토큰 불필요)
   * 반환: { ok: true, list: [...] } 또는 { ok: false, message }
   */
  async function pullFromGist() {
    const cfg = getGistConfig();
    if (!cfg || !cfg.gistId) {
      return { ok: false, message: 'Gist ID가 설정되지 않았습니다.' };
    }
    try {
      const res = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (!res.ok) {
        if (res.status === 404) return { ok: false, message: 'Gist를 찾을 수 없습니다. Gist ID를 확인하세요.' };
        return { ok: false, message: `Gist 불러오기 실패 (HTTP ${res.status})` };
      }
      const data = await res.json();
      const file = data.files && data.files[GIST_FILENAME];
      if (!file) {
        return { ok: true, list: [] }; // 아직 자료 없음
      }
      // truncated 대응: raw_url에서 직접 가져오기
      let content = file.content;
      if (file.truncated && file.raw_url) {
        const rawRes = await fetch(file.raw_url);
        content = await rawRes.text();
      }
      const list = JSON.parse(content);
      return { ok: true, list: Array.isArray(list) ? list : [] };
    } catch (e) {
      return { ok: false, message: 'Gist 통신 오류: ' + e.message };
    }
  }

  /**
   * 현재 로컬 목록을 Gist에 업로드 (토큰 필요 — 관리자 전용)
   * 반환: { ok: true } 또는 { ok: false, message }
   */
  async function pushToGist(list) {
    const cfg = getGistConfig();
    if (!cfg || !cfg.gistId) {
      return { ok: false, message: 'Gist ID가 설정되지 않았습니다. 설정에서 입력해주세요.' };
    }
    if (!cfg.token) {
      return { ok: false, message: 'GitHub 토큰이 설정되지 않았습니다. 관리자 설정에서 입력해주세요.' };
    }
    try {
      const body = {
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(list, null, 2)
          }
        }
      };
      const res = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${cfg.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) return { ok: false, message: '인증 실패: GitHub 토큰을 확인하세요.' };
        if (res.status === 404) return { ok: false, message: 'Gist를 찾을 수 없습니다. Gist ID를 확인하세요.' };
        return { ok: false, message: `Gist 업로드 실패 (HTTP ${res.status}): ${err.message || ''}` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, message: 'Gist 통신 오류: ' + e.message };
    }
  }

  /**
   * 새 Gist를 생성 (관리자 초기 설정 시 1회)
   * 반환: { ok: true, gistId } 또는 { ok: false, message }
   */
  async function createGist(token) {
    try {
      const body = {
        description: '생기부 분석기 — 대학자료 공유 저장소',
        public: true,
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify([], null, 2)
          }
        }
      };
      const res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) return { ok: false, message: '인증 실패: GitHub 토큰을 확인하세요.' };
        return { ok: false, message: `Gist 생성 실패 (HTTP ${res.status}): ${err.message || ''}` };
      }
      const data = await res.json();
      return { ok: true, gistId: data.id, url: data.html_url };
    } catch (e) {
      return { ok: false, message: 'Gist 생성 오류: ' + e.message };
    }
  }

  // ─────────────────────────────────────
  //  공개 함수
  // ─────────────────────────────────────

  function normalizeUniMaterial(raw) {
    const now = new Date().toISOString();
    return {
      id:                  (raw.id                 || '').toString(),
      universityName:      (raw.universityName      || '').trim(),
      departmentName:      (raw.departmentName      || '').trim(),
      admissionType:       (raw.admissionType       || '').trim(),
      sourceTitle:         (raw.sourceTitle         || '').trim(),
      sourceYear:          (raw.sourceYear          || '').toString().trim(),
      sourceText:          (raw.sourceText          || '').trim(),
      evaluationElements:  Array.isArray(raw.evaluationElements)  ? raw.evaluationElements  : [],
      recommendedSubjects: Array.isArray(raw.recommendedSubjects) ? raw.recommendedSubjects : [],
      keywords:            Array.isArray(raw.keywords)
                             ? raw.keywords.slice(0, MAX_KEYWORDS) : [],
      cautions:            Array.isArray(raw.cautions) ? raw.cautions : [],
      extractedSummary:    typeof raw.extractedSummary === 'string'
                             ? raw.extractedSummary.slice(0, MAX_TEXT_LEN) : '',
      createdAt:           raw.createdAt || now,
      updatedAt:           raw.updatedAt || now
    };
  }

  function createUniMaterialId(material) {
    const base = [
      material.universityName || '',
      material.departmentName || '',
      material.admissionType  || '',
      material.sourceYear     || ''
    ].join('_').replace(/\s+/g, '').slice(0, 40);
    const ts  = Date.now().toString(36);
    const rnd = Math.random().toString(36).slice(2, 6);
    return base + '_' + ts + rnd;
  }

  function getSavedUniMaterials() {
    const list = _read();
    return list.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  /**
   * 자료 저장 (로컬 only)
   * 반환: { ok: true, id, action } 또는 { ok: false, message }
   */
  function saveUniMaterialSummary(material) {
    let norm = normalizeUniMaterial(material);
    if (!norm.id) norm.id = createUniMaterialId(norm);

    const list    = _read();
    const dupKey  = _dupKey(norm);
    const existIdx = list.findIndex(item => _dupKey(item) === dupKey);

    if (existIdx !== -1) {
      const existId = list[existIdx].id;
      norm.id        = existId;
      norm.createdAt = list[existIdx].createdAt;
      norm.updatedAt = new Date().toISOString();
      list[existIdx] = norm;
      const result = _write(list);
      if (result !== true) return { ok: false, message: result };
      return { ok: true, id: existId, action: 'updated' };
    }

    if (list.length >= MAX_ITEMS) {
      return {
        ok: false,
        message: `저장된 대학자료가 ${MAX_ITEMS}개를 초과했습니다. 오래된 자료를 삭제한 후 다시 저장하세요.`
      };
    }

    norm.createdAt = new Date().toISOString();
    norm.updatedAt = norm.createdAt;
    list.push(norm);

    const result = _write(list);
    if (result !== true) return { ok: false, message: result };
    return { ok: true, id: norm.id, action: 'created' };
  }

  /**
   * 자료 저장 후 Gist에 동기화 (관리자 전용)
   * 반환: { ok: true, id, action, synced } 또는 { ok: false, message }
   */
  async function saveAndSyncUniMaterial(material) {
    const saveResult = saveUniMaterialSummary(material);
    if (!saveResult.ok) return saveResult;

    const list = _read();
    const pushResult = await pushToGist(list);
    return {
      ok:     true,
      id:     saveResult.id,
      action: saveResult.action,
      synced: pushResult.ok,
      syncMessage: pushResult.ok ? null : pushResult.message
    };
  }

  /**
   * Gist에서 최신 자료를 가져와 로컬과 병합
   * 반환: { ok: true, added, updated } 또는 { ok: false, message }
   */
  async function syncFromGist() {
    const result = await pullFromGist();
    if (!result.ok) return result;

    const remote = result.list;
    if (!remote.length) return { ok: true, added: 0, updated: 0 };

    const local = _read();
    const localMap = {};
    local.forEach(m => { localMap[m.id] = m; });

    let added = 0, updated = 0;
    remote.forEach(rm => {
      if (!rm.id) return;
      if (!localMap[rm.id]) {
        local.push(normalizeUniMaterial(rm));
        added++;
      } else {
        const localUpdated = new Date(localMap[rm.id].updatedAt || 0);
        const remoteUpdated = new Date(rm.updatedAt || 0);
        if (remoteUpdated > localUpdated) {
          const idx = local.findIndex(m => m.id === rm.id);
          if (idx !== -1) { local[idx] = normalizeUniMaterial(rm); updated++; }
        }
      }
    });

    if (added > 0 || updated > 0) _write(local);
    return { ok: true, added, updated };
  }

  /**
   * 로컬 삭제 후 Gist 동기화 (관리자 전용)
   */
  async function deleteAndSyncUniMaterial(id) {
    const list = _read();
    const next = list.filter(item => item.id !== id);
    if (next.length === list.length) {
      return { ok: false, message: '해당 ID의 자료를 찾을 수 없습니다: ' + id };
    }
    const writeResult = _write(next);
    if (writeResult !== true) return { ok: false, message: writeResult };

    const pushResult = await pushToGist(next);
    return {
      ok: true,
      synced: pushResult.ok,
      syncMessage: pushResult.ok ? null : pushResult.message
    };
  }

  function deleteUniMaterialSummary(id) {
    const list = _read();
    const next = list.filter(item => item.id !== id);
    if (next.length === list.length) {
      return { ok: false, message: '해당 ID의 자료를 찾을 수 없습니다: ' + id };
    }
    const result = _write(next);
    if (result !== true) return { ok: false, message: result };
    return { ok: true };
  }

  function findUniMaterialById(id) {
    return _read().find(item => item.id === id) || null;
  }

  function clearUniMaterials() {
    const result = _write([]);
    if (result !== true) return { ok: false, message: result };
    return { ok: true };
  }

  // ─────────────────────────────────────
  //  전역 노출
  // ─────────────────────────────────────
  window.createUniMaterialId       = createUniMaterialId;
  window.getSavedUniMaterials      = getSavedUniMaterials;
  window.saveUniMaterialSummary    = saveUniMaterialSummary;
  window.saveAndSyncUniMaterial    = saveAndSyncUniMaterial;
  window.syncFromGist              = syncFromGist;
  window.deleteUniMaterialSummary  = deleteUniMaterialSummary;
  window.deleteAndSyncUniMaterial  = deleteAndSyncUniMaterial;
  window.findUniMaterialById       = findUniMaterialById;
  window.clearUniMaterials         = clearUniMaterials;
  window.normalizeUniMaterial      = normalizeUniMaterial;
  window.getGistConfig             = getGistConfig;
  window.setGistConfig             = setGistConfig;
  window.clearGistConfig           = clearGistConfig;
  window.pushToGist                = pushToGist;
  window.pullFromGist              = pullFromGist;
  window.createGist                = createGist;

  // ── 페이지 로드 시 Gist 자동 동기화 (읽기 전용, 토큰 불필요) ──
  const AUTO_SYNC_KEY = 'saenggibu_gist_last_sync';
  const AUTO_SYNC_TTL = 60 * 60 * 1000; // 1시간마다 재동기화

  function _shouldAutoSync() {
    try {
      const last = parseInt(localStorage.getItem(AUTO_SYNC_KEY) || '0', 10);
      return Date.now() - last > AUTO_SYNC_TTL;
    } catch (e) { return true; }
  }

  async function _autoSyncFromGist() {
    if (!_shouldAutoSync()) return;
    try {
      const result = await syncFromGist();
      if (result.ok) {
        localStorage.setItem(AUTO_SYNC_KEY, Date.now().toString());
      }
    } catch (e) { /* 조용히 실패 */ }
  }

  // DOM 로드 후 자동 동기화 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoSyncFromGist);
  } else {
    setTimeout(_autoSyncFromGist, 1000);
  }

})();
