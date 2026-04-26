import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import AddStudent from './components/AddStudent';
import StudentList from './components/StudentList';
import FaceRecognition from './components/FaceRecognition';

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="nav">
      <Link 
        to="/add-student" 
        className={`nav-button ${location.pathname === '/add-student' ? 'active' : ''}`}
      >
        Add Student
      </Link>
      <Link 
        to="/students" 
        className={`nav-button ${location.pathname === '/students' ? 'active' : ''}`}
      >
        View Students
      </Link>
      <Link 
        to="/recognize" 
        className={`nav-button ${location.pathname === '/recognize' ? 'active' : ''}`}
      >
        Face Recognition
      </Link>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="container">
        <header className="header">
          <h1>Face Recognition System</h1>
          <p>Admin Dashboard for Student Management</p>
        </header>
        
        <Navigation />
        
        <Routes>
          <Route path="/" element={<AddStudent />} />
          <Route path="/add-student" element={<AddStudent />} />
          <Route path="/students" element={<StudentList />} />
          <Route path="/recognize" element={<FaceRecognition />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;