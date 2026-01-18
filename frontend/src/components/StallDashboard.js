import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRScanner from './QRScanner';
import QRGenerator from './QRGenerator';

const StallDashboard = () => {
  const [activeTab, setActiveTab] = useState('scanner');
  const [stallInfo, setStallInfo] = useState(null);
  const [currentPlay, setCurrentPlay] = useState(null);
  const [plays, setPlays] = useState([]);
  const [score, setScore] = useState('');
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStallInfo();
    if (activeTab === 'history') {
      const loadHistory = async () => {
        if (!stallInfo) return;
        
        try {
          const playsRes = await axios.get(`/api/stall/${stallInfo.id}/plays`);
          setPlays(playsRes.data);
        } catch (error) {
          console.error('Error loading plays:', error);
        }
      };
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, stallInfo]);

  const loadStallInfo = async () => {
    try {
      const stallsRes = await axios.get('/api/stalls');
      // Find current user's stall (you might need to adjust this logic)
      setStallInfo(stallsRes.data[0]); // For demo, taking first stall
    } catch (error) {
      console.error('Error loading stall info:', error);
    }
  };

  const loadPlayHistory = async () => {
    if (!stallInfo) return;
    
    try {
      const playsRes = await axios.get(`/api/stall/${stallInfo.id}/plays`);
      setPlays(playsRes.data);
    } catch (error) {
      console.error('Error loading plays:', error);
    }
  };

  const handleQRScan = async (qrData) => {
    if (qrData.type !== 'visitor') {
      setMessage('❌ Invalid QR code. Please scan a visitor wallet.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('/api/play', {
        visitor_wallet: qrData.wallet_id,
        stall_id: stallInfo.id
      });

      if (response.data.success) {
        setCurrentPlay({
          play_id: response.data.play_id,
          visitor_name: qrData.name,
          visitor_wallet: qrData.wallet_id,
          price_paid: response.data.price_paid,
          visitor_balance: response.data.visitor_balance
        });
        setMessage(`✅ ${qrData.name} paid ${response.data.price_paid} points. Game started!`);
        setActiveTab('score');
      }
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Payment failed'}`);
    }

    setLoading(false);
    setScanning(false);
  };

  const submitScore = async (e) => {
    e.preventDefault();
    if (!currentPlay || !score) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('/api/submit-score', {
        play_id: currentPlay.play_id,
        score: parseFloat(score)
      });

      if (response.data.success) {
        setMessage(`🎉 Score ${response.data.score} submitted! Reward: ${response.data.reward_given} points`);
        setCurrentPlay(null);
        setScore('');
        setActiveTab('scanner');
        loadPlayHistory();
      }
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Score submission failed'}`);
    }

    setLoading(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getAverageScore = () => {
    const completedPlays = plays.filter(play => play.score !== null);
    if (completedPlays.length === 0) return 0;
    const total = completedPlays.reduce((sum, play) => sum + play.score, 0);
    return (total / completedPlays.length).toFixed(1);
  };

  const getTotalEarnings = () => {
    return plays.reduce((sum, play) => sum + play.price_paid, 0);
  };

  const getTotalRewards = () => {
    return plays.reduce((sum, play) => sum + (play.reward_given || 0), 0);
  };

  if (!stallInfo) {
    return <div className="loading">Loading stall information...</div>;
  }

  return (
    <div>
      <div className="card">
        <h1>🎪 {stallInfo.stall_name}</h1>
        <div className="game-stats">
          <div className="stat">
            <div className="stat-value">{stallInfo.price_per_play}</div>
            <div className="stat-label">Price per Play</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stallInfo.reward_multiplier}x</div>
            <div className="stat-label">Reward Multiplier</div>
          </div>
          <div className="stat">
            <div className="stat-value">{plays.length}</div>
            <div className="stat-label">Total Plays</div>
          </div>
          <div className="stat">
            <div className="stat-value">{getAverageScore()}</div>
            <div className="stat-label">Avg Score</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <button 
          className={`btn ${activeTab === 'scanner' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('scanner')}
        >
          📱 QR Scanner
        </button>
        <button 
          className={`btn ${activeTab === 'score' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('score')}
          disabled={!currentPlay}
        >
          🎯 Submit Score
        </button>
        <button 
          className={`btn ${activeTab === 'history' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('history')}
        >
          📋 Play History
        </button>
        <button 
          className={`btn ${activeTab === 'qr' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('qr')}
        >
          🏷️ My QR Code
        </button>
      </div>

      {message && (
        <div className={`${message.includes('❌') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {activeTab === 'scanner' && (
        <div className="card">
          <h3>📱 Scan Visitor Wallet</h3>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Ask visitors to show their wallet QR code, then scan it to start the game.
          </p>
          
          {!scanning && !loading && (
            <button 
              onClick={() => setScanning(true)}
              className="btn"
              style={{ marginBottom: '16px' }}
            >
              📷 Start QR Scanner
            </button>
          )}

          {loading && (
            <div className="loading">Processing payment...</div>
          )}

          <QRScanner 
            onScan={handleQRScan}
            isActive={scanning}
            onError={(error) => {
              setMessage('❌ Camera error: ' + error.message);
              setScanning(false);
            }}
          />
        </div>
      )}

      {activeTab === 'score' && currentPlay && (
        <div className="card">
          <h3>🎯 Submit Game Score</h3>
          
          <div style={{ 
            background: '#f0fdf4', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '24px',
            border: '1px solid #bbf7d0'
          }}>
            <h4>Current Game:</h4>
            <p><strong>Player:</strong> {currentPlay.visitor_name}</p>
            <p><strong>Price Paid:</strong> {currentPlay.price_paid} points</p>
            <p><strong>Player Balance:</strong> {currentPlay.visitor_balance} points</p>
          </div>

          <form onSubmit={submitScore}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Game Score (0-10):
              </label>
              <input
                type="number"
                className="input"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                min="0"
                max="10"
                step="0.1"
                placeholder="Enter score (e.g., 7.5)"
                required
                style={{ fontSize: '24px', textAlign: 'center' }}
              />
            </div>

            <div style={{ 
              background: '#f9fafb', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '16px' 
            }}>
              <p><strong>Reward Calculation:</strong></p>
              <p>Score × {stallInfo.reward_multiplier} = {score ? (parseFloat(score) * stallInfo.reward_multiplier).toFixed(0) : '0'} points</p>
            </div>

            <button 
              type="submit" 
              className="btn btn-success"
              disabled={loading || !score}
              style={{ width: '100%', fontSize: '18px' }}
            >
              {loading ? 'Submitting...' : '🎉 Submit Score & Give Reward'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <h3>📋 Play History</h3>
          
          <div className="game-stats" style={{ marginBottom: '24px' }}>
            <div className="stat">
              <div className="stat-value">{getTotalEarnings()}</div>
              <div className="stat-label">Total Earned</div>
            </div>
            <div className="stat">
              <div className="stat-value">{getTotalRewards()}</div>
              <div className="stat-label">Total Rewards Given</div>
            </div>
            <div className="stat">
              <div className="stat-value">{getTotalEarnings() - getTotalRewards()}</div>
              <div className="stat-label">Net Profit</div>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Price Paid</th>
                <th>Score</th>
                <th>Reward Given</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {plays.map(play => (
                <tr key={play.id}>
                  <td>{play.visitor_wallet?.slice(0, 8)}...</td>
                  <td>{play.price_paid} pts</td>
                  <td>{play.score !== null ? play.score : 'Pending'}</td>
                  <td>{play.reward_given || 0} pts</td>
                  <td>{formatDate(play.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'qr' && (
        <div className="card">
          <h3>🏷️ Stall QR Code</h3>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Display this QR code at your stall for visitors to scan and play.
          </p>
          
          <QRGenerator 
            type="stall" 
            itemId={stallInfo.id} 
            title={`${stallInfo.stall_name} - ${stallInfo.price_per_play} pts`}
          />
        </div>
      )}
    </div>
  );
};

export default StallDashboard;