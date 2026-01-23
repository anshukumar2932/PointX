import React, { useState } from 'react';
import QRGenerator from './QRGenerator';
import QRScanner from './QRScanner';

const QRDebugger = () => {
  const [testData, setTestData] = useState({
    userId: 'test-user-123',
    username: 'testuser',
    type: 'visitor'
  });
  
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = (data) => {
    console.log('QR Scan Result:', data);
    setScanResult(data);
    setScanError(null);
    setIsScanning(false);
  };

  const handleError = (error) => {
    console.error('QR Scan Error:', error);
    setScanError(error);
    setScanResult(null);
  };

  const validateQRData = (data) => {
    const issues = [];
    
    if (!data) {
      issues.push('QR data is null or undefined');
      return issues;
    }
    
    if (typeof data !== 'object') {
      issues.push('QR data is not an object');
      return issues;
    }
    
    if (!data.type) issues.push('Missing type field');
    if (!data.user_id && !data.wallet_id) issues.push('Missing user_id or wallet_id');
    if (!data.username) issues.push('Missing username field');
    
    if (data.type !== 'visitor' && data.type !== 'stall' && data.type !== 'admin') {
      issues.push('Invalid type - must be visitor, stall, or admin');
    }
    
    return issues;
  };

  return (
    <div className="container">
      <h2 className="text-center mb-lg">🔍 QR Code Debugger</h2>
      
      <div className="grid grid-2">
        {/* QR Generator Test */}
        <div className="card">
          <h3 className="mb-md">📱 QR Generator Test</h3>
          
          <div className="input-group">
            <label>User ID:</label>
            <input
              className="input"
              value={testData.userId}
              onChange={(e) => setTestData({...testData, userId: e.target.value})}
              placeholder="Enter user ID"
            />
          </div>
          
          <div className="input-group">
            <label>Username:</label>
            <input
              className="input"
              value={testData.username}
              onChange={(e) => setTestData({...testData, username: e.target.value})}
              placeholder="Enter username"
            />
          </div>
          
          <div className="input-group">
            <label>Type:</label>
            <select
              className="input"
              value={testData.type}
              onChange={(e) => setTestData({...testData, type: e.target.value})}
            >
              <option value="visitor">Visitor</option>
              <option value="stall">Stall</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div className="text-center mt-md">
            <QRGenerator
              userId={testData.userId}
              username={testData.username}
              type={testData.type}
              title={`${testData.username} (${testData.type})`}
            />
          </div>
          
          <div className="mt-md p-sm" style={{ background: '#f9fafb', borderRadius: '6px' }}>
            <h4>Generated QR Data:</h4>
            <pre style={{ fontSize: '12px', wordWrap: 'break-word' }}>
              {JSON.stringify({
                type: testData.type,
                user_id: testData.userId,
                wallet_id: testData.userId,
                username: testData.username,
                issued_at: Date.now()
              }, null, 2)}
            </pre>
          </div>
        </div>

        {/* QR Scanner Test */}
        <div className="card">
          <h3 className="mb-md">📷 QR Scanner Test</h3>
          
          {!isScanning && (
            <button 
              className="btn btn-full mb-md" 
              onClick={() => {
                setIsScanning(true);
                setScanResult(null);
                setScanError(null);
              }}
            >
              Start QR Scanner
            </button>
          )}
          
          {isScanning && (
            <div className="mb-md">
              <QRScanner
                isActive={true}
                onScan={handleScan}
                onError={handleError}
              />
              <button 
                className="btn btn-secondary btn-full mt-sm" 
                onClick={() => setIsScanning(false)}
              >
                Stop Scanner
              </button>
            </div>
          )}
          
          {scanResult && (
            <div className="mt-md">
              <h4 className="mb-sm">✅ Scan Result:</h4>
              <div className="p-sm mb-md" style={{ background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <pre style={{ fontSize: '12px', wordWrap: 'break-word' }}>
                  {JSON.stringify(scanResult, null, 2)}
                </pre>
              </div>
              
              <h4 className="mb-sm">🔍 Validation:</h4>
              <div className="p-sm" style={{ background: '#f9fafb', borderRadius: '6px' }}>
                {(() => {
                  const issues = validateQRData(scanResult);
                  if (issues.length === 0) {
                    return <p className="success">✅ QR data is valid!</p>;
                  } else {
                    return (
                      <div>
                        <p className="error">❌ Issues found:</p>
                        <ul>
                          {issues.map((issue, i) => (
                            <li key={i} style={{ color: '#dc2626' }}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}
          
          {scanError && (
            <div className="mt-md">
              <h4 className="mb-sm">❌ Scan Error:</h4>
              <div className="error">
                <strong>Message:</strong> {scanError.message}<br/>
                {scanError.details && (
                  <>
                    <strong>Details:</strong> {scanError.details}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Manual QR Test */}
      <div className="card mt-md">
        <h3 className="mb-md">✏️ Manual QR Data Test</h3>
        <p className="mb-md" style={{ color: '#6b7280' }}>
          Paste QR code content here to test validation:
        </p>
        
        <textarea
          className="input"
          rows={4}
          placeholder='{"type":"visitor","user_id":"123","username":"test","issued_at":1234567890}'
          onChange={(e) => {
            try {
              const data = JSON.parse(e.target.value);
              setScanResult(data);
              setScanError(null);
            } catch (err) {
              setScanError({ message: 'Invalid JSON format', details: err.message });
              setScanResult(null);
            }
          }}
        />
      </div>
    </div>
  );
};

export default QRDebugger;