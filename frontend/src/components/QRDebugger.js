import React, { useState } from 'react';
import api from '../api/axios';

const QRDebugger = () => {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testAPIConnection = async () => {
    setLoading(true);
    setTestResult('Testing API connection...\n');
    
    try {
      // Test 1: Health check
      setTestResult(prev => prev + '1. Testing health endpoint...\n');
      const healthRes = await api.get('/health');
      setTestResult(prev => prev + `✅ Health check: ${healthRes.status} - ${JSON.stringify(healthRes.data)}\n\n`);
      
      // Test 2: Auth check
      setTestResult(prev => prev + '2. Testing auth endpoint...\n');
      try {
        const authRes = await api.get('/auth/me');
        setTestResult(prev => prev + `✅ Auth check: ${authRes.status} - User authenticated\n\n`);
      } catch (authError) {
        setTestResult(prev => prev + `⚠️ Auth check: ${authError.response?.status || 'Network Error'} - ${authError.response?.data?.error || authError.message}\n\n`);
      }
      
      // Test 3: Test visitor balance endpoint with dummy ID
      setTestResult(prev => prev + '3. Testing visitor balance endpoint...\n');
      try {
        const balanceRes = await api.get('/stall/visitor-balance/test-wallet-id');
        setTestResult(prev => prev + `✅ Visitor balance: ${balanceRes.status}\n\n`);
      } catch (balanceError) {
        setTestResult(prev => prev + `⚠️ Visitor balance: ${balanceError.response?.status || 'Network Error'} - ${balanceError.response?.data?.error || balanceError.message}\n\n`);
      }
      
      // Test 4: Show current API configuration
      setTestResult(prev => prev + '4. Current API Configuration:\n');
      setTestResult(prev => prev + `Base URL: ${api.defaults.baseURL}\n`);
      setTestResult(prev => prev + `Auth Token: ${localStorage.getItem('token') ? 'Present' : 'Missing'}\n`);
      setTestResult(prev => prev + `User Data: ${localStorage.getItem('user') || 'Missing'}\n\n`);
      
    } catch (error) {
      setTestResult(prev => prev + `❌ Connection failed: ${error.message}\n`);
      setTestResult(prev => prev + `Error details: ${JSON.stringify(error.response?.data || error, null, 2)}\n`);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>QR Scanner API Debugger</h2>
      <p>Use this tool to diagnose API connection issues when scanning QR codes.</p>
      
      <button 
        onClick={testAPIConnection} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Test API Connection'}
      </button>
      
      {testResult && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          fontSize: '14px'
        }}>
          {testResult}
        </div>
      )}
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
        <h3>Common Issues & Solutions:</h3>
        <ul>
          <li><strong>Network Error:</strong> Check if your backend URL is correct in environment variables</li>
          <li><strong>401 Unauthorized:</strong> Make sure you're logged in and have a valid token</li>
          <li><strong>403 Forbidden:</strong> Check if your user has the correct role (stall/admin)</li>
          <li><strong>404 Not Found:</strong> The visitor wallet ID might not exist in the database</li>
          <li><strong>CORS Error:</strong> Backend needs to allow your frontend domain</li>
        </ul>
      </div>
    </div>
  );
};

export default QRDebugger;