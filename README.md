# SMART MUSTER CAMERA 100

A comprehensive facial recognition and attendance management system combining real-time face detection, API gateway, and web-based administration interface.

## 🎯 Project Overview

SMART MUSTER CAMERA 100 is an intelligent attendance management system that uses advanced facial recognition technology to automatically detect and log presence. The system consists of three main components:

- **Python Worker**: AI/ML engine for face detection and recognition
- **API Gateway**: Node.js backend serving REST and WebSocket APIs
- **Web UI**: Modern web interface for attendance management and configuration

## 📋 Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- **Real-time Face Detection**: Using advanced deep learning models
- **Attendance Logging**: Automatic recording of presence
- **Web Dashboard**: Intuitive interface for management and monitoring
- **REST API**: Comprehensive API for integration
- **WebSocket Support**: Real-time bidirectional communication
- **Multi-User Support**: Role-based access control
- **Configuration Management**: Dynamic system configuration
- **Database Integration**: Persistent data storage

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Web Browser (UI)                      │
│              (HTML/CSS/JavaScript)                       │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
   REST API                 WebSocket
   (HTTP)                   (Real-time)
        │                         │
        └────────────┬────────────┘
                     ▼
        ┌────────────────────────────┐
        │   API Gateway (Node.js)    │
        │  - Authentication          │
        │  - Route Handling          │
        │  - Database Interface      │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Python Worker Service     │
        │  - Face Detection          │
        │  - Face Recognition        │
        │  - Stream Processing       │
        └────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   Database (SQLite/MySQL)  │
        │  - Users                   │
        │  - Attendance Records      │
        │  - Face Models             │
        └────────────────────────────┘
```

## 📦 Prerequisites

### System Requirements
- Node.js >= 14.x
- Python >= 3.8
- pip or conda for Python package management
- npm or yarn for Node.js dependencies
- SQLite3 or MySQL database

### Dependencies
- **Node.js**: Express, WebSocket libraries
- **Python**: TensorFlow, OpenCV, NumPy, face_recognition
- **Frontend**: Vanilla JavaScript (no framework)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "SMART MUSTER CAMERA 100"
```

### 2. Install API Gateway Dependencies

```bash
cd api-gateway
npm install
cd ..
```

### 3. Install Python Worker Dependencies

```bash
cd python-worker
pip install -r requirements.txt
cd ..
```

### 4. Prepare Python Worker Models

```bash
# Download or place face recognition models in:
python-worker/data/models/

# Ensure the following files are present:
# - EDSR_x2.pb (Super-resolution model)
# - Other face detection/recognition models
```

## ⚙️ Configuration

### API Gateway Configuration

Edit `api-gateway/routes/config.js`:

```javascript
const config = {
  port: process.env.PORT || 3000,
  pythonWorkerUrl: 'http://localhost:5000',
  databaseUrl: process.env.DATABASE_URL || 'sqlite:./data/database.db',
  // ... other settings
};
```

### Python Worker Configuration

Edit `python-worker/config.json`:

```json
{
  "port": 5000,
  "api_gateway_url": "http://localhost:3000",
  "face_detection_model": "data/models/detection_model.pb",
  "confidence_threshold": 0.95,
  "log_level": "INFO"
}
```

### Web UI Configuration

Edit `web-ui/js/config.js`:

```javascript
const CONFIG = {
  API_URL: 'http://localhost:3000',
  WS_URL: 'ws://localhost:3000',
  // ... other settings
};
```

## 📖 Usage

### Start the System

#### Terminal 1: Start API Gateway

```bash
cd api-gateway
npm start
# Server running on http://localhost:3000
```

#### Terminal 2: Start Python Worker

```bash
cd python-worker
python worker.py
# Worker running on http://localhost:5000
```

#### Terminal 3: Serve Web UI

```bash
cd web-ui
# Using Python's built-in server
python -m http.server 8000

# Or using Node.js http-server:
npx http-server -p 8000
```

Then access the web UI at `http://localhost:8000`

### Development Mode

```bash
# API Gateway with nodemon
cd api-gateway
npm run dev

# Python Worker with auto-reload
cd python-worker
python -m pytest test.py  # Run tests first

python worker.py
```

## 📁 Project Structure

