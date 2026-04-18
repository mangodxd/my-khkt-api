# SMART MUSTER CAMERA 100

Hệ thống quản lý chấm công dựa trên nhận diện khuôn mặt toàn diện với khả năng xử lý video thời gian thực, cổng API hiệu suất cao, và giao diện quản lý trên web hiện đại.

## Tổng Quan Dự Án

SMART MUSTER CAMERA 100 là một hệ thống quản lý chấm công thông minh sử dụng công nghệ nhận diện khuôn mặt tiên tiến để tự động phát hiện và ghi nhận sự có mặt. Hệ thống bao gồm ba thành phần chính hoạt động đồng bộ với nhau:

- Python Worker: Động cơ xử lý AI và machine learning cho phát hiện và nhận diện khuôn mặt
- API Gateway: Backend Node.js cung cấp các API REST và WebSocket
- Web UI: Giao diện web hiện đại cho quản lý chấm công và cấu hình hệ thống

## Mục Lục

- Tổng Quan Dự Án
- Tính Năng Chính
- Kiến Trúc Hệ Thống
- Yêu Cầu Hệ Thống
- Cài Đặt
- Cấu Hình
- Sử Dụng
- Cấu Trúc Dự Án
- Tài Liệu API
- Khắc Phục Sự Cố
- Đóng Góp
- Giấy Phép

## Tính Năng Chính

- Phát Hiện Khuôn Mặt Thời Gian Thực: Sử dụng các mô hình deep learning tiên tiến
- Ghi Nhận Chấm Công Tự Động: Tự động ghi lại thông tin có mặt của người dùng
- Bảng Điều Khiển Web: Giao diện trực quan cho quản lý và giám sát
- API REST Hoàn Chỉnh: API toàn diện để tích hợp với các hệ thống khác
- Hỗ Trợ WebSocket: Giao tiếp hai chiều thời gian thực
- Hỗ Trợ Nhiều Người Dùng: Kiểm soát truy cập dựa trên vai trò
- Quản Lý Cấu Hình Động: Cấu hình hệ thống linh hoạt
- Tích Hợp Cơ Sở Dữ Liệu: Lưu trữ dữ liệu bền vững

## Kiến Trúc Hệ Thống

Hệ thống hoạt động theo kiến trúc ba tầng:

Tầng Trình Bày (Web Browser)
Người dùng truy cập giao diện web thông qua trình duyệt để xem thông tin chấm công, quản lý người dùng và cấu hình hệ thống.

Tầng Ứng Dụng (API Gateway - Node.js)
API Gateway chạy trên nền tảng Node.js, xử lý các yêu cầu từ giao diện web thông qua REST API và WebSocket. Nó quản lý xác thực người dùng, định tuyến yêu cầu, xử lý phiên làm việc, và giao tiếp với cơ sở dữ liệu. Các yêu cầu liên quan đến nhận diện khuôn mặt được chuyển tiếp đến Python Worker.

Tầng Xử Lý (Python Worker)
Python Worker chịu trách nhiệm chính yếu trong việc xử lý hình ảnh và video. Nó nhận video streams từ camera, sử dụng các mô hình machine learning để phát hiện khuôn mặt, so sánh với cơ sở dữ liệu khuôn mặt đã lưu, và trả về kết quả. Khi phát hiện người quen, nó gửi thông tin này trở lại API Gateway để ghi nhận chấm công.

Tầng Lưu Trữ (Database)
Cơ sở dữ liệu lưu trữ tất cả thông tin bao gồm dữ liệu người dùng, lịch sử chấm công, các mô hình khuôn mặt đã huấn luyện, và cấu hình hệ thống.

## Yêu Cầu Hệ Thống

Để triển khai và chạy SMART MUSTER CAMERA 100, bạn cần:

Yêu Cầu Phần Cứng:
- Một máy tính hoặc máy chủ có cấu hình tối thiểu: CPU lõi tứ, RAM 8GB, SSD 256GB
- Camera hoặc thiết bị video để cung cấp stream video
- Kết nối mạng ổn định

Yêu Cầu Phần Mềm:
- Node.js phiên bản 14 trở lên
- Python phiên bản 3.8 trở lên
- pip hoặc conda để quản lý các gói Python
- npm hoặc yarn để quản lý các gói Node.js
- SQLite3 hoặc MySQL làm cơ sở dữ liệu

