require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT;
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
let pendingConfig = null;
let commandQueue = [];
let lastCommandNumber = 0;

const nextCommandId = () => {
    lastCommandNumber += 1;
    return `cmd_${Date.now()}_${lastCommandNumber}`;
};

const enqueueCommand = (type, payload = {}) => {
    const command = { id: nextCommandId(), type, payload, timestamp: Date.now() };
    commandQueue.push(command);
    return command;
};

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

app.post('/api/command/trigger_checkin', authenticateToken, tryCatch(async (req, res) => {
    const command = enqueueCommand('trigger_checkin', { requestedBy: req.user.email });
    return res.json({ success: true, commandId: command.id, message: "Đã xếp lệnh điểm danh, Worker sẽ Poll và xử lý." });
}));

app.post('/api/config', authenticateToken, tryCatch(async (req, res) => {
    const sanitized = sanitizeConfig(req.body || {});
    if (!Object.keys(sanitized).length) throw new Error("Không có cấu hình hợp lệ.");
    currentConfig = { ...currentConfig, ...sanitized };
    pendingConfig = sanitized;
    const command = enqueueCommand('update_config', sanitized);
    return res.json({ success: true, message: "Đã lưu cấu hình và đẩy lệnh cập nhật tới Worker.", commandId: command.id });
}));

app.get('/api/config', authenticateToken, tryCatch(async (req, res) => {
    return res.json(currentConfig);
}));

app.get('/api/attendance', authenticateToken, tryCatch(async (req, res) => {
    return res.json(currentAttendanceCache);
}));

app.post('/api/checkin', authenticateToken, tryCatch(async (req, res) => {
    return res.status(410).json({ success: false, message: "Endpoint đã thay đổi, vui lòng dùng POST /api/command/trigger_checkin." });
}));

app.get('/api/commands', tryCatch(async (req, res) => {
    const commands = commandQueue;
    commandQueue = [];
    return res.json({ success: true, commands });
}));

app.post('/api/command/ack', tryCatch(async (req, res) => {
    const { id, status, detail } = req.body || {};
    if (id) console.log(`[CMD][ACK] ${id} -> ${status}`, detail || {});
    return res.json({ success: true });
}));

app.post('/api/attendance', tryCatch(async (req, res) => {
    currentAttendanceCache = { ...currentAttendanceCache, ...req.body };
    currentAttendanceCache.last_update = req.body?.last_update || new Date().toISOString();
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
    return res.send(
        `API Gateway is running.<br>` +
        `Pending Commands: ${commandQueue.length}<br>` +
        `Made with ❤️ by Thuận Huy | Boyvapho`
    );
}));

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));


