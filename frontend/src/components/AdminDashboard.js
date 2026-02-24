import React, { useState, useEffect, useCallback } from "react";
import Papa from "papaparse";
import { Html5QrcodeScanner } from "html5-qrcode";
import QRDebugger from "./QRDebugger";
import ClubLoader from "./ClubLoader";
import api from "../api/axios";
import MessageAlert from "./MessageAlert";
import DashboardTabSwitcher from "./DashboardTabSwitcher";

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
  getStalls,
  assignOperator,
  removeOperator,
  activateOperator,
  deactivateOperator,
} from "../api/admin";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Message state
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // State for image preview modal
  const [previewImage, setPreviewImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Data
  const [users, setUsers] = useState([]);
  const [plays, setPlays] = useState([]);
  const [topupRequests, setTopupRequests] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stalls, setStalls] = useState([]);

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
    stall_name: "",
    price: 10,
    mode: "simple", // "simple" or "full"
    username: "",
    password: "",
    initial_operator_id: "",
  });

  const [topupData, setTopupData] = useState({
    username: "",
    adminname: "admin",
    amount: 50,
  });

  // CSV
  const [csvUsers, setCsvUsers] = useState([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [selectedCSVFile, setSelectedCSVFile] = useState(null);
  const [csvParsing, setCsvParsing] = useState(false);
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
  const attendanceScanStateRef = React.useRef({
    inFlight: false,
    lastKey: "",
    lastAt: 0,
    lastInvalidAt: 0,
  });

  // Operator Management
  const [operatorForm, setOperatorForm] = useState({
    stall_id: "",
    user_id: "",
  });

  // ────────────────────────────────────────────────
  // Data Loading
  // ────────────────────────────────────────────────

  const cacheRef = React.useRef({});
  const CACHE_MS = 30000; // 30 seconds

  const loadData = useCallback(async () => {
    // Check cache first
    if (cacheRef.current[activeTab] && 
        Date.now() - cacheRef.current[activeTab].time < CACHE_MS) {
      // Use cached data
      const cached = cacheRef.current[activeTab].data;
      if (cached.users) setUsers(cached.users);
      if (cached.plays) setPlays(cached.plays);
      if (cached.topupRequests) setTopupRequests(cached.topupRequests);
      if (cached.leaderboard) setLeaderboard(cached.leaderboard);
      if (cached.stalls) setStalls(cached.stalls);
      return;
    }

    setLoading(true);
    try {
      const loadedData = {};

      if (["overview", "users", "wallets"].includes(activeTab)) {
        // Get users with wallet data joined
        const usersRes = await getAllUsers();
        const walletsRes = await api.get("/admin/wallets");
        
        // Create wallet map for O(1) lookup instead of O(n²)
        const walletMap = Object.fromEntries(
          (walletsRes.data || []).map(w => [w.user_id, w])
        );
        
        // Join user data with wallet data in O(n) time
        const usersWithWallets = (usersRes.data || []).map(user => {
          const wallet = walletMap[user.id];
          return {
            ...user,
            balance: wallet?.balance || 0,
            wallet_id: wallet?.id,
            is_active: wallet?.is_active || false
          };
        });
        
        setUsers(usersWithWallets);
        loadedData.users = usersWithWallets;
      }

      if (["overview", "plays"].includes(activeTab)) {
        const res = await getPlays();
        setPlays(res.data || []);
        loadedData.plays = res.data || [];
      }

      if (activeTab === "topups") {
        const res = await getPendingTopups();
        setTopupRequests(res.data || []);
        loadedData.topupRequests = res.data || [];
      }

      if (activeTab === "leaderboard") {
        const res = await getLeaderboard();
        setLeaderboard(res.data || []);
        loadedData.leaderboard = res.data || [];
      }

      if (["overview", "users", "wallets", "operators"].includes(activeTab)) {
        const res = await getStalls();
        setStalls(res.data || []);
        loadedData.stalls = res.data || [];
      }

      // Cache the loaded data
      cacheRef.current[activeTab] = {
        time: Date.now(),
        data: loadedData
      };
    } catch (err) {
      setMessage("Failed to load data.");
      setMessageType("error");
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
      setMessage(successMessage);
      setMessageType("success");
      // Auto-hide success message after 5 seconds
      setTimeout(() => setMessage(""), 5000);
      // Clear cache for current tab to force refresh
      if (cacheRef.current[activeTab]) {
        delete cacheRef.current[activeTab];
      }
      await loadData();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "Operation failed";
      setMessage(msg);
      setMessageType("error");
    } finally {
      setActionLoading(false);
    }
  }, [loadData, activeTab]);

  // ────────────────────────────────────────────────
  // QR Scanner (camera) – only when attendance tab is active
  // ────────────────────────────────────────────────

  useEffect(() => {
    let scanner = null;
    let resumeTimer = null;

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
        async (decodedText) => {
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
              const now = Date.now();
              if (now - attendanceScanStateRef.current.lastInvalidAt > 1500) {
                attendanceScanStateRef.current.lastInvalidAt = now;
                setMessage("Invalid QR format. Expected: JSON or user_id:reg-no");
                setMessageType("error");
              }
              return;
            }

            const scanKey = `${parsed.user_id}:${parsed.reg_no}`;
            const now = Date.now();

            if (attendanceScanStateRef.current.inFlight) {
              return;
            }

            if (
              attendanceScanStateRef.current.lastKey === scanKey &&
              now - attendanceScanStateRef.current.lastAt < 7000
            ) {
              return;
            }

            attendanceScanStateRef.current.inFlight = true;
            attendanceScanStateRef.current.lastKey = scanKey;
            attendanceScanStateRef.current.lastAt = now;

            setQrScanResult(scanKey);
            scanner.pause();

            await runAction(
              () => markAttendance(parsed),
              "Attendance marked successfully (camera scan)"
            );

            resumeTimer = setTimeout(() => {
              scanner.resume();
            }, 5000);

          } catch (err) {
            // Ignore most scan errors (normal behavior)
          } finally {
            attendanceScanStateRef.current.inFlight = false;
          }
        },
        (err) => {
          // Ignore most scan errors (normal behavior)
          if (err?.startsWith?.("No MultiFormat Readers")) return;
        }
      );
    }

    return () => {
      if (resumeTimer) {
        clearTimeout(resumeTimer);
      }
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
    
    const payload = {
      stall_name: newStall.stall_name,
      price: newStall.price,
      create_user: newStall.mode === "full",
    };
    
    if (newStall.mode === "full") {
      payload.username = newStall.username;
      payload.password = newStall.password;
    } else if (newStall.initial_operator_id) {
      payload.initial_operator_id = newStall.initial_operator_id;
    }
    
    runAction(() => createStall(payload), "Stall created successfully");
    setNewStall({ 
      stall_name: "", 
      price: 10, 
      mode: "simple",
      username: "",
      password: "",
      initial_operator_id: "",
    });
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
      setMessage("No image available for this request");
      setMessageType("warning");
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
      let userId = null;
      try {
        userId = JSON.parse(localStorage.getItem("user") || "null")?.user_id;
      } catch (e) {
        userId = null;
      }
      const response = await api.get('/admin/storage-debug', {
        params: userId ? { user_id: userId } : {},
      });
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

  const VALID_ROLES = ['visitor', 'operator', 'admin'];
  const MIN_PASSWORD_LENGTH = 4;

  const cleanCSVValue = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  const optionalCSVValue = (value) => {
    const cleaned = cleanCSVValue(value);
    return cleaned === "" ? null : cleaned;
  };

  const getMissingCSVHeaders = (rows) => {
    const requiredHeaders = ['username', 'password', 'role'];
    const presentHeaders = Object.keys(rows?.[0] || {}).map((header) =>
      header.replace(/^\ufeff/, "").trim().toLowerCase()
    );
    return requiredHeaders.filter((header) => !presentHeaders.includes(header));
  };

  const validateUserData = (user, rowIndex) => {
    const errors = [];
    
    // Required fields
    if (!user.username) {
      errors.push(`Row ${rowIndex + 2}: Username is required`);
    }
    if (!user.password) {
      errors.push(`Row ${rowIndex + 2}: Password is required`);
    }
    if (!user.role) {
      errors.push(`Row ${rowIndex + 2}: Role is required`);
    }
    
    // Role validation
    if (user.role && !VALID_ROLES.includes(user.role)) {
      errors.push(`Row ${rowIndex + 2}: Invalid role "${user.role}". Must be: ${VALID_ROLES.join(', ')}`);
    }
    
    // Username format validation
    if (user.username && user.username.length < 3) {
      errors.push(`Row ${rowIndex + 2}: Username must be at least 3 characters`);
    }
    
    // Password validation
    if (user.password && user.password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`Row ${rowIndex + 2}: Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    
    return errors;
  };

  const processCSVData = (data) => {
    const validUsers = [];
    const allErrors = [];
    
    console.log('Processing CSV data. Total rows:', data.length);
    
    data.forEach((row, index) => {
      const rawPrice = cleanCSVValue(row.price);
      let normalizedPrice;
      const rowErrors = [];

      if (rawPrice !== '') {
        const parsedPrice = Number(rawPrice);
        if (!Number.isInteger(parsedPrice) || parsedPrice < 0) {
          rowErrors.push(`Row ${index + 2}: Price must be a non-negative whole number`);
        } else {
          normalizedPrice = parsedPrice;
        }
      }

      // Clean and normalize data
      const user = {
        username: cleanCSVValue(row.username),
        password: cleanCSVValue(row.password),
        role: cleanCSVValue(row.role).toLowerCase(),
        name: optionalCSVValue(row.name),
        price: normalizedPrice,
        stall_name: optionalCSVValue(row.stall_name)  // For operator assignment
      };
      
      // Skip fully empty rows
      if (!user.username && !user.password && !user.role && !user.name && user.price === undefined && !user.stall_name) {
        return;
      }

      const errors = [...rowErrors, ...validateUserData(user, index)];
      
      if (errors.length === 0) {
        validUsers.push(user);
      } else {
        allErrors.push(...errors);
      }
    });
    
    console.log('Valid users:', validUsers.length);
    console.log('Validation errors:', allErrors.length);
    
    setCsvUsers(validUsers);
    setCsvValidationErrors(allErrors);
    
    // Show alert if no valid users
    if (validUsers.length === 0 && allErrors.length > 0) {
      alert(`No valid users found. All ${data.length} rows have errors. Check the validation messages below.`);
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please select a .csv file");
      return;
    }

    setSelectedCSVFile(file);
    setCsvFileName(file.name);
    setCsvUsers([]);
    setCsvValidationErrors([]);
    setCsvParsing(false);

  };

  const parseSelectedCSV = () => {
    if (!selectedCSVFile) return;

    setCsvParsing(true);
    Papa.parse(selectedCSVFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.replace(/^\ufeff/, "").trim().toLowerCase(),
      complete: (res) => {
        if (res.errors.length > 0) {
          const errorMsg = `CSV parsing errors: ${res.errors.map(e => e.message).join(', ')}`;
          alert(errorMsg);
          console.error('CSV Parse Errors:', res.errors);
          setCsvParsing(false);
          return;
        }
        
        console.log('CSV parsed successfully. Rows:', res.data.length);
        console.log('Sample row:', res.data[0]);
        
        if (res.data.length === 0) {
          alert('CSV file is empty or has no valid data rows');
          setCsvParsing(false);
          return;
        }

        const missingHeaders = getMissingCSVHeaders(res.data);
        if (missingHeaders.length > 0) {
          alert(`Missing required CSV columns: ${missingHeaders.join(', ')}`);
          setCsvParsing(false);
          return;
        }
        
        processCSVData(res.data);
        setCsvParsing(false);
      },
      error: (error) => {
        alert(`Failed to parse CSV: ${error.message}`);
        console.error('CSV Parse Error:', error);
        setCsvParsing(false);
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
      transformHeader: (header) => header.replace(/^\ufeff/, "").trim().toLowerCase(),
      complete: (res) => {
        if (res.errors.length > 0) {
          alert(`Text parsing errors: ${res.errors.map(e => e.message).join(', ')}`);
          return;
        }
        if (res.data.length === 0) {
          alert('Text input is empty or has no valid data rows');
          return;
        }
        const missingHeaders = getMissingCSVHeaders(res.data);
        if (missingHeaders.length > 0) {
          alert(`Missing required CSV columns: ${missingHeaders.join(', ')}`);
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
      { username: 'visitor1', password: 'password123', role: 'visitor', name: 'John Doe', price: '', stall_name: '' },
      { username: 'visitor2', password: 'password456', role: 'visitor', name: 'Jane Smith', price: '', stall_name: '' },
      { username: 'operator1', password: 'oppass123', role: 'operator', name: 'Operator One', price: '', stall_name: 'Game Stall 1' },
      { username: 'operator2', password: 'oppass456', role: 'operator', name: 'Operator Two', price: '', stall_name: '' },
      { username: 'admin2', password: 'adminpass123', role: 'admin', name: 'Admin User', price: '', stall_name: '' }
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
    
    const usersPayload = csvUsers.map((user) => ({
      username: user.username,
      password: user.password,
      role: user.role,
      ...(user.name ? { name: user.name } : {}),
      ...(typeof user.price === 'number' ? { price: user.price } : {}),
      ...(user.stall_name ? { stall_name: user.stall_name } : {}),
    }));

    setActionLoading(true);
    try {
      const response = await bulkUsers(usersPayload);
      const result = response.data;
      
      // Show detailed results
      let message = `✅ Bulk Upload Complete!\n\n`;
      
      // Handle new response format
      if (result.users) {
        message += `✓ Successfully created: ${result.users.length} users\n`;
        
        // Show operator assignment results
        if (result.operator_assignments && result.operator_assignments.length > 0) {
          message += `\n📋 Operator Assignments:\n`;
          result.operator_assignments.forEach(assignment => {
            const statusIcon = assignment.status === 'assigned' ? '✓' : 
                              assignment.status === 'already_assigned' ? '⚠️' : '❌';
            message += `${statusIcon} ${assignment.operator} → ${assignment.stall} (${assignment.status})\n`;
          });
        }
      } else {
        // Legacy format support
        message += `✓ Successfully created: ${result.created_count || result.length} users\n`;
        
        if (result.error_count > 0) {
          message += `⚠️ Errors encountered: ${result.error_count}\n\n`;
          message += `Errors:\n${result.errors.slice(0, 5).join('\n')}`;
          if (result.errors.length > 5) {
            message += `\n... and ${result.errors.length - 5} more errors`;
          }
        }
      }
      
      alert(message);
      
      // Clear form after upload
      setCsvUsers([]);
      setCsvValidationErrors([]);
      setCsvFileName("");
      setSelectedCSVFile(null);
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

  const handleAssignOperator = (e) => {
    e.preventDefault();
    if (!operatorForm.stall_id || !operatorForm.user_id) {
      alert("Please select both stall and user");
      return;
    }
    runAction(
      () => assignOperator(operatorForm),
      "Operator assigned successfully"
    );
    setOperatorForm({ stall_id: "", user_id: "" });
  };

  const handleActivateOperator = (stallId, userId) => {
    runAction(
      () => activateOperator({ stall_id: stallId, user_id: userId }),
      "Operator activated"
    );
  };

  const handleDeactivateOperator = (stallId, userId, username) => {
    if (!window.confirm(`Deactivate ${username}?`)) return;
    runAction(
      () => deactivateOperator({ stall_id: stallId, user_id: userId }),
      "Operator deactivated"
    );
  };

  const handleRemoveOperator = (stallId, userId, username) => {
    if (!window.confirm(`Remove ${username} from this stall?`)) return;
    runAction(
      () => removeOperator({ stall_id: stallId, user_id: userId }),
      "Operator removed from stall"
    );
  };

  const operatorStallsByUserId = React.useMemo(() => {
    const map = {};
    (stalls || []).forEach((stall) => {
      (stall.operators || []).forEach((op) => {
        if (!op?.user_id) return;
        if (!map[op.user_id]) map[op.user_id] = [];
        map[op.user_id].push(stall.stall_name);
      });
    });
    return map;
  }, [stalls]);

  const getRoleDisplay = useCallback((user) => {
    const role = user?.role || "";
    if (role !== "operator") return role;

    const assigned = [...new Set(operatorStallsByUserId[user.id] || [])].filter(Boolean);
    if (assigned.length === 0) return "operator-unassigned";
    return `operator-${assigned.join(",")}`;
  }, [operatorStallsByUserId]);

  const searchText = userSearch.toLowerCase();
  const filteredUsers = users.filter((u) =>
    (u.username || "").toLowerCase().includes(searchText) ||
    getRoleDisplay(u).toLowerCase().includes(searchText)
  );

  const isBusy = loading || actionLoading;
  const adminTabs = React.useMemo(
    () => [
      { key: "overview", label: "Overview" },
      { key: "users", label: "Users" },
      { key: "wallets", label: "Wallets" },
      { key: "operators", label: "Operators" },
      { key: "attendance", label: "Attendance" },
      { key: "plays", label: "Plays" },
      { key: "topups", label: "Topups" },
      { key: "leaderboard", label: "Leaderboard" },
      { key: "create", label: "Create" },
      { key: "qr-debug", label: "QR Debug" },
    ],
    []
  );

  // ────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────

  return (
    <div className="container">
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">
          Admin Dashboard
        </h1>
        <div className="premium-badge">
          MASTER CONTROL
        </div>
      </div>

      <DashboardTabSwitcher
        activeTab={activeTab}
        tabs={adminTabs}
        onTabChange={setActiveTab}
        isBusy={isBusy}
        dialogLabel="Switch admin dashboard tab"
      />

      {message && (
        <MessageAlert 
          message={message} 
          type={messageType} 
          onClose={() => setMessage("")} 
        />
      )}

      {isBusy && <ClubLoader message="Processing..." />}

      {/* ──────────────────────────────────────────────── */}
      {/* OVERVIEW */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-3">
          <div className="stat-card">
            <div className="stat-card-label">Total Users</div>
            <div className="stat-card-value">{users.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Total Plays</div>
            <div className="stat-card-value">{plays.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Pending Top-ups</div>
            <div className="stat-card-value">{topupRequests.length}</div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* USERS */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="card club-pattern">
          <h3 className="card-title">Users</h3>
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
                      <span className={`badge badge-${u.role === 'admin' ? 'reward' : u.role === 'operator' ? 'payment' : 'topup'}`}>
                        {getRoleDisplay(u)}
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
        <div className="card club-pattern">
          <h3 className="card-title">Wallets</h3>
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
                      <span className={`badge badge-${u.role === 'admin' ? 'reward' : u.role === 'operator' ? 'payment' : 'topup'}`}>
                        {getRoleDisplay(u)}
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
        <div className="card club-pattern">
          <h3 className="card-title">Plays</h3>
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
        <div className="card club-pattern">
          <h3 className="card-title">Pending Top-ups</h3>
          
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
        <div className="card club-pattern">
          <h3 className="card-title">Leaderboard</h3>
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
      {/* OPERATORS */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "operators" && (
        <div className="grid grid-2">
          {/* Assign Operator Form */}
          <div className="card club-pattern">
            <h3 className="card-title">Assign Operator to Stall</h3>
            <form onSubmit={handleAssignOperator}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Select Stall:
              </label>
              <select
                className="input"
                value={operatorForm.stall_id}
                onChange={e => setOperatorForm({ ...operatorForm, stall_id: e.target.value })}
                disabled={isBusy}
                required
              >
                <option value="">-- Choose Stall --</option>
                {stalls.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.stall_name} (₹{s.price_per_play}/play)
                  </option>
                ))}
              </select>

              <label style={{ display: 'block', marginTop: '16px', marginBottom: '8px', fontWeight: 'bold' }}>
                Select User (Available Operators):
              </label>
              <select
                className="input"
                value={operatorForm.user_id}
                onChange={e => setOperatorForm({ ...operatorForm, user_id: e.target.value })}
                disabled={isBusy}
                required
              >
                <option value="">-- Choose User --</option>
                {users
                  .filter(u => {
                    // Only show operators who are NOT already assigned to any stall
                    if (u.role !== 'operator') return false;
                    
                    // Check if this user is already assigned to any stall
                    const isAssigned = stalls.some(stall => 
                      stall.operators && stall.operators.some(op => op.user_id === u.id)
                    );
                    
                    return !isAssigned;
                  })
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                    </option>
                  ))}
              </select>

              {users.filter(u => u.role === 'operator').length === 0 && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#991b1b'
                }}>
                  ⚠️ No operators found. Create operator users first in the "Create" tab.
                </div>
              )}

              {users.filter(u => {
                if (u.role !== 'operator') return false;
                const isAssigned = stalls.some(stall => 
                  stall.operators && stall.operators.some(op => op.user_id === u.id)
                );
                return !isAssigned;
              }).length === 0 && users.filter(u => u.role === 'operator').length > 0 && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fbbf24',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#92400e'
                }}>
                  ℹ️ All operators are already assigned. Remove an operator from a stall to reassign them.
                </div>
              )}

              <button className="btn btn-full mt-md" type="submit" disabled={isBusy}>
                {actionLoading ? "Assigning..." : "Assign Operator"}
              </button>
            </form>

            <div style={{
              marginTop: '20px',
              padding: '12px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '6px',
              fontSize: '13px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>ℹ️ How It Works</h4>
              <ul style={{ margin: '0', paddingLeft: '20px' }}>
                <li><strong>One operator → One stall</strong> (exclusive assignment)</li>
                <li><strong>One stall → Many operators</strong> (multiple staff)</li>
                <li><strong>Multiple operators can be active</strong> simultaneously</li>
                <li>Only active operators can start games</li>
                <li>Admin controls activation/deactivation</li>
              </ul>
            </div>
          </div>

          {/* Stalls List with Operators */}
          <div className="card club-pattern">
            <h3 className="card-title">Stalls & Operators</h3>
            {stalls.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                No stalls created yet
              </p>
            ) : (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {stalls.map(stall => (
                  <div
                    key={stall.id}
                    style={{
                      marginBottom: '16px',
                      padding: '16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <div style={{ marginBottom: '12px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#1f2937' }}>
                        {stall.stall_name}
                      </h4>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        Price: ₹{stall.price_per_play}/play | Balance: {stall.balance} pts
                      </div>
                    </div>

                    {stall.active_operators && stall.active_operators.length > 0 && (
                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: '#dcfce7',
                        border: '1px solid #22c55e',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        fontSize: '13px'
                      }}>
                        <strong style={{ color: '#15803d' }}>
                          🟢 Active Operators ({stall.active_operators.length}):
                        </strong>{' '}
                        <span style={{ color: '#166534' }}>
                          {stall.active_operators.join(', ')}
                        </span>
                      </div>
                    )}

                    {stall.operators && stall.operators.length > 0 ? (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>
                          Assigned Operators ({stall.operators.length}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {stall.operators.map(op => (
                            <div
                              key={op.user_id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                backgroundColor: op.is_active ? '#f0fdf4' : '#f9fafb',
                                border: op.is_active ? '1px solid #22c55e' : '1px solid #e5e7eb',
                                borderRadius: '4px',
                                fontSize: '13px'
                              }}
                            >
                              <div>
                                <strong>{op.username}</strong>
                                {op.is_active && (
                                  <span
                                    className="badge badge-success"
                                    style={{ marginLeft: '8px', fontSize: '10px' }}
                                  >
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {!op.is_active ? (
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => handleActivateOperator(stall.id, op.user_id)}
                                    disabled={isBusy}
                                    style={{ fontSize: '11px', padding: '4px 12px' }}
                                  >
                                    Activate
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleDeactivateOperator(stall.id, op.user_id, op.username)}
                                    disabled={isBusy}
                                    style={{ fontSize: '11px', padding: '4px 12px' }}
                                  >
                                    Deactivate
                                  </button>
                                )}
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleRemoveOperator(stall.id, op.user_id, op.username)}
                                  disabled={isBusy}
                                  style={{ fontSize: '11px', padding: '4px 12px' }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: '#991b1b'
                      }}>
                        ⚠️ No operators assigned yet
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────── */}
      {/* ATTENDANCE – with camera scanner */}
      {/* ──────────────────────────────────────────────── */}
      {activeTab === "attendance" && (
        <div className="grid grid-2">
          {/* QR Camera + fallback paste */}
          <div className="card club-pattern">
            <h3 className="card-title">QR Attendance (Live Camera)</h3>

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
          <div className="card club-pattern">
            <h3 className="card-title">Manual Attendance</h3>
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
          <div className="card club-pattern">
            <h3 className="card-title">Create User</h3>
            <form onSubmit={handleCreateUser}>
              <input className="input" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} disabled={isBusy} required />
              <input className="input" type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} disabled={isBusy} required />
              <input className="input" placeholder="Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} disabled={isBusy} />
              <select className="input" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} disabled={isBusy}>
                <option value="visitor">Visitor</option>
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
              </select>
              <button className="btn btn-full" type="submit" disabled={isBusy}>
                {actionLoading ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>

          <div className="card club-pattern">
            <h3 className="card-title">Create Stall</h3>
            
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '6px',
              fontSize: '13px'
            }}>
              <strong style={{ color: '#0369a1' }}>💡 Two Creation Modes:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li><strong>Simple:</strong> Create stall only, assign existing operators later</li>
                <li><strong>Full:</strong> Create stall + new operator user (legacy)</li>
              </ul>
            </div>
            
            <form onSubmit={handleCreateStall}>
              {/* Mode Selection */}
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Creation Mode:
              </label>
              <select 
                className="input" 
                value={newStall.mode} 
                onChange={e => setNewStall({...newStall, mode: e.target.value})} 
                disabled={isBusy}
                style={{ marginBottom: '16px' }}
              >
                <option value="simple">Simple (Recommended)</option>
                <option value="full">Full (Create with User)</option>
              </select>

              {/* Common Fields */}
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Stall Name:
              </label>
              <input 
                className="input" 
                placeholder="e.g., Ring Toss Game" 
                value={newStall.stall_name} 
                onChange={e => setNewStall({...newStall, stall_name: e.target.value})} 
                disabled={isBusy} 
                required 
              />

              <label style={{ display: 'block', marginTop: '12px', marginBottom: '8px', fontWeight: 'bold' }}>
                Price per Play:
              </label>
              <input 
                className="input" 
                type="number" 
                placeholder="10" 
                value={newStall.price} 
                onChange={e => setNewStall({...newStall, price: Number(e.target.value)||10})} 
                disabled={isBusy} 
                min="1" 
              />

              {/* Simple Mode: Optional Initial Operator */}
              {newStall.mode === "simple" && (
                <>
                  <label style={{ display: 'block', marginTop: '12px', marginBottom: '8px', fontWeight: 'bold' }}>
                    Initial Operator (Optional):
                  </label>
                  <select 
                    className="input" 
                    value={newStall.initial_operator_id} 
                    onChange={e => setNewStall({...newStall, initial_operator_id: e.target.value})} 
                    disabled={isBusy}
                  >
                    <option value="">-- Assign Later --</option>
                    {users
                      .filter(u => {
                        // Only show unassigned operators
                        if (u.role !== 'operator') return false;
                        const isAssigned = stalls.some(stall => 
                          stall.operators && stall.operators.some(op => op.user_id === u.id)
                        );
                        return !isAssigned;
                      })
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.username}
                        </option>
                      ))}
                  </select>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    You can assign operators later in the Operators tab
                  </div>
                </>
              )}

              {/* Full Mode: User Creation Fields */}
              {newStall.mode === "full" && (
                <>
                  <label style={{ display: 'block', marginTop: '12px', marginBottom: '8px', fontWeight: 'bold' }}>
                    Operator Username:
                  </label>
                  <input 
                    className="input" 
                    placeholder="operator_username" 
                    value={newStall.username} 
                    onChange={e => setNewStall({...newStall, username: e.target.value})} 
                    disabled={isBusy} 
                    required={newStall.mode === "full"}
                  />

                  <label style={{ display: 'block', marginTop: '12px', marginBottom: '8px', fontWeight: 'bold' }}>
                    Operator Password:
                  </label>
                  <input 
                    className="input" 
                    type="password" 
                    placeholder="password" 
                    value={newStall.password} 
                    onChange={e => setNewStall({...newStall, password: e.target.value})} 
                    disabled={isBusy} 
                    required={newStall.mode === "full"}
                  />
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Creates a new stall user and auto-assigns as operator
                  </div>
                </>
              )}

              <button className="btn btn-full mt-md" type="submit" disabled={isBusy}>
                {actionLoading ? "Creating..." : "Create Stall"}
              </button>
            </form>
          </div>

          <div className="card club-pattern">
            <h3 className="card-title">Bulk User Upload</h3>
            
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
                <strong>Optional:</strong> name, stall_name (for operators - assign to existing stall)
              </div>
              <p style={{ margin: '8px 0 0 0', color: '#0369a1' }}>
                <strong>Roles:</strong> visitor, operator, admin<br/>
                <strong>Note:</strong> Create stalls separately using "Create Stall" tab. Use stall_name to assign operators to existing stalls.
              </p>
            </div>

            {/* Sample Template */}
            <div style={{ marginBottom: '16px' }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={downloadSampleCSV}
                type="button"
                disabled={isBusy}
                style={{ marginRight: '8px' }}
              >
                📥 Download Sample CSV
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowBulkTextArea(!showBulkTextArea)}
                type="button"
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
                  placeholder={`username,password,role,name,price,stall_name
visitor1,pass123,visitor,John Doe,,
operator1,oppass,operator,Operator One,,Game Stall 1
operator2,oppass2,operator,Operator Two,,
admin2,adminpass,admin,Admin User,,`}
                  value={bulkTextInput}
                  onChange={(e) => setBulkTextInput(e.target.value)}
                  disabled={isBusy}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
                <button
                  className="btn btn-primary btn-sm mt-sm"
                  onClick={processBulkText}
                  type="button"
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
            <button
              className="btn btn-primary btn-sm mt-sm"
              onClick={parseSelectedCSV}
              type="button"
              disabled={isBusy || csvParsing || !selectedCSVFile}
            >
              {csvParsing ? "Reading CSV..." : "Read CSV File"}
            </button>
            <button
              className="btn btn-success btn-sm mt-sm"
              onClick={handleBulkUpload}
              type="button"
              disabled={isBusy || csvParsing || csvUsers.length === 0}
              style={{ marginLeft: '8px' }}
            >
              {actionLoading ? 'Submitting...' : `Submit ${csvUsers.length} Valid Users`}
            </button>
            {csvFileName && (
              <p className="mt-sm mb-sm" style={{ color: '#0369a1', fontWeight: 'bold' }}>
                📁 Selected: {csvFileName}
                {csvUsers.length === 0 && csvValidationErrors.length === 0 && !csvParsing && ' - Click "Read CSV File" to parse'}
                {csvParsing && ' - Processing...'}
                {!csvParsing && (csvUsers.length > 0 || csvValidationErrors.length > 0) && ` - Parsed: ${csvUsers.length} valid, ${csvValidationErrors.length} errors`}
              </p>
            )}
            
            {/* Show message if file selected but no valid users */}
            {csvFileName && csvUsers.length === 0 && csvValidationErrors.length > 0 && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#991b1b'
              }}>
                ⚠️ No valid users found in CSV. All rows have validation errors. Please check the errors below and fix your CSV file.
              </div>
            )}

            {csvValidationErrors.length > 0 && (
              <div style={{
                marginTop: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '12px'
              }}>
                <p style={{ margin: '0 0 8px 0', color: '#dc2626', fontWeight: 'bold' }}>
                  ⚠️ Validation Errors ({csvValidationErrors.length})
                </p>
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: '#fff',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #fecaca'
                }}>
                  <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '12px', color: '#dc2626' }}>
                    {csvValidationErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
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
                            <span className={`badge badge-${user.role === 'admin' ? 'reward' : user.role === 'operator' ? 'payment' : 'topup'}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>{user.name || '-'}</td>
                          <td>-</td>
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
        <QRDebugger mode="admin" />
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
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}
        onClick={closeImagePreview}
        >
          {/* Close Button - Fixed outside scrollable area */}
          <button
            onClick={closeImagePreview}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: '#dc2626',
              color: 'white',
              border: '3px solid white',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              cursor: 'pointer',
              fontSize: '28px',
              fontWeight: '900',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#991b1b';
              e.target.style.transform = 'scale(1.15) rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#dc2626';
              e.target.style.transform = 'scale(1) rotate(0deg)';
            }}
          >
            ×
          </button>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 10px 50px rgba(0, 0, 0, 0.5)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            
            <h3 style={{ 
              marginBottom: '20px',
              color: '#1f2937',
              fontSize: '20px',
              fontWeight: '700'
            }}>Payment Proof</h3>
            
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
