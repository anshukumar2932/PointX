"""
Stall routes:
- my active stalls
- start game
- submit score
- view plays
"""

from flask import  request, jsonify
from flask_smorest import Blueprint
from supabase_client import supabase
from auth import require_auth
import httpx
import time

from postgrest.exceptions import APIError

stall_bp = Blueprint("stall", __name__)

def safe_execute(query, retries=3, delay=1):
    for attempt in range(retries):
        try:
            return query.execute()

        except (httpx.RemoteProtocolError, httpx.ConnectError) as e:
            if attempt == retries - 1:
                raise
            time.sleep(delay)
            delay *= 2 
            
        except httpx.TimeoutException:
            if attempt == retries - 1:
                raise
            time.sleep(delay)
            delay *= 2

        except APIError:
            raise

def normalize_wallet_active(is_active_value):
    """
    Legacy compatibility:
    treat NULL as active so old stall wallets do not appear frozen.
    Only explicit False is considered frozen.
    """
    return is_active_value is not False


@stall_bp.route("/my-active-stalls", methods=["GET"])
@require_auth(["operator"])
def my_active_stalls():
    """
    Get all stalls where the current user has an active session
    Returns: List of active stalls with details
    """
    user_id = request.user["id"]
    
    # Get active sessions with stall info
    sessions = safe_execute(
        supabase.table("stall_sessions")
        .select("stall_id, started_at, stalls(stall_name, price_per_play, wallet_id)")
        .eq("user_id", user_id)
        .eq("is_active", True)
    )
    
    active_stalls = []
    for s in (sessions.data or []):
        stall_info = s.get("stalls", {})
        active_stalls.append({
            "stall_id": s["stall_id"],
            "stall_name": stall_info.get("stall_name", "Unknown"),
            "price_per_play": stall_info.get("price_per_play", 10),
            "wallet_id": stall_info.get("wallet_id"),
            "started_at": s["started_at"]
        })
    
    return jsonify(active_stalls), 200


@stall_bp.route("/play", methods=["POST"])
@require_auth(["operator"])
def start_game():
    """
    Start a game for a visitor at a specific stall
    Requires: visitor_wallet, stall_id
    Validates: operator assignment and active session
    """
    data = request.json or {}
    
    if "visitor_wallet" not in data:
        return jsonify({"error": "visitor_wallet required"}), 400

    visitor_wallet_id = data["visitor_wallet"]
    stall_id = data.get("stall_id")

    # Backward compatibility for older clients:
    # if stall_id is not provided and operator has exactly one active stall,
    # auto-select that stall.
    if not stall_id:
        sessions = safe_execute(
            supabase.table("stall_sessions")
            .select("stall_id")
            .eq("user_id", request.user["id"])
            .eq("is_active", True)
        )

        active_sessions = sessions.data or []
        if len(active_sessions) == 1:
            stall_id = active_sessions[0]["stall_id"]
        elif len(active_sessions) == 0:
            return jsonify({"error": "No active stall session found. Ask admin to activate your stall."}), 403
        else:
            return jsonify({"error": "stall_id required when multiple active stalls exist"}), 400
    
    # Verify stall exists
    stall_res = safe_execute(
        supabase.table("stalls")
        .select("id, stall_name")
        .eq("id", stall_id)
        .single()
    )
    
    if not stall_res.data:
        return jsonify({"error": "Stall not found"}), 404
    
    # Check user is assigned to stall
    operator = safe_execute(
        supabase.table("stall_operators")
        .select("id")
        .eq("stall_id", stall_id)
        .eq("user_id", request.user["id"])
    )

    if not operator.data or len(operator.data) == 0:
        return jsonify({"error": "You are not assigned to this stall"}), 403

    # Check user has ACTIVE SESSION for this stall
    session = safe_execute(
        supabase.table("stall_sessions")
        .select("id")
        .eq("stall_id", stall_id)
        .eq("user_id", request.user["id"])
        .eq("is_active", True)
    )
    
    if not session.data or len(session.data) == 0:
        return jsonify({"error": "You are not active for this stall. Ask admin to activate you."}), 403

    # Validate visitor wallet
    visitor_wallet = safe_execute(
        supabase.table("wallets")
        .select("balance, is_active")
        .eq("id", visitor_wallet_id)
        .single()
    )
    
    if not visitor_wallet.data:
        return jsonify({"error": "Visitor wallet not found"}), 404

    if not visitor_wallet.data["is_active"]:
        return jsonify({"error": "Visitor wallet is frozen"}), 403

    if visitor_wallet.data["balance"] <= 0:
        return jsonify({"error": "Insufficient balance"}), 400

    # Check for active game
    active_game = safe_execute(
        supabase.table("transactions")
        .select("id")
        .eq("from_wallet", visitor_wallet_id)
        .eq("type", "play")
        .is_("score", "null")
    )
    
    if active_game.data and len(active_game.data) > 0:
        return jsonify({"error": "Visitor already has an active game"}), 409

    # Start game
    result = safe_execute(
        supabase.rpc("start_game_play", {
            "p_visitor_wallet": visitor_wallet_id,
            "p_stall_id": stall_id
        })
    )
    
    if not result.data:
        return jsonify({"error": "Failed to start game"}), 500

    return jsonify({
        "transaction_id": result.data["transaction_id"],
        "stall_name": stall_res.data["stall_name"],
        "status": "started"
    }), 201


