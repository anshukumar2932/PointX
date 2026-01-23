import React, { useState, useEffect, useCallback } from "react";
import Papa from "papaparse";
import { Html5QrcodeScanner } from "html5-qrcode";

import {
  createUser,
  createStall,
  bulkUsers,
  adminTopup,
  freezeWallet,
  getAllUsers,
  getPlays,
  getPendingTopups,
  approveTopup,
  getLeaderboard,
  markAttendance,
} from "../api/admin";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Data
  const [users, setUsers] = useState([]);
  const [plays, setPlays] = useState([]);
  const [topupRequests, setTopupRequests] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  // Filters
  const [userSearch, setUserSearch] = useState("");

  // Forms
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    role: "visitor",
  });

  const [newStall, setNewStall] = useState({
    username: "",
    password: "",
    price: 10,
  });

  const [topupData, setTopupData] = useState({
    username: "",
    adminname: "admin",
    amount: 50,
  });

  // CSV
  const [csvUsers, setCsvUsers] = useState([]);
  const [csvFileName, setCsvFileName] = useState("");

  // Attendance
  const [attendanceData, setAttendanceData] = useState({
    user_id: "",
    reg_no: "",
  });

  const [qrInput, setQrInput] = useState("");
  const [qrScanResult, setQrScanResult] = useState(null);

  // ────────────────────────────────────────────────
  // Data Loading
  // ────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (["overview", "users", "wallets"].includes(activeTab)) {
        const res = await getAllUsers();
        setUsers(res.data || []);
      }

      if (["overview", "plays"].includes(activeTab)) {
        const res = await getPlays();
        setPlays(res.data || []);
      }

      if (activeTab === "topups") {
        const res = await getPendingTopups();
        setTopupRequests(res.data || []);
      }

      if (activeTab === "leaderboard") {
        const res = await getLeaderboard();
        setLeaderboard(res.data || []);
      }
    } catch (err) {
      console.error("ADMIN LOAD ERROR:", err);
      alert("Failed to load data. Check console.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ────────────────────────────────────────────────
  // Action helper with loading & error handling
  // ────────────────────────────────────────────────

  const runAction = async (actionFn, successMessage) => {
    setActionLoading(true);
    try {
      await actionFn();
      alert(successMessage);
      await loadData();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "Operation failed";
      alert(`Error: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  // QR Scanner (camera) – only when attendance tab is active
  // ────────────────────────────────────────────────

  useEffect(() => {
    let scanner = null;

    if (activeTab === "attendance") {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
          disableFlip: false,
          rememberLastUsedCamera: true,
          showZoom: true,
        },
        false // verbose = false
      );

      scanner.render(
        (decodedText) => {
          try {
            // Case 1: JSON format
            let parsed;
            try {
              parsed = JSON.parse(decodedText.trim());
            } catch {
              // Case 2: "user_id:reg-no" pattern
              const [user_id, reg_no] = decodedText.split(":").map(s => s.trim());
              if (user_id && reg_no) {
                parsed = { user_id, reg_no };
              }
            }

            if (!parsed || !parsed.user_id || !parsed.reg_no) {
              alert("Invalid QR format.\nExpected: JSON or user_id:reg-no");
              return;
            }

            setQrScanResult(decodedText);

            runAction(
              () => markAttendance(parsed),
              "Attendance marked successfully (camera scan)"
            );

            // Optional: pause scanning for a few seconds after success
            scanner.pause();
            setTimeout(() => scanner.resume(), 5000);

          } catch (err) {
            console.error("QR parse/attendance error:", err);
          }
        },
        (err) => {
          // Ignore most scan errors (normal behavior)
          if (err?.startsWith?.("No MultiFormat Readers")) return;
          console.debug("Scan debug:", err);
        }
      );
    }

    return () => {
      if (scanner) {
        scanner
          .clear()
          .catch((err) => console.warn("Scanner clear failed:", err));
      }
    };
  }, [activeTab, runAction]);

  // ────────────────────────────────────────────────
  // Other handlers (create user, stall, topup, etc.)
  // ────────────────────────────────────────────────

  const handleCreateUser = (e) => {
    e.preventDefault();
    runAction(() => createUser(newUser), "User created");
    setNewUser({ username: "", password: "", name: "", role: "visitor" });
  };

  const handleCreateStall = (e) => {
    e.preventDefault();
    runAction(() => createStall(newStall), "Stall created");
    setNewStall({ username: "", password: "", price: 10 });
  };

  const handleTopup = (e) => {
    e.preventDefault();
    runAction(() => adminTopup(topupData), `Top-up of ${topupData.amount} successful`);
    setTopupData({ username: "", adminname: "admin", amount: 50 });
  };

  const handleFreezeWallet = (walletId) => {
    if (!window.confirm("Freeze wallet?")) return;
    runAction(() => freezeWallet(walletId), "Wallet frozen");
  };

  const handleApproveTopup = (id) => {
    runAction(() => approveTopup(id), "Top-up approved");
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const valid = res.data.filter(row => row.username && row.password);
        setCsvUsers(valid);
      },
    });
  };

  const handleBulkUpload = () => {
    if (!csvUsers.length) return alert("No valid users in CSV");
    if (!window.confirm(`Create ${csvUsers.length} users?`)) return;
    runAction(() => bulkUsers(csvUsers), `Created ${csvUsers.length} users`);
    setCsvUsers([]);
    setCsvFileName("");
  };

  const handleAttendanceSubmit = (e) => {
    e.preventDefault();
    if (!attendanceData.user_id || !attendanceData.reg_no) return alert("Fill both fields");
    runAction(() => markAttendance(attendanceData), "Attendance marked");
    setAttendanceData({ user_id: "", reg_no: "" });
  };

  const handleQRSubmit = () => {
    try {
      const parsed = JSON.parse(qrInput.trim());
      if (!parsed.user_id || !parsed.reg_no) throw new Error();
      runAction(() => markAttendance(parsed), "Attendance marked (manual paste)");
      setQrInput("");
    } catch {
      alert("Invalid JSON format");
    }
  };

  const filteredUsers = users.filter(u =>
    (u.username || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.role || "").toLowerCase().includes(userSearch.toLowerCase())
  );

  const isBusy = loading || actionLoading;

  // ────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <h1>👑 Admin Dashboard</h1>

      <div style={{ margin: "20px 0", display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {["overview", "users", "wallets", "attendance", "plays", "topups", "leaderboard", "create"].map(tab => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab(tab)}
            disabled={isBusy}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {isBusy && <p style={{ color: "#666" }}>Processing...</p>}

      {/* ──────────────────────────────────────────────── */}
      {/* OVERVIEW */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
          <div className="card stat-card"><h4>Total Users</h4><p className="stat-number">{users.length}</p></div>
          <div className="card stat-card"><h4>Total Plays</h4><p className="stat-number">{plays.length}</p></div>
          <div className="card stat-card"><h4>Pending Top-ups</h4><p className="stat-number">{topupRequests.length}</p></div>
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* USERS */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="card">
          <h3>👤 Users</h3>
          <input
            className="input"
            placeholder="Search username or role..."
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            disabled={isBusy}
            style={{ marginBottom: 16, maxWidth: 400 }}
          />
          <table className="table">
            <thead><tr><th>Username</th><th>Role</th><th>Created</th></tr></thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id || u.username}>
                  <td>{u.username}</td>
                  <td>{u.role}</td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* WALLETS */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "wallets" && (
        <div className="card">
          <h3>💳 Wallets</h3>
          <table className="table">
            <thead><tr><th>User</th><th>Role</th><th>Balance</th><th>Action</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id || u.username}>
                  <td>{u.username}</td>
                  <td>{u.role}</td>
                  <td>{u.balance != null ? `${u.balance} pts` : "—"}</td>
                  <td>
                    {u.wallet_id && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleFreezeWallet(u.wallet_id)}
                        disabled={isBusy}
                      >
                        Freeze
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* PLAYS */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "plays" && (
        <div className="card">
          <h3>🎮 Plays</h3>
          <table className="table">
            <thead><tr><th>Visitor Wallet</th><th>Score</th><th>Date</th></tr></thead>
            <tbody>
              {plays.map(p => (
                <tr key={p.id}>
                  <td>{p.visitor_wallet || "—"}</td>
                  <td>{p.score ?? "Pending"}</td>
                  <td>{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* TOPUPS */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "topups" && (
        <div className="card">
          <h3>💰 Pending Top-ups</h3>
          {topupRequests.length === 0 ? (
            <p>No pending requests</p>
          ) : (
            topupRequests.map(r => (
              <div key={r.id} style={{ margin: "12px 0", padding: "10px", border: "1px solid #ddd", borderRadius: 6 }}>
                <strong>{r.username || "?"}</strong> — {r.amount} pts
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleApproveTopup(r.id)}
                  disabled={isBusy}
                  style={{ marginLeft: 16 }}
                >
                  Approve
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* LEADERBOARD */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "leaderboard" && (
        <div className="card">
          <h3>🏆 Leaderboard</h3>
          <table className="table">
            <thead><tr><th>Rank</th><th>User</th><th>Total Score</th><th>Plays</th></tr></thead>
            <tbody>
              {leaderboard.map((l, i) => (
                <tr key={l.user_id}>
                  <td>#{i + 1}</td>
                  <td>{l.username}</td>
                  <td>{l.total_score}</td>
                  <td>{l.total_plays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* ATTENDANCE – with camera scanner */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "attendance" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Manual */}
          <div className="card">
            <h3>📝 Manual Attendance</h3>
            <form onSubmit={handleAttendanceSubmit}>
              <input
                className="input"
                placeholder="User ID"
                value={attendanceData.user_id}
                onChange={e => setAttendanceData({ ...attendanceData, user_id: e.target.value })}
                disabled={isBusy}
                required
              />
              <input
                className="input"
                placeholder="Registration No"
                value={attendanceData.reg_no}
                onChange={e => setAttendanceData({ ...attendanceData, reg_no: e.target.value })}
                disabled={isBusy}
                required
              />
              <button className="btn" type="submit" disabled={isBusy}>
                {actionLoading ? "Marking..." : "Mark Attendance"}
              </button>
            </form>
          </div>

          {/* QR Camera + fallback paste */}
          <div className="card">
            <h3>📷 QR Attendance (Live Camera)</h3>

            {qrScanResult && (
              <div style={{ padding: 12, background: "#e6ffe6", borderRadius: 6, marginBottom: 16 }}>
                <strong>Last scan:</strong> {qrScanResult}
              </div>
            )}

            <div id="qr-reader" style={{ width: "100%", maxWidth: 420, margin: "0 auto 16px" }}></div>

            <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
              Position QR code in frame.<br />
              Supported: <code>{"{user_id:..., reg_no:...}"}</code> or <code>user_id:reg-no</code>
            </p>

            {/* Manual paste fallback */}
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>Or paste content:</p>
              <textarea
                className="input"
                rows={3}
                placeholder='{"user_id":"abc123","reg_no":"REG2025-001"}  or  abc123:REG2025-001'
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
                disabled={isBusy}
              />
              <button
                className="btn btn-success"
                onClick={handleQRSubmit}
                disabled={isBusy || !qrInput.trim()}
                style={{ marginTop: 12 }}
              >
                Process Pasted Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* CREATE */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "create" && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          <div className="card">
            <h3>Create User</h3>
            <form onSubmit={handleCreateUser}>
              <input className="input" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} disabled={isBusy} required />
              <input className="input" type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} disabled={isBusy} required />
              <input className="input" placeholder="Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} disabled={isBusy} />
              <select className="input" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} disabled={isBusy}>
                <option value="visitor">Visitor</option>
                <option value="admin">Admin</option>
                <option value="stall">Stall</option>
              </select>
              <button className="btn" type="submit" disabled={isBusy}>
                {actionLoading ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>

          <div className="card">
            <h3>Create Stall</h3>
            <form onSubmit={handleCreateStall}>
              <input className="input" placeholder="Username" value={newStall.username} onChange={e => setNewStall({...newStall, username: e.target.value})} disabled={isBusy} required />
              <input className="input" type="password" placeholder="Password" value={newStall.password} onChange={e => setNewStall({...newStall, password: e.target.value})} disabled={isBusy} required />
              <input className="input" type="number" placeholder="Price per play" value={newStall.price} onChange={e => setNewStall({...newStall, price: Number(e.target.value)||10})} disabled={isBusy} min="1" />
              <button className="btn" type="submit" disabled={isBusy}>
                {actionLoading ? "Creating..." : "Create Stall"}
              </button>
            </form>
          </div>

          <div className="card">
            <h3>📤 Bulk User Upload (CSV)</h3>
            <input type="file" accept=".csv" onChange={handleCSVUpload} disabled={isBusy} />
            {csvFileName && <p style={{margin: "8px 0"}}>Selected: {csvFileName}</p>}
            {csvUsers.length > 0 && (
              <div style={{marginTop: 16}}>
                <p>{csvUsers.length} valid rows</p>
                <button className="btn btn-success" onClick={handleBulkUpload} disabled={isBusy}>
                  Upload {csvUsers.length} Users
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;