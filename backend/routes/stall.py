"""
Stall routes:
- login
- start game
- submit score
- view plays
"""

from flask import Blueprint, request, jsonify
import bcrypt

from supabase_client import supabase
from auth import require_auth, generate_token

stall_bp = Blueprint("stall", __name__)


@stall_bp.route("/login", methods=["POST"])
def stall_login():
    data = request.json

    user = supabase.table("users") \
        .select("*") \
        .eq("username", data["username"]) \
        .eq("role", "stall") \
        .single().execute().data

    if not user or not bcrypt.checkpw(
        data["password"].encode(),
        user["password_hash"].encode()
    ):
        return jsonify({"error": "Invalid credentials"}), 401

    token = generate_token(user["id"], user["role"], user["username"])
    return jsonify({"token": token})


@stall_bp.route("/play", methods=["POST"])
@require_auth(["stall"])
def start_game():
    """
    Uses RPC: start_game_play
    """
    data = request.json

    result = supabase.rpc("start_game_play", {
        "p_visitor_wallet": data["visitor_wallet"],
        "p_stall_id": data["stall_id"],
        "p_price_per_play": data["price"]
    }).execute()

    return jsonify(result.data)


@stall_bp.route("/submit-score", methods=["POST"])
@require_auth(["stall"])
def submit_score():
    """
    Uses RPC: submit_game_score
    """
    data = request.json

    result = supabase.rpc("submit_game_score", {
        "p_play_id": data["play_id"],
        "p_score": data["score"],
        "p_stall_user_id": request.user["uid"]
    }).execute()

    return jsonify(result.data)
