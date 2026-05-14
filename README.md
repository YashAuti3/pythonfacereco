# Face Recognition System

A student face recognition application built with FastAPI and React. This system allows you to register student photos and automatically recognize them from images or webcam feeds.

## Overview

This project was created to build a practical face recognition solution for student management. The backend handles the heavy lifting with DeepFace for face detection and recognition, while the frontend provides an intuitive interface for managing students and testing the recognition system.

## What's Included

The system has two main components:

**Backend (Python/FastAPI):**
- REST API for all face recognition operations
- Face embedding calculation and storage
- Student database management
- Face comparison and matching logic
- Photo upload and processing

**Frontend (React):**
- Student management interface
- Live webcam capture for testing recognition
- Admin panel to add and remove students
- Real-time face recognition results display

## Getting Started

### Prerequisites
- Python 3.8 or higher
- Node.js and npm
- A working webcam (for testing)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The application will open at http://localhost:3000

## Project Structure

```
face_recognition/
├── backend/
│   ├── app/
│   │   ├── main.py              # Main FastAPI application
│   │   ├── models.py            # Data models and schemas
│   │   ├── student_store.py     # Student data persistence
│   │   └── services/
│   │       └── face_service.py  # Face recognition logic
│   ├── reference_photos/        # Stores student reference images
│   └── requirements.txt         # Python dependencies
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddStudent.js           # Add new student form
│   │   │   ├── FaceRecognition.js      # Recognition testing
│   │   │   ├── StudentList.js          # Display all students
│   │   │   └── WebcamCapture.js        # Live webcam component
│   │   ├── services/
│   │   │   └── api.js           # API communication
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
└── README.md
```

## How It Works

1. Register students by uploading their photos through the admin interface
2. The system calculates face embeddings for each student
3. When you upload an image or capture from webcam, the system:
   - Detects faces in the image
   - Calculates embeddings for detected faces
   - Compares against stored student embeddings
   - Returns the best matching student

## Available API Endpoints

- `POST /api/students/` - Register a new student with photo
- `GET /api/students/` - Get list of all registered students
- `POST /api/recognize/` - Send image for face recognition
- `DELETE /api/students/{student_id}` - Remove a student

## Development Notes

The face recognition is powered by DeepFace, which uses deep learning models to generate face embeddings. These embeddings are compared to find the best match.

Student data and photos are stored locally in the backend directory. For production use, consider moving to a proper database and cloud storage.

## Troubleshooting

If the webcam component isn't working, make sure your browser has permission to access the webcam. Also check that you're accessing the app over HTTPS or localhost.

For face recognition accuracy issues, ensure the reference photos are clear, well-lit, and show the face clearly. Multiple photos of each student can improve accuracy.