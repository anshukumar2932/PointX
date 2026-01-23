import React, { useEffect, useState } from "react";
import api from "../api/axios";
import QRGenerator from "./QRGenerator";

const VisitorDashboard = () => {
  const [activeTab, setActiveTab] = useState("wallet");
  const [me, setMe] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /* ================= LOAD CORE DATA ================= */

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    if (!me) return;
    loadWallet();
    loadHistory();
    loadLeaderboard();
  }, [me]);

  const loadMe = async () => {
    try {
      const res = await api.get("/auth/me");
      setMe(res.data);
    } catch {
      setMessage("❌ Failed to load user session");
    }
  };

  const loadWallet = async () => {
    try {
      const res = await api.get("/visitor/wallet");
      setWallet(res.data);
    } catch {
      setMessage("❌ Failed to load wallet");
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get("/visitor/history");
      setHistory(res.data || []);
    } catch {
      console.error("Failed to load history");
    }
  };

  const loadLeaderboard = async () => {
    try {
      const res = await api.get("/visitor/leaderboard");
      setLeaderboard(res.data || []);
    } catch {
      console.error("Failed to load leaderboard");
    }
  };

  /* ================= QR PAYLOAD ================= */

  const qrPayload =
    me &&
    JSON.stringify({
      type: "visitor",
      user_id: me.user_id,
      username: me.username,
    });

  /* ================= UI ================= */

  if (!me || !wallet) {
    return <div className="loading">Loading visitor dashboard…</div>;
  }

  return (
    <div>
      <h1>🎮 Visitor Dashboard</h1>

      <div style={{ marginBottom: 20 }}>
        {["wallet", "history", "leaderboard"].map(tab => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? "" : "btn-secondary"}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {message && <div className="error">{message}</div>}

      {/* ================= WALLET ================= */}
      {activeTab === "wallet" && (
        <div className="card">
          <h3>💳 My Wallet</h3>

          <div className="balance">
            {wallet.balance} points
          </div>

          {!wallet.is_active && (
            <div className="error">Wallet is frozen</div>
          )}

          <p style={{ color: "#6b7280" }}>
            Show this QR to the stall operator
          </p>

          <QRGenerator
            payload={qrPayload}
            title={`${me.username} (Visitor)`}
          />
        </div>
      )}

      {/* ================= HISTORY ================= */}
      {activeTab === "history" && (
        <div className="card">
          <h3>📋 Transaction History</h3>

          {history.length === 0 ? (
            <p>No transactions yet</p>
          ) : (
            <table className="table">
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
                    <td>{tx.type}</td>
                    <td>{tx.points_amount}</td>
                    <td>{new Date(tx.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ================= LEADERBOARD ================= */}
      {activeTab === "leaderboard" && (
        <div className="card">
          <h3>🏆 Leaderboard</h3>

          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>User</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, i) => (
                <tr key={row.user_id}>
                  <td>#{i + 1}</td>
                  <td>{row.username}</td>
                  <td>{row.total_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VisitorDashboard;
