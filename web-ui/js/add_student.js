// ═══════════════════════════════════════════
// Add Student Page
// ═══════════════════════════════════════════

const DOM = {
    video: document.getElementById('video'),
    canvas: document.getElementById('canvas'),
    preview: document.getElementById('preview'),
    previewImg: document.getElementById('previewImg'),
    nameInput: document.getElementById('name'),
    captureBtn: document.getElementById('capture'),
    resetBtn: document.getElementById('reset'),
    submitBtn: document.getElementById('submit'),
    statusDiv: document.getElementById('status'),
    captureText: document.getElementById('captureText'),
};

let state = {
    imageData: null,
    isLoading: false,
    cameraStream: null,
};

const showToast = window.toast || function(msg, type) { alert(msg); };

export async function init(api) {
    window.showToast = showToast;
    
    // Initialize camera
    await initializeCamera();
    
    // Event listeners
    DOM.captureBtn.addEventListener('click', handleCapture);
    DOM.resetBtn.addEventListener('click', handleReset);
    DOM.submitBtn.addEventListener('click', handleSubmit);
    DOM.nameInput.addEventListener('input', checkFormValidity);
}

async function initializeCamera() {
    try {
        const constraints = {
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        };
        
        state.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        DOM.video.srcObject = state.cameraStream;
        
        DOM.video.addEventListener('loadedmetadata', () => {
            DOM.video.play();
        });
    } catch (error) {
        console.error('Camera error:', error);
        showToast(`Lỗi truy cập camera: ${error.message}`, 'error');
        setStatus(`Lỗi truy cập camera. Vui lòng cấp quyền truy cập camera.`, 'error');
        DOM.captureBtn.disabled = true;
    }
}

function handleCapture() {
    if (state.imageData) {
        handleReset();
        return;
    }
    
    try {
        const context = DOM.canvas.getContext('2d');
        context.drawImage(DOM.video, 0, 0, DOM.canvas.width, DOM.canvas.height);
        
        state.imageData = DOM.canvas.toDataURL('image/jpeg', 0.9);
        
        // Show preview
        DOM.video.style.display = 'none';
        DOM.preview.style.display = 'block';
        DOM.previewImg.src = state.imageData;
        
        DOM.captureText.textContent = 'Chụp Lại';
        DOM.resetBtn.style.display = '';
        checkFormValidity();
        
        showToast('Đã chụp ảnh thành công', 'success');
    } catch (error) {
        console.error('Capture error:', error);
        showToast(`Lỗi chụp ảnh: ${error.message}`, 'error');
    }
}

function handleReset() {
    state.imageData = null;
    
    DOM.video.style.display = 'block';
    DOM.preview.style.display = 'none';
    DOM.captureText.textContent = 'Chụp Ảnh';
    DOM.resetBtn.style.display = 'none';
    
    setStatus('', '');
    checkFormValidity();
}

function checkFormValidity() {
    const hasName = DOM.nameInput.value.trim().length > 0;
    const hasImage = state.imageData !== null;
    
    if (hasName && !DOM.nameInput.value.match(/^[a-zA-Z0-9\\s\\u0100-\\u01B0\\u1E00-\\u1EFF\\s]+$/)) {
        DOM.nameInput.style.borderColor = 'var(--red)';
        return;
    } else {
        DOM.nameInput.style.borderColor = '';
    }
    
    DOM.submitBtn.disabled = !(hasName && hasImage);
}

async function handleSubmit() {
    const name = DOM.nameInput.value.trim();
    
    // Validation
    if (!name) {
        showToast('Vui lòng nhập tên học sinh', 'error');
        return;
    }
    
    if (!state.imageData) {
        showToast('Vui lòng chụp ảnh', 'error');
        return;
    }
    
    if (name.length < 2) {
        showToast('Tên học sinh phải có ít nhất 2 ký tự', 'error');
        return;
    }
    
    if (name.length > 100) {
        showToast('Tên học sinh không được vượt quá 100 ký tự', 'error');
        return;
    }
    
    state.isLoading = true;
    DOM.submitBtn.disabled = true;
    setStatus('Đang xử lý...', 'info');
    
    try {
        const imageBase64 = state.imageData.split(',')[1];
        const response = await api.addStudent(name, imageBase64);
        
        if (response.success) {
            setStatus('Đã thêm học sinh thành công! Đang chuyển hướng...', 'success');
            showToast(`Đã thêm học sinh "${name}" thành công`, 'success');
            
            // Stop camera stream
            if (state.cameraStream) {
                state.cameraStream.getTracks().forEach(track => track.stop());
            }
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            throw new Error(response.message || 'Không thể thêm học sinh');
        }
    } catch (error) {
        console.error('Submit error:', error);
        const errorMsg = error.message || 'Lỗi không xác định';
        setStatus(`Lỗi: ${errorMsg}`, 'error');
        showToast(`Lỗi: ${errorMsg}`, 'error');
        
        state.isLoading = false;
        DOM.submitBtn.disabled = false;
    }
}

function setStatus(message, type) {
    if (!message) {
        DOM.statusDiv.style.display = 'none';
        return;
    }
    
    DOM.statusDiv.style.display = 'block';
    DOM.statusDiv.textContent = message;
    
    if (type === 'error') {
        DOM.statusDiv.style.background = 'var(--red-dim)';
        DOM.statusDiv.style.color = 'var(--red)';
        DOM.statusDiv.style.borderLeft = '4px solid var(--red)';
    } else if (type === 'success') {
        DOM.statusDiv.style.background = 'var(--green-dim)';
        DOM.statusDiv.style.color = 'var(--green)';
        DOM.statusDiv.style.borderLeft = '4px solid var(--green)';
    } else {
        DOM.statusDiv.style.background = 'var(--blue-dim)';
        DOM.statusDiv.style.color = 'var(--primary)';
        DOM.statusDiv.style.borderLeft = '4px solid var(--primary)';
    }
}