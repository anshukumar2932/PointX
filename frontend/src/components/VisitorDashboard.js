import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRGenerator from './QRGenerator';
import QRScanner from './QRScanner';

const VisitorDashboard = () => {
  const [activeTab, setActiveTab] = useState('wallet');
  const [wallet, setWallet] = useState(null);
  const [stalls, setStalls] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWalletInfo();
    loadStalls();
    if (activeTab === 'history') {
      const loadHistory = async () => {
        try {
          const txRes = await axios.get('/api/admin/transactions');
          // Filter transactions for this wallet
          if (wallet) {
            const myTransactions = txRes.data.filter(tx => 
              tx.from_wallet === wallet.id || tx.to_wallet === wallet.id
            );
            setTransactions(myTransactions);
          }
        } catch (error) {
          console.error('Error loading transactions:', error);
        }
      };
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, wallet]);

  const loadWalletInfo = async () => {
    try {
      // For demo purposes, we'll need to get the visitor's wallet ID
      // In a real app, this would be stored during login
      const walletsRes = await axios.get('/api/admin/wallets');
      const visitorWallet = walletsRes.data.find(w => w.user_name.includes('Visitor'));
      if (visitorWallet) {
        const walletRes = await axios.get(`/api/wallet/${visitorWallet.id}`);
        setWallet({ ...walletRes.data, id: visitorWallet.id });
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const loadStalls = async () => {
    try {
      const stallsRes = await axios.get('/api/stalls');
      setStalls(stallsRes.data);
    } catch (error) {
      console.error('Error loading stalls:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const txRes = await axios.get('/api/admin/transactions');
      // Filter transactions for this wallet
      if (wallet) {
        const myTransactions = txRes.data.filter(tx => 
          tx.from_wallet === wallet.id || tx.to_wallet === wallet.id
        );
        setTransactions(myTransactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleStallQRScan = async (qrData) => {
    if (qrData.type !== 'stall') {
      setMessage('❌ Invalid QR code. Please scan a stall game QR code.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('/api/play', {
        visitor_wallet: wallet.id,
        stall_id: qrData.stall_id
      });

      if (response.data.success) {
        setMessage(`🎮 Game started at ${qrData.stall_name}! Paid ${response.data.price_paid} points.`);
        loadWalletInfo(); // Refresh balance
      }
    } catch (error) {
      setMessage(`❌ ${error.response?.data?.error || 'Game start failed'}`);
    }

    setLoading(false);
    setScanning(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getTransactionIcon = (type, isOutgoing) => {
    if (type === 'payment') return isOutgoing ? '💸' : '💰';
    if (type === 'reward') return isOutgoing ? '🎁' : '🏆';
    if (type === 'topup') return '💳';
    return '💱';
  };

  const getTransactionColor = (type, isOutgoing) => {
    if (type === 'payment' && isOutgoing) return '#ef4444';
    if (type === 'reward' && !isOutgoing) return '#10b981';
    if (type === 'topup') return '#3b82f6';
    return '#6b7280';
  };

  if (!wallet) {
    return <div className="loading">Loading wallet information...</div>;
  }

  return (
    <div>
      <div className="card">
        <h1>🎮 {wallet.user_name}</h1>
        <div className="balance">{wallet.balance} points</div>
        <p style={{ color: '#6b7280' }}>Available to spend on games</p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <button 
          className={`btn ${activeTab === 'wallet' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('wallet')}
        >
          💳 My Wallet
        </button>
        <button 
          className={`btn ${activeTab === 'games' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('games')}
        >
          🎪 Games
        </button>
        <button 
          className={`btn ${activeTab === 'scanner' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('scanner')}
        >
          📱 Scan Game
        </button>
        <button 
          className={`btn ${activeTab === 'history' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('history')}
        >
          📋 History
        </button>
      </div>

      {message && (
        <div className={`${message.includes('❌') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="card">
          <h3>💳 My Wallet QR Code</h3>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Show this QR code to stall operators to pay for games.
          </p>
          
          <QRGenerator 
            type="wallet" 
            itemId={wallet.id} 
            title={`${wallet.user_name} - ${wallet.balance} pts`}
          />

          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            background: '#f0fdf4', 
            borderRadius: '8px',
            border: '1px solid #bbf7d0'
          }}>
            <h4>💡 How to Play:</h4>
            <ol style={{ marginLeft: '20px', color: '#166534' }}>
              <li>Show your wallet QR code to the stall operator</li>
              <li>They'll scan it to charge the game entry fee</li>
              <li>Play the game and get your score</li>
              <li>Earn points based on your performance!</li>
            </ol>
          </div>
        </div>
      )}

      {activeTab === 'games' && (
        <div className="card">
          <h3>🎪 Available Games</h3>
          <div className="grid">
            {stalls.map(stall => (
              <div key={stall.id} className="card" style={{ margin: 0 }}>
                <h4>{stall.stall_name}</h4>
                <div className="game-stats">
                  <div className="stat">
                    <div className="stat-value">{stall.price_per_play}</div>
                    <div className="stat-label">Entry Fee</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{stall.reward_multiplier}x</div>
                    <div className="stat-label">Multiplier</div>
                  </div>
                </div>
                
                <div style={{ 
                  background: '#f9fafb', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  margin: '12px 0',
                  fontSize: '14px'
                }}>
                  <strong>Max Reward:</strong> {stall.reward_multiplier * 10} points (perfect score)
                </div>

                <button 
                  className="btn"
                  disabled={wallet.balance < stall.price_per_play}
                  style={{ width: '100%' }}
                >
                  {wallet.balance >= stall.price_per_play ? 
                    `🎮 Play (${stall.price_per_play} pts)` : 
                    '💸 Insufficient Funds'
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'scanner' && (
        <div className="card">
          <h3>📱 Scan Game QR Code</h3>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Scan the QR code displayed at any game stall to start playing.
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
            <div className="loading">Starting game...</div>
          )}

          <QRScanner 
            onScan={handleStallQRScan}
            isActive={scanning}
            onError={(error) => {
              setMessage('❌ Camera error: ' + error.message);
              setScanning(false);
            }}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <h3>📋 Transaction History</h3>
          
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
              <p>No transactions yet. Start playing games to see your history!</p>
            </div>
          ) : (
            <div>
              {transactions.map(tx => {
                const isOutgoing = tx.from_wallet === wallet.id;
                const icon = getTransactionIcon(tx.type, isOutgoing);
                const color = getTransactionColor(tx.type, isOutgoing);
                
                return (
                  <div 
                    key={tx.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '16px', 
                      borderBottom: '1px solid #e5e7eb',
                      borderLeft: `4px solid ${color}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>{icon}</span>
                      <div>
                        <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                          {tx.type} {isOutgoing ? 'Sent' : 'Received'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {formatDate(tx.created_at)}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div 
                        style={{ 
                          fontWeight: 'bold', 
                          color: color,
                          fontSize: '18px'
                        }}
                      >
                        {isOutgoing ? '-' : '+'}{tx.points_amount} pts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VisitorDashboard;