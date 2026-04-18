// ═══════════════════════════════════════════
// login.js — Login page logic
// ═══════════════════════════════════════════

import { initEnv } from './js/env.js';
import { isAuthenticated, setToken, fetchApi } from './js/api.js';

await initEnv();

// already logged in -> go to dashboard
if (isAuthenticated()) {
  window.location.href = 'index.html';
}

const emailEl = document.getElementById('loginEmail');
const passEl  = document.getElementById('loginPassword');
const btnEl   = document.getElementById('loginBtn');
const errEl   = document.getElementById('loginError');

async function doLogin() {
  const email    = emailEl.value.trim();
  const password = passEl.value;

  if (!email || !password) {
    errEl.textContent = 'Vui lòng điền đầy đủ thông tin.';
    setTimeout(() => {
      errEl.textContent = '';
    }, 3000);
  }

  errEl.textContent = '';
  btnEl.disabled    = true;
  btnEl.textContent = 'ĐANG XỬ LÝ...';

  try {
    // fake login, just a placeholder for real API call
    const token = 'fake_token_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    setToken(token);
    window.location.href = 'index.html';
  } catch (e) {
    errEl.textContent = e.message;
    btnEl.disabled    = false;
    btnEl.textContent = 'ĐĂNG NHẬP';
  }
}

btnEl.onclick = doLogin;
document.getElementById('loginPassword').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});