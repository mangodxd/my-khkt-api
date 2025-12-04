require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CONFIG & STATE ---
const defaultConfig = {
    image_capture_interval: ["07:00"],
    retry_delay: 3,
    face_recognition_threshold: 0.32,
    frame_count: 2
};

let currentAttendanceCache = {
    total: 0,
    present: [],
    present_names: [],
    absent: [],
    images: [],
    image: "",
    last_update: ""
};
let currentConfig = { ...defaultConfig };
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Helper: Broadcast data to all connected clients (Worker + Frontends)
const broadcast = (type, payload) => {
    const message = JSON.stringify({ type, id: `evt_${Date.now()}`, payload });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};

wss.on('connection', (ws) => {
    console.log('Client connected via WebSocket');
    
    ws.send(JSON.stringify({ type: 'config_update', payload: currentConfig }));
    ws.send(JSON.stringify({ type: 'attendance_update', payload: currentAttendanceCache }));

    ws.on('close', () => console.log('Client disconnected'));
    ws.on('error', (err) => console.error('WS Error:', err));
});

// --- AUTH ---
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) throw new Error("Thiếu Token");

        const user = jwt.verify(token, SECRET_KEY);
        req.user = user;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, message: e.message });
    }
};

const sanitizeConfig = (newConfig = {}) => {
    const sanitized = {};
    Object.keys(defaultConfig).forEach((key) => {
        if (newConfig[key] !== undefined) sanitized[key] = newConfig[key];
    });
    return sanitized;
};

const tryCatch = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message || "Đã xảy ra lỗi, vui lòng thử lại sau." });
    }
};

// --- API ROUTES ---

app.post('/api/command/trigger_checkin', authenticateToken, tryCatch(async (req, res) => {
    const payload = { requestedBy: req.user.email, source: 'manual' };
    
    // PUSH command to Worker
    broadcast('trigger_checkin', payload);
    
    return res.json({ success: true, message: "Đã gửi lệnh Real-time tới Worker." });
}));

app.post('/api/config', authenticateToken, tryCatch(async (req, res) => {
    const sanitized = sanitizeConfig(req.body || {});
    if (!Object.keys(sanitized).length) throw new Error("Không có cấu hình hợp lệ.");
    currentConfig = { ...currentConfig, ...sanitized };
    
    // PUSH config update to Worker
    broadcast('update_config', sanitized);
    
    return res.json({ success: true, message: "Đã lưu và đẩy cấu hình mới." });
}));

app.get('/api/config', authenticateToken, tryCatch(async (req, res) => {
    return res.json(currentConfig);
}));

app.get('/api/attendance', authenticateToken, tryCatch(async (req, res) => {
    return res.json(currentAttendanceCache);
}));

// GET /api/commands

app.post('/api/command/ack', tryCatch(async (req, res) => {
    const { id, status, detail } = req.body || {};
    if (id) console.log(`[CMD][ACK] ${id} -> ${status}`, detail || {});
    return res.json({ success: true });
}));

// Receive data from Worker -> Broadcast to Frontend
app.post('/api/attendance', tryCatch(async (req, res) => {
    currentAttendanceCache = { ...currentAttendanceCache, ...req.body };
    currentAttendanceCache.last_update = req.body?.last_update || new Date().toISOString();
    
    // PUSH data to Frontends
    broadcast('attendance_update', currentAttendanceCache);
    
    return res.json({ success: true });
}));

app.post('/api/login', tryCatch(async (req, res) => {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '8h' });
        return res.json({ success: true, token, message: "Đăng nhập thành công." });
    }
    throw new Error("Email hoặc mật khẩu không đúng.");
}));

app.get('/', tryCatch(async (req, res) => {
    res.send(`<h1>🌟 KHKT API (WebSocket Enabled) Running 🌟</h1>`);
}));

server.listen(PORT, () => console.log(`Server & WebSocket running on port ${PORT}`));