Các Thư Viện Chính:
- Node.js: Express.js, Socket.io, jsonwebtoken
- Python: TensorFlow, OpenCV, numpy, scipy, face_recognition
- Frontend: Vanilla JavaScript, Bootstrap hoặc CSS tùy chỉnh

## Cài Đặt

Bước 1: Clone Repository

Đầu tiên, sao chép mã nguồn từ repository:

git clone <đường-dẫn-repository>
cd "SMART MUSTER CAMERA 100"

Bước 2: Cài Đặt Dependencies của API Gateway

Điều hướng đến thư mục api-gateway và cài đặt tất cả các phụ thuộc Node.js:

cd api-gateway
npm install
cd ..

Bước 3: Cài Đặt Dependencies của Python Worker

Điều hướng đến thư mục python-worker và cài đặt tất cả các phụ thuộc Python. Nên sử dụng virtual environment:

cd python-worker
python -m venv venv
source venv/bin/activate  # Trên Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
cd ..

Bước 4: Chuẩn Bị Các Tệp Mô Hình

Hệ thống yêu cầu các tệp mô hình machine learning được huấn luyện trước:

Đảm bảo rằng các tệp mô hình được đặt trong thư mục:
python-worker/data/models/

Các tệp cần thiết:
- EDSR_x2.pb: Mô hình super-resolution
- Các mô hình phát hiện khuôn mặt khác (nếu cần)

Nếu bạn không có các mô hình này, bạn cần tải xuống hoặc huấn luyện chúng.

## Cấu Hình

Cấu Hình API Gateway

Mở tệp api-gateway/routes/config.js và điều chỉnh các cài đặt:

const config = {
  port: process.env.PORT || 3000,
  pythonWorkerUrl: 'http://localhost:5000',
  databaseUrl: process.env.DATABASE_URL || 'sqlite:./data/database.db',
  databaseType: 'sqlite',
  jwtSecret: 'your-secret-key-here',
  sessionTimeout: 3600000,
  maxUploadSize: '50mb'
};

Các tham số quan trọng:
- port: Cổng để chạy API Gateway
- pythonWorkerUrl: URL của Python Worker service
- databaseUrl: Đường dẫn hoặc URL kết nối cơ sở dữ liệu
- jwtSecret: Khóa bí mật để mã hóa token JWT

Cấu Hình Python Worker

Mở tệp python-worker/config.json và điều chỉnh:

{
  "port": 5000,
  "api_gateway_url": "http://localhost:3000",
  "face_detection_model": "data/models/detection_model.pb",
  "face_recognition_model": "data/models/recognition_model.pb",
  "confidence_threshold": 0.95,
  "log_level": "INFO",
  "camera_settings": {
    "resolution": [1920, 1080],
    "fps": 30,
    "quality": 85
  }
}

Các tham số quan trọng:
- port: Cổng để chạy Python Worker
- api_gateway_url: URL của API Gateway
- confidence_threshold: Ngưỡng độ tin cậy cho phát hiện khuôn mặt (0-1)
- camera_settings: Cài đặt camera và chất lượng video

Cấu Hình Giao Diện Web

Mở tệp web-ui/js/config.js và điều chỉnh:

const CONFIG = {
  API_URL: 'http://localhost:3000',
  WS_URL: 'ws://localhost:3000',
  POLLING_INTERVAL: 5000,
  SESSION_TIMEOUT: 3600000,
  MAX_RETRIES: 3,
  DEBUG_MODE: false
};

Các tham số quan trọng:
- API_URL: Địa chỉ API backend
- WS_URL: Địa chỉ WebSocket
- POLLING_INTERVAL: Khoảng thời gian cập nhật dữ liệu (ms)
- DEBUG_MODE: Bật/tắt chế độ debug

## Sử Dụng

Khởi Động Hệ Thống

Bạn cần khởi động ba thành phần chính trong ba terminal riêng biệt.

Terminal 1: Khởi Động API Gateway

cd api-gateway
npm start

Máy chủ sẽ chạy trên http://localhost:3000

Terminal 2: Khởi Động Python Worker

cd python-worker
source venv/bin/activate  # Trên Linux/Mac
python worker.py

Worker sẽ chạy trên http://localhost:5000

Terminal 3: Phục Vụ Giao Diện Web

cd web-ui

Sử dụng Node.js http-server:
npx http-server -p 8000

Hoặc sử dụng Python:
python -m http.server 8000

