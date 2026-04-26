import React, { useEffect, useRef, useState } from 'react';

/**
 * Reusable webcam component.
 * Props:
 *   onCapture(file)  — called with a File when user clicks capture
 *   onClose()        — called when user clicks cancel/stop
 *   buttonLabel      — text on the capture button (default "📸 Capture")
 */
export default function WebcamCapture({ onCapture, onClose, buttonLabel = '📸 Capture' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');

  // Start stream once component mounts
  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width:  { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setReady(true);
          };
        }
      } catch (e) {
        if (!cancelled) setErr('Camera access denied. Please allow camera in your browser.');
      }
    }

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !ready) return;

    // Send a centered face crop instead of the full wide webcam frame.
    const sourceW = video.videoWidth  || 1280;
    const sourceH = video.videoHeight || 720;
    const cropW = Math.round(sourceW * 0.68);
    const cropH = Math.round(Math.min(sourceH * 0.92, cropW * 1.25));
    const cropX = Math.round((sourceW - cropW) / 2);
    const cropY = Math.round((sourceH - cropH) / 2);

    const canvas = document.createElement('canvas');
    canvas.width  = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');

    // Draw WITHOUT mirroring — the video CSS is mirrored for UX
    // but the actual pixel data should be the natural orientation
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    canvas.toBlob(
      (blob) => {
        const file = new File([blob], 'webcam_capture.jpg', { type: 'image/jpeg' });
        streamRef.current?.getTracks().forEach(t => t.stop());
        onCapture(file);
      },
      'image/jpeg',
      0.95,
    );
  };

  const handleClose = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    onClose();
  };

  return (
    <div style={{ textAlign: 'center' }}>
      {err ? (
        <div style={{ padding: '1rem', color: '#721c24', background: '#f8d7da', borderRadius: 8, marginBottom: '1rem' }}>
          {err}
          <br />
          <button className="btn" onClick={handleClose} style={{ marginTop: 8, background: '#e1e5e9', color: '#333' }}>
            Close
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: 480 }}>
            {/* Video feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                borderRadius: 12,
                border: '3px solid #667eea',
                display: 'block',
                background: '#000',
                minHeight: 240,
                transform: 'scaleX(-1)',   // mirror preview for natural selfie feel
              }}
            />
            {/* Face guide oval */}
            {ready && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '45%', height: '70%',
                  border: '3px dashed rgba(255,255,255,0.85)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.25)',
                }}
              />
            )}
            {!ready && !err && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '0.9rem', background: 'rgba(0,0,0,0.5)', borderRadius: 12,
              }}>
                Starting camera...
              </div>
            )}
          </div>

          {ready && (
            <p style={{ color: '#667eea', margin: '0.6rem 0', fontSize: '0.88rem' }}>
              Align your face inside the oval, then click capture
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={capture}
              disabled={!ready}
            >
              {buttonLabel}
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleClose}
              style={{ background: '#e1e5e9', color: '#333' }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
