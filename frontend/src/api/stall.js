import api from "./axios";

export const startGame = (visitor_wallet) => {
  return api.post("/stall/play", { visitor_wallet });
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

export const getWallet = () => {
  return api.get("/stall/wallet");
};
