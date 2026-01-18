import React, { useState } from 'react';
import QRCode from 'qrcode.react';

const QRGenerator = ({ type, itemId, title, onGenerate }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateQR = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/generate-qr/${type}/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQrData(data.qr_data);
        if (onGenerate) onGenerate(data.qr_data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate QR code');
      }
    } catch (err) {
      setError('Network error');
    }

    setLoading(false);
  };

  const downloadQR = () => {
    const canvas = document.querySelector(`#qr-${itemId} canvas`);
    if (canvas) {
      const url = canvas.toDataURL();
      const link = document.createElement('a');
      link.download = `${type}-${itemId.slice(0, 8)}.png`;
      link.href = url;
      link.click();
    }
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    const canvas = document.querySelector(`#qr-${itemId} canvas`);
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      printWindow.document.write(`
        <html>
          <head><title>QR Code - ${title}</title></head>
          <body style="text-align: center; padding: 20px;">
            <h2>${title}</h2>
            <img src="${dataUrl}" style="max-width: 300px;" />
            <p>Scan this QR code with the Arcade Wallet app</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="qr-container">
      <h3>{title}</h3>
      
      {!qrData && (
        <button 
          onClick={generateQR} 
          className="btn"
          disabled={loading}
        >
          {loading ? 'Generating...' : '📱 Generate QR Code'}
        </button>
      )}

      {error && <div className="error">{error}</div>}

      {qrData && (
        <div>
          <div id={`qr-${itemId}`} style={{ margin: '20px 0' }}>
            <QRCode 
              value={JSON.stringify(qrData)}
              size={256}
              level="M"
              includeMargin={true}
            />
          </div>
          
          <div style={{ marginTop: '16px' }}>
            <button onClick={downloadQR} className="btn btn-secondary">
              💾 Download
            </button>
            <button onClick={printQR} className="btn btn-secondary">
              🖨️ Print
            </button>
            <button 
              onClick={() => setQrData(null)} 
              className="btn btn-secondary"
            >
              🔄 Regenerate
            </button>
          </div>

          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#f9fafb', 
            borderRadius: '8px',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            <strong>QR Data:</strong>
            <pre style={{ margin: '8px 0', fontSize: '10px' }}>
              {JSON.stringify(qrData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRGenerator;