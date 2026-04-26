# Face Recognition System

A complete face recognition system with FastAPI backend and React frontend for student management.

## Features

- Face recognition using DeepFace
- Student photo management
- Admin dashboard for adding new students
- REST API for face recognition operations

## Project Structure

```
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI application
│   │   ├── models.py       # Data models
│   │   ├── routes/         # API routes
│   │   └── services/       # Business logic
│   ├── reference_photos/   # Student reference images
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   └── App.js         # Main app component
│   └── package.json       # Node dependencies
└── README.md
```

## Setup Instructions

### Backend Setup
1. Navigate to backend directory: `cd backend`
2. Install dependencies: `pip install -r requirements.txt`
3. Run the server: `uvicorn app.main:app --reload`

### Frontend Setup
1. Navigate to frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start development server: `npm start`

## API Endpoints

- `POST /api/students/` - Add new student
- `GET /api/students/` - Get all students
- `POST /api/recognize/` - Recognize face from uploaded image
- `DELETE /api/students/{student_id}` - Delete student