import React, { useState, useEffect, useCallback } from "react";
import Papa from "papaparse";
import { Html5QrcodeScanner } from "html5-qrcode";
import QRDebugger from "./QRDebugger";
import api from "../api/axios";

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

  // State for image preview modal
  const [previewImage, setPreviewImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

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
  const [csvValidationErrors, setCsvValidationErrors] = useState([]);
  const [showBulkTextArea, setShowBulkTextArea] = useState(false);
  const [bulkTextInput, setBulkTextInput] = useState("");

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
        // Get users with wallet data joined
        const usersRes = await getAllUsers();
        const walletsRes = await api.get("/admin/wallets");
        
        // Join user data with wallet data
        const usersWithWallets = (usersRes.data || []).map(user => {
          const wallet = (walletsRes.data || []).find(w => w.user_id === user.id);
          return {
            ...user,
            balance: wallet?.balance || 0,
            wallet_id: wallet?.id,
            is_active: wallet?.is_active || false
          };
        });
        
        setUsers(usersWithWallets);
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
      alert("Failed to load data.");
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

  const runAction = useCallback(async (actionFn, successMessage) => {
    setActionLoading(true);
    try {
      await actionFn();
      alert(successMessage);
      await loadData();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "Operation failed";
      alert(`Error: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  }, [loadData]);

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
            // Ignore most scan errors (normal behavior)
          }
        },
        (err) => {
          // Ignore most scan errors (normal behavior)
          if (err?.startsWith?.("No MultiFormat Readers")) return;
        }
      );
    }

    return () => {
      if (scanner) {
        scanner
          .clear()
          .catch(() => {});
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

  const handlePreviewImage = async (imagePath) => {
    if (!imagePath) {
      alert("No image available for this request");
      return;
    }

    setImageLoading(true);
    try {
      // Get the signed URL or base64 data for the image from private bucket
      const response = await api.get(`/admin/topup-image/${encodeURIComponent(imagePath)}`);
      
      if (!response.data.url) {
        throw new Error("No URL returned from server");
      }
      
      setPreviewImage({
        url: response.data.url,
        path: imagePath,
        method: response.data.method || 'signed_url',
        expires_in: response.data.expires_in,
        size: response.data.size
      });
    } catch (error) {
      let errorMessage = "Failed to load image from private bucket. ";
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += "Please try again.";
      }
      
      // Show error in modal instead of alert for better UX
      setPreviewImage({
        url: null,
        path: imagePath,
        error: errorMessage
      });
    } finally {
      setImageLoading(false);
    }
  };

  const closeImagePreview = () => {
    setPreviewImage(null);
  };

  const debugStorage = async () => {
    try {
      const response = await api.get('/admin/storage-debug');
      alert(`Storage Debug Info:\n${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      alert(`Storage debug failed: ${error.response?.data?.error || error.message}`);
    }
  };


  // Handle keyboard events for image modal
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape' && previewImage) {
        closeImagePreview();
      }
    };

    if (previewImage) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [previewImage]);

  const validateUserData = (user, rowIndex) => {
    const errors = [];
    
    // Required fields
    if (!user.username || user.username.trim() === '') {
      errors.push(`Row ${rowIndex + 2}: Username is required`);
    }
    if (!user.password || user.password.trim() === '') {
      errors.push(`Row ${rowIndex + 2}: Password is required`);
    }
    if (!user.role || user.role.trim() === '') {
      errors.push(`Row ${rowIndex + 2}: Role is required`);
    }
    
    // Role validation
    const validRoles = ['visitor', 'stall', 'admin'];
    if (user.role && !validRoles.includes(user.role.toLowerCase())) {
      errors.push(`Row ${rowIndex + 2}: Invalid role "${user.role}". Must be: ${validRoles.join(', ')}`);
    }
    
    // Username format validation
    if (user.username && user.username.length < 3) {
      errors.push(`Row ${rowIndex + 2}: Username must be at least 3 characters`);
    }
    
    // Password validation
    if (user.password && user.password.length < 6) {
      errors.push(`Row ${rowIndex + 2}: Password must be at least 6 characters`);
    }
    
    // Stall-specific validation
    if (user.role === 'stall' && user.price && (isNaN(user.price) || user.price < 1)) {
      errors.push(`Row ${rowIndex + 2}: Stall price must be a number >= 1`);
    }
    
    return errors;
  };

  const processCSVData = (data) => {
    const validUsers = [];
    const allErrors = [];
    
    data.forEach((row, index) => {
      // Clean and normalize data
      const user = {
        username: row.username?.trim(),
        password: row.password?.trim(),
        role: row.role?.trim().toLowerCase(),
        name: row.name?.trim() || null,
        price: row.price ? parseInt(row.price) : (row.role?.toLowerCase() === 'stall' ? 10 : undefined)
      };
      
      const errors = validateUserData(user, index);
      
      if (errors.length === 0) {
        validUsers.push(user);
      } else {
        allErrors.push(...errors);
      }
    });
    
    setCsvUsers(validUsers);
    setCsvValidationErrors(allErrors);
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setCsvFileName(file.name);
    setCsvUsers([]);
    setCsvValidationErrors([]);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.errors.length > 0) {
          alert(`CSV parsing errors: ${res.errors.map(e => e.message).join(', ')}`);
          return;
        }
        processCSVData(res.data);
      },
      error: (error) => {
        alert(`Failed to parse CSV: ${error.message}`);
      }
    });
  };

  const processBulkText = () => {
    if (!bulkTextInput.trim()) return;
    
    setCsvUsers([]);
    setCsvValidationErrors([]);
    
    Papa.parse(bulkTextInput.trim(), {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.errors.length > 0) {
          alert(`Text parsing errors: ${res.errors.map(e => e.message).join(', ')}`);
          return;
        }
        processCSVData(res.data);
        setCsvFileName("Manual Text Input");
      },
      error: (error) => {
        alert(`Failed to parse text: ${error.message}`);
      }
    });
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      { username: 'visitor1', password: 'password123', role: 'visitor', name: 'John Doe', price: '' },
      { username: 'visitor2', password: 'password456', role: 'visitor', name: 'Jane Smith', price: '' },
      { username: 'stall1', password: 'stallpass123', role: 'stall', name: 'Game Stall 1', price: '15' },
      { username: 'stall2', password: 'stallpass456', role: 'stall', name: 'Game Stall 2', price: '20' },
      { username: 'admin2', password: 'adminpass123', role: 'admin', name: 'Admin User', price: '' }
    ];
    
    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'bulk_users_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async () => {
    if (!csvUsers.length) return alert("No valid users to create");
    if (!window.confirm(`Create ${csvUsers.length} users?`)) return;
    
    setActionLoading(true);
    try {
      const response = await bulkUsers(csvUsers);
      const result = response.data;
      
      // Show detailed results
      let message = `✅ Bulk Upload Complete!\n\n`;
      message += `✓ Successfully created: ${result.created_count} users\n`;
      
      if (result.error_count > 0) {
        message += `⚠️ Errors encountered: ${result.error_count}\n\n`;
        message += `Errors:\n${result.errors.slice(0, 5).join('\n')}`;
        if (result.errors.length > 5) {
          message += `\n... and ${result.errors.length - 5} more errors`;
        }
      }
      
      alert(message);
      
      // Clear form after upload
      setCsvUsers([]);
      setCsvValidationErrors([]);
      setCsvFileName("");
      setBulkTextInput("");
      setShowBulkTextArea(false);
      
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
      // Reload data
      await loadData();
      
    } catch (err) {
      const errorMsg = err?.response?.data?.error || 
                      err?.response?.data?.message || 
                      err.message || 
                      "Bulk upload failed";
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setActionLoading(false);
    }
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
    <div className="container">
      <h1 className="text-center mb-lg">Admin Dashboard</h1>

      <div className="tab-nav">
        {["overview", "users", "wallets", "attendance", "plays", "topups", "leaderboard", "create", "qr-debug"].map(tab => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
            disabled={isBusy}
          >
            {tab === "qr-debug" ? "QR Debug" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {isBusy && <div className="loading">Processing...</div>}

      {/* ──────────────────────────────────────────────── */}
      {/* OVERVIEW */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-3">
          <div className="card text-center">
            <h4 className="mb-sm">Total Users</h4>
            <div className="stat-value">{users.length}</div>
          </div>
          <div className="card text-center">
            <h4 className="mb-sm">Total Plays</h4>
            <div className="stat-value">{plays.length}</div>
          </div>
          <div className="card text-center">
            <h4 className="mb-sm">Pending Top-ups</h4>
            <div className="stat-value">{topupRequests.length}</div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* USERS */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="card">
          <h3 className="mb-md">Users</h3>
          <input
            className="input"
            placeholder="Search username or role..."
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            disabled={isBusy}
            style={{ marginBottom: 16, maxWidth: 400 }}
          />
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-mobile">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id || u.username}>
                    <td data-label="Username">{u.username}</td>
                    <td data-label="Role">
                      <span className={`badge badge-${u.role === 'admin' ? 'reward' : u.role === 'stall' ? 'payment' : 'topup'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td data-label="Created">{u.created_at ? new Date(u.created_at).toLocaleString() : "Not available"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* WALLETS */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "wallets" && (
        <div className="card">
          <h3 className="mb-md">Wallets</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-mobile">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Balance</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id || u.username}>
                    <td data-label="User">{u.username}</td>
                    <td data-label="Role">
                      <span className={`badge badge-${u.role === 'admin' ? 'reward' : u.role === 'stall' ? 'payment' : 'topup'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td data-label="Balance">
                      <span className="balance" style={{ fontSize: '16px', margin: 0 }}>
                        {u.balance != null ? `${u.balance} pts` : "No wallet"}
                      </span>
                      {!u.is_active && (
                        <span className="badge badge-danger" style={{ marginLeft: '8px', fontSize: '10px' }}>
                          FROZEN
                        </span>
                      )}
                    </td>
                    <td data-label="Action">
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
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* PLAYS */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "plays" && (
        <div className="card">
          <h3>Plays</h3>
          {plays.length === 0 ? (
            <div className="text-center p-lg" style={{ color: '#6b7280' }}>
              <p>No plays recorded yet</p>
              <p style={{ fontSize: '14px' }}>Games will appear here once visitors start playing</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-mobile">
                <thead>
                  <tr>
                    <th>Visitor</th>
                    <th>Stall</th>
                    <th>Score</th>
                    <th>Points</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {plays.map(p => (
                    <tr key={p.id}>
                      <td data-label="Visitor">
                        <div>
                          <strong>{p.visitor_username || "Unknown User"}</strong>
                          <br />
                          <small style={{ color: '#6b7280' }}>
                            {p.visitor_wallet_short || "No ID"}
                          </small>
                        </div>
                      </td>
                      <td data-label="Stall">{p.stall_username || "Unknown Stall"}</td>
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
                      <td data-label="Date">{new Date(p.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* TOPUPS */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "topups" && (
        <div className="card">
          <h3 className="mb-md">Pending Top-ups</h3>
          
          <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={debugStorage}
              disabled={isBusy}
              style={{ fontSize: '12px' }}
            >
              🔍 Debug Storage
            </button>
          </div>
          
          {topupRequests.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
              No pending topup requests
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-mobile">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Payment Proof</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topupRequests.map(r => (
                    <tr key={r.id}>
                      <td data-label="User">{r.username || "Unknown"}</td>
                      <td data-label="Amount">
                        <span className="balance" style={{ fontSize: '14px', margin: 0 }}>
                          {r.amount} pts
                        </span>
                      </td>
                      <td data-label="Date">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td data-label="Payment Proof">
                        {r.image_path ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handlePreviewImage(r.image_path)}
                            disabled={imageLoading}
                            style={{ fontSize: '12px' }}
                          >
                            {imageLoading ? 'Loading...' : 'View Image'}
                          </button>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>No image</span>
                        )}
                      </td>
                      <td data-label="Action">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApproveTopup(r.id)}
                          disabled={isBusy}
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* LEADERBOARD */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "leaderboard" && (
        <div className="card">
          <h3>Leaderboard</h3>
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
        <div className="grid grid-2">
          {/* QR Camera + fallback paste */}
          <div className="card">
            <h3 className="mb-md">QR Attendance (Live Camera)</h3>

            {qrScanResult && (
              <div className="success mb-md">
                <strong>Last scan:</strong> {qrScanResult}
              </div>
            )}

            <div className="scanner-container mb-md">
              <div id="qr-reader" style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}></div>
            </div>

            <p className="text-center mb-md" style={{ fontSize: 13, color: "#666" }}>
              Position QR code in frame.<br />
              Supported: <code>{"{user_id:..., reg_no:...}"}</code> or <code>user_id:reg-no</code>
            </p>

            {/* Manual paste fallback */}
            <div className="mt-md">
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
                className="btn btn-success btn-full mt-sm"
                onClick={handleQRSubmit}
                disabled={isBusy || !qrInput.trim()}
              >
                Process Pasted Text
              </button>
            </div>
          </div>

          {/* Manual */}
          <div className="card">
            <h3 className="mb-md">Manual Attendance</h3>
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
              <button className="btn btn-full" type="submit" disabled={isBusy}>
                {actionLoading ? "Marking..." : "Mark Attendance"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* CREATE */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "create" && (
        <div className="grid grid-auto">
          <div className="card">
            <h3 className="mb-md">Create User</h3>
            <form onSubmit={handleCreateUser}>
              <input className="input" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} disabled={isBusy} required />
              <input className="input" type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} disabled={isBusy} required />
              <input className="input" placeholder="Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} disabled={isBusy} />
              <select className="input" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} disabled={isBusy}>
                <option value="visitor">Visitor</option>
                <option value="admin">Admin</option>
                <option value="stall">Stall</option>
              </select>
              <button className="btn btn-full" type="submit" disabled={isBusy}>
                {actionLoading ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="mb-md">Create Stall</h3>
            <form onSubmit={handleCreateStall}>
              <input className="input" placeholder="Username" value={newStall.username} onChange={e => setNewStall({...newStall, username: e.target.value})} disabled={isBusy} required />
              <input className="input" type="password" placeholder="Password" value={newStall.password} onChange={e => setNewStall({...newStall, password: e.target.value})} disabled={isBusy} required />
              <input className="input" type="number" placeholder="Price per play" value={newStall.price} onChange={e => setNewStall({...newStall, price: Number(e.target.value)||10})} disabled={isBusy} min="1" />
              <button className="btn btn-full" type="submit" disabled={isBusy}>
                {actionLoading ? "Creating..." : "Create Stall"}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="mb-md">Bulk User Upload</h3>
            
            {/* Format Instructions */}
            <div style={{ 
              backgroundColor: '#f0f9ff', 
              border: '1px solid #0ea5e9', 
              borderRadius: '6px', 
              padding: '12px', 
              marginBottom: '16px',
              fontSize: '13px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>📋 CSV Format Requirements</h4>
              <p style={{ margin: '0 0 8px 0' }}>Your CSV file must include these columns (header row required):</p>
              <div style={{ 
                fontFamily: 'monospace', 
                backgroundColor: '#ffffff', 
                padding: '8px', 
                borderRadius: '4px',
                border: '1px solid #e0e7ff'
              }}>
                <strong>Required:</strong> username, password, role<br/>
                <strong>Optional:</strong> name, price (for stalls only)
              </div>
              <p style={{ margin: '8px 0 0 0', color: '#0369a1' }}>
                <strong>Roles:</strong> visitor, stall, admin
              </p>
            </div>

            {/* Sample Template */}
            <div style={{ marginBottom: '16px' }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={downloadSampleCSV}
                disabled={isBusy}
                style={{ marginRight: '8px' }}
              >
                📥 Download Sample CSV
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowBulkTextArea(!showBulkTextArea)}
                disabled={isBusy}
              >
                ✏️ Manual Text Entry
              </button>
            </div>

            {/* Manual Text Entry */}
            {showBulkTextArea && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Manual Entry (CSV Format):
                </label>
                <textarea
                  className="input"
                  rows={8}
                  placeholder={`username,password,role,name,price
visitor1,pass123,visitor,John Doe,
visitor2,pass456,visitor,Jane Smith,
stall1,stallpass,stall,Game Stall 1,15
admin2,adminpass,admin,Admin User,`}
                  value={bulkTextInput}
                  onChange={(e) => setBulkTextInput(e.target.value)}
                  disabled={isBusy}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
                <button
                  className="btn btn-primary btn-sm mt-sm"
                  onClick={processBulkText}
                  disabled={isBusy || !bulkTextInput.trim()}
                >
                  Parse Text Input
                </button>
              </div>
            )}

            {/* File Upload */}
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleCSVUpload} 
              disabled={isBusy} 
              className="input" 
            />
            {csvFileName && <p className="mt-sm mb-sm">📁 Selected: {csvFileName}</p>}
            
            {/* Validation Results */}
            {csvUsers.length > 0 && (
              <div className="mt-md">
                <div style={{ 
                  backgroundColor: '#f0fdf4', 
                  border: '1px solid #22c55e', 
                  borderRadius: '6px', 
                  padding: '12px', 
                  marginBottom: '12px' 
                }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#15803d' }}>✅ Validation Results</h4>
                  <p style={{ margin: '0' }}>
                    <strong>{csvUsers.length}</strong> valid users ready to create
                  </p>
                  {csvValidationErrors.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <p style={{ margin: '0 0 4px 0', color: '#dc2626' }}>
                        <strong>⚠️ {csvValidationErrors.length} rows skipped:</strong>
                      </p>
                      <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '12px', color: '#dc2626' }}>
                        {csvValidationErrors.slice(0, 5).map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                        {csvValidationErrors.length > 5 && (
                          <li>... and {csvValidationErrors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Preview Table */}
                <div style={{ marginBottom: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                  <table className="table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Name</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvUsers.slice(0, 10).map((user, i) => (
                        <tr key={i}>
                          <td>{user.username}</td>
                          <td>
                            <span className={`badge badge-${user.role === 'admin' ? 'reward' : user.role === 'stall' ? 'payment' : 'topup'}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>{user.name || '-'}</td>
                          <td>{user.role === 'stall' ? (user.price || 10) : '-'}</td>
                        </tr>
                      ))}
                      {csvUsers.length > 10 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: '#6b7280' }}>
                            ... and {csvUsers.length - 10} more users
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <button 
                  className="btn btn-success btn-full" 
                  onClick={handleBulkUpload} 
                  disabled={isBusy}
                >
                  {actionLoading ? 'Creating Users...' : `🚀 Create ${csvUsers.length} Users`}
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="mb-md">Admin Top-up</h3>
            <form onSubmit={handleTopup}>
              <input className="input" placeholder="Username" value={topupData.username} onChange={e => setTopupData({...topupData, username: e.target.value})} disabled={isBusy} required />
              <input className="input" type="number" placeholder="Amount" value={topupData.amount} onChange={e => setTopupData({...topupData, amount: Number(e.target.value)||50})} disabled={isBusy} min="1" />
              <button className="btn btn-full" type="submit" disabled={isBusy}>
                {actionLoading ? "Processing..." : "Top-up Wallet"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* QR DEBUG */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "qr-debug" && (
        <QRDebugger />
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* IMAGE PREVIEW MODAL */}
      {/* ──────────────────────────────────────────────── */}
      {previewImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={closeImagePreview}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeImagePreview}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
            
            <h3 style={{ marginBottom: '15px', paddingRight: '40px' }}>Payment Proof</h3>
            
            <div style={{ textAlign: 'center' }}>
              {previewImage.error ? (
                <div style={{ 
                  padding: '40px', 
                  color: '#dc2626',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px',
                  border: '1px solid #fecaca'
                }}>
                  <h4 style={{ marginBottom: '10px' }}>❌ Failed to Load Image</h4>
                  <p style={{ marginBottom: '15px' }}>{previewImage.error}</p>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6b7280',
                    backgroundColor: '#f9fafb',
                    padding: '10px',
                    borderRadius: '4px',
                    textAlign: 'left'
                  }}>
                    <strong>Debug Info:</strong><br/>
                    Path: {previewImage.path}<br/>
                    Bucket: payments (private)<br/>
                    Possible causes:<br/>
                    • File was not uploaded successfully<br/>
                    • Storage bucket permissions issue<br/>
                    • RLS (Row Level Security) blocking access<br/>
                    • File was deleted or moved<br/>
                    • Signed URL generation failed<br/>
                    <br/>
                    <strong>Try:</strong><br/>
                    • Use the "🔍 Debug Storage" button above<br/>
                    • Check Supabase dashboard for RLS policies<br/>
                    • Verify file exists in storage bucket
                  </div>
                </div>
              ) : previewImage.url ? (
                <img
                  src={previewImage.url}
                  alt="Payment proof"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px'
                  }}
                  onError={(e) => {
                    setPreviewImage(prev => ({
                      ...prev,
                      error: "Image failed to load from storage URL. The file may not exist or be corrupted."
                    }));
                  }}
                />
              ) : (
                <div style={{ padding: '40px', color: '#6b7280' }}>
                  <p>Loading image...</p>
                </div>
              )}
            </div>
            
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              backgroundColor: '#f9fafb', 
              borderRadius: '4px',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              <strong>Image Path:</strong> {previewImage.path}<br/>
              <strong>Bucket Type:</strong> Private (Secure Access)<br/>
              {previewImage.method && (
                <>
                  <strong>Access Method:</strong> {
                    previewImage.method === 'signed_url' ? 'Signed URL (Temporary)' :
                    previewImage.method === 'download_base64' ? 'Direct Download (Base64)' :
                    previewImage.method
                  }<br/>
                </>
              )}
              {previewImage.expires_in && (
                <>
                  <strong>URL Expires In:</strong> {Math.floor(previewImage.expires_in / 60)} minutes<br/>
                </>
              )}
              {previewImage.size && (
                <>
                  <strong>File Size:</strong> {(previewImage.size / 1024).toFixed(1)} KB<br/>
                </>
              )}
              {previewImage.url && !previewImage.url.startsWith('data:') && (
                <>
                  <strong>Temporary URL:</strong> <a href={previewImage.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                    Open in new tab
                  </a><br/>
                </>
              )}
              <small style={{ color: '#9ca3af', marginTop: '5px', display: 'block' }}>
                🔒 This image is stored in a private bucket for security
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;