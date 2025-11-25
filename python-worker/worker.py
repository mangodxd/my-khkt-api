from os import getenv
from dotenv import load_dotenv
from src.utils import FancyText
from src.FaceSystem import FaceSystem
from src.StreamCapture import StreamCapture
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

import base64
import cv2
import json
import numpy as np
import os
import requests
import threading
import time
import atexit

load_dotenv()

# ======= CONFIG & INIT =======
CONFIG_FILE = 'config.json'
DEFAULT_CFG = {
    "image_capture_interval": ["07:00"],
    "retry_delay": 3,
    "face_recognition_threshold": 0.32,
    "frame_count": 2,
}

def loadConfig():
    try:
        if not os.path.exists(CONFIG_FILE):
            saveConfig(DEFAULT_CFG)
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        merged = {**DEFAULT_CFG, **data}
        if merged != data:
            saveConfig(merged)
        return merged
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")
        return DEFAULT_CFG

def saveConfig(cfg):
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")

config = loadConfig()
faceSystem = FaceSystem(threshold=config['face_recognition_threshold'])
WORKER_ID = "python_worker_1"
API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", None)
RTSP_URL = os.getenv("RTSP_URL") or None
COMMAND_POLL_INTERVAL = 5

streamCapture = None
try:
    if RTSP_URL:
        streamCapture = StreamCapture(RTSP_URL)
except Exception as e:
    FancyText.error(f"{type(e).__name__}: {e}")

# ======= UTILS =======
def enhanceImage(img):
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        brightnessBefore = np.mean(gray)
        contrastBefore = gray.std()
        sharpnessBefore = cv2.Laplacian(gray, cv2.CV_64F).var()
        enhanced = img.copy()
        alpha, beta = 1.0, 0
        if brightnessBefore < 80:
            alpha, beta = 1.2, 20
        elif brightnessBefore > 200:
            gamma = 0.8
            lookUpTable = np.array([((i / 255.0)**gamma) * 255
                                    for i in np.arange(0, 256)]).astype("uint8")
            enhanced = cv2.LUT(enhanced, lookUpTable)
        if alpha != 1.0 or beta != 0:
            enhanced = cv2.convertScaleAbs(enhanced, alpha=alpha, beta=beta)
        grayAfter = cv2.cvtColor(enhanced, cv2.COLOR_BGR2GRAY)
        sharpnessAfter = cv2.Laplacian(grayAfter, cv2.CV_64F).var()
        if sharpnessAfter < 100:
            kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
            enhanced = cv2.filter2D(enhanced, -1, kernel)
        FancyText.debug(
            f'Frame stats - brightness: {brightnessBefore:.1f} -> {np.mean(grayAfter):.1f}, '
            f'contrast: {contrastBefore:.1f} -> {grayAfter.std():.1f}, '
            f'sharpness: {sharpnessBefore:.1f} -> {sharpnessAfter:.1f}'
        )
        return enhanced
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")
        return img

def encode_small_base64(frame):
    try:
        new_width = 640
        h, w = frame.shape[:2]
        scale = new_width / w
        new_height = int(h * scale)
        frame = cv2.resize(frame, (new_width, new_height))
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 60]
        _, buffer = cv2.imencode('.jpg', frame, encode_param)
        return base64.b64encode(buffer).decode()
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")
        return ""

def _current_timestamp_():
    try:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")
        return ""

def _get_student_list_():
    try:
        return sorted(list(faceSystem.knownFaces.keys()))
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")
        return []

def _build_attendance_payload_(frames, detectedNames):
    try:
        students = _get_student_list_()
        present = sorted(list(detectedNames))
        absent = [s for s in students if s not in present]
        return {
            "total": len(students),
            "present": present,
            "present_names": present,
            "absent": absent,
            "images": frames,
            "image": frames[0] if frames else "",
            "last_update": _current_timestamp_()
        }
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")
        return {}

def _build_api_url_(path):
    try:
        if not API_GATEWAY_URL:
            FancyText.error("API_GATEWAY_URL chưa được cấu hình.")
            return None
        return f"{API_GATEWAY_URL}{path}"
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")
        return None

def safe_post(url, payload=None):
    try:
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if not data.get("success", True):
            raise Exception("API returned failure")
        return data
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")
        return None

def safe_get(url):
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")
        return None

def _post_attendance_(payload):
    try:
        apiUrl = _build_api_url_("/api/attendance")
        if apiUrl:
            safe_post(apiUrl, payload)
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")

def _fetch_commands_():
    try:
        apiUrl = _build_api_url_("/api/commands")
        if not apiUrl:
            return []
        data = safe_get(apiUrl)
        if data and isinstance(data, dict):
            return data.get("commands", [])
        return []
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")
        return []

def _post_command_ack_(commandId, status, detail=None):
    try:
        apiUrl = _build_api_url_("/api/command/ack")
        if not apiUrl or not commandId:
            return
        payload = {"id": commandId, "status": status, "detail": detail or {}}
        safe_post(apiUrl, payload)
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")

