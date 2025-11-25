const API_GATEWAY_URL = 'https://my-khkt-api.onrender.com/'; 
const apiBaseUrl = API_GATEWAY_URL.replace(/\/+$/, '');

function buildApiUrl(path) {
    return `${apiBaseUrl}${path}`;
}

const absentBtn = document.getElementById('absentBtn');
const absentNames = [];
const attendanceList = document.getElementById('attendance-list');
const addTimeBtn = document.getElementById('addTimeBtn');
const checkinBtn = document.getElementById('checkinBtn');
const configMsg = document.getElementById('configMsg');
const configPopup = document.getElementById('configPopup');
const configData = { image_capture_interval: [], retry_delay: 3, face_recognition_threshold: 0.25, frame_count: 2 };
const cancelConfigBtn = document.getElementById('cancelConfigBtn');
const faceThreshold = document.getElementById('faceThreshold');
const frameCountInput = document.getElementById('frameCount');
const frameImg = document.getElementById('frame');
const logoutBtn = document.getElementById('logoutBtn');
const newTimeInput = document.getElementById('newTimeInput');
const openConfigBtn = document.getElementById('openConfigBtn');
const presentBtn = document.getElementById('presentBtn');
const presentNames = [];
const retryDelay = document.getElementById('retryDelay');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const summary = document.getElementById('summary');
const thumbnailsBox = document.getElementById('thumbnailsBox');
const timeList = document.getElementById('timeList');

function fixBase64(str) {
  if (!str) return "";
  if (str.startsWith("data:image")) return str;
  return "data:image/jpeg;base64," + str;
}

function getToken() {
    return localStorage.getItem('authToken');
}

function checkAuthentication() {
    if (!getToken()) {
        window.location.href = '/login.html'; 
        return false;
    }
    return true;
}

function createAuthHeader(method, body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    return options;
}

logoutBtn.onclick = () => {
    try {
        localStorage.removeItem('authToken');
        window.location.href = '/login.html';
    } catch (e) {
        console.error(`${e.name}: ${e.message}`);
    }
};

function showLoadingState(message = 'Đang xử lý...') {
    summary.textContent = message;
    checkinBtn.disabled = true;
    checkinBtn.textContent = 'Đang xử lý...';
}

function hideLoadingState(message = 'Đã sẵn sàng.') {
    checkinBtn.disabled = false;
    checkinBtn.textContent = 'Điểm danh';
    summary.textContent = message;
}

async function fetchAttendance() {
  if (!checkAuthentication()) return; 
  showLoadingState('Đang tải dữ liệu...');
  try {
    const options = createAuthHeader('GET');
    const res = await fetch(buildApiUrl('/api/attendance'), options);
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    const data = await res.json();
    const images = data.images || [];
    const names = data.present_names || data.present || [];

    updateCameraView(images, data.image);
    summary.textContent = `${names.length}/${data.total ?? 0} có mặt — ${data.last_update || ''}`;

    presentNames.length = 0;
    presentNames.push(...names);
    absentNames.length = 0;
    absentNames.push(...(data.absent || []));
    renderAttendance(presentBtn.classList.contains('active') ? 'present' : 'absent');
  } catch (e) {
    console.error(`${e.name}: ${e.message}`);
    summary.textContent = 'Đã xảy ra lỗi, vui lòng thử lại sau.';
  } finally {
    hideLoadingState();
  }
}

async function doCheckin() {
  if (!checkAuthentication()) return; 
  try {
    const options = createAuthHeader('POST');
    const res = await fetch(buildApiUrl('/api/command/trigger_checkin'), options);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(`API trigger failed`);
    summary.textContent = 'Đợi kết quả...';
    setTimeout(fetchAttendance, 3000);
  } catch (e) {
    console.error(`${e.name}: ${e.message}`);
    hideLoadingState('Đã xảy ra lỗi, vui lòng thử lại sau.');
  }
}

function updateCameraView(images, fallbackImage) {
    try {
        const mainImage = images[0] || fallbackImage || '';
        frameImg.src = fixBase64(mainImage);
        thumbnailsBox.innerHTML = (images||[]).map((src, index) =>
            `<img src="${fixBase64(src)}" class="${index === 0 ? 'active' : ''}" data-index="${index}" />`
        ).join('');
        document.querySelectorAll('#thumbnailsBox img').forEach(img=>{
          img.onclick=()=> {
            frameImg.src = img.src;
            document.querySelectorAll('#thumbnailsBox img').forEach(i=>i.classList.remove('active'));
            img.classList.add('active');
          };
        });
    } catch (e) {
        console.error(`${e.name}: ${e.message}`);
    }
}

