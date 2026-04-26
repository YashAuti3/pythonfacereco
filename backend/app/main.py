import json
import logging
import os
import tempfile
from pathlib import Path
from typing import List

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from .models import RecognitionResult, Student
    from .services.face_service import FaceRecognitionService
except ImportError:
    from models import RecognitionResult, Student
    from services.face_service import FaceRecognitionService

app = FastAPI(title="Face Recognition API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
PHOTOS_DIR = BASE_DIR / "reference_photos"
DB_FILE = BASE_DIR / "students_db.json"
PHOTOS_DIR.mkdir(exist_ok=True)


def load_db() -> dict:
    if DB_FILE.exists():
        try:
            return json.loads(DB_FILE.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.warning("Could not read student database: %s", exc)
    return {"counter": 0, "students": {}}


def save_db(db: dict) -> None:
    DB_FILE.write_text(json.dumps(db, indent=2), encoding="utf-8")


db = load_db()

app.mount("/reference_photos", StaticFiles(directory=str(PHOTOS_DIR)), name="photos")
face_svc = FaceRecognitionService(str(PHOTOS_DIR))


def next_id() -> str:
    db["counter"] = db.get("counter", 0) + 1
    return f"STU{db['counter']:04d}"


@app.get("/")
async def root():
    return {"message": "Face Recognition API v4 - DeepFace Facenet512"}


@app.post("/api/students/", response_model=Student)
async def add_student(
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    dob: str = Form(...),
    photo: UploadFile = File(...),
):
    if not photo.content_type or not photo.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    student_id = next_id()
    photo_path = PHOTOS_DIR / f"{student_id}.jpg"

    try:
        photo_path.write_bytes(await photo.read())

        registration = face_svc.register(student_id, str(photo_path))
        if not registration.get("registered"):
            db["counter"] -= 1
            photo_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=422,
                detail=registration.get(
                    "message",
                    "Could not register this photo. Use a clear photo with one visible face.",
                ),
            )

        record = {
            "id": student_id,
            "name": name,
            "email": email,
            "phone": phone,
            "dob": dob,
            "photo_path": str(photo_path),
            "photo_url": f"/reference_photos/{student_id}.jpg",
        }
        db["students"][student_id] = record
        save_db(db)
        return Student(**record)

    except HTTPException:
        raise
    except Exception as exc:
        db["counter"] -= 1
        photo_path.unlink(missing_ok=True)
        logger.exception("Failed to add student")
        raise HTTPException(500, str(exc)) from exc


@app.get("/api/students/", response_model=List[Student])
async def get_students():
    return [Student(**student) for student in db["students"].values()]


@app.delete("/api/students/{student_id}")
async def delete_student(student_id: str):
    if student_id not in db["students"]:
        raise HTTPException(404, "Student not found")

    record = db["students"][student_id]
    try:
        Path(record["photo_path"]).unlink(missing_ok=True)
        face_svc.remove(student_id)
        del db["students"][student_id]
        save_db(db)
        return {"message": "Deleted"}
    except Exception as exc:
        logger.exception("Failed to delete student %s", student_id)
        raise HTTPException(500, str(exc)) from exc


@app.post("/api/recognize/", response_model=RecognitionResult)
async def recognize_face(photo: UploadFile = File(...)):
    if not photo.content_type or not photo.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    tmp = Path(tempfile.gettempdir()) / f"recog_{os.urandom(4).hex()}.jpg"
    try:
        tmp.write_bytes(await photo.read())
        result = face_svc.recognize(str(tmp))

        if result["match_found"]:
            student_id = result["student_id"]
            student = db["students"].get(student_id, {})
            return RecognitionResult(
                match_found=True,
                student_id=student_id,
                student_name=student.get("name", student_id),
                student_email=student.get("email"),
                student_phone=student.get("phone"),
                student_dob=student.get("dob"),
                photo_url=student.get("photo_url"),
                confidence=result["confidence"],
                distance=result.get("distance"),
                threshold=result.get("threshold"),
                second_best_distance=result.get("second_best_distance"),
                face_confidence=result.get("face_confidence"),
                message=result.get("message"),
            )

        return RecognitionResult(
            match_found=False,
            confidence=0.0,
            distance=result.get("distance"),
            threshold=result.get("threshold"),
            second_best_distance=result.get("second_best_distance"),
            face_confidence=result.get("face_confidence"),
            message=result.get("message"),
        )

    except Exception as exc:
        logger.exception("Recognition failed")
        raise HTTPException(500, str(exc)) from exc
    finally:
        tmp.unlink(missing_ok=True)


@app.post("/api/rebuild/")
async def rebuild():
    face_svc.rebuild()
    return {"rebuilt": len(face_svc._store), "ids": list(face_svc._store.keys())}


@app.get("/api/debug/")
async def debug():
    photos = [
        f.name
        for f in PHOTOS_DIR.iterdir()
        if f.suffix.lower() in FaceRecognitionService.SUPPORTED_EXTENSIONS and not f.name.startswith(".")
    ]
    return {
        "photos_on_disk": photos,
        "students_in_db": list(db["students"].keys()),
        "embeddings_cached": list(face_svc._store.keys()),
        "model": face_svc.MODEL,
        "threshold": face_svc.DISTANCE_THRESHOLD,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