```
SMART MUSTER CAMERA 100/
├── api-gateway/              # Node.js Backend
│   ├── db.js                 # Database initialization
│   ├── server.js             # Express server setup
│   ├── ws.js                 # WebSocket configuration
│   ├── package.json          # Node dependencies
│   └── routes/               # API route handlers
│       ├── auth.js           # Authentication routes
│       ├── attendance.js      # Attendance management
│       ├── commands.js        # Command execution
│       ├── config.js          # Configuration endpoints
│       └── tryCatch.js        # Error handling utilities
│
├── python-worker/            # Python AI/ML Engine
│   ├── worker.py             # Main worker process
│   ├── config.json           # Worker configuration
│   ├── requirements.txt       # Python dependencies
│   ├── test.py               # Unit tests
│   ├── src/
│   │   ├── FaceSystem.py      # Core face detection/recognition
│   │   ├── StreamCapture.py   # Video stream handling
│   │   ├── pipeline.py        # Processing pipeline
│   │   ├── scheduler.py       # Task scheduling
│   │   ├── gateway.py         # Gateway communication
│   │   ├── config.py          # Configuration loader
│   │   └── utils.py           # Utility functions
│   └── data/
│       ├── models/            # Pre-trained ML models
│       │   └── EDSR_x2.pb     # Super-resolution model
│       └── faces/             # Face training data
│
└── web-ui/                   # Frontend Application
    ├── index.html            # Main dashboard
    ├── login.html            # Login page
    ├── login.js              # Authentication logic
    ├── style.css             # Global styles
    └── js/
        ├── app.js            # Main application logic
        ├── api.js            # API client
        ├── ui.js             # UI components
        ├── history.js        # History management
        ├── env.js            # Environment setup
        └── config.js         # Frontend configuration
```

## 🔌 API Documentation

### Authentication

**POST /api/auth/login**
```json
Request: { "username": "string", "password": "string" }
Response: { "token": "string", "user": {...} }
```

**POST /api/auth/logout**
```json
Response: { "success": true }
```

### Attendance

**GET /api/attendance**
```json
Response: { "records": [...] }
```

**POST /api/attendance**
```json
Request: { "user_id": "string", "timestamp": "ISO8601" }
Response: { "record_id": "string" }
```

### Commands

**POST /api/commands**
```json
Request: { "action": "string", "params": {...} }
Response: { "status": "success" }
```

### Configuration

**GET /api/config**
```json
Response: { "settings": {...} }
```

**PUT /api/config**
```json
Request: { "settings": {...} }
Response: { "updated": true }
```

### WebSocket Events

**Connection**
```
ws://localhost:3000/ws
```

**Events**
- `face_detected` - New face detected
- `attendance_logged` - Attendance recorded
- `system_status` - System status update
- `error` - Error notification

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Python Module Not Found

```bash
# Ensure virtual environment is active
# Reinstall dependencies
pip install --force-reinstall -r requirements.txt
```

### Face Detection Not Working

1. Verify model files exist in `python-worker/data/models/`
2. Check Python worker is running: `curl http://localhost:5000/health`
3. Review logs for detailed error messages
4. Ensure camera permissions are granted

### WebSocket Connection Issues

1. Verify API Gateway is running on correct port
2. Check firewall settings
3. Ensure no proxy interferes with WebSocket
4. Check browser console for detailed errors

## 📝 Logging

Logs are stored in the respective modules:
- **API Gateway**: `api-gateway/logs/`
- **Python Worker**: `python-worker/logs/`

Configure log levels in respective config files.

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/AmazingFeature`
2. Commit changes: `git commit -m 'Add AmazingFeature'`
3. Push to branch: `git push origin feature/AmazingFeature`
4. Open a Pull Request

### Code Style

- **JavaScript**: Use ESLint, 2-space indentation
- **Python**: Follow PEP 8, use Black formatter
- **HTML/CSS**: Use semantic HTML, BEM naming

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 📞 Support

For issues and questions:
1. Check existing issues on GitHub
2. Review Troubleshooting section above
3. Contact development team or open a new issue

## 🔄 Version History

- **v1.0.0** - Initial release
  - Core face detection functionality
  - Basic attendance logging
  - Web UI dashboard
  - REST API

## 📚 Additional Resources

- [Face Recognition Library](https://github.com/ageitgey/face_recognition)
- [Express.js Documentation](https://expressjs.com/)
- [OpenCV Python Guide](https://docs.opencv.org/master/d6/d00/tutorial_py_root.html)
- [WebSocket Protocol](https://tools.ietf.org/html/rfc6455)

---

**Last Updated**: 2026-04-18
**Maintained by**: Development Team
