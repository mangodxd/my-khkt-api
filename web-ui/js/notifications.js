/**
 * Toast Notification System
 * Handles success, error, warning, and info notifications
 */

const toastArea = document.getElementById('toastArea');

export function toast(message, type = 'info', duration = 4000) {
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const titles = {
        success: 'Thành công',
        error: 'Lỗi',
        warning: 'Cảnh báo',
        info: 'Thông tin'
    };
    
    toastEl.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${titles[type] || 'Thông báo'}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close">×</button>
    `;
    
    const closeBtn = toastEl.querySelector('.toast-close');
    closeBtn.onclick = () => removeToast(toastEl);
    
    toastArea.appendChild(toastEl);
    
    // Auto-dismiss
    const timeoutId = setTimeout(() => {
        removeToast(toastEl);
    }, duration);
    
    toastEl.dataset.timeoutId = timeoutId;
    
    return toastEl;
}

function removeToast(toastEl) {
    if (toastEl.dataset.timeoutId) {
        clearTimeout(parseInt(toastEl.dataset.timeoutId));
    }
    toastEl.classList.add('removing');
    setTimeout(() => {
        if (toastEl.parentElement) {
            toastEl.remove();
        }
    }, 300);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

export const notify = {
    success: (msg, duration) => toast(msg, 'success', duration),
    error: (msg, duration) => toast(msg, 'error', duration || 6000),
    warning: (msg, duration) => toast(msg, 'warning', duration),
    info: (msg, duration) => toast(msg, 'info', duration),
};
