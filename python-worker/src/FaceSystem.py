from insightface.app import FaceAnalysis
import torch
import cv2
import numpy as np
import os
import pickle
from src.utils import FancyText

class FaceSystem:
    """
    Hệ thống nhận diện khuôn mặt tổng quát.
    Chịu trách nhiệm:
    - Tải / lưu embeddings
    - Phát hiện khuôn mặt
    - Đăng ký khuôn mặt (registration)
    - Nhận diện (recognition)
    """

    def __init__(
        self,
        modelPath: str = 'buffalo_l',
        embPath: str = 'data/embeddings.pkl',
        threshold: float = 0.4
    ):
        self._ctx_id_ = 0 if torch.cuda.is_available() else -1
        self.threshold = threshold
        self._embeddings_path_ = embPath
        
        FancyText.info(f'Using {modelPath}')
        FancyText.info(
            f"Using {'GPU' if self._ctx_id_ >= 0 else 'CPU'} (ctx_id={self._ctx_id_})"
        )

        # NOTE: Chuẩn bị model InsightFace để detect + extract embedding
        self.detector = FaceAnalysis(name=modelPath)
        self.detector.prepare(ctx_id=self._ctx_id_, det_size=(480, 480))

        # NOTE: Tải embedding đã lưu trước đó (nếu có)
        # known_faces: dict[str, list[np.ndarray]]
        self.knownFaces = self._load_embeddings_() # old code: self.known_faces

    def _load_embeddings_(self) -> dict:
        """
        Tải embeddings từ file.
        Trả về dict dạng {tên_người: [embedding_vector_1, embedding_vector_2, ...]}
        """
        # old code: if os.path.exists(self.embeddings_path):
        if os.path.exists(self._embeddings_path_):
            try:
                # old code: with open(self.embeddings_path, 'rb') as f:
                with open(self._embeddings_path_, 'rb') as f:
                    return pickle.load(f)
            except Exception as e:
                FancyText.error(f"Error loading embeddings: {e}")
                return {}
        return {}

    def _save_embeddings_(self) -> None:
        """
        Lưu embeddings hiện tại xuống file.
        """
        # old code: os.makedirs(os.path.dirname(self.embeddings_path), exist_ok=True)
        os.makedirs(os.path.dirname(self._embeddings_path_), exist_ok=True)
        # old code: with open(self.embeddings_path, 'wb') as f:
        with open(self._embeddings_path_, 'wb') as f:
            # old code: pickle.dump(self.known_faces, f)
            pickle.dump(self.knownFaces, f)

    def detectFace(self, frame: 'np.ndarray') -> list:
        """
        Phát hiện khuôn mặt trong một frame ảnh.
        Trả về danh sách dict {bbox, embedding}.
        """
        faceObjects = self.detector.get(frame)
        results = []

        for f in faceObjects:
            results.append({
                'bbox': f.bbox.astype(int),
                'embedding': f.normed_embedding
            })

        return results

    def _process_image_(self, path: str, personName: str) -> bool:
        """
        Xử lý một file ảnh duy nhất để đăng ký khuôn mặt.
        Trả về True nếu thành công, False nếu thất bại.
        """
        img = cv2.imread(path)

        if img is None:
            FancyText.warning(f'Không đọc được ảnh: {path}')
            return False

        results = self.detectFace(img)

        if not results:
            FancyText.warning(f'Không tìm thấy khuôn mặt trong {path}')
            return False

        # NOTE: Lấy embedding đầu tiên và thêm vào danh sách
        embedding = results[0]['embedding']
        
        # old code: if personName not in self.known_faces:
        if personName not in self.knownFaces:
            # old code: self.known_faces[personName] = []
            self.knownFaces[personName] = []
            
        # old code: self.known_faces[personName].append(embedding)
        self.knownFaces[personName].append(embedding)

        FancyText.success(f'Đã tạo embedding cho {personName}')
        return True

    def registerFace(self, path: str) -> None:
        """
        Đăng ký khuôn mặt từ:
        - Một file ảnh
        - Một thư mục chứa nhiều ảnh
        """
        if not os.path.exists(path):
            FancyText.error(f'Path does not exist: {path}')
            return

        # NOTE: Nếu là file -> chỉ đăng ký 1 ảnh, nếu là thư mục -> duyệt
        files = (
            [path]
            if os.path.isfile(path)
            else [
                os.path.join(path, f)
                for f in os.listdir(path)
                if os.path.isfile(os.path.join(path, f))
            ]
        )

        if not files:
            FancyText.error(f'No files found in {path}')
            return

        count = 0
        for filePath in files:
            # NOTE: Tên người = tên file, ví dụ: "minh.jpg" -> "minh"
            personName = os.path.splitext(os.path.basename(filePath))[0]

            # Xóa embeddings cũ trước khi đăng ký lại (tùy chọn)
            # old code: (previous block removed for optimization)
            # if os.path.isfile(path): # Nếu chỉ là 1 file, không xóa các file khác
            #     pass 
            # else: # Nếu là thư mục, xóa toàn bộ embeddings cũ của người này
            #     if personName in self.known_faces:
            #         del self.known_faces[personName]

            # old code: if self._process_image(filePath, personName):
            if self._process_image_(filePath, personName):
                count += 1
        
        # old code: self._save_embeddings()
        self._save_embeddings_()
        
        # old code: total_embeddings = sum(len(v) for v in self.known_faces.values())
        total_embeddings = sum(len(v) for v in self.knownFaces.values())

        FancyText.success(
            # old code: f'Updated embeddings for {count} images/people (total {len(self.known_faces)} people, {total_embeddings} embeddings)'
            f'Updated embeddings for {count} images/people (total {len(self.knownFaces)} people, {total_embeddings} embeddings)'
        )

    def recognize(self, faceEmb: np.ndarray) -> tuple[str, float]:
        """
        Nhận diện khuôn mặt từ embedding đầu vào.
        Sử dụng Max Dot-Product so với tất cả embeddings đã biết.
        """
        # old code: if not self.known_faces:
        if not self.knownFaces:
            return 'Unknown', 0.0

        bestName, bestScore = 'Unknown', 0.0

        # Lặp qua tất cả mọi người đã đăng ký
        # old code: for name, emb_list in self.known_faces.items():
        for name, emb_list in self.knownFaces.items():
            # Tính dot-product với TẤT CẢ embeddings của người đó
            scores = [np.dot(faceEmb, known_emb) for known_emb in emb_list]
            
            currentBestScore = max(scores)
            
            if currentBestScore > bestScore:
                bestScore = currentBestScore
                bestName = name

        # Nếu điểm cao nhất không vượt ngưỡng -> coi như Unknown
        return (bestName, bestScore) if bestScore > self.threshold else ('Unknown', bestScore)