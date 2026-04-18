// ═══════════════════════════════════════════
// history.js — History modal
// ═══════════════════════════════════════════

import { fetchApi } from './api.js';

const overlay    = document.getElementById('historyModal');
const itemsEl    = document.getElementById('historyItems');
const loadMoreEl = document.getElementById('loadMoreBtn');
const detailPane = document.getElementById('historyDetailPane');

const PAGE = 20;
let offset        = 0;
let hasMore       = true;
let activeId      = null;

// ── Open ─────────────────────────────────────
export async function openHistory() {
  offset   = 0;
  hasMore  = true;
  activeId = null;
  itemsEl.innerHTML   = '<p class="history-loading">Đang tải...</p>';
  loadMoreEl.classList.add('hidden');
  detailPane.innerHTML = '<div class="detail-empty">Chọn một phiên để xem chi tiết</div>';
  overlay.classList.remove('hidden');
  await loadPage();
}

export function closeHistory() {
  overlay.classList.add('hidden');
}

// ── Load page ────────────────────────────────
async function loadPage() {
  try {
    const res = await fetchApi(`/api/attendance/history?limit=${PAGE}&offset=${offset}`);
    if (!res.success || !Array.isArray(res.data)) throw new Error();

    if (offset === 0) itemsEl.innerHTML = '';

    if (res.data.length === 0 && offset === 0) {
      itemsEl.innerHTML = '<p class="history-loading">Chưa có phiên nào.</p>';
      return;
    }

    res.data.forEach(item => itemsEl.appendChild(buildItem(item)));

    hasMore = res.data.length === PAGE;
    loadMoreEl.classList.toggle('hidden', !hasMore);
    offset += res.data.length;

    // Auto-select first
    if (offset === res.data.length && res.data.length > 0) {
      selectItem(res.data[0].id);
    }
  } catch {
    if (offset === 0) {
      itemsEl.innerHTML = '<p class="history-loading" style="color:var(--red)">Lỗi tải dữ liệu.</p>';
    }
  }
}

loadMoreEl.onclick = loadPage;

// ── Build history item ───────────────────────
function buildItem(item) {
  const d   = new Date(item.created_at);
  const fmt = isNaN(d) ? item.created_at : d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

  const el = document.createElement('div');
  el.className = 'h-item';
  el.dataset.id = item.id;
  el.innerHTML = `
    <div class="h-date">${fmt}</div>
    <div class="h-meta">
      <span class="h-source-tag">${(item.source || 'manual').toUpperCase()}</span>
      <span class="h-counts">
        <span class="p">${item.present_count}</span>/<span class="a">${item.absent_count}</span>
      </span>
    </div>
  `;
  el.onclick = () => selectItem(item.id);
  return el;
}

// ── Select / load detail ─────────────────────
async function selectItem(id) {
  // Highlight
  itemsEl.querySelectorAll('.h-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id == id);
  });
  activeId = id;

  detailPane.innerHTML = '<div class="detail-empty">Đang tải...</div>';

  try {
    const res = await fetchApi(`/api/attendance/history/${id}`);
    if (!res.success || !res.data) throw new Error();
    renderDetail(res.data);
  } catch {
    detailPane.innerHTML = '<div class="detail-empty" style="color:var(--red)">Lỗi tải chi tiết.</div>';
  }
}

// ── Render detail ────────────────────────────
function renderDetail(d) {
  const primaryImg = d.images?.find(i => i.is_primary) || d.images?.[0];
  const imgHtml = primaryImg
    ? `<div class="detail-img-wrap"><img src="data:image/jpeg;base64,${primaryImg.image_data}" alt="" loading="lazy"></div>`
    : '';

  const makeChips = (names, cls) =>
    (names || []).map(n => `<span class="chip ${cls}">${n}</span>`).join('');

  const dt  = new Date(d.created_at);
  const fmt = isNaN(dt) ? d.created_at : dt.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

  detailPane.innerHTML = `
    ${imgHtml}
    <div class="detail-stat-row">
      <div class="detail-stat">
        <div class="detail-stat-n">${d.total || (d.present_count + d.absent_count)}</div>
        <div class="detail-stat-l">SĨ SỐ</div>
      </div>
      <div class="detail-stat">
        <div class="detail-stat-n p">${d.present_count}</div>
        <div class="detail-stat-l">CÓ MẶT</div>
      </div>
      <div class="detail-stat">
        <div class="detail-stat-n a">${d.absent_count}</div>
        <div class="detail-stat-l">VẮNG</div>
      </div>
    </div>
    <div style="font-size:10px;color:var(--ink-muted);font-family:var(--mono);margin-bottom:12px;">
      ${fmt} · ${(d.source || '').toUpperCase()}
    </div>
    <div class="detail-section">
      <div class="detail-section-title">CÓ MẶT (${(d.present_names||[]).length})</div>
      <div class="chip-list">${makeChips(d.present_names, 'p') || '<span style="font-size:11px;color:var(--ink-faint)">—</span>'}</div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">VẮNG (${(d.absent_names||[]).length})</div>
      <div class="chip-list">${makeChips(d.absent_names, 'a') || '<span style="font-size:11px;color:var(--ink-faint)">—</span>'}</div>
    </div>
  `;
}

// ── Close on overlay click ────────────────────
overlay.addEventListener('click', e => { if (e.target === overlay) closeHistory(); });
document.getElementById('closeHistoryBtn').onclick = closeHistory;