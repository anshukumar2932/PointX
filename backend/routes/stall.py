"""
Stall routes:
- login
- start game
- submit score
- view plays
"""

from flask import  request, jsonify
from flask_smorest import Blueprint
import httpx

from supabase_client import supabase
from auth import require_auth


stall_bp = Blueprint("stall", __name__)

def safe_execute(query):
    try:
        return query.execute()
    except httpx.RemoteProtocolError:
        return None

@stall_bp.route("/play", methods=["POST"])
@require_auth(["stall"])
def start_game():
    data = request.json

    if "visitor_wallet" not in data:
        return jsonify({"error": "visitor_wallet required"}), 400

    stall_user_id = request.user["id"]

    wallet_res = supabase.table("wallets") \
        .select("id") \
        .eq("user_id", stall_user_id) \
        .execute()
    if not wallet_res.data:
        return jsonify({"error": "Stall wallet not found"}), 404

    stall_wallet_id = wallet_res.data[0]["id"]
    stall_res = supabase.table("stalls") \
        .select("id") \
        .eq("wallet_id", stall_wallet_id) \
        .execute()

    if not stall_res.data:
        return jsonify({"error": "Stall not found"}), 404

    stall_id = stall_res.data[0]["id"]

    result = supabase.rpc("start_game_play", {
        "p_visitor_wallet": data["visitor_wallet"],
        "p_stall_id": stall_id
    }).execute()

    if not result.data:
        return jsonify({"error": "Play failed"}), 500

    return jsonify({
        "transaction_id": result.data["transaction_id"],
        "status": "started"
    }), 201





@stall_bp.route("/submit-score", methods=["POST"])
@require_auth(["stall"])
def submit_score():
    data = request.json

    if "transaction_id" not in data or "score" not in data:
        return jsonify({"error": "transaction_id and score required"}), 400

    result = supabase.rpc("submit_game_score", {
        "p_transaction_id": data["transaction_id"],
        "p_score": data["score"]
    }).execute()

    return jsonify(result.data), 200



@stall_bp.route("/history", methods=["GET"])
@require_auth(["stall"])
def history():
    stall_user_id = request.user["id"]

    wallet_res = supabase.table("wallets") \
        .select("id") \
        .eq("user_id", stall_user_id) \
        .single() \
        .execute()

    if not wallet_res.data:
        return jsonify([]), 200

    stall_res = supabase.table("stalls") \
        .select("id") \
        .eq("wallet_id", wallet_res.data["id"]) \
        .single() \
        .execute()

    if not stall_res.data:
        return jsonify([]), 200

    stall_id = stall_res.data["id"]

    tx_res = supabase.table("transactions") \
        .select("""
            id,
            from_wallet,
            points_amount,
            score,
            created_at
        """) \
        .eq("stall_id", stall_id) \
        .eq("type", "play") \
        .order("created_at", desc=True) \
        .execute()

    if not tx_res.data:
        return jsonify([]), 200

    wallet_ids = list({tx["from_wallet"] for tx in tx_res.data})

    wallet_res = supabase.table("wallets") \
        .select("id, username") \
        .in_("id", wallet_ids) \
        .execute()

    wallet_map = {
        w["id"]: w["username"]
        for w in (wallet_res.data or [])
    }

    history = []
    for tx in tx_res.data:
        history.append({
            "transaction_id": tx["id"],
            "visitor_wallet": tx["from_wallet"],
            "visitor_username": wallet_map.get(tx["from_wallet"], "Unknown"),
            "points": tx["points_amount"],
            "score": tx["score"],
            "status": "pending" if tx["score"] is None else "completed",
            "created_at": tx["created_at"]
        })

    return jsonify(history), 200




@stall_bp.route("/visitor-balance/<wallet_id>", methods=["GET"])
@require_auth(["stall"])
def get_visitor_balance(wallet_id):
    """Get visitor balance by wallet ID for stall operators"""
    try:
        wallet_res = supabase.table("wallets") \
            .select("balance, username, is_active") \
            .eq("id", wallet_id) \
            .single() \
            .execute()

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
@require_auth(["stall"])
def wallet():
    stall_user_id = request.user["id"]

    wallet_res = supabase.table("wallets") \
        .select("id, balance, is_active") \
        .eq("user_id", stall_user_id) \
        .execute()

    if not wallet_res.data:
        return jsonify({"error": "Stall wallet not found"}), 404

    wallet = wallet_res.data[0]

    stall_res = supabase.table("stalls") \
        .select("id") \
        .eq("wallet_id", wallet["id"]) \
        .execute()

    if not stall_res.data:
        return jsonify({"error": "Stall not found"}), 404

    return jsonify({
        "wallet_id": wallet["id"],
        "balance": wallet["balance"],
        "is_active": wallet["is_active"]
    }), 200

@stall_bp.route("/pending-games", methods=["GET"])
@require_auth(["stall"])
def pending_games():
    stall_user_id = request.user["id"]

    wallet_res = supabase.table("wallets") \
        .select("id") \
        .eq("user_id", stall_user_id) \
        .single() \
        .execute()

    if not wallet_res.data:
        return jsonify([]), 200

    stall_res = supabase.table("stalls") \
        .select("id") \
        .eq("wallet_id", wallet_res.data["id"]) \
        .single() \
        .execute()

    if not stall_res.data:
        return jsonify([]), 200

    stall_id = stall_res.data["id"]

    tx_res = supabase.table("transactions") \
        .select("id, from_wallet, created_at") \
        .eq("stall_id", stall_id) \
        .eq("type", "play") \
        .is_("score", "null") \
        .order("created_at", desc=True) \
        .execute()

    if not tx_res.data:
        return jsonify([]), 200

    wallet_ids = list({tx["from_wallet"] for tx in tx_res.data})

    wallet_res = supabase.table("wallets") \
        .select("id, username") \
        .in_("id", wallet_ids) \
        .execute()

    wallet_map = {w["id"]: w["username"] for w in wallet_res.data or []}

    pending = []
    for tx in tx_res.data:
        pending.append({
            "transaction_id": tx["id"],
            "visitor_wallet": tx["from_wallet"],
            "visitor_username": wallet_map.get(tx["from_wallet"], "Unknown"),
            "created_at": tx["created_at"]
        })

    return jsonify(pending), 200