Truy cập giao diện web tại http://localhost:8000

Chế Độ Phát Triển

Nếu bạn muốn phát triển và cần tự động reload:

API Gateway với nodemon:

cd api-gateway
npm install --save-dev nodemon
npm run dev

Python Worker với auto-reload:

cd python-worker
pip install watchdog
python -m pytest test.py  # Chạy các bài kiểm tra trước
python worker.py

## Cấu Trúc Dự Án

Dự án được tổ chức theo cấu trúc thư mục như sau:

SMART MUSTER CAMERA 100/
├── api-gateway/              # Backend Node.js
│   ├── db.js                 # Khởi tạo cơ sở dữ liệu
│   ├── server.js             # Thiết lập Express server
│   ├── ws.js                 # Cấu hình WebSocket
│   ├── package.json          # Danh sách phụ thuộc Node
│   └── routes/               # Các xử lý API routes
│       ├── auth.js           # Routes xác thực
│       ├── attendance.js      # Quản lý chấm công
│       ├── commands.js        # Thực thi lệnh
│       ├── config.js          # Điểm cuối cấu hình
│       └── tryCatch.js        # Tiện ích xử lý lỗi
│
├── python-worker/            # Động cơ Python AI/ML
│   ├── worker.py             # Quy trình worker chính
│   ├── config.json           # Cấu hình worker
│   ├── requirements.txt       # Danh sách phụ thuộc Python
│   ├── test.py               # Kiểm tra đơn vị
│   ├── src/
│   │   ├── FaceSystem.py      # Lõi phát hiện/nhận diện khuôn mặt
│   │   ├── StreamCapture.py   # Xử lý luồng video
│   │   ├── pipeline.py        # Pipeline xử lý
│   │   ├── scheduler.py       # Lên lịch tác vụ
│   │   ├── gateway.py         # Giao tiếp cổng
│   │   ├── config.py          # Trình tải cấu hình
│   │   └── utils.py           # Các hàm tiện ích
│   └── data/
│       ├── models/            # Các mô hình ML được huấn luyện trước
│       │   └── EDSR_x2.pb     # Mô hình super-resolution
│       └── faces/             # Dữ liệu huấn luyện khuôn mặt
│
└── web-ui/                   # Ứng dụng Frontend
    ├── index.html            # Bảng điều khiển chính
    ├── login.html            # Trang đăng nhập
    ├── login.js              # Logic xác thực
    ├── style.css             # Kiểu toàn cục
    └── js/
        ├── app.js            # Logic ứng dụng chính
        ├── api.js            # Máy khách API
        ├── ui.js             # Thành phần giao diện
        ├── history.js        # Quản lý lịch sử
        ├── env.js            # Thiết lập môi trường
        └── config.js         # Cấu hình frontend

## Tài Liệu API

API Gateway cung cấp các điểm cuối sau:

Xác Thực

Đăng Nhập
POST /api/auth/login

Yêu cầu:
{
  "username": "tên người dùng",
  "password": "mật khẩu"
}

Phản hồi:
{
  "token": "jwt-token-string",
  "user": {
    "id": "user-id",
    "username": "tên người dùng",
    "role": "admin"
  }
}

Đăng Xuất
POST /api/auth/logout

Phản hồi:
{
  "success": true,
  "message": "Đã đăng xuất thành công"
}

Chấm Công

Lấy Danh Sách Chấm Công
GET /api/attendance?from=2024-01-01&to=2024-01-31&userId=123

Phản hồi:
{
  "records": [
    {
      "id": "record-id",
      "userId": "user-id",
      "timestamp": "2024-01-15T09:30:00Z",
      "status": "present",
      "confidence": 0.98
    }
  ],
  "total": 22
}

Ghi Nhận Chấm Công
POST /api/attendance

Yêu cầu:
{
  "userId": "user-id",
  "timestamp": "2024-01-15T09:30:00Z",
  "status": "present"
}

Phản hồi:
{
  "recordId": "record-id",
  "success": true
}

Lệnh Điều Khiển

Thực Thi Lệnh
POST /api/commands

Yêu cầu:
{
  "action": "restart-camera",
  "params": {
    "cameraId": "camera-1"
  }
}

Phản hồi:
{
  "status": "success",
  "message": "Lệnh đã được thực thi"
}

Cấu Hình

Lấy Cấu Hình Hiện Tại
GET /api/config

