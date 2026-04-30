// ════════════════════════════════════════
//  adminAuth.js — 관리자 인증 모듈
//  비밀번호: localStorage에 해시로 저장
//  기본 비밀번호: saenggibu2024 (최초 설정 후 변경 가능)
// ════════════════════════════════════════
(function () {
  'use strict';

  const AUTH_KEY    = 'saenggibu_admin_auth_v1';
  const HASH_KEY    = 'saenggibu_admin_hash_v1';
  const SESSION_TTL = 60 * 60 * 1000; // 1시간 세션

  // ── 기본 비밀번호 해시 (SHA-256 of "123456")
  const DEFAULT_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

  // ── 간단 해시 (SHA-256 없는 환경 대비 자체 구현)
  async function _hash(str) {
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(str)
      );
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    }
    // fallback: 단순 해시
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return (h >>> 0).toString(16).padStart(8, '0').repeat(8);
  }

  function _getStoredHash() {
    return localStorage.getItem(HASH_KEY) || DEFAULT_HASH;
  }

  function _isSessionValid() {
    try {
      const raw = sessionStorage.getItem(AUTH_KEY);
      if (!raw) return false;
      const { ts } = JSON.parse(raw);
      return Date.now() - ts < SESSION_TTL;
    } catch (e) { return false; }
  }

  function _setSession() {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify({ ts: Date.now() }));
  }

  function _clearSession() {
    sessionStorage.removeItem(AUTH_KEY);
  }

  // ── 공개 API ──

  window.isAdminLoggedIn = function () {
    return _isSessionValid();
  };

  window.adminLogout = function () {
    _clearSession();
    _toast('관리자 로그아웃 되었습니다.', '#888');
    _updateAdminButtons();
    // 대학자료 탭 리렌더 (업로드 UI 숨김)
    if (typeof window.renderUniMaterialTab === 'function') {
      setTimeout(window.renderUniMaterialTab, 50);
    }
  };

  window.showAdminLoginModal = function (onSuccess) {
    // 이미 로그인 중이면 바로 성공
    if (_isSessionValid()) { if (onSuccess) onSuccess(); return; }

    const modal = document.createElement('div');
    modal.id = 'admin-login-modal';
    modal.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99999;' +
      'display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    modal.innerHTML = `
      <div style="background:var(--sur,#fff);border-radius:16px;padding:32px 36px;
                  width:320px;box-shadow:0 20px 60px rgba(0,0,0,.4);text-align:center;
                  border:1px solid var(--bdr,#ddd)">
        <div style="font-size:36px;margin-bottom:8px">🔐</div>
        <div style="font-size:18px;font-weight:800;color:var(--tx,#111);margin-bottom:4px">관리자 모드</div>
        <div style="font-size:12px;color:var(--tx3,#888);margin-bottom:20px;line-height:1.6">
          관리자 전용 기능입니다.<br>비밀번호를 입력하세요.
        </div>
        <input id="admin-pw-input" type="password" placeholder="비밀번호"
          style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid var(--bdr,#ddd);
                 border-radius:8px;font-size:15px;outline:none;background:var(--sur2,#f5f5f5);
                 color:var(--tx,#111);margin-bottom:8px"
          onkeydown="if(event.key==='Enter')document.getElementById('admin-login-confirm').click()"/>
        <div id="admin-pw-err" style="font-size:12px;color:#e74c3c;min-height:18px;margin-bottom:8px"></div>
        <div style="display:flex;gap:8px">
          <button onclick="document.getElementById('admin-login-modal').remove()"
            style="flex:1;padding:10px;background:var(--sur3,#eee);border:1px solid var(--bdr,#ddd);
                   border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;color:var(--tx2,#555)">
            취소
          </button>
          <button id="admin-login-confirm"
            style="flex:1;padding:10px;background:#2ecc71;border:none;
                   border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;color:#fff">
            로그인
          </button>
        </div>
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--bdr,#eee)">
          <button onclick="_showChangePwForm()"
            style="background:none;border:none;font-size:11px;color:var(--tx3,#aaa);
                   cursor:pointer;text-decoration:underline">
            비밀번호 변경
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('admin-pw-input')?.focus(), 100);

    document.getElementById('admin-login-confirm').onclick = async function () {
      const pw = document.getElementById('admin-pw-input').value;
      const errEl = document.getElementById('admin-pw-err');
      if (!pw) { errEl.textContent = '비밀번호를 입력하세요.'; return; }
      const h = await _hash(pw);
      if (h === _getStoredHash()) {
        _setSession();
        modal.remove();
        _toast('✅ 관리자로 로그인되었습니다.', '#1aaa6e');
        if (onSuccess) onSuccess();
        _updateAdminButtons();
        // 대학자료 탭 리렌더 (업로드 UI 표시)
        if (typeof window.renderUniMaterialTab === 'function') {
          setTimeout(window.renderUniMaterialTab, 50);
        }
      } else {
        errEl.textContent = '❌ 비밀번호가 올바르지 않습니다.';
        document.getElementById('admin-pw-input').value = '';
        document.getElementById('admin-pw-input').focus();
      }
    };
  };

  window._showChangePwForm = function () {
    const modal = document.getElementById('admin-login-modal');
    if (!modal) return;
    modal.querySelector('div > div').innerHTML = `
      <div style="font-size:36px;margin-bottom:8px">🔑</div>
      <div style="font-size:18px;font-weight:800;color:var(--tx,#111);margin-bottom:4px">비밀번호 변경</div>
      <div style="font-size:12px;color:var(--tx3,#888);margin-bottom:20px;line-height:1.6">
        현재 비밀번호와 새 비밀번호를 입력하세요.
      </div>
      <input id="admin-pw-old" type="password" placeholder="현재 비밀번호"
        style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid var(--bdr,#ddd);
               border-radius:8px;font-size:14px;outline:none;background:var(--sur2,#f5f5f5);
               color:var(--tx,#111);margin-bottom:8px"/>
      <input id="admin-pw-new1" type="password" placeholder="새 비밀번호 (6자리 이상)"
        style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid var(--bdr,#ddd);
               border-radius:8px;font-size:14px;outline:none;background:var(--sur2,#f5f5f5);
               color:var(--tx,#111);margin-bottom:8px"/>
      <input id="admin-pw-new2" type="password" placeholder="새 비밀번호 확인"
        style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid var(--bdr,#ddd);
               border-radius:8px;font-size:14px;outline:none;background:var(--sur2,#f5f5f5);
               color:var(--tx,#111);margin-bottom:8px"/>
      <div id="admin-cpw-err" style="font-size:12px;color:#e74c3c;min-height:18px;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px">
        <button onclick="document.getElementById('admin-login-modal').remove()"
          style="flex:1;padding:10px;background:var(--sur3,#eee);border:1px solid var(--bdr,#ddd);
                 border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;color:var(--tx2,#555)">
          취소
        </button>
        <button id="admin-cpw-confirm"
          style="flex:1;padding:10px;background:#3498db;border:none;
                 border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;color:#fff">
          변경
        </button>
      </div>`;
    document.getElementById('admin-cpw-confirm').onclick = async function () {
      const old1  = document.getElementById('admin-pw-old').value;
      const new1  = document.getElementById('admin-pw-new1').value;
      const new2  = document.getElementById('admin-pw-new2').value;
      const errEl = document.getElementById('admin-cpw-err');
      if (!old1 || !new1 || !new2) { errEl.textContent = '모든 필드를 입력하세요.'; return; }
      if (new1.length < 6) { errEl.textContent = '새 비밀번호는 6자리 이상이어야 합니다.'; return; }
      if (new1 !== new2) { errEl.textContent = '새 비밀번호가 일치하지 않습니다.'; return; }
      const oldHash = await _hash(old1);
      if (oldHash !== _getStoredHash()) { errEl.textContent = '현재 비밀번호가 올바르지 않습니다.'; return; }
      const newHash = await _hash(new1);
      localStorage.setItem(HASH_KEY, newHash);
      modal.remove();
      _toast('✅ 비밀번호가 변경되었습니다.', '#1aaa6e');
    };
  };

  // ── 토스트
  function _toast(msg, color) {
    color = color || '#1aaa6e';
    const t = document.createElement('div');
    t.style.cssText =
      'position:fixed;bottom:24px;right:24px;background:' + color +
      ';color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;' +
      'font-weight:700;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.2);max-width:320px;line-height:1.5';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ── 관리자 버튼 상태 갱신
  function _updateAdminButtons() {
    const btn = document.getElementById('admin-mode-btn');
    if (!btn) return;
    if (_isSessionValid()) {
      btn.innerHTML = '🔓 관리자 모드 <span style="font-size:10px;opacity:.8">(로그아웃)</span>';
      btn.style.background = '#1aaa6e';
      btn.onclick = function () { window.adminLogout(); };
    } else {
      btn.innerHTML = '🔐 관리자 모드';
      btn.style.background = '#e67e22';
      btn.onclick = function () {
        window.showAdminLoginModal(function () { _updateAdminButtons(); });
      };
    }
  }

  // ── 초기화: 사이드바에 관리자 버튼 추가
  function _init() {
    // 이미 있으면 skip
    if (document.getElementById('admin-mode-btn')) return;

    const footer = document.querySelector('.sb-ft');
    if (!footer) return;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:10px;';
    wrap.innerHTML = `
      <button id="admin-mode-btn"
        style="width:100%;padding:8px 10px;border:none;border-radius:8px;
               font-size:12px;font-weight:700;cursor:pointer;color:#fff;
               background:#e67e22;transition:background .2s;letter-spacing:0.3px"
        onclick="window.showAdminLoginModal(function(){ window._updateAdminButtons && window._updateAdminButtons(); })">
        🔐 관리자 모드
      </button>
`;
    footer.insertBefore(wrap, footer.firstChild);
  }

  // DOM 준비 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    setTimeout(_init, 100);
  }

  // 외부에서 버튼 상태 갱신 가능하도록 노출
  window._updateAdminButtons = _updateAdminButtons;

})();
