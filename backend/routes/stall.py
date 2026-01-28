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
import httpx
import time

from postgrest.exceptions import APIError

stall_bp = Blueprint("stall", __name__)

def safe_execute(query, retries=3, delay=1):
    for attempt in range(retries):
        try:
            return query.execute()

        except httpx.RemoteProtocolError:
            if attempt == retries - 1:
                raise
            time.sleep(delay)
            delay *= 2

        except APIError:
            raise


@stall_bp.route("/play", methods=["POST"])
@require_auth(["stall"])
def start_game():
    data = request.json

    if "visitor_wallet" not in data:
        return jsonify({"error": "visitor_wallet required"}), 400

    visitor_wallet_id = data["visitor_wallet"]
    stall_user_id = request.user["id"]

    visitor_wallet = safe_execute(supabase.table("wallets") \
        .select("balance, is_active") \
        .eq("id", visitor_wallet_id) \
        .single())
    if not visitor_wallet.data:
        return jsonify({"error": "Visitor wallet not found"}), 404

    if not visitor_wallet.data["is_active"]:
        return jsonify({"error": "Visitor wallet is frozen"}), 403

    if visitor_wallet.data["balance"] <= 0:
        return jsonify({"error": "Insufficient balance"}), 400

    active_game = safe_execute(supabase.table("transactions") \
        .select("id") \
        .eq("from_wallet", visitor_wallet_id) \
        .eq("type", "play") \
        .is_("score", "null") )
    if active_game.data:
        return jsonify({"error": "Visitor already has an active game"}), 409

    wallet_res = safe_execute(supabase.table("wallets") \
        .select("id") \
        .eq("user_id", stall_user_id) \
        .single())

    if not wallet_res.data:
        return jsonify({"error": "Stall wallet not found"}), 404

    stall_res = safe_execute(supabase.table("stalls") \
        .select("id") \
        .eq("wallet_id", wallet_res.data["id"]) \
        .single())

    if not stall_res.data:
        return jsonify({"error": "Stall not found"}), 404

    stall_id = stall_res.data["id"]

    result = safe_execute(supabase.rpc("start_game_play", {
        "p_visitor_wallet": visitor_wallet_id,
        "p_stall_id": stall_id
    }))
    if not result.data:
        return jsonify({"error": "Failed to start game"}), 500

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

    result = safe_execute(supabase.rpc("submit_game_score", {
        "p_transaction_id": data["transaction_id"],
        "p_score": data["score"]
    }))

    return jsonify(result.data), 200


@stall_bp.route("/history", methods=["GET"])
@require_auth(["stall"])
def history():
    result = safe_execute(
        supabase.rpc("get_stall_history", {
            "p_user_id": request.user["id"]
        })
    )
    return jsonify(result.data or []), 200

@stall_bp.route("/visitor-balance/<wallet_id>", methods=["GET"])
@require_auth(["stall"])
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
@require_auth(["stall"])
def wallet():
    stall_user_id = request.user["id"]
    wallet_res = safe_execute(supabase.table("wallets") \
        .select("id, balance, is_active") \
        .eq("user_id", stall_user_id) \
        )
    if not wallet_res.data:
        return jsonify({"error": "Stall wallet not found"}), 404

    wallet = wallet_res.data[0]
    stall_res = safe_execute(supabase.table("stalls") \
        .select("id") \
        .eq("wallet_id", wallet["id"]) )

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

    wallet_res = safe_execute(supabase.table("wallets") \
        .select("id") \
        .eq("user_id", stall_user_id) \
        .single() )

    if not wallet_res.data:
        return jsonify([]), 200

    stall_res = safe_execute(supabase.table("stalls") \
        .select("id") \
        .eq("wallet_id", wallet_res.data["id"]) \
        .single() \
        )

    if not stall_res.data:
        return jsonify([]), 200

    stall_id = stall_res.data["id"]

    tx_res = safe_execute(supabase.table("transactions") \
        .select("id, from_wallet, created_at") \
        .eq("stall_id", stall_id) \
        .eq("type", "play") \
        .is_("score", "null") \
        .order("created_at", desc=True) \
        )

    if not tx_res.data:
        return jsonify([]), 200

    wallet_ids = list({tx["from_wallet"] for tx in tx_res.data})

    wallet_res = safe_execute(supabase.table("wallets") \
        .select("id, username") \
        .in_("id", wallet_ids) )

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
