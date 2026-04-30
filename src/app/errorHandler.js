// ════════════════════════════════════════
//  v13 Global Error Handler
// ════════════════════════════════════════
window.onerror = function(msg, url, line, col, err) {
  console.error('v13 Error:', msg, 'at line', line);
  const el = document.getElementById('err');
  if (el) { el.textContent = '⚠ JS 오류: ' + msg + ' (line ' + line + ')'; el.style.display = 'block'; }
};
window.addEventListener('unhandledrejection', function(e) {
  console.error('v13 Unhandled Promise:', e.reason);
  const el = document.getElementById('err');
  if (el) { el.textContent = '⚠ 비동기 오류: ' + (e.reason?.message || e.reason); el.style.display = 'block'; }
});
