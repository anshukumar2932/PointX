"""
Auth routes:
- login
- logout
- me
"""

from flask import Blueprint, request, jsonify
import bcrypt

from supabase_client import supabase
from auth import require_auth, generate_token


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data or "username" not in data or "password" not in data:
        return jsonify({"error": "Username and Password required"}), 400

    try:
        res = supabase.table("users") \
            .select("id,username,password_hash,role") \
            .eq("username", data["username"]) \
            .execute()
    except Exception as e:
        return jsonify({"error": "Database error"}), 500


    if not res.data:
        return jsonify({"error": "Invalid credentials"}), 401

    user = res.data[0]

    if not bcrypt.checkpw(
        data["password"].encode("utf-8"),
        user["password_hash"].encode("utf-8")
    ):
        return jsonify({"error": "Invalid credentials"}), 401

    token = generate_token(
        user["id"],
        user["role"],
        user["username"]
    )

    return jsonify({
        "token": token,
        "role": user["role"]
    })


@auth_bp.route("/logout", methods=["POST"])
@require_auth()
def logout():

    return jsonify({"success": True})

@auth_bp.route("/me",methods=["GET"])
@require_auth()
def me():

    return jsonify({
        "username":request.user["username"],
        "role":request.user["role"]
    })
    