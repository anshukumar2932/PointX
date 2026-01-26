"""
Stall routes:
- login
- start game
- submit score
- view plays
"""

from flask import  request, jsonify
from flask_smorest import Blueprint

from supabase_client import supabase
from auth import require_auth, generate_token


stall_bp = Blueprint("stall", __name__)

@stall_bp.route("/play", methods=["POST"])
@require_auth(["stall"])
def start_game():
    data = request.json

    if "visitor_wallet" not in data:
        return jsonify({"error": "visitor_wallet required"}), 400

    stall_user_id = request.user["id"]

    # 1️⃣ Get stall wallet from user_id
    wallet_res = supabase.table("wallets") \
        .select("id") \
        .eq("user_id", stall_user_id) \
        .execute()
    if not wallet_res.data:
        return jsonify({"error": "Stall wallet not found"}), 404

    stall_wallet_id = wallet_res.data[0]["id"]
    # 2️⃣ Get stall using wallet_id
    stall_res = supabase.table("stalls") \
        .select("id") \
        .eq("wallet_id", stall_wallet_id) \
        .execute()

    if not stall_res.data:
        return jsonify({"error": "Stall not found"}), 404

    stall_id = stall_res.data[0]["id"]

    # 3️⃣ Call RPC to start game
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
    # 1️⃣ Get stall wallet
    wallet_res = supabase.table("wallets") \
        .select("id") \
        .eq("user_id", stall_user_id) \
        .execute()

    if not wallet_res.data:
        return jsonify({"error": "Stall wallet not found"}), 404

    stall_wallet_id = wallet_res.data[0]["id"]

    # 2️⃣ Get stall via wallet_id
    stall_res = supabase.table("stalls") \
        .select("id") \
        .eq("wallet_id", stall_wallet_id) \
        .execute()

    if not stall_res.data:
        return jsonify({"error": "Stall not found"}), 404

    stall_id = stall_res.data[0]["id"]

    # 3️⃣ Fetch transactions with visitor username
    res = supabase.table("transactions") \
        .select("id, from_wallet, to_wallet, points_amount, score, type, created_at") \
        .eq("stall_id", stall_id) \
        .order("created_at", desc=True) \
        .execute()

    # 4️⃣ Enrich with visitor usernames
    enriched_transactions = []
    for tx in res.data:
        # Get visitor username from wallet
        if tx.get("from_wallet"):
            visitor_wallet_res = supabase.table("wallets") \
                .select("username") \
                .eq("id", tx["from_wallet"]) \
                .execute()
            
            visitor_username = visitor_wallet_res.data[0]["username"] if visitor_wallet_res.data else "Unknown"
        else:
            visitor_username = "Unknown"
        
        enriched_tx = {
            **tx,
            "visitor_username": visitor_username,
            "is_pending": tx.get("score") is None  # Add pending status
        }
        enriched_transactions.append(enriched_tx)

    return jsonify(enriched_transactions), 200


@stall_bp.route("/pending-games", methods=["GET"])
@require_auth(["stall"])
def pending_games():
    """Get all pending games (transactions without scores) for this stall"""
    stall_user_id = request.user["id"]
    
    # Get stall wallet
    wallet_res = supabase.table("wallets") \
        .select("id") \
        .eq("user_id", stall_user_id) \
        .execute()

    if not wallet_res.data:
        return jsonify({"error": "Stall wallet not found"}), 404

    stall_wallet_id = wallet_res.data[0]["id"]

    # Get stall via wallet_id
    stall_res = supabase.table("stalls") \
        .select("id") \
        .eq("wallet_id", stall_wallet_id) \
        .execute()

    if not stall_res.data:
        return jsonify({"error": "Stall not found"}), 404

    stall_id = stall_res.data[0]["id"]

    # Fetch pending transactions (score is null)
    res = supabase.table("transactions") \
        .select("id, from_wallet, to_wallet, points_amount, score, type, created_at") \
        .eq("stall_id", stall_id) \
        .eq("type", "play") \
        .is_("score", "null") \
        .order("created_at", desc=True) \
        .execute()

    # Enrich with visitor usernames
    pending_games = []
    for tx in res.data:
        # Get visitor username from wallet
        if tx.get("from_wallet"):
            visitor_wallet_res = supabase.table("wallets") \
                .select("username") \
                .eq("id", tx["from_wallet"]) \
                .execute()
            
            visitor_username = visitor_wallet_res.data[0]["username"] if visitor_wallet_res.data else "Unknown"
        else:
            visitor_username = "Unknown"
        
        pending_game = {
            **tx,
            "visitor_username": visitor_username,
            "time_elapsed": tx["created_at"]  # Frontend can calculate elapsed time
        }
        pending_games.append(pending_game)

    return jsonify(pending_games), 200


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

    # 1️⃣ Get wallet of stall user
    wallet_res = supabase.table("wallets") \
        .select("id, balance, is_active") \
        .eq("user_id", stall_user_id) \
        .execute()

    if not wallet_res.data:
        return jsonify({"error": "Stall wallet not found"}), 404

    wallet = wallet_res.data[0]

    # 2️⃣ Ensure this wallet is actually a stall
    stall_res = supabase.table("stalls") \
        .select("id") \
        .eq("wallet_id", wallet["id"]) \
        .execute()

    if not stall_res.data:
        return jsonify({"error": "Stall not found"}), 404

    # 3️⃣ Return wallet info
    return jsonify({
        "wallet_id": wallet["id"],
        "balance": wallet["balance"],
        "is_active": wallet["is_active"]
    }), 200