@stall_bp.route("/submit-score", methods=["POST"])
@require_auth(["operator"])
def submit_score():
    data = request.json

    if "transaction_id" not in data or "score" not in data:
        return jsonify({"error": "transaction_id and score required"}), 400

    result = safe_execute(supabase.rpc("submit_game_score", {
        "p_transaction_id": data["transaction_id"],
        "p_score": data["score"]
    }))

    return jsonify(result.data), 200


@stall_bp.route("/history", methods=["GET"])
@require_auth(["operator"])
def history():
    """
    Get play history for operator's active stalls.
    Query param: stall_id (optional) - filter by specific active stall.
    """
    user_id = request.user["id"]
    stall_id_filter = request.args.get("stall_id")

    # Get active stalls for this operator
    sessions = safe_execute(
        supabase.table("stall_sessions")
        .select("stall_id")
        .eq("user_id", user_id)
        .eq("is_active", True)
    )

    if not sessions.data or len(sessions.data) == 0:
        return jsonify([]), 200

    active_stall_ids = [s["stall_id"] for s in sessions.data]

    # Filter by specific stall if provided
    if stall_id_filter:
        if stall_id_filter not in active_stall_ids:
            return jsonify({"error": "You are not active for this stall"}), 403
        active_stall_ids = [stall_id_filter]

    tx_res = safe_execute(
        supabase.table("transactions")
        .select("id, from_wallet, stall_id, score, points_amount, created_at")
        .in_("stall_id", active_stall_ids)
        .eq("type", "play")
        .order("created_at", desc=True)
        .limit(200)
    )

    if not tx_res.data or len(tx_res.data) == 0:
        return jsonify([]), 200

    # Get visitor usernames
    wallet_ids = list({tx["from_wallet"] for tx in tx_res.data if tx.get("from_wallet")})
    wallet_map = {}
    if wallet_ids:
        wallet_res = safe_execute(
            supabase.table("wallets")
            .select("id, username")
            .in_("id", wallet_ids)
        )
        wallet_map = {w["id"]: w["username"] for w in (wallet_res.data or [])}

    # Get stall names
    stall_res = safe_execute(
        supabase.table("stalls")
        .select("id, stall_name")
        .in_("id", active_stall_ids)
    )
    stall_map = {s["id"]: s["stall_name"] for s in (stall_res.data or [])}

    history_rows = []
    for tx in tx_res.data:
        points = tx.get("points_amount")
        history_rows.append({
            "id": tx["id"],  # legacy compatibility
            "transaction_id": tx["id"],
            "visitor_wallet": tx.get("from_wallet"),
            "visitor_username": wallet_map.get(tx.get("from_wallet"), "Unknown"),
            "stall_id": tx.get("stall_id"),
            "stall_name": stall_map.get(tx.get("stall_id"), "Unknown"),
            "score": tx.get("score"),
            "points": points if points is not None else 0,
            "points_amount": points if points is not None else 0,
            "created_at": tx.get("created_at")
        })

    return jsonify(history_rows), 200

