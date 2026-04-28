import json
import logging
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional


logger = logging.getLogger(__name__)


class StudentStore:
    def __init__(self, db_path: Path, legacy_json_path: Optional[Path] = None):
        self.db_path = db_path
        self.legacy_json_path = legacy_json_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        self._migrate_legacy_json()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS app_state (
                    key TEXT PRIMARY KEY,
                    value INTEGER NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS students (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    dob TEXT NOT NULL,
                    photo_path TEXT NOT NULL,
                    photo_url TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.execute(
                "INSERT OR IGNORE INTO app_state (key, value) VALUES ('student_counter', 0)"
            )

    def _migrate_legacy_json(self) -> None:
        if not self.legacy_json_path or not self.legacy_json_path.exists():
            return

        with self._connect() as conn:
            existing_count = conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]
            if existing_count:
                return

            try:
                legacy = json.loads(self.legacy_json_path.read_text(encoding="utf-8"))
            except Exception as exc:
                logger.warning("Could not migrate legacy student JSON: %s", exc)
                return

            students = legacy.get("students", {})
            for student in students.values():
                conn.execute(
                    """
                    INSERT OR REPLACE INTO students
                    (id, name, email, phone, dob, photo_path, photo_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        student["id"],
                        student["name"],
                        student["email"],
                        student["phone"],
                        student["dob"],
                        student["photo_path"],
                        student["photo_url"],
                    ),
                )

            counter = int(legacy.get("counter") or self._max_student_number(conn))
            conn.execute(
                """
                INSERT INTO app_state (key, value)
                VALUES ('student_counter', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (counter,),
            )
            logger.info("Migrated %s students from JSON to SQLite", len(students))

    def _max_student_number(self, conn: sqlite3.Connection) -> int:
        rows = conn.execute("SELECT id FROM students").fetchall()
        numbers = []
        for row in rows:
            student_id = row["id"]
            if student_id.startswith("STU") and student_id[3:].isdigit():
                numbers.append(int(student_id[3:]))
        return max(numbers, default=0)

    def next_id(self) -> str:
        with self._connect() as conn:
            current = conn.execute(
                "SELECT value FROM app_state WHERE key = 'student_counter'"
            ).fetchone()[0]
            next_value = current + 1
            conn.execute(
                "UPDATE app_state SET value = ? WHERE key = 'student_counter'",
                (next_value,),
            )
            return f"STU{next_value:04d}"

    def add_student(self, student: dict) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO students
                (id, name, email, phone, dob, photo_path, photo_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    student["id"],
                    student["name"],
                    student["email"],
                    student["phone"],
                    student["dob"],
                    student["photo_path"],
                    student["photo_url"],
                ),
            )

    def list_students(self) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, name, email, phone, dob, photo_path, photo_url
                FROM students
                ORDER BY CAST(SUBSTR(id, 4) AS INTEGER), id
                """
            ).fetchall()
            return [dict(row) for row in rows]

    def get_student(self, student_id: str) -> Optional[dict]:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT id, name, email, phone, dob, photo_path, photo_url
                FROM students
                WHERE id = ?
                """,
                (student_id,),
            ).fetchone()
            return dict(row) if row else None

    def delete_student(self, student_id: str) -> bool:
        with self._connect() as conn:
            cursor = conn.execute("DELETE FROM students WHERE id = ?", (student_id,))
            return cursor.rowcount > 0

    def list_student_ids(self) -> list[str]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id FROM students ORDER BY CAST(SUBSTR(id, 4) AS INTEGER), id"
            ).fetchall()
            return [row["id"] for row in rows]
