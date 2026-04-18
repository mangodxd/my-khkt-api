// ═══════════════════════════════════════════
// ui.js — DOM state, render, utility
// ═══════════════════════════════════════════

// ── DOM refs ────────────────────────────────
export const DOM = {
  clock:          document.getElementById('navClock'),
  wsPill:         document.getElementById('wsPill'),
  wsText:         document.getElementById('wsText'),
  camStatus:      document.getElementById('camStatus'),
  camFrame:       document.getElementById('camFrame'),
  thumbStrip:     document.getElementById('thumbStrip'),
  checkinBtn:     document.getElementById('checkinBtn'),
  checkinLabel:   document.getElementById('checkinLabel'),
  presentCard:    document.getElementById('presentCard'),
  absentCard:     document.getElementById('absentCard'),
  countPresent:   document.getElementById('countPresent'),
  countAbsent:    document.getElementById('countAbsent'),
  progressFill:   document.getElementById('progressFill'),
  searchInput:    document.getElementById('searchInput'),
  rosterList:     document.getElementById('rosterList'),
  lastUpdateTime: document.getElementById('lastUpdateTime'),
  toastArea:      document.getElementById('toastArea'),
};

// ── Shared roster state ──────────────────────
export const state = {
  present:  [],
  absent:   [],
  view:     'present',   // 'present' | 'absent'
};

// ── Clock ────────────────────────────────────
export function updateClock() {
  const now  = new Date();
  const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  DOM.clock.textContent = `${time}  ${date}`;
}

// ── WebSocket status ─────────────────────────
export function setWsStatus(connected) {
  if (connected) {
    // Khi có mạng: Thông báo sẵn sàng
    setCamStatus('ONLINE', 'ok');
    DOM.checkinBtn.disabled = false;
  } else {
    // Khi mất mạng: Thông báo đang kết nối lại (thay vì Mất kết nối nghe rất nặng nề)
    setCamStatus('OFFLINE', 'error');
    DOM.checkinBtn.disabled = true;
  }
}

export function setCamStatus(text, cls = '') {
  DOM.camStatus.textContent = text;
  DOM.camStatus.className = 'cam-status' + (cls ? ' ' + cls : '');
}

// ── Camera / thumbnails ──────────────────────
const fixB64 = (s) =>
  !s ? '' : s.startsWith('data:image') ? s : 'data:image/webp;base64,' + s;

export function updateCameraView(images, mainImg) {
  // Use images array if provided, otherwise fall back to mainImg
  let imgs = [];
  
  if (Array.isArray(images) && images.length > 0) {
    imgs = images;
  } else if (mainImg) {
    imgs = [mainImg];
  }
  
  if (!imgs.length) return;

  // Show last frame as main
  DOM.camFrame.src = fixB64(imgs[imgs.length - 1]);

  // Thumbnails with selection capability
  DOM.thumbStrip.innerHTML = '';
  imgs.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = fixB64(src);
    img.title = `Frame ${i + 1}/${imgs.length}`;
    if (i === imgs.length - 1) img.classList.add('active');
    img.onclick = () => {
      DOM.camFrame.src = img.src;
      DOM.thumbStrip.querySelectorAll('img').forEach(t => t.classList.remove('active'));
      img.classList.add('active');
    };
    DOM.thumbStrip.appendChild(img);
  });
}

// ── Attendance data update ───────────────────
export function updateAttendanceData(presentNames, absentNames, lastUpdate) {
  state.present = presentNames || [];
  state.absent  = absentNames  || [];

  // Counts
  DOM.countPresent.textContent = state.present.length;
  DOM.countAbsent.textContent  = state.absent.length;

  // Progress bar
  const total = state.present.length + state.absent.length;
  const pct   = total > 0 ? Math.round(state.present.length / total * 100) : 0;
  DOM.progressFill.style.width = pct + '%';

  // Camera status summary
  setCamStatus(`${state.present.length}/${total} có mặt`, 'ok');

  // Last update time
  if (lastUpdate) {
    const d = new Date(lastUpdate);
    DOM.lastUpdateTime.textContent = isNaN(d)
      ? lastUpdate
      : d.toLocaleTimeString('vi-VN');
  }

  renderRoster();
}