Phản hồi:
{
  "settings": {
    "confidenceThreshold": 0.95,
    "processingFps": 30,
    "maxUsersCache": 1000
  }
}

Cập Nhật Cấu Hình
PUT /api/config

Yêu cầu:
{
  "settings": {
    "confidenceThreshold": 0.93,
    "processingFps": 25
  }
}

Phản hồi:
{
  "updated": true,
  "message": "Cấu hình đã được cập nhật"
}

Sự Kiện WebSocket

Khi kết nối WebSocket được thiết lập với ws://localhost:3000/ws, hệ thống sẽ gửi các sự kiện thời gian thực:

face_detected: Phát hiện khuôn mặt mới
{
  "type": "face_detected",
  "timestamp": "2024-01-15T09:30:00Z",
  "confidence": 0.98,
  "userId": "user-id"
}

attendance_logged: Ghi nhận chấm công
{
  "type": "attendance_logged",
  "userId": "user-id",
  "timestamp": "2024-01-15T09:30:00Z",
  "status": "present"
}

system_status: Cập nhật trạng thái hệ thống
{
  "type": "system_status",
  "cameraStatus": "active",
  "workerStatus": "running",
  "uptime": 3600
}

error: Thông báo lỗi
{
  "type": "error",
  "message": "Không thể kết nối đến camera",
  "severity": "warning"
}

## Khắc Phục Sự Cố

Cổng Đã Được Sử Dụng

Nếu bạn nhận được lỗi cổng đã được sử dụng, bạn cần tìm và dừng quá trình sử dụng cổng đó.

Trên Windows:

netstat -ano | findstr :3000
taskkill /PID <PID> /F

Trên Linux/Mac:

lsof -i :3000
kill -9 <PID>

Module Python Không Được Tìm Thấy

Nếu bạn gặp lỗi module không được tìm thấy khi chạy Python Worker:

1. Kiểm tra xem virtual environment đã được kích hoạt chưa
2. Cài đặt lại các phụ thuộc:

cd python-worker
pip install --force-reinstall -r requirements.txt

3. Kiểm tra phiên bản Python:

python --version

Phát Hiện Khuôn Mặt Không Hoạt Động

Nếu hệ thống không phát hiện khuôn mặt:

1. Kiểm tra các tệp mô hình có tồn tại trong python-worker/data/models/ không
2. Xác minh Python Worker đang chạy:

curl http://localhost:5000/health

3. Kiểm tra quyền truy cập camera. Trên Linux, bạn có thể cần thêm người dùng vào nhóm video:

sudo usermod -a -G video $USER

4. Xem lại nhật ký chi tiết trong python-worker/logs/

Sự Cố Kết Nối WebSocket

Nếu giao diện web không thể kết nối WebSocket:

1. Xác minh API Gateway đang chạy trên cổng chính xác
2. Kiểm tra cài đặt tường lửa cho phép kết nối WebSocket
3. Xem nhật ký trình duyệt để tìm thông báo lỗi chi tiết
4. Nếu sử dụng proxy hoặc balancer tải, đảm bảo chúng hỗ trợ WebSocket

Cơ Sở Dữ Liệu Bị Khóa

Nếu bạn gặp lỗi cơ sở dữ liệu bị khóa:

1. Dừng tất cả các quá trình Node.js
2. Xóa tệp khóa cơ sở dữ liệu (nếu tồn tại)
3. Khởi động lại API Gateway

Hiệu Suất Thấp

Nếu hệ thống chạy chậm:

1. Giảm resolution camera trong cấu hình (ví dụ: 1280x720 thay vì 1920x1080)
2. Giảm FPS (frames per second)
3. Tăng ngưỡng confidenceThreshold để bỏ qua các phát hiện không chắc chắn
4. Kiểm tra tài nguyên hệ thống (CPU, RAM, đĩa)

Vấn Đề Chất Lượng Ảnh

Nếu ảnh kém chất lượng hoặc không có tương phản:

1. Điều chỉnh cài đặt camera (độ sáng, tương phản, bão hòa)
2. Đảm bảo ánh sáng đủ tại vị trí camera
3. Làm sạch ống kính camera
4. Kiểm tra độ phân giải camera và cài đặt fps

## Nhật Ký Hệ Thống

Hệ thống tạo các tệp nhật ký chi tiết để giúp khắc phục sự cố:

Nhật Ký API Gateway:
- Vị trí: api-gateway/logs/
- Tệp: server.log, error.log
- Xem nhật ký thời gian thực: tail -f api-gateway/logs/server.log

