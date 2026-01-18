"""
Admin routes:
- login
- create users
- create stalls
- topup
- freeze wallet
- view data
"""

from flask import Blueprint, request, jsonify
import bcrypt

from supabase_client import supabase
from auth import require_auth, generate_token

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/login", methods=["POST"])
def admin_login():
    data = request.json

    user = supabase.table("users") \
        .select("*") \
        .eq("username", data["username"]) \
        .eq("role", "admin") \
        .single().execute().data

    if not user or not bcrypt.checkpw(
        data["password"].encode(),
        user["password_hash"].encode()
    ):
        return jsonify({"error": "Invalid credentials"}), 401

    token = generate_token(user["id"], user["role"], user["username"])
    return jsonify({"token": token})


@admin_bp.route("/create-user", methods=["POST"])
@require_auth(["admin"])
def create_user():
    """
    Creates visitor (default) or admin user
    """
    data = request.json

    hashed = bcrypt.hashpw(
        data["password"].encode(),
        bcrypt.gensalt()
    ).decode()

    user = supabase.table("users").insert({
        "username": data["username"],
        "password_hash": hashed,
        "role": data.get("role", "visitor")
    }).execute().data[0]

    wallet = supabase.table("wallets").insert({
        "user_id": user["id"],
        "user_name": data["name"],
        "balance": 100 if user["role"] == "visitor" else 0
    }).execute().data[0]

    return jsonify({
        "user_id": user["id"],
        "wallet_id": wallet["id"]
    })


@admin_bp.route("/create-stall", methods=["POST"])
@require_auth(["admin"])
def create_stall():
    """
    Creates stall user + wallet + stall config
    """
    data = request.json

    hashed = bcrypt.hashpw(
        data["stall_password"].encode(),
        bcrypt.gensalt()
    ).decode()

    user = supabase.table("users").insert({
        "username": data["stall_username"],
        "password_hash": hashed,
        "role": "stall"
    }).execute().data[0]

    wallet = supabase.table("wallets").insert({
        "user_id": user["id"],
        "user_name": data["stall_name"],
        "balance": 0
    }).execute().data[0]

    stall = supabase.table("stalls").insert({
        "stall_name": data["stall_name"],
        "wallet_id": wallet["id"],
        "price_per_play": data["price_per_play"],
        "reward_multiplier": data["reward_multiplier"]
    }).execute().data[0]

    return jsonify({"stall_id": stall["id"]})


@admin_bp.route("/topup", methods=["POST"])
@require_auth(["admin"])
def admin_topup():
    """
    Uses RPC: admin_topup
    """
    data = request.json

    result = supabase.rpc("admin_topup", {
        "p_admin_wallet": data["admin_wallet"],
        "p_target_wallet": data["target_wallet"],
        "p_amount": data["amount"]
    }).execute()

    return jsonify(result.data)


@admin_bp.route("/freeze/<wallet_id>", methods=["POST"])
@require_auth(["admin"])
def freeze_wallet(wallet_id):
    supabase.table("wallets") \
        .update({"is_active": False}) \
        .eq("id", wallet_id) \
        .execute()

    return jsonify({"success": True})