// ── Tab toggle ───────────────────────────────
export function setTab(tab) {
  state.view = tab;
  if (tab === 'present') {
    DOM.presentCard.classList.add('active-present');
    DOM.absentCard.classList.remove('active-absent');
  } else {
    DOM.absentCard.classList.add('active-absent');
    DOM.presentCard.classList.remove('active-present');
  }
  DOM.searchInput.value = '';
  renderRoster();
}

// ── Roster render ────────────────────────────
export function renderRoster() {
  const term   = DOM.searchInput.value.toLowerCase().trim();
  const source = state.view === 'present' ? state.present : state.absent;
  const list   = term ? source.filter(n => n.toLowerCase().includes(term)) : source;

  DOM.rosterList.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = term ? 'Không tìm thấy' : 'Chưa có dữ liệu';
    DOM.rosterList.appendChild(empty);
    return;
  }

  list.forEach(name => {
    const row = document.createElement('div');
    row.className = `student-row ${state.view}`;

    const parts    = name.trim().split(' ');
    const initials = parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();

    const statusText = state.view === 'present' ? 'có mặt' : 'vắng mặt';

    row.innerHTML = `
      <div class="row-avatar">${initials}</div>
      <div class="row-info">
        <div class="row-name">${name}</div>
        <div class="row-sub">${statusText}</div>
      </div>
    `;

    row.onclick = () => toggleStudentStatus(name);
    DOM.rosterList.appendChild(row);
  });
}

function toggleStudentStatus(name) {
  const msg = state.view === 'present'
    ? `Đổi "${name}" sang VẮNG?`
    : `Đổi "${name}" sang CÓ MẶT?`;
  if (!confirm(msg)) return;

  if (state.view === 'present') {
    state.present = state.present.filter(n => n !== name);
    state.absent.push(name);
  } else {
    state.absent  = state.absent.filter(n => n !== name);
    state.present.push(name);
  }
  // Refresh counts
  DOM.countPresent.textContent = state.present.length;
  DOM.countAbsent.textContent  = state.absent.length;
  renderRoster();
}

// ── Checkin button state ─────────────────────
export function setCheckinProcessing(on) {
  DOM.checkinBtn.disabled = on;
  if (on) {
    DOM.checkinBtn.classList.add('processing');
    DOM.checkinLabel.textContent = 'ĐANG QUÉT...';
  } else {
    DOM.checkinBtn.classList.remove('processing');
    DOM.checkinLabel.textContent = 'ĐIỂM DANH';
  }
}

// ── Toast ────────────────────────────────────

const TOAST_DEFAULTS = {
  'ok':      4000,
  'success': 4000,
  'err':     0,        // Manual dismiss
  'error':   0,        // Manual dismiss
  'warn':    5000,
  'warning': 5000,
  'info':    4000,
};

export function toast(message, type = 'info', duration = null) {  
  // Use default duration if not specified
  if (duration === null) {
    duration = TOAST_DEFAULTS[type];
  }

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  
  const progressBar = duration > 0 ? '<div class="toast-progress"></div>' : '';
  
  el.innerHTML = `
    <span class="toast-msg">${message}</span>
    <button class="toast-close" title="Đóng">×</button>
    ${progressBar}
  `;
  
  DOM.toastArea.appendChild(el);

  // Close button handler
  el.querySelector('.toast-close').onclick = () => {
    el.classList.add('toast-exit');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };

  // Auto-dismiss if duration > 0
  if (duration > 0) {
    const startTime = Date.now();
    const progressEl = el.querySelector('.toast-progress');
    
    // Animate progress bar
    if (progressEl) {
      progressEl.style.animation = `toast-progress ${duration}ms linear forwards`;
    }

    setTimeout(() => {
      if (el.parentNode) {
        el.classList.add('toast-exit');
        el.addEventListener('animationend', () => el.remove(), { once: true });
      }
    }, duration);
  } else {
    // Error/manual dismiss: stay visible until clicked
    el.classList.add('toast-persistent');
  }
}

// Stack limit: remove oldest if exceeds
const observer = new MutationObserver(() => {
  const toasts = DOM.toastArea.querySelectorAll('.toast');
  if (toasts.length > 5) {
    toasts[0].remove();
  }
});

if (DOM.toastArea) {
  observer.observe(DOM.toastArea, { childList: true });
}