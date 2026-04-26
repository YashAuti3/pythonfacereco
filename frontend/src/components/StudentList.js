import React, { useState, useEffect } from 'react';
import { studentAPI } from '../services/api';

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    studentAPI.getStudents()
      .then(data => setStudents(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load students.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await studentAPI.deleteStudent(id);
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch {
      setError('Failed to delete student.');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Loading students...</div>;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ color: '#333' }}>Registered Students</h2>
        <span style={{ background: '#667eea', color: 'white', padding: '4px 14px', borderRadius: 20, fontSize: '0.9rem' }}>
          {students.length} student{students.length !== 1 ? 's' : ''}
        </span>
      </div>

      {students.length > 0 && (
        <input
          placeholder="🔎 Search by name, ID or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: 6, border: '2px solid #e1e5e9', marginBottom: '1.5rem', fontSize: '0.95rem' }}
        />
      )}

      {error && <div className="error">{error}</div>}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
          <p style={{ fontSize: '3rem' }}>👥</p>
          <p>{students.length === 0 ? 'No students registered yet.' : 'No results match your search.'}</p>
        </div>
      ) : (
        <div className="students-grid">
          {filtered.map(student => (
            <div key={student.id} className="student-card">
              <img
                src={`http://localhost:8000${student.photo_url}`}
                alt={student.name}
                className="student-photo"
                onError={e => { e.target.src = 'https://placehold.co/120x120?text=No+Photo'; }}
              />
              <div style={{ background: '#667eea', color: 'white', borderRadius: 12, padding: '2px 10px', fontSize: '0.8rem', display: 'inline-block', marginBottom: 6 }}>
                {student.id}
              </div>
              <h3 style={{ margin: '4px 0', color: '#333' }}>{student.name}</h3>
              <p style={{ color: '#666', fontSize: '0.85rem', margin: '2px 0' }}>📧 {student.email}</p>
              <p style={{ color: '#666', fontSize: '0.85rem', margin: '2px 0' }}>📞 {student.phone}</p>
              <p style={{ color: '#666', fontSize: '0.85rem', margin: '2px 0 12px' }}>🎂 {student.dob}</p>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(student.id, student.name)}
                disabled={deletingId === student.id}
                style={{ width: '100%' }}
              >
                {deletingId === student.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
