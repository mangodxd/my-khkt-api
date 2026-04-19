"""RTSP stream capture with automatic reconnection."""

import cv2
import time
import gc
from src.utils import FancyText
import threading


class StreamCapture():
    """
    RTSP stream capture with threaded frame reading and auto-reconnection.
    
    Maintains a background thread that continuously reads frames from RTSP stream.
    Supports automatic reconnection on connection loss.
    """
    
    def __init__(self, url: str, reconnectDelay: float = 3, readTimeout: float = 5):
        """
        Initialize RTSP stream capture.
        
        Args:
            url (str): RTSP stream URL
            reconnectDelay (float): Delay in seconds before reconnection attempt
            readTimeout (float): Timeout in seconds for frame read operations
        """
        self.url = url
        self.reconnectDelay = reconnectDelay
        self.readTimeout = readTimeout
        self.cap = None
        self.frame = None
        self.lock = threading.Lock()
        self.thread = threading.Thread(target=self._update, daemon=True)
        self.is_running = True
        self._connect()
        if self.cap and self.cap.isOpened():
            self.thread.start()

    def _connect(self):
        """Establish RTSP connection."""
        self.cap = cv2.VideoCapture(self.url, cv2.CAP_FFMPEG)
        
        # Limit the buffer size to reduce memory consumption
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        if not self.cap.isOpened():
            FancyText.error('Unable to connect to RTSP. Retrying...')
            time.sleep(self.reconnectDelay)
        else:
            FancyText.success('Connected successfully.')
            # Pre-read a few frames to clear buffer
            for _ in range(3):
                self.cap.read()
            with self.lock:
                self.frame = None

    def _reconnect(self):
        """Attempt to re-establish RTSP connection."""
        FancyText.warning('Connection lost — attempting to reconnect...')
        self.stop()
        self._connect()
        if self.cap and self.cap.isOpened() and not self.thread.is_alive():
            self.thread = threading.Thread(target=self._update, daemon=True)
            self.thread.start()

    def _update(self):
        """Background thread that continuously reads frames."""
        frame_count = 0
        skip_frames = 2  # Process every 3rd frame to reduce memory pressure
        
        while self.is_running:
            if self.cap and self.cap.isOpened():
                try:
                    ret, frame = self.cap.read()
                    if ret:
                        frame_count += 1
                        # Skip frames to reduce memory pressure
                        if frame_count % (skip_frames + 1) == 0:
                            # Resize to reduce memory footprint (~50% smaller)
                            if frame is not None:
                                resized = cv2.resize(frame, (960, 540), interpolation=cv2.INTER_LINEAR)
                                with self.lock:
                                    self.frame = resized
                                del resized
                            del frame
                        else:
                            del frame
                        # Periodic garbage collection
                        if frame_count % 30 == 0:
                            gc.collect()
                    else:
                        time.sleep(0.1)
                except Exception as e:
                    FancyText.error(f'Frame read error: {str(e)[:100]}')
                    time.sleep(0.2)
            else:
                self._reconnect()
                time.sleep(self.reconnectDelay)
            time.sleep(0.01)

    def read(self):
        """
        Read the latest frame from the stream.
        
        Blocks until a frame is available or timeout is reached.
        
        Returns:
            np.ndarray: Frame image, or None if timeout or connection lost
        """
        startTime = time.time()
        while self.frame is None and time.time() - startTime < self.readTimeout:
            time.sleep(0.1)
        with self.lock:
            frame_to_return = self.frame
        if frame_to_return is None:
            FancyText.warning('RTSP frame read timeout (Frame buffer empty).')
            return None
        return frame_to_return

    def stop(self):
        """Stop capturing and close connection."""
        self.is_running = False
        if self.thread.is_alive():
            self.thread.join(timeout=1)
        if self.cap:
            self.cap.release()
            self.cap = None
            FancyText.info('RTSP connection closed.')

    def __del__(self):
        """Cleanup on object deletion."""
        self.stop()
