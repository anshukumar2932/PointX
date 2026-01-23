import React, { useState, useEffect } from "react";
import api from "../api/axios";
import QRScanner from "./QRScanner";

const StallDashboard = () => {
  const [activeTab, setActiveTab] = useState("scanner");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [currentPlay, setCurrentPlay] = useState(null);
  const [score, setScore] = useState("");
  const [plays, setPlays] = useState([]);
  const [wallet, setWallet] = useState(null);

  /* ---------------- LOAD WALLET & HISTORY ---------------- */

  useEffect(() => {
    loadWallet();
    loadHistory();
  }, []);

  const loadWallet = async () => {
    const res = await api.get("/stall/wallet");
    setWallet(res.data);
  };

  const loadHistory = async () => {
    const res = await api.get("/stall/history");
    setPlays(res.data || []);
  };

  /* ---------------- QR SCAN ---------------- */

  const handleQRScan = async (qrData) => {
    if (!qrData?.wallet_id || loading || currentPlay) return;

    setLoading(true);
    setMessage("Starting game...");

    try {
      const res = await api.post("/stall/play", {
        visitor_wallet: qrData.wallet_id,
      });

      setCurrentPlay({
        transaction_id: res.data.transaction_id,
        visitor_wallet: qrData.wallet_id,
      });

      setTimeout(() => {
        setScanning(false);
        setActiveTab("score");
      }, 200);

      setMessage("✅ Game started");
    } catch (err) {
      setMessage(err.response?.data?.error || "Play failed");
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

      setMessage("🎉 Score submitted!");
      setCurrentPlay(null);
      setScore("");
      setActiveTab("scanner");
      loadHistory();
      loadWallet();
    } catch (err) {
      setMessage(err.response?.data?.error || "Score failed");
    }

    setLoading(false);
  };

  /* ---------------- UI ---------------- */

  return (
    <div>
      <h1>🎪 Stall Dashboard</h1>

      <div style={{ marginBottom: 20 }}>
        {["scanner", "score", "history", "wallet"].map((tab) => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? "" : "btn-secondary"}`}
            onClick={() => setActiveTab(tab)}
            disabled={tab === "score" && !currentPlay}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {message && <div className="success">{message}</div>}

      {/* -------- SCANNER -------- */}
      {activeTab === "scanner" && (
        <div className="card">
          {!scanning && (
            <button className="btn" onClick={() => setScanning(true)}>
              📷 Start Scanner
            </button>
          )}

          {scanning && (
            <QRScanner
              isActive={true}
              onScan={handleQRScan}
              onError={(e) => {
                setMessage(e.message);
                setScanning(false);
              }}
            />
          )}
        </div>
      )}

      {/* -------- SCORE -------- */}
      {activeTab === "score" && currentPlay && (
        <div className="card">
          <h3>Submit Score</h3>

          <form onSubmit={submitScore}>
            <input
              className="input"
              type="number"
              step="0.1"
              placeholder="Score"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
            />

            <button className="btn btn-success" disabled={loading}>
              Submit
            </button>
          </form>
        </div>
      )}

      {/* -------- HISTORY -------- */}
      {activeTab === "history" && (
        <div className="card">
          <h3>Play History</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Score</th>
                <th>Points</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {plays.map((p) => (
                <tr key={p.id}>
                  <td>{p.from_wallet?.slice(0, 8)}...</td>
                  <td>{p.score ?? "—"}</td>
                  <td>{p.points_amount}</td>
                  <td>{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* -------- WALLET -------- */}
      {activeTab === "wallet" && wallet && (
        <div className="card">
          <h3>💳 Wallet</h3>
          <p>Balance: {wallet.balance} pts</p>
          <p>Status: {wallet.is_active ? "Active" : "Frozen"}</p>
        </div>
      )}

    </div>
  );
};

export default StallDashboard;
