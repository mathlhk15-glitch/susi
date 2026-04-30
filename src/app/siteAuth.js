// ════════════════════════════════════════════════════════════════
//  siteAuth.js — 사이트 접근 잠금 모듈 (선생님 전용 입장 비밀번호)
//
//  ✅ 기본 접속 비밀번호: teacher2024
//  ✅ 비밀번호는 localStorage에 SHA-256 해시로 저장
//  ✅ 세션 유지: sessionStorage 활용 (브라우저 닫으면 재입력)
//  ✅ 비밀번호 변경: 관리자(adminAuth)로 로그인된 상태에서만 가능
//  ✅ 접근 차단: 인증 전 전체 UI를 덮는 잠금 화면 표시
// ════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── 스토리지 키 ──────────────────────────────────────────────
  const SITE_AUTH_SESSION_KEY = 'saenggibu_site_auth_v1';
  const SITE_PW_HASH_KEY      = 'saenggibu_site_pw_hash_v1';
  const SESSION_TTL           = 8 * 60 * 60 * 1000; // 8시간 세션

  // 기본 비밀번호: teacher2024  →  SHA-256 해시
  const DEFAULT_SITE_HASH = 'b0dea9d5b3ca87e7c3d0e4a0e2a5f1d8c4e9b6f2a1c3d7e8f9a2b4c5d6e7f8a9';
  // ↑ 위 해시는 placeholder입니다. 실제 해시는 init() 시점에 계산하여 덮어씁니다.

  // ── SHA-256 해시 함수 ────────────────────────────────────────
  async function _hash(str) {
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(str)
      );
      return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // fallback (crypto.subtle 미지원 환경)
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return (h >>> 0).toString(16).padStart(8, '0').repeat(8);
  }

  // 기본 비밀번호 해시 (런타임 계산, 최초 1회)
  let _defaultHashComputed = null;
  async function _getDefaultHash() {
    if (!_defaultHashComputed) {
      _defaultHashComputed = await _hash('teacher2024');
    }
    return _defaultHashComputed;
  }

  // ── 저장된 해시 반환 ─────────────────────────────────────────
  async function _getStoredHash() {
    return localStorage.getItem(SITE_PW_HASH_KEY) || (await _getDefaultHash());
  }

  // ── 세션 유효성 ─────────────────────────────────────────────
  function _isSessionValid() {
    try {
      const raw = sessionStorage.getItem(SITE_AUTH_SESSION_KEY);
      if (!raw) return false;
      const { ts } = JSON.parse(raw);
      return Date.now() - ts < SESSION_TTL;
    } catch (e) { return false; }
  }

  function _setSession() {
    sessionStorage.setItem(SITE_AUTH_SESSION_KEY, JSON.stringify({ ts: Date.now() }));
  }

  // ── 잠금 화면 생성 ───────────────────────────────────────────
  function _createLockScreen() {
    const overlay = document.createElement('div');
    overlay.id = 'site-lock-screen';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:999999',
      'background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)',
      'display:flex;align-items:center;justify-content:center',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
    ].join(';');

    overlay.innerHTML = `
      <div style="
        background:rgba(255,255,255,0.07);
        backdrop-filter:blur(20px);
        border:1px solid rgba(255,255,255,0.15);
        border-radius:24px;
        padding:40px 44px;
        width:340px;
        box-shadow:0 30px 80px rgba(0,0,0,0.5);
        text-align:center;
        color:#fff;
      ">
        <!-- 로고/아이콘 -->
        <div style="font-size:52px;margin-bottom:12px;line-height:1">🏫</div>
        <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;margin-bottom:6px">
          생기부 분석기
        </div>
        <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-bottom:28px;line-height:1.6">
          선생님 전용 서비스입니다.<br>접속 비밀번호를 입력해 주세요.
        </div>

        <!-- 비밀번호 입력 -->
        <input
          id="site-pw-input"
          type="password"
          placeholder="비밀번호 입력"
          autocomplete="current-password"
          style="
            width:100%;box-sizing:border-box;
            padding:13px 16px;
            background:rgba(255,255,255,0.1);
            border:1.5px solid rgba(255,255,255,0.2);
            border-radius:10px;
            font-size:16px;color:#fff;
            outline:none;
            margin-bottom:10px;
            letter-spacing:2px;
            transition:border-color .2s;
          "
          oninput="document.getElementById('site-pw-err').textContent=''"
          onkeydown="if(event.key==='Enter')document.getElementById('site-pw-submit').click()"
        />
        <div id="site-pw-err" style="
          font-size:12px;color:#ff6b6b;
          min-height:18px;margin-bottom:12px;
          font-weight:600;
        "></div>

        <!-- 입장 버튼 -->
        <button id="site-pw-submit" style="
          width:100%;padding:13px;
          background:linear-gradient(135deg,#667eea,#764ba2);
          border:none;border-radius:10px;
          font-size:15px;font-weight:800;color:#fff;
          cursor:pointer;
          box-shadow:0 4px 20px rgba(102,126,234,0.4);
          transition:opacity .2s,transform .1s;
          letter-spacing:0.5px;
        "
        onmouseover="this.style.opacity='.9'"
        onmouseout="this.style.opacity='1'"
        onmousedown="this.style.transform='scale(.98)'"
        onmouseup="this.style.transform='scale(1)'"
        >
          ✅ 입장하기
        </button>

        <!-- 관리자 비밀번호 변경 링크 -->
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1)">
          <button id="site-change-pw-btn" style="
            background:none;border:none;
            font-size:11px;color:rgba(255,255,255,0.35);
            cursor:pointer;text-decoration:underline;
          ">
            🔑 접속 비밀번호 변경 (관리자 전용)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 포커스
    setTimeout(() => document.getElementById('site-pw-input')?.focus(), 120);

    // 입장 버튼 클릭
    document.getElementById('site-pw-submit').onclick = async function () {
      const pw    = document.getElementById('site-pw-input').value;
      const errEl = document.getElementById('site-pw-err');
      if (!pw) { errEl.textContent = '비밀번호를 입력하세요.'; return; }

      const h       = await _hash(pw);
      const stored  = await _getStoredHash();
      if (h === stored) {
        _setSession();
        overlay.style.transition = 'opacity .4s';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 420);
      } else {
        errEl.textContent = '❌ 비밀번호가 올바르지 않습니다.';
        document.getElementById('site-pw-input').value = '';
        document.getElementById('site-pw-input').focus();
        // 흔들기 애니메이션
        const box = overlay.querySelector('div > div');
        box.style.animation = 'siteShake .35s';
        setTimeout(() => { box.style.animation = ''; }, 400);
      }
    };

    // 비밀번호 변경 (관리자 전용)
    document.getElementById('site-change-pw-btn').onclick = function () {
      _showChangePwModal();
    };
  }

  // ── 비밀번호 변경 모달 (관리자 인증 후 가능) ────────────────
  function _showChangePwModal() {
    // 관리자 로그인 여부 확인
    if (typeof window.isAdminLoggedIn !== 'function' || !window.isAdminLoggedIn()) {
      // 관리자 로그인 요청
      if (typeof window.showAdminLoginModal === 'function') {
        window.showAdminLoginModal(function () {
          // 관리자 인증 성공 → 변경 폼으로
          _openChangePwForm();
        });
      } else {
        alert('관리자 모듈을 불러올 수 없습니다.');
      }
      return;
    }
    _openChangePwForm();
  }

  function _openChangePwForm() {
    // 기존 모달 제거
    document.getElementById('site-cpw-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'site-cpw-modal';
    modal.style.cssText = [
      'position:fixed;inset:0;z-index:9999999',
      'background:rgba(0,0,0,0.7)',
      'display:flex;align-items:center;justify-content:center',
      'backdrop-filter:blur(6px)',
    ].join(';');

    modal.innerHTML = `
      <div style="
        background:var(--sur,#fff);
        border-radius:20px;padding:36px 40px;
        width:340px;
        box-shadow:0 20px 60px rgba(0,0,0,0.4);
        text-align:center;
        border:1px solid var(--bdr,#ddd);
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      ">
        <div style="font-size:40px;margin-bottom:10px">🔑</div>
        <div style="font-size:18px;font-weight:800;color:var(--tx,#111);margin-bottom:6px">
          접속 비밀번호 변경
        </div>
        <div style="font-size:12px;color:var(--tx3,#888);margin-bottom:24px;line-height:1.7">
          관리자 인증 완료 ✅<br>
          새로운 접속 비밀번호를 설정하세요.
        </div>

        <input id="site-cpw-new1" type="password" placeholder="새 비밀번호 (6자리 이상)"
          style="width:100%;box-sizing:border-box;padding:11px 14px;
                 border:1.5px solid var(--bdr,#ddd);border-radius:8px;
                 font-size:14px;outline:none;
                 background:var(--sur2,#f5f5f5);color:var(--tx,#111);
                 margin-bottom:8px"
        />
        <input id="site-cpw-new2" type="password" placeholder="새 비밀번호 확인"
          style="width:100%;box-sizing:border-box;padding:11px 14px;
                 border:1.5px solid var(--bdr,#ddd);border-radius:8px;
                 font-size:14px;outline:none;
                 background:var(--sur2,#f5f5f5);color:var(--tx,#111);
                 margin-bottom:8px"
          onkeydown="if(event.key==='Enter')document.getElementById('site-cpw-confirm').click()"
        />
        <div id="site-cpw-err"
          style="font-size:12px;color:#e74c3c;min-height:18px;margin-bottom:12px;font-weight:600">
        </div>

        <div style="display:flex;gap:8px">
          <button onclick="document.getElementById('site-cpw-modal').remove()"
            style="flex:1;padding:10px;background:var(--sur3,#eee);
                   border:1px solid var(--bdr,#ddd);border-radius:8px;
                   font-size:14px;font-weight:700;cursor:pointer;color:var(--tx2,#555)">
            취소
          </button>
          <button id="site-cpw-confirm"
            style="flex:1;padding:10px;background:#3498db;border:none;
                   border-radius:8px;font-size:14px;font-weight:700;
                   cursor:pointer;color:#fff">
            변경 저장
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('site-cpw-new1')?.focus(), 80);

    document.getElementById('site-cpw-confirm').onclick = async function () {
      const new1  = document.getElementById('site-cpw-new1').value;
      const new2  = document.getElementById('site-cpw-new2').value;
      const errEl = document.getElementById('site-cpw-err');

      if (!new1 || !new2)    { errEl.textContent = '모든 필드를 입력하세요.'; return; }
      if (new1.length < 6)   { errEl.textContent = '비밀번호는 6자리 이상이어야 합니다.'; return; }
      if (new1 !== new2)     { errEl.textContent = '비밀번호가 일치하지 않습니다.'; return; }

      const newHash = await _hash(new1);
      localStorage.setItem(SITE_PW_HASH_KEY, newHash);
      modal.remove();
      _toast('✅ 접속 비밀번호가 변경되었습니다.', '#1aaa6e');
      // 변경 즉시 반영: 기존 잠금화면 제거 후 재생성
      const existingLock = document.getElementById('site-lock-screen');
      if (existingLock) existingLock.remove();
      setTimeout(_createLockScreen, 3100);
    };
  }

  // ── 토스트 메시지 ────────────────────────────────────────────
  function _toast(msg, color) {
    const t = document.createElement('div');
    t.style.cssText = [
      'position:fixed;bottom:24px;right:24px',
      'background:' + (color || '#1aaa6e'),
      'color:#fff;padding:12px 20px;border-radius:10px',
      'font-size:13px;font-weight:700;z-index:999999',
      'box-shadow:0 4px 20px rgba(0,0,0,.2)',
      'max-width:320px;line-height:1.5'
    ].join(';');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ── 흔들기 애니메이션 CSS 삽입 ───────────────────────────────
  function _injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes siteShake {
        0%,100% { transform:translateX(0); }
        20%      { transform:translateX(-10px); }
        40%      { transform:translateX(10px); }
        60%      { transform:translateX(-8px); }
        80%      { transform:translateX(6px); }
      }
      #site-pw-input:focus {
        border-color:rgba(102,126,234,0.8) !important;
        background:rgba(255,255,255,0.15) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ── 공개 API ─────────────────────────────────────────────────

  /** 현재 사이트 인증 세션이 유효한지 반환 */
  window.isSiteAuthenticated = function () {
    return _isSessionValid();
  };

  /** 비밀번호 변경 모달 직접 열기 (관리자 인증 포함) */
  window.showSiteChangePwModal = function () {
    _showChangePwModal();
  };

  // ── 초기화: DOM 준비 후 잠금 화면 표시 ──────────────────────
  function _init() {
    _injectStyles();
    if (!_isSessionValid()) {
      _createLockScreen();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    // DOMContentLoaded 이미 지남 → 즉시 실행
    _init();
  }

})();
