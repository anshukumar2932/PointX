import React, { useMemo, useState } from "react";
import api from "../api/axios";

const formatError = (error) => {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    "Unknown error"
  );
};

const readLocalUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const QRDebugger = ({ mode, selectedStallId }) => {
  const [testResult, setTestResult] = useState("");
  const [loading, setLoading] = useState(false);
  const localUser = useMemo(() => readLocalUser(), []);

  const append = (line = "") => {
    setTestResult((prev) => `${prev}${line}\n`);
  };

  const runOperatorChecks = async (stallHint) => {
    append("[operator] checking active stalls...");
    const activeStallsRes = await api.get("/stall/my-active-stalls");
    const activeStalls = activeStallsRes.data || [];
    append(`[operator] active stalls: ${activeStalls.length}`);

    const targetStallId = stallHint || activeStalls[0]?.stall_id;
    if (!targetStallId) {
      append("[operator] no active stall found for wallet/debug checks");
      return;
    }

    append(`[operator] selected stall_id: ${targetStallId}`);

    const walletRes = await api.get("/stall/wallet", {
      params: { stall_id: targetStallId },
    });
    append(
      `[operator] wallet: balance=${walletRes.data?.balance}, is_active=${walletRes.data?.is_active}`
    );

    const pendingRes = await api.get("/stall/pending-games", {
      params: { stall_id: targetStallId },
    });
    append(`[operator] pending games: ${(pendingRes.data || []).length}`);

    const debugRes = await api.get("/stall/debug", {
      params: { stall_id: targetStallId },
    });
    append(
      `[operator] debug selected_wallet: ${JSON.stringify(debugRes.data?.selected_wallet || null)}`
    );
  };

  const runVisitorChecks = async () => {
    append("[visitor] checking wallet...");
    const walletRes = await api.get("/visitor/wallet");
    append(
      `[visitor] wallet: balance=${walletRes.data?.balance}, is_active=${walletRes.data?.is_active}`
    );

    append("[visitor] checking topup debug endpoint...");
    try {
      const topupRes = await api.get("/visitor/debug/topup");
      append(`[visitor] /visitor/debug/topup: ${topupRes.status}`);
      append(JSON.stringify(topupRes.data, null, 2));
    } catch (error) {
      if (error?.response?.status === 404) {
        const fallbackRes = await api.get("/visitor/topup-test");
        append(`[visitor] fallback /visitor/topup-test: ${fallbackRes.status}`);
        append(JSON.stringify(fallbackRes.data, null, 2));
      } else {
        throw error;
      }
    }
  };

  const runAdminChecks = async () => {
    append("[admin] checking storage debug...");
    const myUserId = localUser?.user_id;
    const storageRes = await api.get("/admin/storage-debug", {
      params: myUserId ? { user_id: myUserId } : {},
    });
    append(`[admin] /admin/storage-debug: ${storageRes.status}`);
    append(
      `[admin] target_user_id=${storageRes.data?.target_user_id}, payments_bucket=${storageRes.data?.bucket_info?.payments_exists}`
    );

    append("[admin] checking wallet inventory...");
    const walletsRes = await api.get("/admin/wallets");
    const wallets = walletsRes.data || [];
    const stallWallets = wallets.filter((w) => !w.user_id);
    const frozenStallWallets = stallWallets.filter((w) => w.is_active === false);
    append(
      `[admin] stall wallets: total=${stallWallets.length}, frozen=${frozenStallWallets.length}`
    );
  };

  const testAPIConnection = async () => {
    setLoading(true);
    setTestResult("Running debug checks...\n");

    let resolvedRole = mode || localUser?.role || "unknown";

    try {
      append("[core] checking /health...");
      const healthRes = await api.get("/health");
      append(`[core] /health: ${healthRes.status}`);

      append("[core] checking /debug...");
      const debugRes = await api.get("/debug");
      append(`[core] /debug: ${debugRes.status}`);

      append("[core] checking /auth/me...");
      try {
        const meRes = await api.get("/auth/me");
        append(`[core] /auth/me: ${meRes.status}`);
        append(`[core] authenticated as ${meRes.data?.username} (${meRes.data?.role})`);
        resolvedRole = mode || meRes.data?.role || resolvedRole;
      } catch (error) {
        append(
          `[core] /auth/me failed: ${error.response?.status || "network"} - ${formatError(error)}`
        );
      }

      append(`[core] debugger role mode: ${resolvedRole}`);
      if (resolvedRole === "operator") {
        await runOperatorChecks(selectedStallId);
      } else if (resolvedRole === "admin") {
        await runAdminChecks();
      } else if (resolvedRole === "visitor") {
        await runVisitorChecks();
      } else {
        append("[core] unknown role, running basic operator check attempt...");
        try {
          await runOperatorChecks(selectedStallId);
        } catch (error) {
          append(
            `[core] operator check attempt failed: ${error.response?.status || "network"} - ${formatError(error)}`
          );
        }
      }
    } catch (error) {
      append(
        `[fatal] debug run failed: ${error.response?.status || "network"} - ${formatError(error)}`
      );
    }

    append("");
    append("[client] configuration:");
    append(`baseURL=${api.defaults.baseURL}`);
    append(`token_present=${localStorage.getItem("token") ? "yes" : "no"}`);
    append(`local_user=${localStorage.getItem("user") || "missing"}`);
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h2>API Debugger</h2>
      <p>Checks the current role-specific debug routes and wallet status.</p>

      <button
        onClick={testAPIConnection}
        disabled={loading}
        style={{
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Running..." : "Run Debug Checks"}
      </button>

      {testResult && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#f8f9fa",
            border: "1px solid #dee2e6",
            borderRadius: "4px",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            fontSize: "14px",
          }}
        >
          {testResult}
        </div>
      )}

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#e7f3ff",
          borderRadius: "4px",
        }}
      >
        <h3>What this checks</h3>
        <ul>
          <li>Core connectivity: `/health`, `/debug`, `/auth/me`</li>
          <li>Operator: active stalls, selected stall wallet, pending games, `/stall/debug`</li>
          <li>Admin: storage debug and stall wallet frozen-count summary</li>
          <li>Visitor: wallet and topup debug dependencies</li>
        </ul>
      </div>
    </div>
  );
};

export default QRDebugger;
