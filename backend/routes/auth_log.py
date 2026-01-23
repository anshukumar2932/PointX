"""
Auth routes:
- login
- logout
- me
"""

from flask import request, jsonify
from flask_smorest import Blueprint
from marshmallow import Schema, fields
import bcrypt

from supabase_client import supabase
from auth import require_auth, generate_token


auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth",
    description="Authentication and session routes"
)

# =========================
# Swagger Schemas
# =========================

class LoginRequestSchema(Schema):
    """Login request payload"""
    username = fields.Str(required=True, metadata={"example": "admin"})
    password = fields.Str(required=True, metadata={"example": "password123"})


class LoginResponseSchema(Schema):
    """Successful login response"""
    token = fields.Str(metadata={"example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."})
    role = fields.Str(metadata={"example": "admin"})


class LogoutResponseSchema(Schema):
    success = fields.Boolean(metadata={"example": True})


class MeResponseSchema(Schema):
    username = fields.Str(metadata={"example": "admin"})
    role = fields.Str(metadata={"example": "admin"})



# =========================
# Routes
# =========================

@auth_bp.route("/login", methods=["POST"])
@auth_bp.arguments(LoginRequestSchema)
@auth_bp.response(200, LoginResponseSchema)
def login(data):
    """
    Login with username and password.
    Returns JWT token on success.
    """

    # NOTE: logic unchanged, only `data` now comes from schema
    try:
        res = supabase.table("users") \
            .select("id,username,password_hash,role") \
            .eq("username", data["username"]) \
            .execute()
    except Exception:
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

    return {
        "token": token,
        "role": user["role"]
    }


@auth_bp.route("/logout", methods=["POST"])
@auth_bp.response(200, LogoutResponseSchema)
@require_auth()
def logout():
    """
    Logout endpoint (client-side token discard).
    """
    return {"success": True}


@auth_bp.route("/me", methods=["GET"])
@auth_bp.response(200, MeResponseSchema)
@require_auth()
def me():
    """
    Get current logged-in user details.
    """
    return {
        "user_id": request.user["id"],
        "username": request.user["username"],
        "role": request.user["role"]
    }
