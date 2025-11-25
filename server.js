// Server Trung Gian: Node.js + Express + Socket.IO

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'your_default_secret_key_123';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@face.com';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync('123456', 8); // '123456' hashed

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || "*", 
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Để xử lý POST body

// --- DATABASE/CACHE ĐƠN GIẢN ---
let currentAttendanceCache = {
    total: 0, present: [], present_names: [], absent: [], images: [], image: "", last_update: ""
};

let workerSocket = null; 
const WORKER_ID = "python_worker_1"; 

// --- MIDDLEWARE XÁC THỰC TOKEN ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Format: "Bearer <TOKEN>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "Thiếu Token xác thực." });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            // Token không hợp lệ hoặc hết hạn
            return res.status(403).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn." });
        }
        req.user = user; // Lưu thông tin user vào request
        next();
    });
};

// --- SOCKET.IO HANDLER (Giữ nguyên) ---
io.on('connection', (socket) => {
  // ... (Logic giữ nguyên từ phiên bản trước) ...
  console.log(`[Socket] Client connected: ${socket.id}`);

  if (socket.handshake.query.id === WORKER_ID) {
    console.log(`[Socket] Python Worker registered: ${socket.id}`);
    workerSocket = socket;
  }

  socket.on('result:checkin_done', (payload) => {
    console.log(`[Socket] Nhận kết quả từ Worker. Có mặt: ${payload.present_names.length}`);
    currentAttendanceCache = payload;
    io.emit('attendance_update', currentAttendanceCache); 
  });

  socket.on('config_updated', (newConfig) => {
    console.log("[Socket] Cấu hình Worker đã cập nhật:", newConfig);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    if (socket === workerSocket) {
      workerSocket = null; 
      console.log("[Socket] Python Worker disconnected.");
    }
  });
});

// --- REST API (CÓ AUTH) ---

// 1. Endpoint để Client yêu cầu điểm danh
app.post('/api/checkin', authenticateToken, (req, res) => {
  if (!workerSocket) {
    return res.status(503).json({ success: false, message: "Python Worker chưa kết nối." });
  }
  workerSocket.emit('command:trigger_checkin', { timestamp: Date.now(), user: req.user.email });
  res.json({ success: true, message: "Đã gửi yêu cầu điểm danh, Worker đang xử lý." });
});

// 2. Endpoint để Client lấy dữ liệu điểm danh mới nhất
app.get('/api/attendance', authenticateToken, (req, res) => {
  res.json(currentAttendanceCache);
});

// 3. Endpoint để Client gửi cấu hình
app.post('/api/config', authenticateToken, (req, res) => {
  if (!workerSocket) {
      return res.status(503).json({ success: false, message: "Python Worker chưa kết nối để cập nhật cấu hình." });
  }
  const newConfig = req.body;
  workerSocket.emit('command:update_config', newConfig);
  res.json({ success: true, message: "Đã gửi cấu hình, Worker sẽ tự lưu." });
});

// --- REST API (KHÔNG CẦN AUTH) ---

// 4. Endpoint Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    // 1. Kiểm tra Email và Mật khẩu (dùng bcrypt để so sánh hash)
    if (email === ADMIN_EMAIL && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
        // 2. Tạo Token
        const token = jwt.sign({ email: email }, SECRET_KEY, { expiresIn: '8h' });

        return res.json({ success: true, token: token, message: "Đăng nhập thành công." });
    } else {
        return res.status(401).json({ success: false, message: "Email hoặc mật khẩu không đúng." });
    }
});

// 5. Kiểm tra trạng thái kết nối
app.get('/', (req, res) => {
  const status = workerSocket ? 'Connected' : 'Disconnected';
  res.send(`API Gateway is running. Worker Status: ${status}`);
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});