@stall_bp.route("/visitor-balance/<wallet_id>", methods=["GET"])
@require_auth(["operator"])
def get_visitor_balance(wallet_id):
    """Get visitor balance by wallet ID for stall operators"""
    try:
        wallet_res = safe_execute(supabase.table("wallets") \
            .select("balance, username, is_active") \
            .eq("id", wallet_id) \
            .single())

        if not wallet_res.data:
            return jsonify({"error": "Visitor wallet not found"}), 404

        return jsonify({
            "balance": wallet_res.data["balance"],
            "username": wallet_res.data["username"],
            "is_active": wallet_res.data["is_active"]
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to fetch visitor balance"}), 500


@stall_bp.route("/wallet", methods=["GET"])
@require_auth(["operator"])
def wallet():
    """
    Get wallet info for operator's active stall.
    Query param: stall_id (optional)
      - If provided, returns wallet for that stall after active-session validation.
      - If omitted, auto-selects when exactly one active stall exists.
    Falls back to legacy operator wallet only when no active stall can be resolved.
    """
    user_id = request.user["id"]
    stall_id = request.args.get("stall_id")

    sessions = safe_execute(
        supabase.table("stall_sessions")
        .select("stall_id")
        .eq("user_id", user_id)
        .eq("is_active", True)
    )
    active_stall_ids = [s["stall_id"] for s in (sessions.data or [])]

    # Resolve stall context for modern operator flow
    if stall_id:
        if stall_id not in active_stall_ids:
            return jsonify({"error": "You are not active for this stall"}), 403
    else:
        if len(active_stall_ids) == 1:
            stall_id = active_stall_ids[0]
        elif len(active_stall_ids) > 1:
            return jsonify({"error": "stall_id required when multiple active stalls exist"}), 400

    if stall_id:
        stall_res = safe_execute(
            supabase.table("stalls")
            .select("id, stall_name, wallet_id")
            .eq("id", stall_id)
            .single()
        )

        if not stall_res.data:
            return jsonify({"error": "Stall not found"}), 404

        wallet_id = stall_res.data.get("wallet_id")
        if not wallet_id:
            return jsonify({"error": "Stall wallet not found"}), 404

        wallet_res = safe_execute(
            supabase.table("wallets")
            .select("id, balance, is_active")
            .eq("id", wallet_id)
            .single()
        )

        if not wallet_res.data:
            return jsonify({"error": "Stall wallet not found"}), 404

        return jsonify({
            "stall_id": stall_res.data["id"],
            "stall_name": stall_res.data["stall_name"],
            "wallet_id": wallet_res.data["id"],
            "balance": wallet_res.data["balance"],
            "is_active": normalize_wallet_active(wallet_res.data.get("is_active"))
        }), 200

    # Legacy fallback: direct operator wallet tied to user_id
    wallet_res = safe_execute(
        supabase.table("wallets")
        .select("id, balance, is_active")
        .eq("user_id", user_id)
    )

    if not wallet_res.data:
        return jsonify({"error": "No wallet found. Use /my-active-stalls to see your active stalls."}), 404

    wallet = wallet_res.data[0]
    return jsonify({
        "wallet_id": wallet["id"],
        "balance": wallet["balance"],
        "is_active": normalize_wallet_active(wallet.get("is_active"))
    }), 200

@stall_bp.route("/debug", methods=["GET"])
@require_auth(["operator"])
def debug_stall_context():
    """
    Debug endpoint for operator context:
    active stalls, selected stall, wallet status and pending games count.
    """
    user_id = request.user["id"]
    requested_stall_id = request.args.get("stall_id")

    sessions = safe_execute(
        supabase.table("stall_sessions")
        .select("stall_id, started_at, stalls(stall_name, price_per_play, wallet_id)")
        .eq("user_id", user_id)
        .eq("is_active", True)
    )
    session_rows = sessions.data or []

    active_stalls = []
    active_stall_ids = []
    for row in session_rows:
        stall_info = row.get("stalls", {})
        active_stall_ids.append(row["stall_id"])
        active_stalls.append({
            "stall_id": row["stall_id"],
            "stall_name": stall_info.get("stall_name", "Unknown"),
            "wallet_id": stall_info.get("wallet_id"),
            "price_per_play": stall_info.get("price_per_play", 10),
            "started_at": row.get("started_at")
        })

    selected_stall_id = None
    selection_error = None

    if requested_stall_id:
        if requested_stall_id in active_stall_ids:
            selected_stall_id = requested_stall_id
        else:
            selection_error = "Requested stall_id is not part of active operator sessions"
    elif len(active_stall_ids) == 1:
        selected_stall_id = active_stall_ids[0]

    selected_wallet = None
    pending_games_count = 0
    if selected_stall_id:
        stall_res = safe_execute(
            supabase.table("stalls")
            .select("id, stall_name, wallet_id")
            .eq("id", selected_stall_id)
            .single()
        )

        stall_data = stall_res.data or {}
        wallet_id = stall_data.get("wallet_id")

        if wallet_id:
            wallet_res = safe_execute(
                supabase.table("wallets")
                .select("id, balance, is_active")
                .eq("id", wallet_id)
                .single()
            )
            wallet_data = wallet_res.data or {}
            selected_wallet = {
                "wallet_id": wallet_data.get("id"),
                "balance": wallet_data.get("balance"),
                "raw_is_active": wallet_data.get("is_active"),
                "effective_is_active": normalize_wallet_active(wallet_data.get("is_active"))
            }

        pending_res = safe_execute(
            supabase.table("transactions")
            .select("id")
            .eq("stall_id", selected_stall_id)
            .eq("type", "play")
            .is_("score", "null")
        )
        pending_games_count = len(pending_res.data or [])

    return jsonify({
        "user_id": user_id,
        "requested_stall_id": requested_stall_id,
        "selected_stall_id": selected_stall_id,
        "selection_error": selection_error,
        "active_stall_count": len(active_stalls),
        "active_stalls": active_stalls,
        "selected_wallet": selected_wallet,
        "pending_games_count": pending_games_count
    }), 200

@stall_bp.route("/pending-games", methods=["GET"])
@require_auth(["operator"])
def pending_games():
    """
    Get pending games for operator's active stalls
    Query param: stall_id (optional) - filter by specific stall
    """
    user_id = request.user["id"]
    stall_id_filter = request.args.get("stall_id")
    
    # Get active stalls for this operator
    sessions = safe_execute(
        supabase.table("stall_sessions")
        .select("stall_id")
        .eq("user_id", user_id)
        .eq("is_active", True)
    )
    
    if not sessions.data or len(sessions.data) == 0:
        return jsonify([]), 200
    
    active_stall_ids = [s["stall_id"] for s in sessions.data]
    
    # Filter by specific stall if provided
    if stall_id_filter:
        if stall_id_filter not in active_stall_ids:
            return jsonify({"error": "You are not active for this stall"}), 403
        active_stall_ids = [stall_id_filter]
    
    # Get pending transactions for active stalls
    tx_res = safe_execute(
        supabase.table("transactions")
        .select("id, from_wallet, stall_id, created_at")
        .in_("stall_id", active_stall_ids)
        .eq("type", "play")
        .is_("score", "null")
        .order("created_at", desc=True)
    )

    if not tx_res.data or len(tx_res.data) == 0:
        return jsonify([]), 200

    # Get wallet info
    wallet_ids = list({tx["from_wallet"] for tx in tx_res.data})
    wallet_res = safe_execute(
        supabase.table("wallets")
        .select("id, username")
        .in_("id", wallet_ids)
    )
    wallet_map = {w["id"]: w["username"] for w in (wallet_res.data or [])}
    
    # Get stall info
    stall_res = safe_execute(
        supabase.table("stalls")
        .select("id, stall_name")
        .in_("id", active_stall_ids)
    )
    stall_map = {s["id"]: s["stall_name"] for s in (stall_res.data or [])}

    pending = []
    for tx in tx_res.data:
        pending.append({
            "id": tx["id"],  # legacy compatibility
            "transaction_id": tx["id"],
            "visitor_wallet": tx["from_wallet"],
            "visitor_username": wallet_map.get(tx["from_wallet"], "Unknown"),
            "stall_id": tx["stall_id"],
            "stall_name": stall_map.get(tx["stall_id"], "Unknown"),
            "created_at": tx["created_at"]
        })

    return jsonify(pending), 200
