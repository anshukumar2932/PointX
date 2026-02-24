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

import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../api/axios";
import QRScanner from "./QRScanner";
import QRDebugger from "./QRDebugger";
import MessageAlert from "./MessageAlert";

const StallDashboard = () => {
  const [activeTab, setActiveTab] = useState("scanner");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const [currentPlay, setCurrentPlay] = useState(null);
  const [score, setScore] = useState("");
  const [scoreError, setScoreError] = useState("");
  const [plays, setPlays] = useState([]);
  const [pendingGames, setPendingGames] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [activeStalls, setActiveStalls] = useState([]);
  const [selectedStallId, setSelectedStallId] = useState("");
  const [selectedPendingGame, setSelectedPendingGame] = useState(null);
  const scanStateRef = useRef({
    inFlight: false,
    walletId: "",
    timestamp: 0,
  });
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
      if (event.key === 'Enter' && !scanning && activeTab === 'scanner' && !loading && selectedStallId) {
        setScanning(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [scanning, activeTab, loading, selectedStallId]);

  const loadActiveStalls = useCallback(async () => {
    try {
      const res = await api.get("/stall/my-active-stalls");
      const stalls = res.data || [];
      setActiveStalls(stalls);
      setSelectedStallId((prev) => {
        if (prev && stalls.some((stall) => stall.stall_id === prev)) {
          return prev;
        }
        return stalls[0]?.stall_id || "";
      });

      if (stalls.length === 0) {
        setScanning(false);
      }
    } catch (error) {
      setActiveStalls([]);
      setSelectedStallId("");
      setMessage("Failed to load active stalls. Ask admin to activate your stall session.");
      setMessageType("error");
      setScanning(false);
    }
  }, []);

  const loadWallet = useCallback(async (stallId = selectedStallId) => {
    if (!stallId) {
      setWallet(null);
      return;
    }

    try {
      const res = await api.get("/stall/wallet", {
        params: { stall_id: stallId },
      });
      setWallet(res.data);
    } catch (error) {
      if ([400, 403, 404].includes(error.response?.status)) {
        setWallet(null);
        return;
      }
      setMessage("Failed to load wallet information");
      setMessageType("error");
    }
  }, [selectedStallId]);

  const loadHistory = useCallback(async (stallId = selectedStallId) => {
    try {
      const res = await api.get("/stall/history", {
        params: stallId ? { stall_id: stallId } : {},
      });
      setPlays(res.data || []);
    } catch (error) {
      setMessage("Failed to load play history");
      setMessageType("error");
    }
  }, [selectedStallId]);

  const loadPendingGames = useCallback(async (stallId = selectedStallId) => {
    try {
      const res = await api.get("/stall/pending-games", {
        params: stallId ? { stall_id: stallId } : {},
      });
      setPendingGames(res.data || []);
    } catch (error) {
      console.error("Failed to load pending games:", error);
    }
  }, [selectedStallId]);

  useEffect(() => {
    loadActiveStalls();
    loadHistory(selectedStallId);
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      loadActiveStalls();
      loadWallet(selectedStallId);
      loadHistory(selectedStallId);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadActiveStalls, loadWallet, loadHistory, selectedStallId]);

  useEffect(() => {
    loadWallet(selectedStallId);
  }, [selectedStallId, loadWallet]);

  useEffect(() => {
    loadPendingGames(selectedStallId);
  }, [selectedStallId, loadPendingGames]);

  useEffect(() => {
    loadHistory(selectedStallId);
  }, [selectedStallId, loadHistory]);

  /* ---------------- QR SCAN ---------------- */

  const handleQRScan = useCallback(async (qrData) => {
    // Validate QR data structure
    if (!qrData || typeof qrData !== 'object') {
      setMessage("Invalid QR code format");
      setMessageType("error");
      return;
    }

    // Check if it's a visitor QR code
    if (qrData.type !== 'visitor') {
      setMessage("This QR code is not for a visitor");
      setMessageType("warning");
      return;
    }

    // Get wallet identifier (try both wallet_id and user_id for compatibility)
    const walletId = qrData.wallet_id || qrData.user_id;
    
    if (!walletId) {
      setMessage("Invalid visitor QR code - missing wallet ID");
      setMessageType("error");
      return;
    }

    const now = Date.now();
    if (scanStateRef.current.inFlight) {
      return;
    }
    if (
      scanStateRef.current.walletId === walletId &&
      now - scanStateRef.current.timestamp < 5000
    ) {
      return;
    }

    const stallId = selectedStallId || activeStalls[0]?.stall_id;
    if (!stallId) {
      setMessage("No active stall selected. Ask admin to activate your stall session.");
      setMessageType("error");
      setScanning(false);
      return;
    }

    if (loading || currentPlay) {
      setMessage("Game already in progress");
      setMessageType("warning");
      return;
    }

    scanStateRef.current = {
      inFlight: true,
      walletId,
      timestamp: now,
    };

    setLoading(true);
    setMessage("Checking visitor balance...");
    setMessageType("loading");

    try {
      // First, get visitor's current balance
      const balanceRes = await api.get(`/stall/visitor-balance/${walletId}`);
      const visitorData = balanceRes.data;
      
      if (!visitorData.is_active) {
        setMessage("Error: Visitor wallet is frozen");
        setMessageType("error");
        setLoading(false);
        return;
      }

      setMessage(`Visitor: ${qrData.username || visitorData.username} | Balance: ${visitorData.balance} pts | Starting game...`);
      setMessageType("info");

      const res = await api.post("/stall/play", {
        visitor_wallet: walletId,
        stall_id: stallId,
      });

      setCurrentPlay({
        transaction_id: res.data.transaction_id,
        visitor_wallet: walletId,
        visitor_username: qrData.username || visitorData.username,
        visitor_balance: visitorData.balance,
        stall_id: stallId,
      });

      setTimeout(() => {
        setScanning(false);
        setActiveTab("score");
      }, 200);

      setMessage(`Game started for ${qrData.username || visitorData.username} (Balance: ${visitorData.balance} pts)`);
      setMessageType("success");
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
      
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      scanStateRef.current = {
        inFlight: false,
        walletId,
        timestamp: Date.now(),
      };
      setLoading(false);
    }
  }, [activeStalls, currentPlay, loading, selectedStallId]);

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
      setMessageType("success");
      setCurrentPlay(null);
      setSelectedPendingGame(null);
      setScore("");
      scanStateRef.current = {
        inFlight: false,
        walletId: "",
        timestamp: 0,
      };
      
      // Auto-switch back to scanner after 3 seconds
      setTimeout(() => {
        setActiveTab("scanner");
        setMessage("Ready for next game");
        setMessageType("info");
      }, 3000);

      loadHistory(selectedStallId);
      loadPendingGames(selectedStallId);
      loadWallet(selectedStallId);
    } catch (err) {
      setMessage(err.response?.data?.error || "Score submission failed");
      setMessageType("error");
    }

    setLoading(false);
  };

  const selectPendingGame = (game) => {
    setSelectedPendingGame(game);
    setCurrentPlay(null);
    setScore("");
    setActiveTab("score");
    setMessage(`Selected pending game for ${game.visitor_username}`);
    setMessageType("info");
  };

  const handleScannerError = useCallback((e) => {
    setMessage(`Scanner Error: ${e.message}`);
    setMessageType("error");
    if (e.message.includes("Camera permission")) {
      setScanning(false);
    }
  }, []);

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

  const selectedStall = activeStalls.find((stall) => stall.stall_id === selectedStallId);


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
          Stall Dashboard
        </h1>
        <div className="premium-badge">
          {selectedStall?.stall_name
            ? `OPERATOR-${selectedStall.stall_name.toUpperCase()}`
            : "OPERATOR-UNASSIGNED"}
        </div>
      </div>

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
        <MessageAlert 
          message={message} 
          type={messageType} 
          onClose={() => setMessage("")} 
        />
      )}

      {/* -------- SCANNER -------- */}
      {activeTab === "scanner" && (
        <div className="card club-pattern">
          <h3 className="card-title">QR Scanner</h3>
          
          <div className="info-box mb-md">
            <h4 className="info-title"> Instructions</h4>
            <ul className="info-list">
              <li>Ask visitor to show their wallet QR code</li>
              <li>Position QR code in the camera frame</li>
              <li>Wait for automatic scan and game start</li>
            </ul>
            <p className="info-tip">TIP: Press Enter to start scanner, ESC to stop</p>
          </div>

          <div className="mb-md">
            <label className="mb-sm" style={{ display: "block", fontWeight: 700 }}>
              Active Stall
            </label>
            <select
              className="input"
              value={selectedStallId}
              onChange={(e) => {
                setSelectedStallId(e.target.value);
                setCurrentPlay(null);
                setSelectedPendingGame(null);
                setScanning(false);
              }}
              disabled={loading || activeStalls.length === 0}
            >
              {activeStalls.length === 0 && <option value="">No active stalls found</option>}
              {activeStalls.map((stall) => (
                <option key={stall.stall_id} value={stall.stall_id}>
                  {stall.stall_name} ({stall.price_per_play} pts/play)
                </option>
              ))}
            </select>
            {selectedStall && (
              <p className="mt-sm" style={{ fontSize: "13px", color: "#6b7280" }}>
                Selected: <strong>{selectedStall.stall_name}</strong>
              </p>
            )}
          </div>
          
          {!scanning && (
            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={() => setScanning(true)}
              disabled={!selectedStallId || loading}
            >
              {!selectedStallId ? "No Active Stall Available" : "Start Scanner"}
            </button>
          )}

          {scanning && (
            <div className="scanner-container">
              <QRScanner
                isActive={true}
                onScan={handleQRScan}
                onError={handleScannerError}
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
        <div className="card club-pattern">
          <h3 className="card-title">Pending Games</h3>
          {pendingGames.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 16px',
                border: '4px solid rgba(220, 38, 38, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                color: 'rgba(220, 38, 38, 0.3)',
                fontWeight: '900'
              }}>-</div>
              <h4 className="empty-title">No pending games!</h4>
              <p className="empty-description">All games have been completed.</p>
            </div>
          ) : (
            <>              
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
                      const createdAt = game.created_at || "";
                      const gameUTC = Date.parse(
                        createdAt.endsWith("Z")
                          ? createdAt
                          : createdAt
                            ? createdAt + "Z"
                            : ""
                      );
                      const timeAgo = Number.isNaN(gameUTC)
                        ? 0
                        : Math.floor((nowUTC - gameUTC) / (1000 * 60));


                      return (
                        <tr key={game.transaction_id}>
                          <td data-label="Visitor">
                            <span className="wallet-id">
                              {game.visitor_wallet ? `${game.visitor_wallet.slice(0, 8)}...` : "No ID"}
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
                              Submit Score
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
        <div className="card club-pattern">
          <h3 className="card-title">
            Submit Score {selectedPendingGame && <span className="badge badge-warning">Pending Game</span>}
          </h3>

          {/* Player Info */}
          <div className="player-info mb-md">
            <div className="player-avatar" style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              color: 'white',
              fontWeight: '900',
              fontSize: '20px'
            }}>P</div>
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
                ID: {((currentPlay || selectedPendingGame).visitor_wallet || (currentPlay || selectedPendingGame).from_wallet)?.slice(0, 8)}...
              </p>

              {selectedPendingGame && (
                <p className="game-started">
                  Started: {formatUTC(selectedPendingGame.created_at)}
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
                <p className="form-error">{scoreError}</p>
              )}
            </div>

            <button
              className="btn btn-success btn-full btn-lg"
              disabled={loading || score === "" || score < 0 || score > 10}
            >
              {loading ? "Submitting..." : "Submit Score"}
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
                Back to Pending
              </button>
            )}
          </form>
        </div>
      )}

      {/* -------- HISTORY -------- */}
      {activeTab === "history" && (
        <div className="card club-pattern">
          <h3 className="card-title">Play History</h3>
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
                {memoizedPlays.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "#6b7280" }}>
                      No play history found for the selected stall yet.
                    </td>
                  </tr>
                ) : (
                  memoizedPlays.map((p) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------- WALLET -------- */}
      {activeTab === "wallet" && wallet && (
        <div className="card club-pattern">
          <h3 className="card-title">
            {wallet.stall_name
              ? `Operator - ${wallet.stall_name}`
              : selectedStall?.stall_name
                ? `Operator - ${selectedStall.stall_name}`
                : "My Wallet"}
          </h3>
          
          <div className="wallet-display">
            <div className="wallet-balance">
              <span className="balance-amount">{wallet.balance}</span>
              <span className="balance-label">points</span>
            </div>
            
            <div className="wallet-status">
              <span className="badge badge-success">Session Active</span>
            </div>
          </div>

          <div className="help-text">
            <p>Auto-refreshes every 30 seconds</p>
            {wallet.is_active === false && (
              <p>Wallet flag is frozen in DB. Check Debug tab or ask admin to review wallet status.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "wallet" && !wallet && (
        <div className="card club-pattern">
          <h3 className="card-title">
            {selectedStall?.stall_name
              ? `Operator - ${selectedStall.stall_name}`
              : "My Wallet"}
          </h3>
          <div className="help-text">
            <p>
              {selectedStall
                ? `Wallet not available for ${selectedStall.stall_name} right now.`
                : "No active stall selected."}
            </p>
            <p>Select an active stall in Scanner tab to view stall wallet balance.</p>
          </div>
        </div>
      )}

      {/* -------- DEBUG -------- */}
      {activeTab === "debug" && (
        <div className="card club-pattern">
          <h3 className="card-title">Debug Tools</h3>
          <QRDebugger mode="operator" selectedStallId={selectedStallId} />
        </div>
      )}
    </div>
  );
};

export default StallDashboard;