Nhật Ký Python Worker:
- Vị trí: python-worker/logs/
- Tệp: worker.log, face_detection.log
- Xem nhật ký thời gian thực: tail -f python-worker/logs/worker.log

Điều chỉnh cấp độ nhật ký (log level) trong các tệp cấu hình để nhận được thông tin chi tiết hơn (DEBUG) hoặc ít dài dòng hơn (WARNING).

## Bảo Mật

Khuyến Nghị Bảo Mật:

1. Thay đổi tất cả các khóa bí mật mặc định:
   - jwtSecret trong api-gateway
   - Mật khẩu cơ sở dữ liệu
   - Mật khẩu quản trị viên mặc định

2. Sử dụng HTTPS cho giao tiếp sản xuất

3. Thiết lập firewall để chỉ cho phép truy cập từ các mạng đáng tin cậy

4. Thực hiện xác thực đa yếu tố nếu có thể

5. Cập nhật tất cả các phần mềm phụ thuộc thường xuyên

6. Sao lưu dữ liệu chấm công và cơ sở dữ liệu khuôn mặt thường xuyên

7. Giới hạn số lần đăng nhập thất bại

8. Theo dõi các yêu cầu API bất thường

## Đóng Góp

Nếu bạn muốn đóng góp vào dự án:

1. Fork repository

2. Tạo một nhánh tính năng:
   git checkout -b feature/TenTinhNang

3. Thực hiện các thay đổi của bạn

4. Commit các thay đổi:
   git commit -m 'Thêm tính năng tuyệt vời'

5. Push lên nhánh:
   git push origin feature/TenTinhNang

6. Mở Pull Request

Tiêu Chuẩn Mã:

Đối với JavaScript:
- Sử dụng ESLint
- 2 khoảng trắng cho thụt lề
- Đặt tên hàm và biến rõ ràng

Đối với Python:
- Tuân theo PEP 8
- Sử dụng Black formatter
- Viết docstring cho tất cả các hàm

Đối với HTML/CSS:
- Sử dụng HTML ngữ nghĩa
- Tuân theo quy ước đặt tên BEM cho CSS

Viết Bài Kiểm Tra:

Tất cả các tính năng mới phải có bài kiểm tra đi kèm. Chạy các bài kiểm tra trước khi gửi Pull Request:

cd api-gateway
npm test

cd python-worker
pytest

## Giấy Phép

Dự án này được cấp phép theo giấy phép MIT. Xem tệp LICENSE để biết chi tiết.

## Liên Hệ và Hỗ Trợ

Nếu bạn có câu hỏi hoặc cần hỗ trợ:

1. Kiểm tra các issue hiện có trên GitHub
2. Xem lại phần Khắc Phục Sự Cố ở trên
3. Liên hệ với nhóm phát triển hoặc mở một issue mới

Thông Tin Nhóm:
- Email: support@smartmustercamera.dev
- Trang web: https://smartmustercamera.dev
- Documentation: https://docs.smartmustercamera.dev

## Lịch Sử Phiên Bản

Phiên bản 1.0.0 - Bản phát hành đầu tiên
- Chức năng phát hiện khuôn mặt cơ bản
- Ghi nhận chấm công
- Bảng điều khiển web
- REST API
- WebSocket cho cập nhật thời gian thực

Phiên bản 1.1.0 (Sắp tới)
- Hỗ trợ đa camera
- Tối ưu hóa hiệu suất
- Báo cáo nâng cao
- Export dữ liệu

## Tài Liệu và Tài Nguyên Bổ Sung

Để tìm hiểu thêm về các công nghệ được sử dụng:

- Thư viện nhận diện khuôn mặt: https://github.com/ageitgey/face_recognition
- Tài liệu Express.js: https://expressjs.com/
- Hướng dẫn OpenCV Python: https://docs.opencv.org/master/d6/d00/tutorial_py_root.html
- Giao thức WebSocket: https://tools.ietf.org/html/rfc6455
- Tài liệu TensorFlow: https://www.tensorflow.org/

Cảm ơn bạn đã sử dụng SMART MUSTER CAMERA 100! Nếu bạn thấy dự án này hữu ích, vui lòng đánh dấu sao trên GitHub.

Cập nhật cuối: 18/04/2026
Duy trì bởi: Nhóm Phát Triển
