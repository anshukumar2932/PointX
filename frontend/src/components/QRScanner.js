import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';

const QRScanner = ({ onScan, onError, isActive = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const startScanning = async () => {
    try {
      setError('');
      setScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        intervalRef.current = setInterval(() => {
          scanFrame();
        }, 100);
      }
    } catch (err) {
      setError('Camera access denied or not available');
      setScanning(false);
      if (onError) onError(err);
    }
  };

  const stopScanning = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setScanning(false);
  };

  useEffect(() => {
    if (isActive) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => stopScanning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        try {
          const qrData = JSON.parse(code.data);
          if (onScan) onScan(qrData);
          stopScanning();
        } catch (err) {
          // Invalid QR data format
          console.log('Invalid QR format:', code.data);
        }
      }
    }
  };

  return (
    <div className="scanner-container">
      {error && <div className="error">{error}</div>}
      
      {scanning && (
        <div style={{ position: 'relative' }}>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              maxWidth: '400px',
              borderRadius: '12px'
            }}
            playsInline
            muted
          />
          <div className="scanner-overlay" />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <p style={{ color: '#6b7280', marginBottom: '8px' }}>
              📱 Point camera at QR code
            </p>
            <button 
              onClick={stopScanning}
              className="btn btn-secondary"
            >
              Stop Scanning
            </button>
          </div>
        </div>
      )}

      {!scanning && !error && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Ready to scan QR codes
          </p>
          <button 
            onClick={startScanning}
            className="btn"
          >
            📱 Start Camera
          </button>
        </div>
      )}
    </div>
  );
};

export default QRScanner;