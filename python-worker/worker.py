import os
import time
import atexit
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

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
    
    Handles trigger_checkin and update_config commands.
    
    Args:
        data (dict): WebSocket message data with type, id, and payload
    """
    msg_type = data.get('type')
    msg_id = data.get('id')
    
    if msg_type == 'trigger_checkin':
        FancyText.info(f'Command: Manual Check-in (ID: {msg_id})')
        result = run_checkin_workflow(face_system, stream_capture, data.get('payload', {}))
        gateway.post_ack(msg_id, 'processed', result)
    elif msg_type == 'update_config':
        FancyText.info(f'Command: Update Config (ID: {msg_id})')
        cfg.update(data.get('payload', {}))
        face_system.threshold = cfg.get('face_recognition_threshold', 0.32)
        gateway.post_ack(msg_id, 'processed', {'updated': True})

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