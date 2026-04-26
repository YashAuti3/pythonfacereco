import json
import logging
import math
import os
from pathlib import Path
from typing import Any

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import cv2
import numpy as np
from deepface import DeepFace

logger = logging.getLogger(__name__)


class FaceRecognitionService:
    """Face registration and recognition using DeepFace embeddings."""

    MODEL = "Facenet512"
    DISTANCE_METRIC = "cosine"
    NORMALIZATION = "Facenet"
    DETECTORS = ("retinaface", "mtcnn", "opencv")
    DISTANCE_THRESHOLD = 0.42
    MIN_FACE_CONFIDENCE = 0.50
    MIN_FACE_SIZE = 60
    MIN_SHARPNESS = 25.0
    UPSCALE_SHORT_SIDE = 640
    EXPAND_PERCENTAGE = 10
    ACCEPTANCE_MARGIN = 0.04
    SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

    def __init__(self, reference_photos_dir: str):
        self.ref_dir = Path(reference_photos_dir)
        self.store_file = self.ref_dir.parent / "embeddings.json"
        self._store: dict[str, Any] = {}
        self._load()

    def _load(self) -> None:
        if not self.store_file.exists():
            self._store = {}
            return

        try:
            raw = json.loads(self.store_file.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.warning("Could not load embeddings file: %s", exc)
            self._store = {}
            return

        self._store = raw if isinstance(raw, dict) else {}
        logger.info("Loaded %d enrolled face records", len(self._store))

    def _save(self) -> None:
        tmp = self.store_file.with_suffix(".tmp")
        tmp.write_text(json.dumps(self._store, indent=2), encoding="utf-8")
        tmp.replace(self.store_file)

    def _preprocess(self, image_path: str) -> tuple[str, bool]:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("The uploaded file is not a readable image.")

        h, w = img.shape[:2]
        short = min(h, w)
        if short >= self.UPSCALE_SHORT_SIDE:
            return image_path, False

        scale = max(1.0, self.UPSCALE_SHORT_SIDE / short)
        resized = cv2.resize(
            img,
            (int(round(w * scale)), int(round(h * scale))),
            interpolation=cv2.INTER_CUBIC,
        )
        tmp = str(Path(image_path).parent / f"_pre_{Path(image_path).name}")
        cv2.imwrite(tmp, resized)
        return tmp, True

    @staticmethod
    def _face_area(face: dict) -> int:
        area = face.get("facial_area") or {}
        return int(area.get("w", 0) * area.get("h", 0))

    @staticmethod
    def _normalize_embedding(embedding: list[float]) -> list[float]:
        arr = np.asarray(embedding, dtype=np.float32)
        norm = np.linalg.norm(arr)
        if not np.isfinite(norm) or norm <= 0:
            raise ValueError("Invalid face embedding.")
        return (arr / norm).astype(float).tolist()

    def _quality_score(self, image_path: str, face: dict) -> float:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 0.0

        area = face.get("facial_area") or {}
        x = max(0, int(area.get("x", 0)))
        y = max(0, int(area.get("y", 0)))
        w = max(0, int(area.get("w", 0)))
        h = max(0, int(area.get("h", 0)))
        crop = img[y : y + h, x : x + w]
        if crop.size == 0:
            return 0.0
        return float(cv2.Laplacian(crop, cv2.CV_64F).var())

    def _represent_faces(self, image_path: str) -> tuple[list[dict], str]:
        last_error: Exception | None = None
        for detector in self.DETECTORS:
            try:
                faces = DeepFace.represent(
                    img_path=image_path,
                    model_name=self.MODEL,
                    detector_backend=detector,
                    enforce_detection=True,
                    align=True,
                    expand_percentage=self.EXPAND_PERCENTAGE,
                    normalization=self.NORMALIZATION,
                    max_faces=2,
                    l2_normalize=True,
                )
            except Exception as exc:
                last_error = exc
                logger.info("Detector %s did not produce a face: %s", detector, exc)
                continue

            valid_faces = []
            for face in faces or []:
                raw_confidence = face.get("face_confidence")
                confidence = float(raw_confidence) if raw_confidence is not None else 1.0
                area = face.get("facial_area") or {}
                face_size = min(int(area.get("w", 0)), int(area.get("h", 0)))
                embedding = face.get("embedding")
                if (
                    embedding
                    and confidence >= self.MIN_FACE_CONFIDENCE
                    and face_size >= self.MIN_FACE_SIZE
                ):
                    valid_faces.append(face)

            if valid_faces:
                valid_faces.sort(key=self._face_area, reverse=True)
                logger.info("Detected %d valid face(s) with %s", len(valid_faces), detector)
                return valid_faces, detector

        if last_error:
            logger.info("No usable face detected in %s: %s", Path(image_path).name, last_error)
        return [], ""

    def _embed_single_face(self, image_path: str, *, strict: bool) -> tuple[list[float] | None, dict]:
        preprocessed, cleanup = self._preprocess(image_path)
        try:
            faces, detector = self._represent_faces(preprocessed)
            if not faces:
                return None, {
                    "reason": "no_face",
                    "message": "No clear face was detected. Use a front-facing photo with good lighting.",
                }

            if len(faces) > 1:
                return None, {
                    "reason": "multiple_faces",
                    "message": "Multiple faces were detected. Use a photo with only one person.",
                    "face_count": len(faces),
                }

            face = faces[0]
            sharpness = self._quality_score(preprocessed, face)
            if strict and sharpness < self.MIN_SHARPNESS:
                return None, {
                    "reason": "blurry_face",
                    "message": "The face is too blurry. Retake the photo with the face steady and well lit.",
                    "sharpness": round(sharpness, 2),
                }

            embedding = self._normalize_embedding(face["embedding"])
            return embedding, {
                "reason": "ok",
                "detector": detector,
                "face_confidence": round(float(face.get("face_confidence") or 0.0), 4),
                "sharpness": round(sharpness, 2),
            }
        finally:
            if cleanup and os.path.exists(preprocessed):
                os.remove(preprocessed)

    @staticmethod
    def _cosine_distance(normalized_a: list[float], normalized_b: list[float]) -> float:
        a = np.asarray(normalized_a, dtype=np.float32)
        b = np.asarray(normalized_b, dtype=np.float32)
        if a.shape != b.shape or a.size == 0:
            return 1.0
        distance = 1.0 - float(np.dot(a, b))
        return max(0.0, min(2.0, distance)) if math.isfinite(distance) else 1.0

    def _stored_embeddings(self, record: Any) -> list[list[float]]:
        if isinstance(record, list):
            return [record]
        if isinstance(record, dict):
            embeddings = record.get("embeddings", [])
            if embeddings and isinstance(embeddings[0], (int, float)):
                return [embeddings]
            return embeddings
        return []

    def register(self, student_id: str, image_path: str) -> dict:
        embedding, meta = self._embed_single_face(image_path, strict=True)
        if embedding is None:
            return {"registered": False, **meta}

        self._store[student_id] = {
            "embeddings": [embedding],
            "model": self.MODEL,
            "distance_metric": self.DISTANCE_METRIC,
            "normalization": self.NORMALIZATION,
            "detector": meta.get("detector"),
            "face_confidence": meta.get("face_confidence"),
            "sharpness": meta.get("sharpness"),
            "reference_path": image_path,
        }
        self._save()
        logger.info("Registered face for %s", student_id)
        return {"registered": True, **meta}

    def remove(self, student_id: str) -> None:
        if student_id in self._store:
            del self._store[student_id]
            self._save()

    def rebuild(self) -> None:
        self._store = {}
        for photo in self.ref_dir.iterdir():
            if photo.suffix.lower() not in self.SUPPORTED_EXTENSIONS or photo.name.startswith("."):
                continue
            result = self.register(photo.stem, str(photo))
            if not result.get("registered"):
                logger.warning("Skipped %s during rebuild: %s", photo.name, result.get("message"))
        self._save()
        logger.info("Rebuild done: %d enrolled face record(s)", len(self._store))

    def recognize(self, image_path: str) -> dict:
        if not os.path.exists(image_path):
            raise FileNotFoundError(image_path)

        if not self._store:
            return {
                "match_found": False,
                "student_id": None,
                "confidence": 0.0,
                "message": "No students are registered yet.",
            }

        query, meta = self._embed_single_face(image_path, strict=False)
        if query is None:
            return {
                "match_found": False,
                "student_id": None,
                "confidence": 0.0,
                "message": meta.get("message", "No usable face was detected."),
                **meta,
            }

        best_id = None
        best_distance = float("inf")
        second_best_distance = float("inf")
        for student_id, record in self._store.items():
            for ref in self._stored_embeddings(record):
                try:
                    normalized_ref = self._normalize_embedding(ref)
                except ValueError:
                    continue
                distance = self._cosine_distance(query, normalized_ref)
                logger.info("Compared scan with %s: distance=%.4f", student_id, distance)
                if distance < best_distance:
                    second_best_distance = best_distance
                    best_distance = distance
                    best_id = student_id
                elif distance < second_best_distance:
                    second_best_distance = distance

        has_clear_margin = (
            not math.isfinite(second_best_distance)
            or second_best_distance - best_distance >= self.ACCEPTANCE_MARGIN
        )
        if best_id and best_distance <= self.DISTANCE_THRESHOLD and has_clear_margin:
            confidence = 1.0 - (best_distance / self.DISTANCE_THRESHOLD)
            return {
                "match_found": True,
                "student_id": best_id,
                "confidence": round(max(0.0, min(1.0, confidence)), 4),
                "distance": round(best_distance, 4),
                "threshold": self.DISTANCE_THRESHOLD,
                "second_best_distance": (
                    round(second_best_distance, 4) if math.isfinite(second_best_distance) else None
                ),
                "message": "Face matched.",
                **meta,
            }

        return {
            "match_found": False,
            "student_id": None,
            "confidence": 0.0,
            "distance": round(best_distance, 4) if math.isfinite(best_distance) else None,
            "threshold": self.DISTANCE_THRESHOLD,
            "second_best_distance": (
                round(second_best_distance, 4) if math.isfinite(second_best_distance) else None
            ),
            "message": (
                "The scan is too close to another enrolled face. Try again with better lighting."
                if best_id and best_distance <= self.DISTANCE_THRESHOLD
                else "No registered student matched this face."
            ),
            **meta,
        }
