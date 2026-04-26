import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { studentAPI } from '../services/api';
import WebcamCapture from './WebcamCapture';

export default function FaceRecognition() {
  const [mode, setMode] = useState('upload'); // 'upload' | 'camera'
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // ── Dropzone ──────────────────────────────────────────────
  const onDrop = useCallback((files) => {
    const file = files[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
    maxFiles: 1,
  });

  // ── Webcam capture → immediately recognize ────────────────
  const handleCapture = async (file) => {
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setShowCamera(false);
    setResult(null);
    setError('');
    await runRecognition(file);
  };

  const switchMode = (m) => {
    setMode(m);
    setShowCamera(false);
    setPhoto(null);
    setPreview(null);
    setResult(null);
    setError('');
  };

  // ── Recognition ───────────────────────────────────────────
  const runRecognition = async (fileOverride) => {
    const target = fileOverride || photo;
    if (!target) { setError('Please provide a photo first.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await studentAPI.recognizeFace(target);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Recognition failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhoto(null);
    setPreview(null);
    setResult(null);
    setError('');
    setShowCamera(false);
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '0.25rem', color: '#333' }}>Face Recognition</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Identify a registered student by scanning their face.
      </p>

      {error && <div className="error">{error}</div>}

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          className="btn"
          onClick={() => switchMode('upload')}
          style={{ flex: 1, background: mode === 'upload' ? '#667eea' : '#e1e5e9', color: mode === 'upload' ? 'white' : '#333' }}
        >
          📁 Upload Photo
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => switchMode('camera')}
          style={{ flex: 1, background: mode === 'camera' ? '#667eea' : '#e1e5e9', color: mode === 'camera' ? 'white' : '#333' }}
        >
          📷 Live Webcam Scan
        </button>
      </div>

      {/* ── Upload mode ── */}
      {mode === 'upload' && (
        <>
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} style={{ marginBottom: '1rem' }}>
            <input {...getInputProps()} />
            {preview ? (
              <div>
                <img
                  src={preview}
                  alt="to recognize"
                  style={{ maxWidth: 220, maxHeight: 220, borderRadius: 10, objectFit: 'cover', border: '3px solid #667eea' }}
                />
                <p style={{ color: '#666', fontSize: '0.85rem', marginTop: 8 }}>Click or drag to replace</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '2.5rem' }}>🔍</p>
                <p style={{ fontWeight: 500 }}>Drag & drop or click to select a photo</p>
                <p style={{ color: '#999', fontSize: '0.85rem', marginTop: 4 }}>JPG, JPEG, PNG supported</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => runRecognition()}
              disabled={loading || !photo}
              style={{ flex: 1 }}
            >
              {loading ? '⏳ Scanning...' : '🔍 Recognize Face'}
            </button>
            {(photo || result) && (
              <button className="btn" onClick={reset} style={{ background: '#e1e5e9', color: '#333' }}>
                Reset
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Camera mode ── */}
      {mode === 'camera' && (
        <div>
          {/* Not yet opened */}
          {!showCamera && !preview && (
            <div style={{ textAlign: 'center', padding: '1.5rem', border: '2px dashed #667eea', borderRadius: 10, background: '#f8f9ff' }}>
              <p style={{ fontSize: '2.5rem' }}>📷</p>
              <p style={{ fontWeight: 500, marginBottom: 12 }}>Open your webcam to scan a face</p>
              <button className="btn btn-primary" onClick={() => setShowCamera(true)}>
                🎥 Start Camera
              </button>
            </div>
          )}

          {/* Live webcam — mounts/unmounts cleanly */}
          {showCamera && (
            <WebcamCapture
              onCapture={handleCapture}
              onClose={() => setShowCamera(false)}
              buttonLabel="🔍 Scan Face"
            />
          )}

          {/* After capture — show preview + actions */}
          {preview && !showCamera && (
            <div style={{ textAlign: 'center' }}>
              <img
                src={preview}
                alt="scanned"
                style={{ maxWidth: 300, borderRadius: 10, border: '3px solid #667eea', marginBottom: '0.75rem' }}
              />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => runRecognition()}
                  disabled={loading}
                >
                  {loading ? '⏳ Scanning...' : '🔍 Scan Again'}
                </button>
                <button
                  className="btn"
                  onClick={() => { setShowCamera(true); setPhoto(null); setPreview(null); setResult(null); }}
                  style={{ background: '#e1e5e9', color: '#333' }}
                >
                  🔄 Retake
                </button>
                <button className="btn" onClick={reset} style={{ background: '#e1e5e9', color: '#333' }}>
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Loading spinner ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#667eea', marginTop: '1rem' }}>
          <div className="spinner" />
          <p style={{ marginTop: 8 }}>Analyzing face… this may take a moment.</p>
        </div>
      )}

      {/* ── Result card ── */}
      {result && !loading && (
        <div
          className={`recognition-result ${result.match_found ? 'success' : 'failure'}`}
          style={{ marginTop: '1.25rem', padding: '1.25rem' }}
        >
          {result.match_found ? (
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', textAlign: 'left' }}>
              {result.photo_url && (
                <img
                  src={`http://localhost:8000${result.photo_url}`}
                  alt="matched student"
                  style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid #28a745', flexShrink: 0 }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              <div>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>✅ Student Identified!</p>
                <p style={{ fontSize: '1.15rem', fontWeight: 700 }}>{result.student_name}</p>
                <p style={{ marginTop: 4 }}>🪪 ID: <strong>{result.student_id}</strong></p>
                {result.student_email && <p>📧 {result.student_email}</p>}
                {result.student_phone && <p>📞 {result.student_phone}</p>}
                {result.student_dob && <p>🎂 DOB: {result.student_dob}</p>}
                <p style={{ marginTop: 8, fontSize: '0.88rem', opacity: 0.75 }}>
                  Match confidence: {(result.confidence * 100).toFixed(1)}%
                </p>
                {typeof result.distance === 'number' && (
                  <p style={{ fontSize: '0.82rem', opacity: 0.7 }}>
                    Face distance: {result.distance.toFixed(4)}
                    {typeof result.threshold === 'number' ? ` / ${result.threshold.toFixed(2)}` : ''}
                  </p>
                )}
                {typeof result.face_confidence === 'number' && (
                  <p style={{ fontSize: '0.82rem', opacity: 0.7 }}>
                    Detection confidence: {(result.face_confidence * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '2rem', marginBottom: 6 }}>❌</p>
              <p style={{ fontWeight: 700, fontSize: '1.05rem' }}>No Match Found</p>
              <p style={{ marginTop: 4 }}>
                {result.message || 'This face does not match any registered student.'}
              </p>
              {typeof result.distance === 'number' && (
                <p style={{ marginTop: 6, fontSize: '0.84rem', opacity: 0.75 }}>
                  Closest distance: {result.distance.toFixed(4)}
                  {typeof result.threshold === 'number' ? ` / ${result.threshold.toFixed(2)}` : ''}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
