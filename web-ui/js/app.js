// ═══════════════════════════════════════════
// app.js — Main entry point
// ═══════════════════════════════════════════

import { initEnv } from './env.js';
import { isAuthenticated, clearToken, fetchApi, getWsUrl } from './api.js';
import * as UI     from './ui.js';
import * as Config from './config.js';
import * as History from './history.js';

// Initialize environment variables
await initEnv();

// ── Guard ────────────────────────────────────
if (!isAuthenticated()) {
  window.location.href = 'login.html';
}

// ── Clock ────────────────────────────────────
UI.updateClock();
setInterval(UI.updateClock, 1000);

// ── Roster interaction ───────────────────────
UI.DOM.presentCard.onclick  = () => UI.setTab('present');
UI.DOM.absentCard.onclick   = () => UI.setTab('absent');
UI.DOM.searchInput.addEventListener('input', UI.renderRoster);

// ── Logout ───────────────────────────────────
document.getElementById('logoutBtn').onclick = () => {
  clearToken();
  window.location.href = 'login.html';
};

// ── Config modal ─────────────────────────────
document.getElementById('openConfigBtn').onclick = Config.openConfig;

// ── History modal ─────────────────────────────
document.getElementById('openHistoryBtn').onclick = History.openHistory;

// ── Checkin ───────────────────────────────────
UI.DOM.checkinBtn.onclick = async () => {
  UI.setCheckinProcessing(true);
  try {
    const res = await fetchApi('/api/command/trigger_checkin', { method: 'POST' });
    if (!res.success) throw new Error(res.message || 'Lỗi kích hoạt');
    UI.setCamStatus('Đang quét AI...', '');
  } catch (e) {
    UI.setCheckinProcessing(false);
    UI.toast(`Lỗi: ${e.message}`, 'error');
  }
};

// ── WebSocket ─────────────────────────────────
let ws;
let reconnectTimer;

function connectWS() {
  clearTimeout(reconnectTimer);
  try {
    ws = new WebSocket(getWsUrl());
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => UI.setWsStatus(true);

  ws.onmessage = ({ data }) => {
    try {
      const msg = JSON.parse(data);
      handleWsMessage(msg);
    } catch { /* ignore malformed */ }
  };

  ws.onerror = () => { /* let onclose handle it */ };

  ws.onclose = () => {
    UI.setWsStatus(false);
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  reconnectTimer = setTimeout(connectWS, 3000);
}

function handleWsMessage(msg) {
  if (msg.type === 'attendance_update') {
    const att = msg.payload;
    UI.updateCameraView(att.images, att.image);
    UI.updateAttendanceData(att.present_names, att.absent_names, att.last_update);
    UI.setCheckinProcessing(false);
    UI.toast(`Điểm danh xong — ${(att.present_names||[]).length}/${(att.present_names||[]).length + (att.absent_names||[]).length} có mặt`, 'success');
  } else if (msg.type === 'config_update') {
    Config.setConfig(msg.payload);
  }
}

// Start WS
connectWS();

// ── Load latest session on startup ───────────
(async () => {
  try {
    const res = await fetchApi('/api/attendance/history?limit=1&offset=0');
    if (res.success && res.data?.[0]) {
      const latest = await fetchApi(`/api/attendance/history/${res.data[0].id}`);
      if (latest.success && latest.data) {
        const d = latest.data;
        UI.updateAttendanceData(d.present_names, d.absent_names, d.created_at);
        if (d.images?.[0]) UI.updateCameraView([], d.images[0].image_data);
      }
    }
  } catch { /* non-critical */ }
})();