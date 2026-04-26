import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { studentAPI } from '../services/api';
import WebcamCapture from './WebcamCapture';

export default function AddStudent() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', dob: '' });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [photoMode, setPhotoMode] = useState('upload'); // 'upload' | 'camera'
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // ── Dropzone ──────────────────────────────────────────────
  const onDrop = useCallback((files) => {
    const file = files[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
    maxFiles: 1,
  });

  // ── Webcam callbacks ──────────────────────────────────────
  const handleCapture = (file) => {
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setShowCamera(false);
    setError('');
  };

  const switchMode = (mode) => {
    setPhotoMode(mode);
    setShowCamera(false);
    setPhoto(null);
    setPreview(null);
    setError('');
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!photo) { setError('Please provide a photo.'); return; }

    setLoading(true);
    try {
      const student = await studentAPI.addStudent({ ...form, photo });
      setSuccess(`Student "${student.name}" registered successfully as ${student.id}`);
      setForm({ name: '', email: '', phone: '', dob: '' });
      setPhoto(null);
      setPreview(null);
      setShowCamera(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register student.');
    } finally {
      setLoading(false);
    }
  };

  const field = (label, name, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label>{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={e => setForm({ ...form, [name]: e.target.value })}
        placeholder={placeholder}
        required
      />
    </div>
  );

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Register New Student</h2>

      {error && <div className="error">{error}</div>}
      {success && (
        <div style={{ background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', borderRadius: 6, padding: '0.9rem 1rem', marginBottom: '1rem' }}>
          ✅ {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Personal info grid */}
        <div className="form-grid">
          {field('Full Name', 'name', 'text', 'John Doe')}
          {field('Email', 'email', 'email', 'john@example.com')}
          {field('Phone Number', 'phone', 'tel', '+1 234 567 8900')}
          {field('Date of Birth', 'dob', 'date')}
        </div>

        {/* Photo section */}
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label>Reference Photo</label>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <button
              type="button"
              className="btn"
              onClick={() => switchMode('upload')}
              style={{
                flex: 1,
                background: photoMode === 'upload' ? '#667eea' : '#e1e5e9',
                color: photoMode === 'upload' ? 'white' : '#333',
              }}
            >
              📁 Upload Photo
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => switchMode('camera')}
              style={{
                flex: 1,
                background: photoMode === 'camera' ? '#667eea' : '#e1e5e9',
                color: photoMode === 'camera' ? 'white' : '#333',
              }}
            >
              📷 Use Webcam
            </button>
          </div>

          {/* ── Upload mode ── */}
          {photoMode === 'upload' && (
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
              <input {...getInputProps()} />
              {preview ? (
                <div>
                  <img
                    src={preview}
                    alt="preview"
                    style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid #667eea' }}
                  />
                  <p style={{ color: '#666', fontSize: '0.85rem', marginTop: 8 }}>Click or drag to replace</p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '2.5rem' }}>📷</p>
                  <p style={{ fontWeight: 500 }}>Drag & drop or click to select</p>
                  <p style={{ color: '#999', fontSize: '0.85rem', marginTop: 4 }}>JPG, JPEG, PNG supported</p>
                </div>
              )}
            </div>
          )}

          {/* ── Camera mode ── */}
          {photoMode === 'camera' && (
            <div>
              {/* Show captured preview or start button */}
              {!showCamera && (
                <div style={{ textAlign: 'center' }}>
                  {preview ? (
                    <div>
                      <img
                        src={preview}
                        alt="captured"
                        style={{ width: 150, height: 150, borderRadius: '50%', objectFit: 'cover', border: '4px solid #667eea' }}
                      />
                      <p style={{ color: '#28a745', fontWeight: 600, marginTop: 8 }}>✅ Photo captured</p>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => { setShowCamera(true); setPhoto(null); setPreview(null); }}
                        style={{ marginTop: 8, background: '#e1e5e9', color: '#333' }}
                      >
                        🔄 Retake
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '1.5rem', border: '2px dashed #667eea', borderRadius: 10, background: '#f8f9ff' }}>
                      <p style={{ fontSize: '2.5rem' }}>🎥</p>
                      <p style={{ fontWeight: 500, marginBottom: 12 }}>Use your webcam to take a photo</p>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setShowCamera(true)}
                      >
                        🎥 Open Camera
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Live webcam */}
              {showCamera && (
                <WebcamCapture
                  onCapture={handleCapture}
                  onClose={() => setShowCamera(false)}
                  buttonLabel="📸 Capture Photo"
                />
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%', marginTop: '1rem', padding: '0.9rem', fontSize: '1rem' }}
        >
          {loading ? 'Registering...' : 'Register Student'}
        </button>
      </form>
    </div>
  );
}