openConfigBtn.onclick = async () => {
  if (!checkAuthentication()) return; 
  configPopup.classList.remove('hidden');
  configMsg.textContent = 'Đang tải cấu hình...';
  try {
    const options = createAuthHeader('GET');
    const res = await fetch(buildApiUrl('/api/config'), options);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const fetchedConfig = await res.json();
    Object.assign(configData, fetchedConfig);
    configMsg.textContent = 'Đã tải cấu hình.';
  } catch (e) {
    console.error(`${e.name}: ${e.message}`);
    configMsg.textContent = 'Đã xảy ra lỗi, vui lòng thử lại sau.';
    Object.assign(configData, { image_capture_interval: [], retry_delay: 3, face_recognition_threshold: 0.25, frame_count: 2 });
  }
  retryDelay.value = configData.retry_delay ?? 3;
  faceThreshold.value = configData.face_recognition_threshold ?? 0.25;
  frameCountInput.value = configData.frame_count ?? 2;
  renderTimes();
};

saveConfigBtn.onclick = async () => {
  if (!checkAuthentication()) return; 
  configData.retry_delay = parseFloat(retryDelay.value) || 1;
  configData.face_recognition_threshold = parseFloat(faceThreshold.value) || 0.25;
  configData.frame_count = parseInt(frameCountInput.value) || 1;
  configMsg.textContent = 'Đang gửi cấu hình...';
  try {
    const options = createAuthHeader('POST', configData);
    const res = await fetch(buildApiUrl('/api/config'), options);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(`Config update failed`);
    setTimeout(() => configPopup.classList.add('hidden'), 800);
  } catch (e) {
    console.error(`${e.name}: ${e.message}`);
    configMsg.textContent = 'Đã xảy ra lỗi, vui lòng thử lại sau.';
  }
};

function renderAttendance(type) {
    try {
        let list = type === 'present' ? presentNames : absentNames;
        attendanceList.innerHTML = list.map(n => `<li>${n}</li>`).join('');
        attendanceList.classList.toggle('list-present', type === 'present');
        presentBtn.classList.toggle('active', type==='present');
        absentBtn.classList.toggle('active', type==='absent');
    } catch(e) { console.error(`${e.name}: ${e.message}`); }
}

presentBtn.onclick = () => { try { renderAttendance('present'); } catch(e){console.error(e)} };
absentBtn.onclick = () => { try { renderAttendance('absent'); } catch(e){console.error(e)} };

function renderTimes() {
    try {
        timeList.innerHTML = '';
        (configData.image_capture_interval||[]).sort().forEach((t)=>{
            const li=document.createElement('li');
            li.textContent=t+' ';
            const del=document.createElement('button');
            del.className='time-del-btn';
            del.textContent='✕';
            del.onclick=()=> { 
                configData.image_capture_interval = configData.image_capture_interval.filter(item => item !== t);
                renderTimes(); 
            };
            li.appendChild(del);
            timeList.appendChild(li);
        });
    } catch(e){ console.error(e); }
}

newTimeInput.addEventListener('input', ()=>{
    try {
        newTimeInput.value = newTimeInput.value.replace(/[^0-9:]/g,'');
        if(newTimeInput.value.length>5) newTimeInput.value=newTimeInput.value.slice(0,5);
        if(/^\d{2}$/.test(newTimeInput.value)) newTimeInput.value+=':';
    } catch(e){ console.error(e); }
});

addTimeBtn.onclick = ()=>{ 
    try {
        const t = newTimeInput.value.trim();
        if(/^([01]\d|2[0-3]):([0-5]\d)$/.test(t)){
            if(!configData.image_capture_interval.includes(t)){
                configData.image_capture_interval.push(t);
                renderTimes();
            }
            newTimeInput.value='';
        } else if(t) alert("Vui lòng nhập giờ hợp lệ theo dạng 24h (00:00 – 23:59).");
    } catch(e){ console.error(e); }
};

cancelConfigBtn.onclick = ()=>{ try { configPopup.classList.add('hidden'); configMsg.textContent=''; } catch(e){ console.error(e); }};

if (checkAuthentication()) { 
    fetchAttendance();
    checkinBtn.onclick = doCheckin;
    setInterval(fetchAttendance,15000);
}
