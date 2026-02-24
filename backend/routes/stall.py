"""
Stall routes:
- my active stalls
- start game
- submit score
- view plays
"""

from flask import  request, jsonify
from flask_smorest import Blueprint
import httpx
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
    data = request.json
    
    if "visitor_wallet" not in data:
        return jsonify({"error": "visitor_wallet required"}), 400
    
    if "stall_id" not in data:
        return jsonify({"error": "stall_id required"}), 400

    visitor_wallet_id = data["visitor_wallet"]
    stall_id = data["stall_id"]
    
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
    result = safe_execute(
        supabase.rpc("get_stall_history", {
            "p_user_id": request.user["id"]
        })
    )
    return jsonify(result.data or []), 200

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
    Get wallet info for operator's active stall(s)
    Note: This is deprecated - use /my-active-stalls instead
    """
    stall_user_id = request.user["id"]
    
    # Try to find wallet via user_id (legacy stall users)
    wallet_res = safe_execute(
        supabase.table("wallets")
        .select("id, balance, is_active")
        .eq("user_id", stall_user_id)
    )
    
    if not wallet_res.data or len(wallet_res.data) == 0:
        return jsonify({"error": "No wallet found. Use /my-active-stalls to see your active stalls."}), 404

    wallet = wallet_res.data[0]
    stall_res = safe_execute(
        supabase.table("stalls")
        .select("id")
        .eq("wallet_id", wallet["id"])
    )

    if not stall_res.data or len(stall_res.data) == 0:
        return jsonify({"error": "Stall not found"}), 404

    return jsonify({
        "wallet_id": wallet["id"],
        "balance": wallet["balance"],
        "is_active": wallet["is_active"]
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
            "transaction_id": tx["id"],
            "visitor_wallet": tx["from_wallet"],
            "visitor_username": wallet_map.get(tx["from_wallet"], "Unknown"),
            "stall_id": tx["stall_id"],
            "stall_name": stall_map.get(tx["stall_id"], "Unknown"),
            "created_at": tx["created_at"]
        })

    return jsonify(pending), 200
