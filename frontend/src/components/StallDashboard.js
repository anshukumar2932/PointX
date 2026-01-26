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
  const [scoreError, setScoreError] = useState("");
  const [plays, setPlays] = useState([]);
  const [pendingGames, setPendingGames] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [selectedPendingGame, setSelectedPendingGame] = useState(null);

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
    loadPendingGames();
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      loadWallet();
      loadHistory();
      loadPendingGames();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadWallet = async () => {
    try {
      const res = await api.get("/stall/wallet");
      setWallet(res.data);
    } catch (error) {
      setMessage("Failed to load wallet information");
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get("/stall/history");
      setPlays(res.data || []);
    } catch (error) {
      setMessage("Failed to load play history");
    }
  };

  const loadPendingGames = async () => {
    try {
      const res = await api.get("/stall/pending-games");
      setPendingGames(res.data || []);
    } catch (error) {
      console.error("Failed to load pending games:", error);
    }
  };

  /* ---------------- QR SCAN ---------------- */

  const handleQRScan = async (qrData) => {
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
      const balanceRes = await api.get(`/stall/visitor-balance/${walletId}`);
      const visitorData = balanceRes.data;
      
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
      let errorMsg = "Failed to fetch visitor balance";
      
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
      
      setMessage(`Error: ${errorMsg}`);
    }

    setLoading(false);
  };

  /* ---------------- SUBMIT SCORE ---------------- */

  const submitScore = async (e) => {
    e.preventDefault();
    const gameToSubmit = currentPlay || selectedPendingGame;
    if (!gameToSubmit || !score) return;

    setLoading(true);

    try {
      await api.post("/stall/submit-score", {
        transaction_id: gameToSubmit.transaction_id || gameToSubmit.id,
        score: Number(score),
      });

      setMessage("Score submitted successfully! Game completed.");
      setCurrentPlay(null);
      setSelectedPendingGame(null);
      setScore("");
      
      // Auto-switch back to scanner after 3 seconds
      setTimeout(() => {
        setActiveTab("scanner");
        setMessage("Ready for next game");
      }, 3000);
      
      loadHistory();
      loadPendingGames();
      loadWallet();
    } catch (err) {
      setMessage(err.response?.data?.error || "Score failed");
    }

    setLoading(false);
  };

  const selectPendingGame = (game) => {
    setSelectedPendingGame(game);
    setCurrentPlay(null);
    setScore("");
    setActiveTab("score");
    setMessage(`Selected pending game for ${game.visitor_username}`);
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
        {["scanner", "pending", "score", "history", "wallet", "debug"].map((tab) => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
            disabled={tab === "score" && !currentPlay && !selectedPendingGame}
          >
            {tab === "pending" ? `Pending (${pendingGames.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {message && <div className="success">{message}</div>}

      {/* -------- SCANNER -------- */}
      {activeTab === "scanner" && (
        <div className="card neon-card">
          <h3 className="mb-md"> QR Scanner</h3>
          
          <div className="mb-md p-md" style={{ 
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%)', 
            borderRadius: 'var(--radius-lg)', 
            fontSize: 'var(--text-sm)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <p><strong> Instructions:</strong></p>
            <p>• Ask visitor to show their wallet QR code</p>
            <p>• Position QR code in the camera frame</p>
            <p>• Wait for automatic scan and game start</p>
            <p><small>💡 Press Enter to start scanner, ESC to stop</small></p>
          </div>
          
          {!scanning && (
            <button className="btn btn-neon btn-lg" onClick={() => setScanning(true)}>
              🔍 Start Scanner
            </button>
          )}

          {scanning && (
            <div className="scanner-container">
              <QRScanner
                isActive={true}
                onScan={handleQRScan}
                onError={(e) => {
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
              <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255, 255, 255, 0.7)' }}>
                Having trouble? Make sure camera permissions are enabled and the QR code is clearly visible.
              </p>
            </div>
          )}
        </div>
      )}

      {/* -------- PENDING GAMES -------- */}
      {activeTab === "pending" && (
        <div className="card">
          <h3 className="mb-md"> Pending Games</h3>
          {pendingGames.length === 0 ? (
            <div className="text-center" style={{ padding: 'var(--space-2xl)', color: 'rgba(255, 255, 255, 0.7)' }}>
              <p> No pending games!</p>
              <p style={{ fontSize: 'var(--text-sm)' }}>All games have been completed.</p>
            </div>
          ) : (
            <>
              <div className="mb-md" style={{ 
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)', 
                padding: 'var(--space-md)', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <p style={{ color: '#fca5a5', fontSize: 'var(--text-sm)', margin: 0 }}>
                   These games were started but scores were never submitted. Click "Submit Score" to complete them.
                </p>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table className="table table-mobile">
                  <thead>
                    <tr>
                      <th>Visitor</th>
                      <th>Username</th>
                      <th>Started</th>
                      <th>Time Ago</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingGames.map((game) => {
                      const timeAgo = Math.floor((new Date() - new Date(game.created_at)) / (1000 * 60));
                      return (
                        <tr key={game.id}>
                          <td data-label="Visitor">
                            {game.from_wallet ? `${game.from_wallet.slice(0, 8)}...` : "No ID"}
                          </td>
                          <td data-label="Username">
                            <strong>{game.visitor_username || "Unknown User"}</strong>
                          </td>
                          <td data-label="Started">
                            {new Date(game.created_at).toLocaleString()}
                          </td>
                          <td data-label="Time Ago">
                            <span style={{ 
                              color: timeAgo > 60 ? '#ef4444' : timeAgo > 30 ? '#f59e0b' : '#10b981',
                              fontWeight: '600'
                            }}>
                              {timeAgo < 1 ? 'Just now' : `${timeAgo}m ago`}
                            </span>
                          </td>
                          <td data-label="Action">
                            <button
                              className="btn btn-sm btn-neon"
                              onClick={() => selectPendingGame(game)}
                              style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-xs) var(--space-md)' }}
                            >
                              ⚡ Submit Score
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* -------- SCORE -------- */}
      {activeTab === "score" && (currentPlay || selectedPendingGame) && (
        <div
          className="card futuristic-card"
          style={{
            background: "linear-gradient(145deg, #0f172a, #020617)",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 0 30px rgba(99,102,241,0.25)",
            border: "1px solid rgba(99,102,241,0.3)",
            backdropFilter: "blur(12px)"
          }}
        >
          {/* Title */}
          <h3
            className="mb-md text-center"
            style={{
              color: "#e0e7ff",
              letterSpacing: "1px",
              fontWeight: "700"
            }}
          >
             Submit Score {selectedPendingGame && <span style={{ color: '#f59e0b' }}>(Pending Game)</span>}
          </h3>

          {/* Player Info */}
          <div
            className="text-center mb-md"
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              borderRadius: "14px",
              padding: "16px",
              border: "1px solid rgba(148,163,184,0.15)"
            }}
          >
            <p style={{ color: "#c7d2fe", fontSize: "16px", fontWeight: "600" }}>
              👤 {(currentPlay || selectedPendingGame).visitor_username || "Unknown Player"}
            </p>

            {currentPlay && (
              <p style={{ color: "#a5b4fc", fontSize: "14px", marginTop: "6px" }}>
                 Balance: <strong>{currentPlay.visitor_balance || 0}</strong> pts
              </p>
            )}

            <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>
               {((currentPlay || selectedPendingGame).visitor_wallet || (currentPlay || selectedPendingGame).from_wallet)?.slice(0, 8)}...
            </p>

            {selectedPendingGame && (
              <p style={{ color: "#f59e0b", fontSize: "12px", marginTop: "8px" }}>
                 Game started: {new Date(selectedPendingGame.created_at).toLocaleString()}
              </p>
            )}
          </div>

          {/* Score Form */}
          <form onSubmit={submitScore}>
            <input
              type="number"
              className="input futuristic-input"
              placeholder="Score (0 – 10)"
              step="0.1"
              min="0"
              max="10"
              value={score}
              onChange={(e) => {
                let val = e.target.value;

                if (val === "") {
                  setScore("");
                  setScoreError("");
                  return;
                }

                val = parseFloat(val);
                if (val < 0) val = 0;
                if (val > 10) {
                  val = 10;
                  setScoreError("Score cannot exceed 10");
                } else {
                  setScoreError("");
                }

                setScore(val);
              }}
              required
              style={{
                background: "rgba(2,6,23,0.8)",
                border: scoreError
                  ? "1px solid #ef4444"
                  : "1px solid rgba(99,102,241,0.4)",
                borderRadius: "12px",
                color: "#e0e7ff",
                padding: "14px",
                fontSize: "16px",
                marginBottom: scoreError ? "8px" : "16px",
                boxShadow: "inset 0 0 10px rgba(99,102,241,0.15)"
              }}
            />

            {/* Error */}
            {scoreError && (
              <p
                style={{
                  color: "#f87171",
                  fontSize: "12px",
                  textAlign: "center",
                  marginBottom: "12px"
                }}
              >
                ⚠ {scoreError}
              </p>
            )}

            {/* Submit */}
            <button
              className="btn btn-success btn-full"
              disabled={loading || score === "" || score < 0 || score > 10}
              style={{
                background: loading
                  ? "linear-gradient(90deg, #334155, #475569)"
                  : "linear-gradient(90deg, #22c55e, #16a34a)",
                borderRadius: "14px",
                padding: "14px",
                fontWeight: "700",
                letterSpacing: "0.5px",
                boxShadow: "0 0 20px rgba(34,197,94,0.5)",
                transition: "all 0.3s ease"
              }}
            >
              {loading ? "⚡ Submitting..." : "🚀 Submit Score"}
            </button>

            {selectedPendingGame && (
              <button
                type="button"
                className="btn btn-secondary btn-full mt-sm"
                onClick={() => {
                  setSelectedPendingGame(null);
                  setScore("");
                  setActiveTab("pending");
                }}
                style={{ fontSize: '14px' }}
              >
                Cancel & Back to Pending
              </button>
            )}
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
                      {p.score !== null ? (
                        <span className="stat-value" style={{ fontSize: '16px' }}>
                          {p.score}
                        </span>
                      ) : (
                        <span style={{ 
                          color: '#ef4444', 
                          fontWeight: '600',
                          fontSize: '14px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                          Pending
                        </span>
                      )}
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
