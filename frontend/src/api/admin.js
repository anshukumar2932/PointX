import api from "./axios";

/* =====================================================
   👤 USERS
===================================================== */

/**
 * Create visitor / admin / stall user
 * POST /api/admin/create-user
 */
export const createUser = (data) => {
  return api.post("/admin/create-user", data);
};

/**
 * Create stall (stall user + wallet + config)
 * POST /api/admin/create-stall
 */
export const createStall = (data) => {
  return api.post("/admin/create-stall", data);
};

/**
 * Bulk create users (CSV upload)
 * POST /api/admin/bulk-users
 */
export const bulkUsers = (users) => {
  return api.post("/admin/bulk-users", users);
};

/**
 * Get all users
 * GET /api/admin/users
 */
export const getAllUsers = () => {
  return api.get("/admin/users");
};

/* =====================================================
   💳 WALLET / TOPUP
===================================================== */

/**
 * Admin manual topup
 * POST /api/admin/topup
 */
export const adminTopup = (data) => {
  return api.post("/admin/topup", data);
};

/**
 * Freeze wallet
 * POST /api/admin/freeze/<wallet_id>
 */
export const freezeWallet = (walletId) => {
  return api.post(`/admin/freeze/${walletId}`);
};

/**
 * Get pending topup requests
 * GET /api/admin/topup-requests
 */
export const getPendingTopups = () => {
  return api.get("/admin/topup-requests");
};

/**
 * Approve topup request
 * POST /api/admin/topup-approve
 */
export const approveTopup = (requestId) => {
  return api.post("/admin/topup-approve", {
    request_id: requestId,
  });
};

/* =====================================================
   🎮 PLAYS / TRANSACTIONS
===================================================== */

/**
 * Get all play transactions
 * GET /api/admin/plays
 */
export const getPlays = () => {
  return api.get("/admin/plays");
};

/* =====================================================
   🧾 ATTENDANCE
===================================================== */

/**
 * Mark attendance
 * POST /api/admin/attendance
 */
export const markAttendance = (data) => {
  return api.post("/admin/attendance", data);
};

/* =====================================================
   🏆 LEADERBOARD
===================================================== */

/**
 * Get leaderboard (admin allowed)
 * GET /api/visitor/leaderboard
 */
export const getLeaderboard = () => {
  return api.get("/visitor/leaderboard");
};


export const getWallets = () => api.get("/admin/wallets");

export const getTransactions = () => api.get("/admin/transactions");
