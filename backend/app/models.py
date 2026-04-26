from pydantic import BaseModel
from typing import Optional

class Student(BaseModel):
    id: str          # auto-incremented e.g. STU001
    name: str
    email: str
    phone: str
    dob: str
    photo_path: str
    photo_url: str

class RecognitionResult(BaseModel):
    match_found: bool
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    student_phone: Optional[str] = None
    student_dob: Optional[str] = None
    photo_url: Optional[str] = None
    confidence: float = 0.0
    distance: Optional[float] = None
    threshold: Optional[float] = None
    second_best_distance: Optional[float] = None
    face_confidence: Optional[float] = None
    message: Optional[str] = None
