/**
 * Configuration Management Module
 * 
 * Handles system configuration UI and state management.
 * Syncs with API Gateway via WebSocket.
 */

import { fetchApi } from './api.js';
import { toast } from './ui.js';
import { getEnv } from './env.js';

// DOM elements
const overlay = document.getElementById('configModal');
const tagsWrap = document.getElementById('timeTagsWrap');
const newTimeInput = document.getElementById('newTimeInput');
const retryInput = document.getElementById('cfgRetryDelay');
const threshInput = document.getElementById('cfgThreshold');
const frameInput = document.getElementById('cfgFrameCount');
const msgEl = document.getElementById('configMsg');

/**
 * Local configuration cache, synced via WebSocket.
 */
let cfg = {
  image_capture_interval: [getEnv('IMAGE_CAPTURE_INTERVAL')],
  retry_delay: parseInt(getEnv('RETRY_DELAY')),
  face_recognition_threshold: parseFloat(getEnv('FACE_RECOGNITION_THRESHOLD')),
  frame_count: parseInt(getEnv('FRAME_COUNT')),
};

/**
 * Update configuration from WebSocket message.
 * 
 * @param {Object} data - Configuration data from server
 */
export function setConfig(data) {
  Object.assign(cfg, data);
}

/**
 * Get current configuration copy.
 * 
 * @returns {Object} Configuration object
 */
export function getConfig() {
  return { ...cfg };
}

/**
 * Render capture time tags with delete buttons.
 */
function renderTags() {
  tagsWrap.innerHTML = cfg.image_capture_interval.map((t, i) => `
    <div class="time-tag">
      <span>${t}</span>
      <button type="button" data-i="${i}" title="Delete">×</button>
    </div>
  `).join('');
  tagsWrap.querySelectorAll('button[data-i]').forEach(btn => {
    btn.onclick = () => {
      cfg.image_capture_interval.splice(+btn.dataset.i, 1);
      renderTags();
    };
  });
}

/**
 * Open configuration modal dialog.
 */
export function openConfig() {
  retryInput.value = cfg.retry_delay;
  threshInput.value = cfg.face_recognition_threshold;
  frameInput.value = cfg.frame_count;
  renderTags();
  msgEl.textContent = '';
  overlay.classList.remove('hidden');
}

/**
 * Close configuration modal dialog.
 */
export function closeConfig() {
  overlay.classList.add('hidden');
}

/**
 * Add new capture time slot.
 */
document.getElementById('addTimeBtn').onclick = () => {
  const v = newTimeInput.value;
  if (v && !cfg.image_capture_interval.includes(v)) {
    cfg.image_capture_interval.push(v);
    cfg.image_capture_interval.sort();
    renderTags();
    newTimeInput.value = '';
  }
};

/**
 * Save configuration to API Gateway.
 */
document.getElementById('saveConfigBtn').onclick = async () => {
  const payload = {
    image_capture_interval: cfg.image_capture_interval,
    retry_delay: parseInt(retryInput.value, 10),
    face_recognition_threshold: parseFloat(threshInput.value),
    frame_count: parseInt(frameInput.value, 10),
  };

  msgEl.style.color = 'var(--ink-muted)';
  msgEl.textContent = 'Saving...';
  document.getElementById('saveConfigBtn').disabled = true;

  try {
    const res = await fetchApi('/api/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.success) {
      Object.assign(cfg, payload);
      msgEl.style.color = 'var(--green)';
      msgEl.textContent = 'Saved.';
      toast('Configuration updated', 'info');
      setTimeout(closeConfig, 800);
    } else {
      throw new Error(res.message || 'Unknown error');
    }
  } catch (e) {
    msgEl.style.color = 'var(--red)';
    msgEl.textContent = `Error: ${e.message}`;
    toast('Failed to save configuration', 'err');
  } finally {
    document.getElementById('saveConfigBtn').disabled = false;
  }
};

/**
 * Close button handlers.
 */
document.getElementById('cancelConfigBtn').onclick = closeConfig;
document.getElementById('closeConfigBtn').onclick = closeConfig;
overlay.addEventListener('click', e => { if (e.target === overlay) closeConfig(); });