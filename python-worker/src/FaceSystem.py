"""Face recognition system using InsightFace."""

from insightface.app import FaceAnalysis
import torch
import cv2
import numpy as np
import os
import pickle
from src.utils import FancyText


class FaceSystem():
    """
    Face detection and recognition system using InsightFace.
    
    Manages face embeddings, performs face detection/recognition, 
    and handles face registration and embeddings caching.
    """
    
    def __init__(self, modelPath: str='buffalo_l', embPath: str='data/embeddings.pkl', threshold: float=0.4):
        """
        Initialize Face System.
        
        Args:
            modelPath (str): InsightFace model name (default: 'buffalo_l')
            embPath (str): Path to embeddings pickle file
            threshold (float): Recognition confidence threshold
        """
        self.ctx_id = (0 if torch.cuda.is_available() else (-1))
        FancyText.info(f'Using {modelPath}')
        FancyText.info(f"Using {('GPU' if (self.ctx_id >= 0) else 'CPU')} (ctx_id={self.ctx_id})")
        self.detector = FaceAnalysis(name=modelPath)
        self.detector.prepare(ctx_id=self.ctx_id, det_size=(480, 480))
        self.embeddings_path = embPath
        self.threshold = threshold
        self.known_faces = self._load_embeddings()
        self._emb_matrix = None
        self._name_list = []
        self._norm_matrix = None
        self._rebuild_cache()

    def _load_embeddings(self) -> dict:
        """
        Load face embeddings from disk.
        
        Returns:
            dict: Dictionary mapping person names to embedding lists
        """
        if os.path.exists(self.embeddings_path):
            try:
                with open(self.embeddings_path, 'rb') as f:
                    return pickle.load(f)
            except Exception as e:
                FancyText.error(f'Failed to load embeddings: {e}')
                return {}
        return {}

    def _save_embeddings(self) -> None:
        """Save face embeddings to disk."""
        os.makedirs(os.path.dirname(self.embeddings_path), exist_ok=True)
        with open(self.embeddings_path, 'wb') as f:
            pickle.dump(self.known_faces, f)

    def _rebuild_cache(self):
        """
        Rebuild normalized embedding matrix for fast recognition.
        
        Concatenates all embeddings and normalizes them for cosine similarity search.
        """
        all_embeddings = []
        all_names = []
        for name, emb_list in self.known_faces.items():
            for emb in emb_list:
                all_embeddings.append(emb.astype(np.float32))
                all_names.append(name)
        if len(all_embeddings) == 0:
            self._emb_matrix = None
            self._norm_matrix = None
            self._name_list = []
            return
        self._emb_matrix = np.vstack(all_embeddings).astype(np.float32)
        self._name_list = all_names
        self._norm_matrix = self._emb_matrix / np.linalg.norm(self._emb_matrix, axis=1, keepdims=True)

    def detectFace(self, frame: np.ndarray) -> list:
        """
        Detect faces in image frame.
        
        Args:
            frame (np.ndarray): BGR image frame
            
        Returns:
            list: List of detected faces with bounding boxes and embeddings
        """
        faceObjects = self.detector.get(frame)
        results = []
        for f in faceObjects:
            results.append({'bbox': f.bbox.astype(int), 'embedding': f.normed_embedding})
        return results

    def _process_image(self, path: str, personName: str) -> bool:
        """
        Process single image and extract face embedding.
        
        Args:
            path (str): Path to image file
            personName (str): Name of the person in image
            
        Returns:
            bool: True if embedding extracted successfully
        """
        img = cv2.imread(path)
        if img is None:
            FancyText.warning(f'Cannot read image: {path}')
            return False
        results = self.detectFace(img)
        if not results:
            FancyText.warning(f'No face detected in: {path}')
            return False
        embedding = results[0]['embedding']
        if personName not in self.known_faces:
            self.known_faces[personName] = []
        self.known_faces[personName].append(embedding)
        FancyText.success(f'Generated embedding for {personName}')
        return True

    def registerFace(self, path: str) -> None:
        """
        Register faces from image file(s).
        
        Args:
            path (str): Path to single image or directory of images
        """
        if not os.path.exists(path):
            FancyText.error(f'Path does not exist: {path}')
            return
        files = [path] if os.path.isfile(path) else [os.path.join(path, f) for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]
        if not files:
            FancyText.error(f'No files found in {path}')
            return
        count = 0
        for filePath in files:
            personName = os.path.splitext(os.path.basename(filePath))[0]
            if self._process_image(filePath, personName):
                count += 1
        self._save_embeddings()
        self._rebuild_cache()
        total_embeddings = sum(len(v) for v in self.known_faces.values())
        FancyText.success(
            f'Updated embeddings for {count} images/people '
            f'(total {len(self.known_faces)} people, {total_embeddings} embeddings)'
        )

    def register_face_from_image(self, personName: str, image_data: np.ndarray) -> bool:
        """
        Register a single face from an image buffer.
        
        Args:
            personName (str): Name of the person in the image.
            image_data (np.ndarray): Image data in a numpy array.
            
        Returns:
            bool: True if embedding was extracted and saved successfully.
        """
        results = self.detectFace(image_data)
        if not results:
            FancyText.warning(f'No face detected for: {personName}')
            return False
        
        embedding = results[0]['embedding']
        
        if personName not in self.known_faces:
            self.known_faces[personName] = []
        
        self.known_faces[personName].append(embedding)
        FancyText.success(f'Generated embedding for {personName}')
        
        self._save_embeddings()
        self._rebuild_cache()
        
        total_embeddings = sum(len(v) for v in self.known_faces.values())
        FancyText.success(
            f'Updated embeddings. Total {len(self.known_faces)} people, {total_embeddings} embeddings.'
        )
        return True

    def recognize(self, faceEmb: np.ndarray) -> tuple[str, float]:
        """
        Recognize face from embedding vector.
        
        Args:
            faceEmb (np.ndarray): Face embedding vector
            
        Returns:
            tuple: (person_name, confidence_score)
        """
        if self._norm_matrix is None:
            return ('Unknown', 0.0)
        faceEmb = faceEmb.astype(np.float32)
        face_norm = faceEmb / np.linalg.norm(faceEmb)
        scores = np.dot(self._norm_matrix, face_norm)
        best_idx = int(np.argmax(scores))
        best_score = float(scores[best_idx])
        best_name = self._name_list[best_idx]
        if best_score > self.threshold:
            return (best_name, best_score)
        return ('Unknown', best_score)
