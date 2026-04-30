// ════════════════════════════════════════════════════════════════
//  siteAuth.js — 사이트 접근 잠금 모듈 (선생님 전용 입장 비밀번호)
//
//  ✅ 접속 비밀번호: 코드에 고정 (변경 시 파일 수정 후 재업로드)
//  ✅ 세션 유지: sessionStorage 활용 (브라우저 닫으면 재입력)
//  ✅ 접근 차단: 인증 전 전체 UI를 덮는 잠금 화면 표시
// ════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const SITE_AUTH_SESSION_KEY = 'saenggibu_site_auth_v1';
  const SESSION_TTL           = 8 * 60 * 60 * 1000; // 8시간 세션

  // 접속 비밀번호 해시 (SHA-256 of "ruddlf") — 고정값
  const SITE_PW_HASH = '7d33b47ed5c421f93569e5bb2a834460b9fa2ddf6c0b94ddc3c19a971c3e9da3';

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
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return (h >>> 0).toString(16).padStart(8, '0').repeat(8);
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
        <div style="font-size:52px;margin-bottom:12px;line-height:1">🏫</div>
        <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;margin-bottom:6px">
          생기부 분석기
        </div>
        <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-bottom:28px;line-height:1.6">
          선생님 전용 서비스입니다.<br>접속 비밀번호를 입력해 주세요.
        </div>
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
      </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('site-pw-input')?.focus(), 120);

    document.getElementById('site-pw-submit').onclick = async function () {
      const pw    = document.getElementById('site-pw-input').value;
      const errEl = document.getElementById('site-pw-err');
      if (!pw) { errEl.textContent = '비밀번호를 입력하세요.'; return; }

      const h = await _hash(pw);
      if (h === SITE_PW_HASH) {
        _setSession();
        overlay.style.transition = 'opacity .4s';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 420);
      } else {
        errEl.textContent = '❌ 비밀번호가 올바르지 않습니다.';
        document.getElementById('site-pw-input').value = '';
        document.getElementById('site-pw-input').focus();
        const box = overlay.querySelector('div > div');
        box.style.animation = 'siteShake .35s';
        setTimeout(() => { box.style.animation = ''; }, 400);
      }
    };
  }

  // ── 흔들기 애니메이션 CSS ────────────────────────────────────
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
  window.isSiteAuthenticated = function () {
    return _isSessionValid();
  };

  // 접속 비밀번호 변경 UI 제거 — 비밀번호는 코드에 고정
  window.showSiteChangePwModal = function () {
    alert('접속 비밀번호는 코드(siteAuth.js)에 고정되어 있습니다.\n변경하려면 파일을 수정 후 GitHub에 재업로드하세요.');
  };

  // ── 초기화 ───────────────────────────────────────────────────
  function _init() {
    _injectStyles();
    if (!_isSessionValid()) {
      _createLockScreen();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
