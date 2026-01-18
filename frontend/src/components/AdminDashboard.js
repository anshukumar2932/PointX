import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRGenerator from './QRGenerator';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [plays, setPlays] = useState([]);
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({
    username: '', password: '', name: '', role: 'visitor'
  });
  const [newStall, setNewStall] = useState({
    stall_name: '', price_per_play: 10, reward_multiplier: 5.0,
    stall_username: '', stall_password: ''
  });
  const [topupData, setTopupData] = useState({
    target_wallet: '', amount: 100
  });

  useEffect(() => {
    const loadDataForTab = async () => {
      setLoading(true);
      try {
        if (activeTab === 'overview' || activeTab === 'wallets') {
          const walletsRes = await axios.get('/api/admin/wallets');
          setWallets(walletsRes.data);
        }
        if (activeTab === 'overview' || activeTab === 'transactions') {
          const txRes = await axios.get('/api/admin/transactions');
          setTransactions(txRes.data);
        }
        if (activeTab === 'overview' || activeTab === 'plays') {
          const playsRes = await axios.get('/api/admin/plays');
          setPlays(playsRes.data);
        }
        if (activeTab === 'stalls') {
          const stallsRes = await axios.get('/api/stalls');
          setStalls(stallsRes.data);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
      setLoading(false);
    };

    loadDataForTab();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview' || activeTab === 'wallets') {
        const walletsRes = await axios.get('/api/admin/wallets');
        setWallets(walletsRes.data);
      }
      if (activeTab === 'overview' || activeTab === 'transactions') {
        const txRes = await axios.get('/api/admin/transactions');
        setTransactions(txRes.data);
      }
      if (activeTab === 'overview' || activeTab === 'plays') {
        const playsRes = await axios.get('/api/admin/plays');
        setPlays(playsRes.data);
      }
      if (activeTab === 'stalls') {
        const stallsRes = await axios.get('/api/stalls');
        setStalls(stallsRes.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/create-user', newUser);
      setNewUser({ username: '', password: '', name: '', role: 'visitor' });
      loadData();
      alert('User created successfully!');
    } catch (error) {
      alert('Error creating user: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const createStall = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/create-stall', newStall);
      setNewStall({
        stall_name: '', price_per_play: 10, reward_multiplier: 5.0,
        stall_username: '', stall_password: ''
      });
      loadData();
      alert('Stall created successfully!');
    } catch (error) {
      alert('Error creating stall: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const topupWallet = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/topup', topupData);
      setTopupData({ target_wallet: '', amount: 100 });
      loadData();
      alert('Wallet topped up successfully!');
    } catch (error) {
      alert('Error topping up: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  const freezeWallet = async (walletId) => {
    if (window.confirm('Are you sure you want to freeze this wallet?')) {
      try {
        await axios.post(`/api/admin/freeze/${walletId}`);
        loadData();
        alert('Wallet frozen successfully!');
      } catch (error) {
        alert('Error freezing wallet: ' + (error.response?.data?.error || 'Unknown error'));
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getTotalBalance = () => {
    return wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  };

  return (
    <div>
      <h1>👑 Admin Dashboard</h1>
      
      <div style={{ marginBottom: '24px' }}>
        <button 
          className={`btn ${activeTab === 'overview' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`btn ${activeTab === 'wallets' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('wallets')}
        >
          💳 Wallets
        </button>
        <button 
          className={`btn ${activeTab === 'stalls' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('stalls')}
        >
          🎪 Stalls
        </button>
        <button 
          className={`btn ${activeTab === 'transactions' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('transactions')}
        >
          📋 Transactions
        </button>
        <button 
          className={`btn ${activeTab === 'plays' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('plays')}
        >
          🎮 Plays
        </button>
        <button 
          className={`btn ${activeTab === 'create' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('create')}
        >
          ➕ Create
        </button>
      </div>

      {loading && <div className="loading">Loading...</div>}

      {activeTab === 'overview' && (
        <div className="grid">
          <div className="card">
            <h3>💰 System Stats</h3>
            <div className="game-stats">
              <div className="stat">
                <div className="stat-value">{wallets.length}</div>
                <div className="stat-label">Total Wallets</div>
              </div>
              <div className="stat">
                <div className="stat-value">{getTotalBalance()}</div>
                <div className="stat-label">Total Points</div>
              </div>
              <div className="stat">
                <div className="stat-value">{transactions.length}</div>
                <div className="stat-label">Transactions</div>
              </div>
              <div className="stat">
                <div className="stat-value">{plays.length}</div>
                <div className="stat-label">Games Played</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>🔥 Recent Activity</h3>
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} style={{ 
                padding: '8px', 
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span className={`badge badge-${tx.type}`}>{tx.type}</span>
                <span>{tx.points_amount} pts</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {formatDate(tx.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'wallets' && (
        <div className="card">
          <h3>💳 Wallet Management</h3>
          
          <div style={{ marginBottom: '24px' }}>
            <h4>💰 Top Up Wallet</h4>
            <form onSubmit={topupWallet} style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
              <div>
                <label>Wallet ID:</label>
                <input
                  type="text"
                  className="input"
                  value={topupData.target_wallet}
                  onChange={(e) => setTopupData({...topupData, target_wallet: e.target.value})}
                  placeholder="Enter wallet ID"
                  required
                />
              </div>
              <div>
                <label>Amount:</label>
                <input
                  type="number"
                  className="input"
                  value={topupData.amount}
                  onChange={(e) => setTopupData({...topupData, amount: parseInt(e.target.value)})}
                  min="1"
                  required
                />
              </div>
              <button type="submit" className="btn btn-success">💰 Top Up</button>
            </form>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map(wallet => (
                <tr key={wallet.id}>
                  <td>{wallet.user_name}</td>
                  <td className="balance">{wallet.balance} pts</td>
                  <td>
                    <span className={`badge ${wallet.is_active ? 'badge-reward' : 'badge-payment'}`}>
                      {wallet.is_active ? 'Active' : 'Frozen'}
                    </span>
                  </td>
                  <td>{formatDate(wallet.created_at)}</td>
                  <td>
                    <QRGenerator 
                      type="wallet" 
                      itemId={wallet.id} 
                      title={`${wallet.user_name} Wallet`}
                    />
                    {wallet.is_active && (
                      <button 
                        onClick={() => freezeWallet(wallet.id)}
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        🚫 Freeze
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'stalls' && (
        <div className="card">
          <h3>🎪 Stall Management</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Stall Name</th>
                <th>Price per Play</th>
                <th>Reward Multiplier</th>
                <th>QR Code</th>
              </tr>
            </thead>
            <tbody>
              {stalls.map(stall => (
                <tr key={stall.id}>
                  <td>{stall.stall_name}</td>
                  <td>{stall.price_per_play} pts</td>
                  <td>{stall.reward_multiplier}x</td>
                  <td>
                    <QRGenerator 
                      type="stall" 
                      itemId={stall.id} 
                      title={`${stall.stall_name} Game`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="card">
          <h3>📋 Transaction History</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>From</th>
                <th>To</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>
                    <span className={`badge badge-${tx.type}`}>{tx.type}</span>
                  </td>
                  <td>{tx.points_amount} pts</td>
                  <td>{tx.from_wallet?.slice(0, 8)}...</td>
                  <td>{tx.to_wallet?.slice(0, 8)}...</td>
                  <td>{formatDate(tx.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'plays' && (
        <div className="card">
          <h3>🎮 Game Play History</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Stall</th>
                <th>Price Paid</th>
                <th>Score</th>
                <th>Reward</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {plays.map(play => (
                <tr key={play.id}>
                  <td>{play.visitor_wallet?.slice(0, 8)}...</td>
                  <td>{play.stall_id?.slice(0, 8)}...</td>
                  <td>{play.price_paid} pts</td>
                  <td>{play.score || 'Pending'}</td>
                  <td>{play.reward_given || 0} pts</td>
                  <td>{formatDate(play.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="grid">
          <div className="card">
            <h3>👤 Create User</h3>
            <form onSubmit={createUser}>
              <input
                type="text"
                className="input"
                placeholder="Username"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                required
              />
              <input
                type="password"
                className="input"
                placeholder="Password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                required
              />
              <input
                type="text"
                className="input"
                placeholder="Display Name"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                required
              />
              <select
                className="input"
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="visitor">Visitor</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" className="btn">Create User</button>
            </form>
          </div>

          <div className="card">
            <h3>🎪 Create Stall</h3>
            <form onSubmit={createStall}>
              <input
                type="text"
                className="input"
                placeholder="Stall Name"
                value={newStall.stall_name}
                onChange={(e) => setNewStall({...newStall, stall_name: e.target.value})}
                required
              />
              <input
                type="number"
                className="input"
                placeholder="Price per Play"
                value={newStall.price_per_play}
                onChange={(e) => setNewStall({...newStall, price_per_play: parseInt(e.target.value)})}
                min="1"
                required
              />
              <input
                type="number"
                className="input"
                placeholder="Reward Multiplier"
                step="0.1"
                value={newStall.reward_multiplier}
                onChange={(e) => setNewStall({...newStall, reward_multiplier: parseFloat(e.target.value)})}
                min="0"
                required
              />
              <input
                type="text"
                className="input"
                placeholder="Stall Username"
                value={newStall.stall_username}
                onChange={(e) => setNewStall({...newStall, stall_username: e.target.value})}
                required
              />
              <input
                type="password"
                className="input"
                placeholder="Stall Password"
                value={newStall.stall_password}
                onChange={(e) => setNewStall({...newStall, stall_password: e.target.value})}
                required
              />
              <button type="submit" className="btn">Create Stall</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;