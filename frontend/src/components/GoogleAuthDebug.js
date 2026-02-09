import React, { useEffect, useState } from 'react';

/**
 * Debug component to verify Google OAuth configuration
 * This helps identify if the Client ID is being loaded correctly
 */
const GoogleAuthDebug = () => {
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const apiUrl = process.env.REACT_APP_API_BASE_URL;
    
    setDebugInfo({
      clientId: clientId || 'NOT FOUND',
      clientIdLength: clientId ? clientId.length : 0,
      apiUrl: apiUrl || 'NOT FOUND',
      currentUrl: window.location.href,
      origin: window.location.origin,
      allEnvVars: Object.keys(process.env).filter(key => key.startsWith('REACT_APP_'))
    });
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f3f4f6', 
      borderRadius: '8px',
      margin: '20px',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h3 style={{ marginTop: 0 }}>🔍 Google OAuth Debug Info</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Client ID:</strong>
        <div style={{ 
          backgroundColor: debugInfo.clientId === 'NOT FOUND' ? '#fee' : '#efe',
          padding: '8px',
          borderRadius: '4px',
          marginTop: '4px',
          wordBreak: 'break-all'
        }}>
          {debugInfo.clientId}
        </div>
        <small>Length: {debugInfo.clientIdLength} characters</small>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>API Base URL:</strong>
        <div style={{ 
          backgroundColor: '#efe',
          padding: '8px',
          borderRadius: '4px',
          marginTop: '4px'
        }}>
          {debugInfo.apiUrl}
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Current URL:</strong>
        <div style={{ 
          backgroundColor: '#efe',
          padding: '8px',
          borderRadius: '4px',
          marginTop: '4px'
        }}>
          {debugInfo.currentUrl}
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Origin (must be in Google Console):</strong>
        <div style={{ 
          backgroundColor: '#fff3cd',
          padding: '8px',
          borderRadius: '4px',
          marginTop: '4px',
          fontWeight: 'bold'
        }}>
          {debugInfo.origin}
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Available REACT_APP_ env vars:</strong>
        <div style={{ 
          backgroundColor: '#efe',
          padding: '8px',
          borderRadius: '4px',
          marginTop: '4px'
        }}>
          {debugInfo.allEnvVars?.join(', ') || 'None found'}
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#fff3cd',
        padding: '12px',
        borderRadius: '4px',
        marginTop: '16px'
      }}>
        <strong>⚠️ Action Required:</strong>
        <ol style={{ marginBottom: 0, paddingLeft: '20px' }}>
          <li>Copy the <strong>Origin</strong> value above</li>
          <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
          <li>Click your OAuth Client ID</li>
          <li>Add the Origin to <strong>Authorized JavaScript origins</strong></li>
          <li>Make sure Client ID matches exactly (no spaces/typos)</li>
          <li>Save and wait 5 minutes for changes to propagate</li>
        </ol>
      </div>

      <div style={{ 
        backgroundColor: '#fee',
        padding: '12px',
        borderRadius: '4px',
        marginTop: '16px'
      }}>
        <strong>🔴 If Client ID shows "NOT FOUND":</strong>
        <ol style={{ marginBottom: 0, paddingLeft: '20px' }}>
          <li>Stop your React dev server (Ctrl+C)</li>
          <li>Verify <code>frontend/.env</code> has <code>REACT_APP_GOOGLE_CLIENT_ID</code></li>
          <li>Run <code>npm start</code> again</li>
          <li>Refresh this page</li>
        </ol>
      </div>
    </div>
  );
};

export default GoogleAuthDebug;
