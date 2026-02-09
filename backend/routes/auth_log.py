"""
Auth routes:
- login
- logout
- me
- google (OAuth)
"""

from flask import request, jsonify, current_app
from flask_smorest import Blueprint
from marshmallow import Schema, fields
import bcrypt
import os

from supabase_client import supabase
from auth import require_auth, generate_token

import re
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

# Regex to capture registration number from: name.2024btech0001@vitbhopal.ac.in
# Pattern: looks for anything after the first dot and before the @
VIT_EMAIL_REGEX = r"^[a-zA-Z]+\.([a-zA-Z0-9]+)@vitbhopal\.ac\.in$"


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

# =========================
# GOOGLE AUTHENTICATION 
# =========================

@auth_bp.route("/google", methods=["POST"])
def google_login():
    token = request.json.get("token")
    print(token)
    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        
        # 1. Internal Domain Check
        if idinfo.get('hd') != "vitbhopal.ac.in":
            return jsonify({"error": "Invalid credentials. Please use authorized email."}), 403

        email = idinfo['email']
        google_sub = idinfo['sub']
        print(email)
        # 2. Extract Registration Number via Regex
        match = re.match(VIT_EMAIL_REGEX, email)
        if not match:
            return jsonify({"error": "Invalid credentials. Please contact administrator."}), 400
        
        reg_no = match.group(1) # This is your '2024btech...'

        # 3. Database Sync Logic - Case insensitive search
        # Search by reg_no (since that's your unique internal identifier)
        res = supabase.table("users").select("*").eq("reg_no", reg_no).execute()
        
        # If not found, try case-insensitive search
        if not res.data:
            current_app.logger.info(f"Exact match not found, trying case-insensitive search for: {reg_no}")
            res = supabase.table("users").select("*").ilike("reg_no", reg_no).execute()
            if res.data:
                current_app.logger.info(f"Found user with case-insensitive match: {res.data[0].get('reg_no')}")

        if not res.data:
            current_app.logger.warning(f"Registration number not found in database: {reg_no}")
            return jsonify({
                "error": "Account not registered. Please contact your administrator."
            }), 401
        
        user = res.data[0]

        # 4. Link Google Sub if missing
        if not user.get("google_sub"):
            supabase.table("users").update({"google_sub": google_sub}).eq("id", user["id"]).execute()
            current_app.logger.info(f"Linked Google account for user: {reg_no}")

        # 5. Generate PointX Token
        pointx_token = generate_token(user["id"], user["role"], user["username"])
        
        return jsonify({
            "token": pointx_token, 
            "role": user["role"],
            "reg_no": reg_no
        }), 200

    except ValueError:
        return jsonify({"error": "Invalid Google token"}), 400