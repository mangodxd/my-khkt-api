import cv2
import numpy as np
import base64
import time
from datetime import datetime
from src.utils import FancyText
from src.config import cfg
import src.gateway as gateway


def enhance_image(frame: np.ndarray) -> np.ndarray:
    """
    Enhance image brightness and sharpness before face recognition.
    
    Applies adaptive brightness adjustment and sharpening based on image characteristics.
    
    Args:
        frame (np.ndarray): Input BGR image frame
        
    Returns:
        np.ndarray: Enhanced image frame, or original if processing fails
    """
    try:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray)
        enhanced = frame.copy()
        
        if brightness < 80:
            enhanced = cv2.convertScaleAbs(enhanced, alpha=1.2, beta=20)
        elif brightness > 200:
            gamma = 0.8
            table = np.array([(((i / 255.0) ** gamma) * 255) for i in range(256)]).astype('uint8')
            enhanced = cv2.LUT(enhanced, table)
        
        if cv2.Laplacian(cv2.cvtColor(enhanced, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var() < 100:
            kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
            enhanced = cv2.filter2D(enhanced, -1, kernel)
            
        return enhanced
    except Exception as e:
        FancyText.error(f'Image enhancement error: {e}')
        return frame


def encode_base64(frame: np.ndarray, width: int = 640, quality: int = 40) -> str:
    """
    Compress image to WebP base64 format for network transmission.
    
    Resizes image and applies WebP compression for efficient transfer.
    
    Args:
        frame (np.ndarray): Input BGR image
        width (int): Target width in pixels (default: 640)
        quality (int): WebP quality (1-100, default: 40)
        
    Returns:
        str: Base64-encoded WebP image string, empty if encoding fails
    """
    try:
        h, w = frame.shape[:2]
        scale = width / w
        new_height = int(h * scale)
        resized = cv2.resize(frame, (width, new_height))
        
        encode_param = [int(cv2.IMWRITE_WEBP_QUALITY), quality]
        success, buffer = cv2.imencode('.webp', resized, encode_param)
        if not success:
            return ''
        return base64.b64encode(buffer).decode('utf-8')
    except Exception as e:
        FancyText.error(f'Image encoding error: {e}')
        return ''


def capture_and_recognize(face_system, stream, frame_count: int) -> tuple[list[str], set[str]]:
    """
    Capture frames from stream and perform face recognition.
    
    Processes multiple frames, detects faces, and returns recognized names and images.
    
    Args:
        face_system: FaceSystem instance for face detection and recognition
        stream: StreamCapture instance for reading frames
        frame_count (int): Number of frames to capture
        
    Returns:
        tuple: (encoded_images list, detected_names set)
    """
    frames, detected_names = [], set()
    if not stream:
        FancyText.error('StreamCapture not initialized.')
        return frames, detected_names
        
    retry_delay = cfg.get('retry_delay', 3)
    
    for idx in range(frame_count):
        try:
            frame = stream.read()
            if frame is None:
                FancyText.warning('Unable to read frame from camera.')
                time.sleep(retry_delay)
                continue
                
            frame_processed = enhance_image(frame.copy())
            faces = face_system.detectFace(frame_processed)
            
            for face in faces:
                try:
                    name, score = face_system.recognize(face['embedding'])
                    threshold = cfg.get('face_recognition_threshold', 0.32)
                    color = (0, 255, 0) if score >= threshold else (0, 0, 255)
                    x1, y1, x2, y2 = face['bbox']
                    
                    cv2.rectangle(frame_processed, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(frame_processed, f'{name} {score:.2f}', (x1, y1 - 5),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                                
                    if name != 'Unknown' and score >= threshold:
                        detected_names.add(name)
                except Exception as e:
                    FancyText.error(f'Face processing error: {e}')
                    
            frames.append(encode_base64(frame_processed))
            
            if idx < frame_count - 1:
                time.sleep(0.5)
        except Exception as e:
            FancyText.error(f'Capture loop error: {e}')
            
    return frames, detected_names


def run_checkin_workflow(face_system, stream, command_meta: dict) -> dict:
    """
    Execute complete check-in workflow: capture, recognize, send, upload images.
    
    Captures frames, performs face recognition, posts attendance data to gateway,
    and uploads additional images.
    
    Args:
        face_system: FaceSystem instance
        stream: StreamCapture instance
        command_meta (dict): Command metadata with frame_count and source
        
    Returns:
        dict: Result dictionary with number of detected students
    """
    try:
        frame_count = command_meta.get('frame_count', cfg.get('frame_count', 2))
        imgs, names = capture_and_recognize(face_system, stream, frame_count)
        
        # Get list of all students and determine attendance status
        all_students = sorted(list(face_system.known_faces.keys()))
        present_names = sorted(list(names))
        absent_names = [s for s in all_students if s not in present_names]
        
        payload = {
            'source': command_meta.get('source', 'manual'),
            'total': len(all_students),
            'present_names': present_names,
            'absent_names': absent_names,
            'image': imgs[0] if imgs else None,
            'last_update': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Send primary attendance data to gateway
        result = gateway.post_attendance(payload)
        
        # Upload additional images if available
        if result and "attendance_id" in result and len(imgs) > 1:
            att_id = result["attendance_id"]
            for extra_img in imgs[1:]:
                gateway.upload_image(att_id, extra_img, is_primary=0)
                time.sleep(0.1)  # Prevent network congestion
                
        FancyText.success(f"Check-in complete. Present: {len(present_names)}/{len(all_students)}")
        return {'detected': len(present_names)}
        
    except Exception as e:
        FancyText.error(f'Check-in workflow error: {e}')
        return {'detected': 0}