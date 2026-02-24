import api from "./axios";

export const startGame = (visitor_wallet, stall_id) => {
  return api.post("/stall/play", { visitor_wallet, stall_id });
};

export const submitScore = (transaction_id, score) => {
  return api.post("/stall/submit-score", {
    transaction_id,
    score,
  });
};

export const getHistory = () => {
  return api.get("/stall/history");
};

export const getWallet = (stall_id) => {
  return api.get("/stall/wallet", {
    params: stall_id ? { stall_id } : {},
  });
};

export const getStallDebug = (stall_id) => {
  return api.get("/stall/debug", {
    params: stall_id ? { stall_id } : {},
  });
};
