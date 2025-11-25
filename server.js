// Server Trung Gian: Node.js + Express (HTTP Polling)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'your_default_secret_key_123';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@face.com';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync('123456', 8); // '123456' hashed

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// # old code: Socket.IO realtime layer removed, sử dụng HTTP Polling.
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
let pendingConfig = null;
let commandQueue = [];
let lastCommandNumber = 0;

const nextCommandId = () => {
    lastCommandNumber += 1;
    return `cmd_${Date.now()}_${lastCommandNumber}`;
};

const enqueueCommand = (type, payload = {}) => {
    const command = {
        id: nextCommandId(),
        type,
        payload,
        timestamp: Date.now()
    };
    commandQueue.push(command);
    return command;
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "Thiếu Token xác thực." });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn." });
        }
        req.user = user;
        next();
    });
};

const sanitizeConfig = (newConfig = {}) => {
    const sanitized = {};
    Object.keys(defaultConfig).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(newConfig, key)) {
            sanitized[key] = newConfig[key];
        }
    });
    return sanitized;
};

// --- REST API (CÓ AUTH) ---

app.post('/api/command/trigger_checkin', authenticateToken, (req, res) => {
    // # old code: /api/checkin phát lệnh qua Socket.IO.
    const command = enqueueCommand('trigger_checkin', {
        requestedBy: req.user.email
    });
    res.json({
        success: true,
        commandId: command.id,
        message: "Đã xếp lệnh điểm danh, Worker sẽ Poll và xử lý."
    });
});

app.post('/api/config', authenticateToken, (req, res) => {
    const sanitized = sanitizeConfig(req.body || {});
    if (!Object.keys(sanitized).length) {
        return res.status(400).json({ success: false, message: "Không có cấu hình hợp lệ." });
    }
    currentConfig = { ...currentConfig, ...sanitized };
    pendingConfig = sanitized;
    const command = enqueueCommand('update_config', { ...sanitized });
    res.json({
        success: true,
        message: "Đã lưu cấu hình và đẩy lệnh cập nhật tới Worker.",
        commandId: command.id
    });
});

app.get('/api/config', authenticateToken, (req, res) => {
    res.json(currentConfig);
});

app.get('/api/attendance', authenticateToken, (req, res) => {
    res.json(currentAttendanceCache);
});

// # old code: Endpoint này từng gửi lệnh qua Socket.IO, nay báo deprecated.
app.post('/api/checkin', authenticateToken, (req, res) => {
    res.status(410).json({
        success: false,
        message: "Endpoint đã thay đổi, vui lòng dùng POST /api/command/trigger_checkin."
    });
});

// --- REST API (Worker + Public) ---

app.get('/api/commands', (req, res) => {
    const commands = commandQueue;
    commandQueue = [];
    res.json({ success: true, commands });
});

app.post('/api/command/ack', (req, res) => {
    const { id, status, detail } = req.body || {};
    if (id) {
        console.log(`[CMD][ACK] ${id} -> ${status}`, detail || {});
    }
    res.json({ success: true });
});

app.post('/api/attendance', (req, res) => {
    currentAttendanceCache = { ...currentAttendanceCache, ...req.body };
    currentAttendanceCache.last_update = req.body?.last_update || new Date().toISOString();
    res.json({ success: true });
});

// --- REST API (KHÔNG CẦN AUTH) ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
        const token = jwt.sign({ email: email }, SECRET_KEY, { expiresIn: '8h' });
        return res.json({ success: true, token: token, message: "Đăng nhập thành công." });
    }
    return res.status(401).json({ success: false, message: "Email hoặc mật khẩu không đúng." });
});

app.get('/', (req, res) => {
    res.send(`API Gateway is running. Pending Commands: ${commandQueue.length}`);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});