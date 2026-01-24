/**
 * PointX - QR-based Point Management System
 * Stall Dashboard Component
 * 
 * Features:
 * - QR Scanner for visitor wallets
 * - Real-time balance checking
 * - Score submission and game management
 * - Play history with visitor information
 * - Auto-refresh every 30 seconds
 * - Keyboard shortcuts (Enter/ESC)
 */

import React, { useState, useEffect } from "react";
import api from "../api/axios";
import QRScanner from "./QRScanner";
import QRDebugger from "./QRDebugger";

const StallDashboard = () => {
  const [activeTab, setActiveTab] = useState("scanner");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [currentPlay, setCurrentPlay] = useState(null);
  const [score, setScore] = useState("");
  const [plays, setPlays] = useState([]);
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    const handleKeyPress = (event) => {
      // ESC key to stop scanning
      if (event.key === 'Escape' && scanning) {
        setScanning(false);
      }
      // Enter key to start scanning when not scanning
      if (event.key === 'Enter' && !scanning && activeTab === 'scanner' && !loading) {
        setScanning(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [scanning, activeTab, loading]);

  useEffect(() => {
    loadWallet();
    loadHistory();
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      loadWallet();
      loadHistory();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadWallet = async () => {
    try {
      const res = await api.get("/stall/wallet");
      setWallet(res.data);
    } catch (error) {
      console.error("Failed to load wallet:", error);
      setMessage("Failed to load wallet information");
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get("/stall/history");
      setPlays(res.data || []);
    } catch (error) {
      console.error("Failed to load history:", error);
      setMessage("Failed to load play history");
    }
  };

  /* ---------------- QR SCAN ---------------- */

  const handleQRScan = async (qrData) => {
    console.log("QR Data received:", qrData);
    
    // Validate QR data structure
    if (!qrData || typeof qrData !== 'object') {
      setMessage("Invalid QR code format");
      return;
    }

    // Check if it's a visitor QR code
    if (qrData.type !== 'visitor') {
      setMessage("This QR code is not for a visitor");
      return;
    }

    // Get wallet identifier (try both wallet_id and user_id for compatibility)
    const walletId = qrData.wallet_id || qrData.user_id;
    
    if (!walletId) {
      setMessage("Invalid visitor QR code - missing wallet ID");
      return;
    }

    if (loading || currentPlay) {
      setMessage("Game already in progress");
      return;
    }

    setLoading(true);
    setMessage("Checking visitor balance...");

    try {
      // First, get visitor's current balance
      console.log(`Fetching balance for wallet ID: ${walletId}`);
      console.log(`API URL: ${api.defaults.baseURL}/stall/visitor-balance/${walletId}`);
      
      const balanceRes = await api.get(`/stall/visitor-balance/${walletId}`);
      const visitorData = balanceRes.data;
      
      console.log("Visitor balance response:", visitorData);
      
      if (!visitorData.is_active) {
        setMessage("Error: Visitor wallet is frozen");
        setLoading(false);
        return;
      }

      setMessage(`Visitor: ${qrData.username || visitorData.username} | Balance: ${visitorData.balance} pts | Starting game...`);

      const res = await api.post("/stall/play", {
        visitor_wallet: walletId,
      });

      setCurrentPlay({
        transaction_id: res.data.transaction_id,
        visitor_wallet: walletId,
        visitor_username: qrData.username || visitorData.username,
        visitor_balance: visitorData.balance,
      });

      setTimeout(() => {
        setScanning(false);
        setActiveTab("score");
      }, 200);

      setMessage(`Game started for ${qrData.username || visitorData.username} (Balance: ${visitorData.balance} pts)`);
    } catch (err) {
      console.error("Play error:", err);
      console.error("Error response:", err.response);
      console.error("Error config:", err.config);
      
      let errorMsg = "Failed to fetch visitor balance";
      
      if (err.response) {
        // Server responded with error status
        errorMsg = err.response.data?.error || err.response.data?.message || `Server error: ${err.response.status}`;
        console.error(`Server error ${err.response.status}:`, err.response.data);
      } else if (err.request) {
        // Request was made but no response received
        errorMsg = "Network error - cannot reach server";
        console.error("Network error:", err.request);
      } else {
        // Something else happened
        errorMsg = err.message || "Unknown error occurred";
        console.error("Unknown error:", err.message);
      }
      
      setMessage(`Error: ${errorMsg}`);
      
      // Additional debugging info
      console.log("Current API base URL:", api.defaults.baseURL);
      console.log("Auth token present:", !!localStorage.getItem('token'));
      console.log("User data:", localStorage.getItem('user'));
    }

    setLoading(false);
  };

  /* ---------------- SUBMIT SCORE ---------------- */

  const submitScore = async (e) => {
    e.preventDefault();
    if (!currentPlay || !score) return;

    setLoading(true);

    try {
      await api.post("/stall/submit-score", {
        transaction_id: currentPlay.transaction_id,
        score: Number(score),
      });

      setMessage("Score submitted successfully! Game completed.");
      setCurrentPlay(null);
      setScore("");
      
      // Auto-switch back to scanner after 3 seconds
      setTimeout(() => {
        setActiveTab("scanner");
        setMessage("Ready for next game");
      }, 3000);
      
      loadHistory();
      loadWallet();
    } catch (err) {
      setMessage(err.response?.data?.error || "Score failed");
    }

    setLoading(false);
  };

  // Memoize expensive operations
  const memoizedPlays = React.useMemo(() => {
    return plays.map((p) => ({
      ...p,
      formattedDate: new Date(p.created_at).toLocaleString(),
      visitorId: p.from_wallet ? `${p.from_wallet.slice(0, 8)}...` : "No ID"
    }));
  }, [plays]);

  return (
    <div className="container">
      <h1 className="text-center mb-lg">Stall Dashboard</h1>

      <div className="tab-nav">
        {["scanner", "score", "history", "wallet", "debug"].map((tab) => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
            disabled={tab === "score" && !currentPlay}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {message && <div className="success">{message}</div>}

      {/* -------- SCANNER -------- */}
      {activeTab === "scanner" && (
        <div className="card text-center">
          <h3 className="mb-md">QR Scanner</h3>
          
          <div className="mb-md p-sm" style={{ 
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)', 
            borderRadius: '12px', 
            fontSize: '14px',
            border: '1px solid rgba(79, 70, 229, 0.2)'
          }}>
            <p><strong>Instructions:</strong></p>
            <p>• Ask visitor to show their wallet QR code</p>
            <p>• Position QR code in the camera frame</p>
            <p>• Wait for automatic scan and game start</p>
            <p><small>💡 Press Enter to start scanner, ESC to stop</small></p>
          </div>
          
          {!scanning && (
            <button className="btn btn-lg" onClick={() => setScanning(true)}>
              Start Scanner
            </button>
          )}

          {scanning && (
            <div className="scanner-container">
              <QRScanner
                isActive={true}
                onScan={handleQRScan}
                onError={(e) => {
                  console.error("Scanner error:", e);
                  setMessage(`❌ Scanner Error: ${e.message}`);
                  if (e.message.includes("Camera permission")) {
                    setScanning(false);
                  }
                }}
              />
              <button 
                className="btn btn-secondary mt-md" 
                onClick={() => setScanning(false)}
              >
                Stop Scanner
              </button>
            </div>
          )}
          
          {!scanning && (
            <div className="mt-md">
              <p style={{ fontSize: '12px', color: '#6b7280' }}>
                Having trouble? Make sure camera permissions are enabled and the QR code is clearly visible.
              </p>
            </div>
          )}
        </div>
      )}

      {/* -------- SCORE -------- */}
      {activeTab === "score" && currentPlay && (
        <div className="card">
          <h3 className="mb-md text-center">Submit Score</h3>
          <div className="text-center mb-md">
            <p style={{ color: '#374151', fontSize: '16px', fontWeight: '600' }}>
              Player: {currentPlay.visitor_username || 'Unknown'}
            </p>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Balance: {currentPlay.visitor_balance || 0} pts
            </p>
            <p style={{ color: '#6b7280', fontSize: '12px' }}>
              ID: {currentPlay.visitor_wallet?.slice(0, 8)}...
            </p>
          </div>

          <form onSubmit={submitScore}>
            <input
              className="input"
              type="number"
              step="0.1"
              placeholder="Enter player's score"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
            />

            <button className="btn btn-success btn-full" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Score'}
            </button>
          </form>
        </div>
      )}

      {/* -------- HISTORY -------- */}
      {activeTab === "history" && (
        <div className="card">
          <h3 className="mb-md">Play History</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-mobile">
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Username</th>
                  <th>Score</th>
                  <th>Points</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {memoizedPlays.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Visitor">
                      {p.visitorId}
                    </td>
                    <td data-label="Username">
                      <strong>{p.visitor_username || "Unknown User"}</strong>
                    </td>
                    <td data-label="Score">
                      <span className="stat-value" style={{ fontSize: '16px' }}>
                        {p.score ?? "Pending"}
                      </span>
                    </td>
                    <td data-label="Points">
                      <span className="balance" style={{ fontSize: '14px', margin: 0 }}>
                        {p.points_amount || 0} pts
                      </span>
                    </td>
                    <td data-label="Date">{p.formattedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------- WALLET -------- */}
      {activeTab === "wallet" && wallet && (
        <div className="card text-center">
          <h3 className="mb-md">My Wallet</h3>
          
          <div className="balance mb-md">
            {wallet.balance} points
          </div>
          
          <div className="mb-md">
            <span className={`badge ${wallet.is_active ? 'badge-reward' : 'badge-danger'}`}>
              {wallet.is_active ? "✓ Active" : "⚠ Frozen"}
            </span>
          </div>

          <div className="mt-md" style={{ fontSize: '12px', color: '#6b7280' }}>
            <p>Auto-refreshes every 30 seconds</p>
          </div>
        </div>
      )}

      {/* -------- DEBUG -------- */}
      {activeTab === "debug" && (
        <div className="card">
          <QRDebugger />
        </div>
      )}
    </div>
  );
};

export default StallDashboard;
