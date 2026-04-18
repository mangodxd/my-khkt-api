import time
from datetime import datetime
from src.utils import FancyText
from src.config import cfg
from src.pipeline import run_checkin_workflow


def run_auto_capture(face_system, stream):
    """
    Automated check-in scheduler.
    
    Continuously monitors time and triggers automatic check-in workflow
    at configured intervals.
    
    Args:
        face_system: FaceSystem instance for face recognition
        stream: StreamCapture instance for video capture
        
    Returns:
        None (infinite loop until interrupted)
    """
    last_triggered_minute = -1
    
    while True:
        try:
            now = datetime.now()
            current_time_str = now.strftime('%H:%M')
            current_minute = now.minute
            capture_intervals = cfg.get('image_capture_interval', [])
            
            if current_time_str in capture_intervals and current_minute != last_triggered_minute:
                FancyText.info(f'⏰ Auto Capture triggered at {current_time_str}')
                meta = {'source': 'auto', 'frame_count': cfg.get('frame_count', 2)}
                run_checkin_workflow(face_system, stream, meta)
                last_triggered_minute = current_minute
        except Exception as e:
            FancyText.error(f'Auto Capture Scheduler Error: {e}')
        time.sleep(1)
