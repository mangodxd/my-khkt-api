import os
from src.utils import FancyText
from src.config import cfg
from src.FaceSystem import FaceSystem

def register_faces(dataset_path: str):
    """Quét thư mục dataset và tạo embeddings cho toàn bộ hình ảnh khuôn mặt."""
    if not os.path.exists(dataset_path):
        FancyText.error(f'Thư mục dataset không tồn tại: {dataset_path}')
        return

    FancyText.info(f'Khởi tạo mô hình nhận diện (Ngưỡng: {cfg.get("face_recognition_threshold")})...')
    face_system = FaceSystem(threshold=cfg.get('face_recognition_threshold', 0.32))

    FancyText.info(f'Đang trích xuất đặc trưng từ thư mục: {dataset_path}...')
    face_system.registerFace(dataset_path)

if __name__ == '__main__':
    # Đặt hình ảnh các bạn học sinh vào thư mục data/dataset/
    # VD: data/dataset/Nguyen_Van_A.jpg
    DATASET_DIR = "data/dataset"
    register_faces(DATASET_DIR)