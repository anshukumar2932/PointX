"""
JWT authentication + role-based authorization
"""

from functools import wraps
from flask import request, jsonify
import jwt, os, datetime

JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret")

def require_auth(roles=None):
    roles = roles or []

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            header = request.headers.get("Authorization")

            if not header or not header.startswith("Bearer "):
                return jsonify({"error": "Missing token"}), 401

            try:
                token = header.split(" ")[1]
                payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                request.user = payload
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token"}), 401

            if roles and payload.get("role") not in roles:
                return jsonify({"error": "Forbidden"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def generate_token(user_id, role, username):
    payload = {
        "uid": user_id,
        "role": role,
        "username": username,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")
