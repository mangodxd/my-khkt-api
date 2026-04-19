# Production Ready Deployment Guide

## System Components Overview

### 1. **API Gateway (Node.js)**
- **Location:** `api-gateway/`
- **Endpoints:**
  - `POST /api/auth/login` - Admin authentication
  - `POST /api/command/trigger_checkin` - Manual check-in trigger
  - `POST /api/command/add_student` - Add new student with photo
  - `POST /api/command/ack` - WebSocket acknowledgment handler

### 2. **Python Worker (Face Recognition)**
- **Location:** `python-worker/`
- **Features:**
  - Real-time face detection using InsightFace
  - Dynamic face embedding registration (no restart needed)
  - Persistent embedding cache (pkl format)
  - WebSocket communication with API Gateway
  - Enhanced error handling and validation

**Key Files:**
- `worker.py` - Main worker with WebSocket message handling
- `src/FaceSystem.py` - Face recognition engine with `register_face_from_image` method
- `src/pipeline.py` - Check-in workflow orchestration
- `src/StreamCapture.py` - RTSP camera stream handler

### 3. **Web UI (HTML/CSS/JS)**
- **Location:** `web-ui/`
- **Key Features:**
  - Production-ready responsive design
  - Real-time attendance dashboard
  - Student registration form with camera capture
  - Toast notifications for user feedback
  - WebSocket-based live updates

**Key Files:**
- `index.html` - Main dashboard
- `add_student.html` - Student registration page
- `style.css` - Enhanced UI with modern design tokens
- `js/api.js` - API communication layer
- `js/add_student_prod.js` - Production student registration logic
- `js/notifications.js` - Toast notification system

### 4. **Flutter App (Mobile)**
- **Location:** `app/`
- **Features:**
  - Material Design UI
  - Camera integration for student photos
  - Offline-capable (local storage)
  - Real-time attendance sync

**Key Files:**
- `lib/screen/add_student/add_student_screen_v2.dart` - Enhanced student registration
- `lib/service/attendance_service.dart` - API communication
- `pubspec.yaml` - Dependencies (includes camera plugin)

---

## Production Deployment Checklist

### Backend Setup

1. **Environment Variables (.env)**
   ```
   RTSP_URL=rtsp://your-camera-ip:port/stream
   API_PORT=3000
   JWT_SECRET=your-secret-key
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=secure-password-here
   ```

2. **Install Dependencies**
   ```bash
   cd api-gateway && npm install
   cd ../python-worker && pip install -r requirements.txt
   ```

3. **Start Services**
   ```bash
   # API Gateway (Node.js)
   cd api-gateway
   node server.js
   
   # Python Worker
   cd python-worker
   python worker.py
   ```

### Frontend Setup

1. **Web UI**
   - Serve files from `web-ui/` using a web server (nginx, Apache, etc.)
   - Update API base URL in `js/api.js` if needed

2. **Flutter App**
   ```bash
   cd app
   flutter pub get
   flutter build apk  # or ios for Apple
   ```

---

## Data Persistence & Synchronization

### Face Embeddings Storage
- **File:** `python-worker/data/embeddings.pkl`
- **Format:** Python pickle (binary)
- **Update Mechanism:** Automatic on each student addition
- **No Restart Required:** System reloads embeddings on each operation

### Database Synchronization
- **Attendance Records:** Stored in backend database
- **Real-time Updates:** WebSocket connection maintains live sync
- **Fallback:** REST API provides recovery mechanism

---

## Security Best Practices

1. **Authentication**
   - JWT tokens with 8-hour expiration
   - Secure password storage in environment variables
   - Token-based API access

2. **Data Validation**
   - Name length: 2-100 characters
   - Image format validation (JPEG/PNG)
   - Base64 decoding error handling
   - Face detection verification

3. **Error Handling**
   - Graceful error messages
   - Detailed logging for debugging
   - No sensitive data in error responses

4. **Camera Access**
   - HTTPS required for camera access in production
   - User permission prompts
   - Proper cleanup of camera streams

---

## Performance Optimization

1. **Image Compression**
   - JPEG quality: 0.9 (90%)
   - Max resolution: 640x480

2. **Database**
   - Indexed attendance queries
   - Batch operations for bulk updates

3. **Frontend**
   - CSS minification
   - Asset caching
   - Lazy loading where applicable

---

## Monitoring & Logging

### Python Worker Logs
- Face recognition operations
- WebSocket connection status
- Student registration events
- Error tracking

### API Gateway Logs
- Request/response times
- Authentication failures
- WebSocket events
- Error rates

### Best Practices
- Implement ELK Stack for centralized logging
- Set up alerts for error thresholds
- Regular backup of embeddings.pkl
- Monitor GPU usage for face recognition

---

## Backup & Recovery

1. **Backup Schedule**
   ```bash
   # Daily backup of embeddings
   cp data/embeddings.pkl data/embeddings_$(date +%Y%m%d).pkl
   ```

2. **Database Backup**
   - Regular database snapshots
   - Keep at least 30 days of history

3. **Recovery Procedure**
   - Restore embeddings.pkl
   - Verify face detection functionality
   - Run test check-ins

---

## Troubleshooting

### Issue: Camera not connecting
- **Check:** RTSP_URL environment variable
- **Fix:** Verify camera is accessible and credentials are correct

### Issue: Face not detected
- **Check:** Image quality and lighting
- **Fix:** Adjust threshold in config (`face_recognition_threshold`)

### Issue: WebSocket disconnection
- **Check:** Network connectivity
- **Fix:** Implement automatic reconnection (already in code)

### Issue: Slow face recognition
- **Check:** GPU availability
- **Fix:** Use GPU-accelerated model (buffalo_l with CUDA)

---

## Testing

### Unit Tests
```bash
cd api-gateway && npm test
cd ../python-worker && python -m pytest
```

### Integration Tests
1. Test student registration flow
2. Verify face recognition accuracy
3. Test WebSocket reconnection
4. Verify data persistence

### Load Testing
- Simulate concurrent users
- Test with 100+ students
- Monitor response times

---

## Production Deployment Servers

### Recommended Setup
- **API Gateway:** Node.js on Linux (Ubuntu 20.04+)
- **Python Worker:** Python 3.8+ with GPU (NVIDIA CUDA optional)
- **Database:** PostgreSQL or MongoDB
- **Frontend:** Nginx reverse proxy
- **Monitoring:** Prometheus + Grafana

### Docker Deployment
```dockerfile
# API Gateway
FROM node:16-alpine
WORKDIR /app
COPY api-gateway .
RUN npm ci --only=production
CMD ["node", "server.js"]

# Python Worker
FROM python:3.9-slim
WORKDIR /app
COPY python-worker .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["python", "worker.py"]
```

---

## Future Enhancements

1. **Multi-camera support**
2. **Real-time analytics dashboard**
3. **Mobile app push notifications**
4. **Advanced face analytics (age, emotion)**
5. **Integration with school management systems**
6. **Automated report generation**

---

**Last Updated:** April 19, 2026
**Version:** 1.0.0 (Production Ready)
