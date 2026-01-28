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
  const formatUTC = (utcString) => {
    if (!utcString) return "—";
    const date = new Date(
      utcString.endsWith("Z") ? utcString : utcString + "Z"
    );

    if (isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };


  

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
      formattedDate: formatUTC(p.created_at),
      visitorId: p.visitor_wallet
        ? `${p.visitor_wallet.slice(0, 8)}...`
        : "No ID",
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

      {message && (
        <div className="alert-message mb-md">
          {message}
        </div>
      )}

      {/* -------- SCANNER -------- */}
      {activeTab === "scanner" && (
        <div className="card">
          <h3 className="card-title"> QR Scanner</h3>
          
          <div className="info-box mb-md">
            <h4 className="info-title"> Instructions</h4>
            <ul className="info-list">
              <li>Ask visitor to show their wallet QR code</li>
              <li>Position QR code in the camera frame</li>
              <li>Wait for automatic scan and game start</li>
            </ul>
            <p className="info-tip">💡 Press Enter to start scanner, ESC to stop</p>
          </div>
          
          {!scanning && (
            <button className="btn btn-primary btn-lg btn-full" onClick={() => setScanning(true)}>
            Start Scanner
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
                className="btn btn-secondary btn-full mt-md" 
                onClick={() => setScanning(false)}
              >
                 Stop Scanner
              </button>
            </div>
          )}
          
          {!scanning && (
            <div className="help-text mt-md">
              <p>Having trouble? Make sure camera permissions are enabled and the QR code is clearly visible.</p>
            </div>
          )}
        </div>
      )}

      {/* -------- PENDING GAMES -------- */}
      {activeTab === "pending" && (
        <div className="card">
          <h3 className="card-title"> Pending Games</h3>
          {pendingGames.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <h4 className="empty-title">No pending games!</h4>
              <p className="empty-description">All games have been completed.</p>
            </div>
          ) : (
            <>
              <div className="warning-box mb-md">
                <p>⚠️ These games were started but scores were never submitted. Click "Submit Score" to complete them.</p>
              </div>
              
              <div className="table-container">
                <table className="table">
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
                      const nowUTC = Date.now();
                      const gameUTC = Date.parse(
                        game.created_at.endsWith("Z")
                          ? game.created_at
                          : game.created_at + "Z"
                      );

                      const timeAgo = Math.floor((nowUTC - gameUTC) / (1000 * 60));


                      return (
                        <tr key={game.id}>
                          <td data-label="Visitor">
                            <span className="wallet-id">
                              {game.from_wallet ? `${game.from_wallet.slice(0, 8)}...` : "No ID"}
                            </span>
                          </td>
                          <td data-label="Username">
                            <strong className="username">{game.visitor_username || "Unknown User"}</strong>
                          </td>
                          <td data-label="Started">
                            <span className="date-text">
                              {formatUTC(game.created_at)}                            
                            </span>
                          </td>
                          <td data-label="Time Ago">
                            <span className={`time-badge ${timeAgo > 60 ? 'urgent' : timeAgo > 30 ? 'warning' : 'recent'}`}>
                              {timeAgo < 1 ? 'Just now' : `${timeAgo}m ago`}
                            </span>
                          </td>
                          <td data-label="Action">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => selectPendingGame(game)}
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
        <div className="card">
          <h3 className="card-title">
             Submit Score {selectedPendingGame && <span className="badge badge-warning">Pending Game</span>}
          </h3>

          {/* Player Info */}
          <div className="player-info mb-md">
            <div className="player-avatar">👤</div>
            <div className="player-details">
              <h4 className="player-name">
                {(currentPlay || selectedPendingGame).visitor_username || "Unknown Player"}
              </h4>
              
              {currentPlay && (
                <p className="player-balance">
                  Balance: <strong>{currentPlay.visitor_balance || 0}</strong> pts
                </p>
              )}

              <p className="player-wallet">
                🔑 {((currentPlay || selectedPendingGame).visitor_wallet || (currentPlay || selectedPendingGame).from_wallet)?.slice(0, 8)}...
              </p>

              {selectedPendingGame && (
                <p className="game-started">
                  🕒 Started: {formatUTC(selectedPendingGame.created_at)}
                </p>
              )}
            </div>
          </div>

          {/* Score Form */}
          <form onSubmit={submitScore}>
            <div className="form-group">
              <label className="form-label">Score (0 – 10)</label>
              <input
                type="number"
                className={`form-input ${scoreError ? 'error' : ''}`}
                placeholder="Enter score..."
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
              />
              {scoreError && (
                <p className="form-error">⚠️ {scoreError}</p>
              )}
            </div>

            <button
              className="btn btn-success btn-full btn-lg"
              disabled={loading || score === "" || score < 0 || score > 10}
            >
              {loading ? "⚡ Submitting..." : " Submit Score"}
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
              >
                ← Back to Pending
              </button>
            )}
          </form>
        </div>
      )}

      {/* -------- HISTORY -------- */}
      {activeTab === "history" && (
        <div className="card">
          <h3 className="card-title"> Play History</h3>
          <div className="table-container">
            <table className="table">
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
                  <tr key={p.transaction_id}>
                    <td data-label="Visitor">
                      <span className="wallet-id">{p.visitorId}</span>
                    </td>
                    <td data-label="Username">
                      <strong className="username">{p.visitor_username || "Unknown User"}</strong>
                    </td>
                    <td data-label="Score">
                      {p.score !== null ? (
                        <span className="score-value">{p.score}</span>
                      ) : (
                        <span className="badge badge-danger">Pending</span>
                      )}
                    </td>
                    <td data-label="Points">
                      <span className="points-value">{p.points || 0} pts</span>
                    </td>
                    <td data-label="Date">
                      <span className="date-text">{p.formattedDate}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------- WALLET -------- */}
      {activeTab === "wallet" && wallet && (
        <div className="card">
          <h3 className="card-title"> My Wallet</h3>
          
          <div className="wallet-display">
            <div className="wallet-balance">
              <span className="balance-amount">{wallet.balance}</span>
              <span className="balance-label">points</span>
            </div>
            
            <div className="wallet-status">
              <span className={`badge ${wallet.is_active ? 'badge-success' : 'badge-danger'}`}>
                {wallet.is_active ? "✓ Active" : "Frozen"}
              </span>
            </div>
          </div>

          <div className="help-text">
            <p>Auto-refreshes every 30 seconds</p>
          </div>
        </div>
      )}

      {/* -------- DEBUG -------- */}
      {activeTab === "debug" && (
        <div className="card">
          <h3 className="card-title"> Debug Tools</h3>
          <QRDebugger />
        </div>
      )}
    </div>
  );
};

export default StallDashboard;
