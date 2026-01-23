"""
JWT authentication + role-based authorization
"""

from functools import wraps
from flask import request, jsonify
import jwt
import os
from datetime import datetime, timedelta, timezone

JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret")
JWT_ALGORITHM = "HS256"
JWT_LEEWAY_SECONDS = 10  # small clock skew tolerance


def require_auth(roles=None):
    """
    Decorator to protect routes with JWT auth.
    Optionally restrict access by role.
    """
    roles = set(roles or [])

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")

            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid Authorization header"}), 401

            token = auth_header.split(" ", 1)[1].strip()

            try:
                payload = jwt.decode(
                    token,
                    JWT_SECRET,
                    algorithms=[JWT_ALGORITHM],
                    leeway=JWT_LEEWAY_SECONDS
                )
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token"}), 401

            # Attach user info to request context
            request.user = {
                "id": payload.get("uid"),
                "username": payload.get("username"),
                "role": payload.get("role")
            }

            # Role-based access control
            if roles and request.user["role"] not in roles:
                return jsonify({"error": "Forbidden"}), 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator


def generate_token(user_id, role, username, expires_minutes=300):
    """
    Generate a signed JWT token.
    """
    now = datetime.now(tz=timezone.utc)

    payload = {
        "uid": user_id,
        "username": username,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes)
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
