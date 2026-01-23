"""
Visitor routes:
- view wallet
- view stalls
"""

from flask import  jsonify,request
from flask_smorest import Blueprint

from supabase_client import supabase
from auth import require_auth, generate_token
from PIL import Image
import io
import time


def compress_image(
    file_bytes: bytes,
    max_width: int = 1280,
    quality: int = 65
) -> bytes:
    img = Image.open(io.BytesIO(file_bytes))

    # Convert to RGB (important for JPEG)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Resize if too wide
    if img.width > max_width:
        ratio = max_width / img.width
        new_size = (max_width, int(img.height * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    output = io.BytesIO()
    img.save(
        output,
        format="JPEG",
        quality=quality,
        optimize=True
    )
    return output.getvalue()

import hashlib

def hash_image(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


visitor_bp = Blueprint("visitor", __name__)


@visitor_bp.route("/wallet", methods=["GET"])
@require_auth(["visitor"])
def wallet():
    user_id = request.user["id"]

    wallet_res = supabase.table("wallets") \
        .select("balance, is_active") \
        .eq("user_id", user_id) \
        .single() \
        .execute()

    if not wallet_res.data:
        return jsonify({"error": "Wallet not found"}), 404

    return jsonify(wallet_res.data), 200



@visitor_bp.route("/history", methods=["GET"])
@require_auth(["visitor"])
def history():
    user_id = request.user["id"]

    res = supabase.table("wallets") \
        .select("id") \
        .eq("user_id", user_id) \
        .execute()

    if not res.data:
        return jsonify({"error": "Wallet not found"}), 404

    wallet_id = res.data[0]["id"]

    res = supabase.table("transactions") \
        .select("id, from_wallet, to_wallet, points_amount, type, created_at") \
        .or_(f"from_wallet.eq.{wallet_id},to_wallet.eq.{wallet_id}") \
        .order("created_at", desc=True) \
        .execute()

    return jsonify(res.data), 200\
    
@visitor_bp.route("/leaderboard", methods=["GET"])
@require_auth(["visitor", "admin"])
def leaderboard():
    res = supabase.rpc("visitor_leaderboard").execute()
    return jsonify(res.data), 200

@visitor_bp.route("/topup-request", methods=["POST"])
@require_auth(["visitor"])
def create_topup_request():
    if "image" not in request.files:
        return jsonify({"error": "Image is required"}), 400

    data = request.form
    file = request.files["image"]

    if "amount" not in data:
        return jsonify({"error": "Amount required"}), 400

    amount = int(data["amount"])
    if amount <= 0:
        return jsonify({"error": "Invalid amount"}), 400

    user_id = request.user["id"]

    raw_bytes = file.read()
    if len(raw_bytes) > 5 * 1024 * 1024:
        return jsonify({"error": "Image too large"}), 400

    image_hash = hash_image(raw_bytes)
    compressed = compress_image(raw_bytes)

    wallet_res = supabase.table("wallets") \
        .select("id, is_active") \
        .eq("user_id", user_id) \
        .single() \
        .execute()

    if not wallet_res.data or not wallet_res.data["is_active"]:
        return jsonify({"error": "Wallet inactive"}), 403

    wallet_id = wallet_res.data["id"]

    path = f"topups/{image_hash}.jpg"
    supabase.storage.from_("payments").upload(
        path,
        compressed,
        {"content-type": "image/jpeg"}
    )

    try:
        supabase.table("topup_requests").insert({
            "user_id": user_id,
            "wallet_id": wallet_id,
            "amount": amount,
            "image_path": path,
            "image_hash": image_hash
        }).execute()
    except Exception:
        return jsonify({"error": "Duplicate payment proof detected"}), 409

    return jsonify({"status": "pending"}), 201



