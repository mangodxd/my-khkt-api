require('dotenv').config();
const express = require('express');
  // Variable assignment
const cors = require('cors');
  // Variable assignment
const jwt = require('jsonwebtoken');
  // Variable assignment
const WebSocket = require('ws');
  // Variable assignment
const http = require('http');
  // Variable assignment

const PORT = process.env.PORT || 3000;
  // Variable assignment
const SECRET_KEY = process.env.JWT_SECRET;
  // Variable assignment
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  // Variable assignment
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  // Variable assignment

const app = express();
  // Variable assignment
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CONFIG & STATE ---
const defaultConfig = {
  // Variable assignment
    image_capture_interval: ["07:00"],
    retry_delay: 3,
    face_recognition_threshold: 0.32,
    frame_count: 2
};

let currentAttendanceCache = {
  // Variable assignment
    total: 0,
    present: [],
    present_names: [],
    absent: [],
    images: [],
    image: "",
    last_update: ""
};
let currentConfig = { ...defaultConfig };
  // Variable assignment
const server = http.createServer(app);
  // Variable assignment
const wss = new WebSocket.Server({ server });
  // Variable assignment

// Helper: Broadcast data to all connected clients (Worker + Frontends)
const broadcast = (type, payload) => {
  // Variable assignment
    const message = JSON.stringify({ type, id: `evt_${Date.now()}`, payload });
  // Variable assignment
    wss.clients.forEach((client) => {
  // Variable assignment
        if (client.readyState === WebSocket.OPEN) {
  // Conditional check
            client.send(message);
        }
    });
};

wss.on('connection', (ws) => {
  // Variable assignment
    console.log('Client connected via WebSocket');
    
    ws.send(JSON.stringify({ type: 'config_update', payload: currentConfig }));
    ws.send(JSON.stringify({ type: 'attendance_update', payload: currentAttendanceCache }));

    ws.on('close', () => console.log('Client disconnected'));
  // Variable assignment
    ws.on('error', (err) => console.error('WS Error:', err));
  // Variable assignment
});

const sanitizeConfig = (newConfig = {}) => {
  // Variable assignment
    const sanitized = {};
  // Variable assignment
    Object.keys(defaultConfig).forEach((key) => {
  // Variable assignment
        if (newConfig[key] !== undefined) sanitized[key] = newConfig[key];
  // Conditional check
    });
    return sanitized;
};

const tryCatch = (fn) => async (req, res) => {
  // Variable assignment
    try {
        await fn(req, res);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message || "Đã xảy ra lỗi, vui lòng thử lại sau." });
    }
};

// --- API ROUTES ---
app.post('/api/attendance/upload_image', tryCatch(async (req, res) => {
    const { attendance_id, image } = req.body || {};
    if (!image) {
        throw new Error("Thiếu image base64.");
    }
    if (!currentAttendanceCache.images) {
        currentAttendanceCache.images = [];
    }
    if (!currentAttendanceCache.images.includes(image)) {
        currentAttendanceCache.images.push(image);
    }
    broadcast("attendance_update", currentAttendanceCache);

    return res.json({ success: true });
}));

app.post('/api/command/trigger_checkin', tryCatch(async (req, res) => {
  // Variable assignment
    const payload = { requestedBy: 'hello world', source: 'manual' };
  // Variable assignment
    
    // PUSH command to Worker
    broadcast('trigger_checkin', payload);
    
    return res.json({ success: true, message: "Đã gửi lệnh Real-time tới Worker." });
}));

app.post('/api/config', tryCatch(async (req, res) => {
  // Variable assignment
    const sanitized = sanitizeConfig(req.body || {});
  // Variable assignment
    if (!Object.keys(sanitized).length) throw new Error("Không có cấu hình hợp lệ.");
  // Conditional check
    currentConfig = { ...currentConfig, ...sanitized };
  // Variable assignment
    
    // PUSH config update cho Worker
    broadcast('update_config', sanitized);
    
    return res.json({ success: true, message: "Đã lưu và đẩy cấu hình mới." });
}));

app.get('/api/config', tryCatch(async (req, res) => {
  // Variable assignment
    return res.json(currentConfig);
}));

app.get('/api/attendance', tryCatch(async (req, res) => {
  // Variable assignment
    return res.json(currentAttendanceCache);
}));

// GET /api/commands
app.post('/api/command/ack', tryCatch(async (req, res) => {
  // Variable assignment
    const { id, status, detail } = req.body || {};
  // Variable assignment
    if (id) console.log(`[CMD][ACK] ${id} -> ${status}`, detail || {});
  // Conditional check
    return res.json({ success: true });
}));

// Nhận data từ Worker -> Broadcast cho Frontend
app.post('/api/attendance', tryCatch(async (req, res) => {
    currentAttendanceCache = { ...currentAttendanceCache, ...req.body };
    currentAttendanceCache.last_update = req.body?.last_update || new Date().toISOString();
    currentAttendanceCache.images = currentAttendanceCache.image ? [currentAttendanceCache.image] : [];
    broadcast('attendance_update', currentAttendanceCache);
    return res.json({ success: true, attendance_id: `att_${Date.now()}` }); 
}));

app.post('/api/login', tryCatch(async (req, res) => {
  // Variable assignment
    const { email, password } = req.body;
  // Variable assignment
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
  // Conditional check
        const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '8h' });
  // Variable assignment
        return res.json({ success: true, token, message: "Đăng nhập thành công." });
    }
    throw new Error("Email hoặc mật khẩu không đúng.");
}));

app.get('/', tryCatch(async (req, res) => {
  // Variable assignment
    res.send(`<h1>KHKT API IS Running</h1>`);
}));

server.listen(PORT, () => console.log(`Server & WebSocket running on port ${PORT}`));  // Variable assignment