# ======= CAPTURE & RECOGNIZE =======
def captureAndRecognize(frameCount=2):
    frames, detectedNames = [], set()
    try:
        if not streamCapture:
            FancyText.error("RTSP URL chưa được cấu hình hoặc camera không kết nối.")
            return frames, detectedNames
        retry_delay = config.get("retry_delay", DEFAULT_CFG["retry_delay"])
        for idx in range(frameCount):
            try:
                frame = streamCapture.read()
                if frame is None:
                    FancyText.warning("Không đọc được frame từ camera, bỏ qua frame này.")
                    time.sleep(retry_delay)
                    continue
                frame_copy = frame.copy()
                frame_processed = enhanceImage(frame_copy)
                faces = faceSystem.detectFace(frame_processed)
                for face in faces:
                    try:
                        name, score = faceSystem.recognize(face['embedding'])
                        color = (0, 255, 0) if score >= config['face_recognition_threshold'] else (0, 0, 255)
                        x1, y1, x2, y2 = face['bbox']
                        cv2.rectangle(frame_processed, (x1, y1), (x2, y2), color, 2)
                        cv2.putText(frame_processed, f"{name} {score:.2f}", (x1, y1 - 5),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                        if name != 'Unknown' and score >= config['face_recognition_threshold']:
                            detectedNames.add(name)
                    except Exception as e:
                        FancyText.error(f"{type(e).__name__}: {e}")
                frames.append(encode_small_base64(frame_processed))
                if frameCount > 1 and idx < frameCount - 1:
                    time.sleep(0.5)
            except Exception as e:
                FancyText.error(f"{type(e).__name__}: {e}")
        return frames, detectedNames
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")
        return frames, detectedNames

def runCheckinWorkflow(commandMeta):
    try:
        frameCount = commandMeta.get("frame_count") or config.get("frame_count", DEFAULT_CFG["frame_count"])
        imgs, names = captureAndRecognize(frameCount=frameCount)
        payload = _build_attendance_payload_(imgs, names)
        payload["source"] = commandMeta.get("source", "manual")
        _post_attendance_(payload)
        FancyText.success(f"Gửi kết quả điểm danh ({len(names)} có mặt) qua HTTP Polling.")
        return {"detected": len(names)}
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")
        return {"detected": 0}

def applyConfigUpdate(newConfig):
    try:
        global config, faceSystem
        FancyText.info("Nhận cấu hình mới từ Gateway.")
        allowedUpdates = {k: v for k, v in newConfig.items() if k in DEFAULT_CFG}
        if not allowedUpdates:
            return
        config.update(allowedUpdates)
        saveConfig(config)
        faceSystem.threshold = config.get('face_recognition_threshold', DEFAULT_CFG["face_recognition_threshold"])
        FancyText.success("Đã cập nhật cấu hình Worker.")
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")

def processGatewayCommand(command):
    try:
        commandId = command.get("id")
        commandType = command.get("type")
        if commandType == "trigger_checkin":
            meta = command.get("payload", {}) or {}
            meta.setdefault("source", "manual")
            result = runCheckinWorkflow(meta)
            _post_command_ack_(commandId, "processed", result)
        elif commandType == "update_config":
            applyConfigUpdate(command.get("payload", {}))
            _post_command_ack_(commandId, "processed", {"updated": list(command.get("payload", {}).keys())})
        else:
            FancyText.warning(f"Lệnh không hỗ trợ: {commandType}")
            _post_command_ack_(commandId, "skipped", {"reason": "unsupported_command"})
    except Exception as e:
        FancyText.error(f"{type(e).__name__}: {e}")
        _post_command_ack_(commandId, "failed", {"error": str(e)})

def pollingThread():
    while True:
        try:
            FancyText.info("Bắt đầu luồng Polling lệnh từ Gateway.")
            commands = _fetch_commands_()
            for command in commands:
                processGatewayCommand(command)
        except Exception as e:
            FancyText.error(f"{type(e).__name__}: {e}")
        time.sleep(COMMAND_POLL_INTERVAL)

def autoCapture():
    lastTriggeredMinute = -1
    while True:
        try:
            now = datetime.now()
            current_time_str = now.strftime("%H:%M")
            current_minute = now.minute
            shouldTrigger = API_GATEWAY_URL and current_time_str in config["image_capture_interval"] and current_minute != lastTriggeredMinute
            if shouldTrigger:
                FancyText.info(f"Triggered at {current_time_str}")
                frame_count = config.get("frame_count", 2)
                runCheckinWorkflow({"source": "auto", "frame_count": frame_count})
                lastTriggeredMinute = current_minute
        except Exception as e:
            FancyText.error(f"{type(e).__name__}: {e}")
        time.sleep(1)

if __name__ == '__main__':
    atexit.register(lambda: streamCapture.stop() if streamCapture else None)
    if not API_GATEWAY_URL:
        FancyText.warning("API_GATEWAY_URL chưa được thêm.")
    pool = ThreadPoolExecutor(max_workers=2)
    pool.submit(autoCapture)
    pool.submit(pollingThread)
    while True:
        time.sleep(60)
