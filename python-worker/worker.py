import os
import time
import atexit
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

import base64
import numpy as np
import cv2

from src.utils import FancyText
from src.config import cfg
import src.gateway as gateway
from src.pipeline import run_checkin_workflow
from src.scheduler import run_auto_capture
from src.FaceSystem import FaceSystem
from src.StreamCapture import StreamCapture

load_dotenv()
RTSP_URL = os.getenv('RTSP_URL')

FancyText.info('Loading AI face recognition model...')
face_system = FaceSystem(threshold=cfg.get('face_recognition_threshold', 0.32))
stream_capture = None

if RTSP_URL:
    FancyText.info(f'Connecting to RTSP camera: {RTSP_URL}')
    stream_capture = StreamCapture(RTSP_URL)
else:
    FancyText.error('RTSP_URL environment variable not configured.')

atexit.register(lambda: stream_capture.stop() if stream_capture else None)

def handle_ws_message(data: dict):
    """
    Process WebSocket messages from API Gateway.
    
    Handles trigger_checkin, add_student, and update_config commands.
    Gracefully ignores non-command messages (ping/pong, handshake, etc).
    
    Args:
        data (dict): WebSocket message data with type, id, and payload
    """
    msg_type = data.get('type')
    msg_id = data.get('id')
    
    # Skip non-command messages (handshake, ping/pong, etc)
    if not msg_type or not msg_id:
        return
    
    try:
        if msg_type == 'trigger_checkin':
            FancyText.info(f'Command: Manual Check-in (ID: {msg_id})')
            result = run_checkin_workflow(face_system, stream_capture, data.get('payload', {}))
            gateway.post_ack(msg_id, 'processed', result)
            
        elif msg_type == 'add_student':
            FancyText.info(f'Command: Add Student (ID: {msg_id})')
            _handle_add_student(msg_id, data.get('payload', {}))
            
        elif msg_type == 'update_config':
            FancyText.info(f'Command: Update Config (ID: {msg_id})')
            payload = data.get('payload', {})
            cfg.update(payload)
            face_system.threshold = cfg.get('face_recognition_threshold', 0.32)
            FancyText.success(f'Configuration updated successfully')
            gateway.post_ack(msg_id, 'processed', {'updated': True})
            
        else:
            FancyText.warning(f'Unknown message type: {msg_type}')
            gateway.post_ack(msg_id, 'failed', {'error': f'Unknown message type: {msg_type}'})
            
    except Exception as e:
        FancyText.error(f'Error processing message {msg_id}: {e}')
        gateway.post_ack(msg_id, 'failed', {'error': str(e)})

def _handle_add_student(msg_id: str, payload: dict):
    """
    Handle adding a new student with validation.
    
    Args:
        msg_id (str): Message ID for acknowledgment
        payload (dict): Payload containing 'name' and 'image' (base64)
    """
    try:
        person_name = payload.get('name', '').strip()
        image_b64 = payload.get('image', '').strip()
        
        # Validation
        if not person_name:
            raise ValueError('Student name is required')
        
        if len(person_name) < 2:
            raise ValueError('Student name must be at least 2 characters')
        
        if len(person_name) > 100:
            raise ValueError('Student name cannot exceed 100 characters')
        
        if not image_b64:
            raise ValueError('Image data is required')
        
        # Decode the base64 image
        try:
            image_data = base64.b64decode(image_b64)
        except Exception as e:
            raise ValueError(f'Invalid base64 image data: {e}')
        
        # Convert to numpy array and decode
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError('Could not decode image. Please ensure it is a valid image format.')
        
        if img.size == 0:
            raise ValueError('Image is empty')
        
        # Register the face
        success = face_system.register_face_from_image(person_name, img)
        
        if success:
            FancyText.success(f'Student \"{person_name}\" added successfully')
            gateway.post_ack(msg_id, 'processed', {
                'success': True,
                'added': True,
                'name': person_name,
                'message': f'Student \"{person_name}\" has been registered'
            })
        else:
            raise ValueError('No face detected in the image. Please ensure the image is clear and contains a face.')
            
    except Exception as e:
        error_msg = str(e)
        FancyText.error(f'Failed to add student: {error_msg}')
        gateway.post_ack(msg_id, 'failed', {
            'success': False,
            'error': error_msg
        })

if __name__ == '__main__':
    pool = ThreadPoolExecutor(max_workers=2)
    pool.submit(run_auto_capture, face_system, stream_capture)
    pool.submit(gateway.connect_websocket, handle_ws_message)
    
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        FancyText.warning('Shutdown initiated by user.')
        if stream_capture:
            stream_capture.stop()
        pool.shutdown(wait=False)