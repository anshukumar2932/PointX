import React, { useEffect, useState } from "react";
import api from "../api/axios";
import QRGenerator from "./QRGenerator";
import ClubLoader from "./ClubLoader";
import { useAuth } from "../context/AuthContext";
import MessageAlert from "./MessageAlert";

const VisitorDashboard = () => {
  const { user: authUser, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("wallet");
  const [me, setMe] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [topupAmount, setTopupAmount] = useState(50);
  const [topupImage, setTopupImage] = useState(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);

  /* ================= LOAD CORE DATA ================= */

  useEffect(() => {
    // If authUser already has user_id, use it directly
    if (authUser && authUser.user_id) {
      setMe(authUser);
      setUserLoading(false);
    } 
    // Otherwise, load user data if we have authentication
    else if (authUser) {
      loadMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]); // loadMe is intentionally not included to avoid infinite loops

  useEffect(() => {
    if (!me) return;
    loadWallet();
    loadHistory();
    loadLeaderboard();
  }, [me]);

  const loadMe = async () => {
    setUserLoading(true);
    try {
      const res = await api.get("/auth/me");
      setMe(res.data);
      setMessage("");
      setMessageType("info");
      
      // Also update the auth context with complete user data
      await refreshUser();
    } catch (error) {
      setMessage("Failed to load user session. Please try logging in again.");
      setMessageType("error");
    } finally {
      setUserLoading(false);
    }
  };

  const loadWallet = async () => {
    try {
      const res = await api.get("/visitor/wallet");
      setWallet(res.data);
    } catch {
      setMessage("Failed to load wallet");
      setMessageType("error");
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get("/visitor/history");
      setHistory(res.data || []);
    } catch {
      // Silent fail for history
    }
  };

  const loadLeaderboard = async () => {
    try {
      const res = await api.get("/visitor/leaderboard");
      setLeaderboard(res.data || []);
    } catch {
      // Silent fail for leaderboard
    }
  };

  /* ================= TOPUP REQUEST ================= */

  const handleTopupRequest = async (e) => {
    e.preventDefault();
    if (!topupImage || !topupAmount) {
      setMessage("Please select an image and enter amount");
      setMessageType("warning");
      return;
    }

    setTopupLoading(true);
    setMessage("Submitting topup request...");
    setMessageType("loading");

    try {
      const formData = new FormData();
      formData.append('image', topupImage);
      formData.append('amount', topupAmount);

      await api.post("/visitor/topup-request", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage("Topup request submitted successfully! Admin will review within 24 hours.");
      setMessageType("success");
      setTopupImage(null);
      setTopupAmount(50);
      
      // Reset file input
      const fileInput = document.getElementById('topup-image');
      if (fileInput) fileInput.value = '';
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setMessage(""), 5000);
      
    } catch (err) {
      let errorMsg = "Failed to submit topup request";
      
      if (err.response) {
        // Server responded with error status
        errorMsg = err.response.data?.error || err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        // Request was made but no response received
        errorMsg = "Network error - cannot reach server";
      } else {
        // Something else happened
        errorMsg = err.message || "Unknown error occurred";
      }
      
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setTopupLoading(false);
    }
  };

  /* ================= UI ================= */

  // Show loading while waiting for authentication or user data
  if (!authUser || userLoading) {
    return (
      <div className="container">
        <ClubLoader message="Loading Visitor Dashboard" />
      </div>
    );
  }

  // Show error if we have auth but no user data
  if (!me) {
    return (
      <div className="container">
        <div className="error">
          <h2>Unable to Load User Data</h2>
          <p>There was an issue loading your user information.</p>
          <button 
            className="btn btn-primary mt-md" 
            onClick={loadMe}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show loading if we have user data but no wallet data yet
  if (!wallet) {
    return (
      <div className="container">
        <ClubLoader message="Loading Wallet Information" />
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '900',
          background: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          marginBottom: '8px'
        }}>
          Visitor Dashboard
        </h1>
        <div className="premium-badge">
          CLUB MEMBER
        </div>
      </div>

      <div className="tab-nav">
        {["wallet", "attendance", "topup", "history", "leaderboard"].map(tab => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {message && <MessageAlert message={message} type={messageType} onClose={() => setMessage("")} />}

      {/* ================= WALLET ================= */}
      {activeTab === "wallet" && (
        <div className="card club-pattern text-center">
          <h3 className="card-title">My Wallet</h3>

          <div className="balance mb-md">
            {wallet.balance} points
          </div>

          {!wallet.is_active && (
            <div className="error mb-md">Wallet is frozen</div>
          )}

          <p className="mb-md" style={{ color: "#6b7280" }}>
            Show this QR to the stall operator
          </p>

          <div className="qr-container">
            {me && me.user_id && wallet && wallet.wallet_id ? (
              <QRGenerator
                walletId={wallet.wallet_id}
                username={me.username}
                type="visitor"
                title={`${me.username} (Visitor)`}
              />
            ) : (
              <div className="error">
                <h4>Unable to generate QR code</h4>
                <p>Missing wallet ID in session data</p>
                <div className="mt-sm">
                  <button 
                    className="btn btn-sm btn-primary mr-sm" 
                    onClick={loadWallet}
                  >
                    Retry
                  </button>
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </button>
                </div>
                <small className="mt-sm" style={{ display: 'block', color: '#666' }}>
                  Debug info: {wallet ? `Wallet ID: ${wallet.wallet_id}` : 'No wallet data'}
                </small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ATTENDANCE ================= */}
      {activeTab === "attendance" && (
        <div className="card text-center">
          <h3 className="mb-md">Attendance QR</h3>

          <p className="mb-md" style={{ color: "#6b7280" }}>
            Show this QR to admin for attendance marking
          </p>

          <div className="qr-container">
            {me && me.user_id ? (
              <QRGenerator
                userId={me.user_id}
                username={me.username}
                type="attendance"
                title={`${me.username} (Attendance)`}
              />
            ) : (
              <div className="error">
                <h4>Unable to generate attendance QR</h4>
                <p>Missing user ID in session data</p>
                <div className="mt-sm">
                  <button 
                    className="btn btn-sm btn-primary mr-sm" 
                    onClick={loadMe}
                    disabled={userLoading}
                  >
                    {userLoading ? 'Loading...' : 'Retry'}
                  </button>
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-md p-sm" style={{ 
            background: '#f0f9ff', 
            borderRadius: '6px', 
            fontSize: '12px',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <p><strong>Attendance Instructions:</strong></p>
            <p>• Present this QR code to the admin</p>
            <p>• Admin will scan to mark your attendance</p>
            <p>• Registration number: <strong>{me.username}</strong></p>
          </div>
        </div>
      )}

      {/* ================= TOPUP REQUEST ================= */}
      {activeTab === "topup" && (
        <div className="card club-pattern">
          <h3 className="card-title">Request Wallet Topup</h3>
          
          <p className="mb-md" style={{ color: '#6b7280', fontSize: '14px' }}>
            Upload payment proof to request wallet topup. Admin will review and approve your request.
          </p>

          <form onSubmit={handleTopupRequest}>
            <div className="mb-md">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Amount (points)
              </label>
              <input
                type="number"
                className="input"
                value={topupAmount}
                onChange={(e) => setTopupAmount(Number(e.target.value))}
                min="10"
                max="1000"
                step="10"
                required
              />
            </div>

            <div className="mb-md">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Payment Proof (Image)
              </label>
              <input
                id="topup-image"
                type="file"
                className="input"
                accept="image/*"
                onChange={(e) => setTopupImage(e.target.files[0])}
                required
              />
              {topupImage && (
                <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                  ✓ {topupImage.name} selected
                </p>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-success btn-full"
              disabled={topupLoading || !topupImage || !topupAmount}
            >
              {topupLoading ? 'Submitting...' : 'Submit Topup Request'}
            </button>
          </form>

          <div className="mt-md p-sm" style={{ background: '#f0f9ff', borderRadius: '6px', fontSize: '12px' }}>
            <p><strong>Instructions:</strong></p>
            <p>• Upload clear image of payment receipt/screenshot</p>
            <p>• Supported formats: JPG, PNG (max 5MB)</p>
            <p>• Admin will review and approve within 24 hours</p>
          </div>
        </div>
      )}

      {/* ================= HISTORY ================= */}
      {activeTab === "history" && (
        <div className="card club-pattern">
          <h3 className="card-title">Transaction History</h3>

          {history.length === 0 ? (
            <div className="text-center p-lg" style={{ color: '#6b7280' }}>
              <p>No transactions yet</p>
              <p style={{ fontSize: '14px' }}>Start playing games to see your history!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-mobile">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(tx => (
                    <tr key={tx.id}>
                      <td data-label="Type">
                      <span className={`badge badge-${
                        tx.type === 'payment' || tx.type === 'play' ? 'payment' : 
                        tx.type === 'reward' ? 'reward' : 'topup'
                      }`}>
                        {tx.type === 'play' ? 'Game Play' : tx.type}
                      </span>
                      </td>
                      <td data-label="Amount">
                        <span className="balance" style={{ 
                          fontSize: '14px', 
                          margin: 0,
                          color: (tx.type === 'payment' || tx.type === 'play') ? '#dc2626' : '#10b981'
                        }}>
                          {(tx.type === 'payment' || tx.type === 'play') ? '-' : '+'}
                          {Math.abs(tx.points_amount)} pts
                        </span>
                      </td>
                      <td data-label="Date">{new Date(tx.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= LEADERBOARD ================= */}
      {activeTab === "leaderboard" && (
        <div className="card club-pattern">
          <h3 className="card-title">Leaderboard</h3>

          {leaderboard.length === 0 ? (
            <div className="text-center p-lg" style={{ color: '#6b7280' }}>
              <p>No scores yet</p>
              <p style={{ fontSize: '14px' }}>Be the first to play and score!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-mobile">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => (
                    <tr key={row.user_id} className={row.username === me.username ? 'highlight-row' : ''}>
                      <td data-label="Rank">
                        <span className={`badge ${i < 3 ? 'badge-reward' : 'badge-topup'}`}>
                          #{i + 1}
                        </span>
                      </td>
                      <td data-label="User">
                        {row.username}
                        {row.username === me.username && <span style={{ marginLeft: '8px' }}>👤</span>}
                      </td>
                      <td data-label="Score">
                        <span className="stat-value" style={{ fontSize: '16px' }}>
                          {row.total_score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VisitorDashboard;
