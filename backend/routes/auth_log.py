"""
Auth routes:
- login
- logout
- me
"""

from flask import request, jsonify, current_app
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
    user_id = fields.Str(metadata={"example": "123e4567-e89b-12d3-a456-426614174000"})
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
    try:
        current_app.logger.info(
            "LOGIN ATTEMPT",
            extra={"username": data.get("username")}
        )

        res = (
            supabase
            .table("users")
            .select("id, username, password_hash, role")
            .eq("username", data["username"])
            .execute()
        )

        current_app.logger.debug("SUPABASE RESPONSE: %s", res.data)

    except Exception:
        current_app.logger.exception("DATABASE ERROR during login")
        return jsonify({"error": "Database error"}), 500

    if not res.data:
        current_app.logger.warning(
            "INVALID USERNAME",
            extra={"username": data.get("username")}
        )
        return jsonify({"error": "Invalid credentials"}), 401

    user = res.data[0]

    if not bcrypt.checkpw(
        data["password"].encode("utf-8"),
        user["password_hash"].encode("utf-8")
    ):
        current_app.logger.warning(
            "INVALID PASSWORD",
            extra={"username": data.get("username")}
        )
        return jsonify({"error": "Invalid credentials"}), 401

    token = generate_token(
        user["id"],
        user["role"],
        user["username"]
    )

    current_app.logger.info(
        "LOGIN SUCCESS",
        extra={"username": user["username"], "role": user["role"]}
    )

    return {
        "token": token,
        "role": user["role"]
    }


@auth_bp.route("/logout", methods=["POST"])
@auth_bp.response(200, LogoutResponseSchema)
@require_auth()
def logout():
    """Logout endpoint (client-side token discard)."""
    return {"success": True}


@auth_bp.route("/me", methods=["GET"])
@auth_bp.response(200, MeResponseSchema)
@require_auth()
def me():
    """Get current logged-in user details."""
    return {
        "user_id": request.user["id"],
        "username": request.user["username"],
        "role": request.user["role"]
    }
