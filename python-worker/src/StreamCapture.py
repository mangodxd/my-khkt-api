import cv2
import time
from src.utils import FancyText
import threading


class StreamCapture:
    def __init__(self, url: str, reconnectDelay: float = 3, readTimeout: float = 5):
        """
        url: đường dẫn RTSP
        reconnectDelay: thời gian chờ trước khi thử kết nối lại (giây)
        readTimeout: thời gian chờ tối đa khi đọc frame (giây)
        """
        self.url = url
        self.reconnectDelay = reconnectDelay
        self.readTimeout = readTimeout
        self.cap = None
        
        # Thêm biến cho luồng nền
        self.frame = None
        self.lock = threading.Lock()
        self.thread = threading.Thread(target=self._update, daemon=True)
        self.is_running = True

        self._connect()
        # Bắt đầu luồng nền đọc frame
        if self.cap and self.cap.isOpened():
             self.thread.start()

    def _connect(self):
        """Thử kết nối tới camera RTSP"""
        self.cap = cv2.VideoCapture(self.url, cv2.CAP_FFMPEG)

        if not self.cap.isOpened():
            FancyText.error("Không thể kết nối RTSP, thử lại sau...")
            time.sleep(self.reconnectDelay)
        else:
            FancyText.success("Đã kết nối RTSP thành công.")

            # Xả bớt dữ liệu cũ
            for _ in range(3):
                self.cap.read()
            
            # Reset frame buffer khi kết nối lại
            with self.lock:
                 self.frame = None

    def _reconnect(self):
        """Tự động kết nối lại khi mất tín hiệu"""
        FancyText.warning("Mất kết nối RTSP — đang thử lại...")

        self.stop()
        self._connect()
        
        # Khởi động lại luồng nếu kết nối thành công
        if self.cap and self.cap.isOpened() and not self.thread.is_alive():
             self.thread = threading.Thread(target=self._update, daemon=True)
             self.thread.start()

    def _update(self):
        """Luồng nền liên tục đọc frame mới nhất"""
        while self.is_running:
            if self.cap and self.cap.isOpened():
                ret, frame = self.cap.read()
                
                if ret:
                    with self.lock:
                        self.frame = frame
                else:
                    # Nếu không đọc được frame, thử lại sau 0.1s
                    time.sleep(0.1)
            else:
                self._reconnect()
                time.sleep(self.reconnectDelay)
                
            time.sleep(0.01) # Nghỉ 1 chút

    def read(self):
        """
        Trả về frame mới nhất từ luồng nền.
        Tự động kết nối lại nếu cần (được xử lý trong _update).
        """
        # Đợi tối đa readTimeout để frame đầu tiên được đọc
        startTime = time.time()
        while self.frame is None and time.time() - startTime < self.readTimeout:
            time.sleep(0.1)
        
        with self.lock:
            frame_to_return = self.frame
            
        if frame_to_return is None:
            FancyText.warning("Timeout đọc frame từ RTSP (Frame buffer rỗng).")
            # OLD_CODE:
            # __reconect()
            return None
        
        return frame_to_return

    def stop(self):
        """Đóng kết nối camera và dừng luồng nền"""
        self.is_running = False
        if self.thread.is_alive():
             self.thread.join(timeout=1)
        
        if self.cap:
            self.cap.release()
            self.cap = None
            FancyText.info("Đã đóng kết nối RTSP.")

    def __del__(self):
        self.stop()