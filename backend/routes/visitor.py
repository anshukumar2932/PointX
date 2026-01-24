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
        .select("id, balance, is_active") \
        .eq("user_id", user_id) \
        .single() \
        .execute()

    if not wallet_res.data:
        return jsonify({"error": "Wallet not found"}), 404

    return jsonify({
        "wallet_id": wallet_res.data["id"],
        "balance": wallet_res.data["balance"],
        "is_active": wallet_res.data["is_active"]
    }), 200



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

@visitor_bp.route("/topup-test", methods=["GET"])
@require_auth(["visitor"])
def test_topup_dependencies():
    """Test endpoint to check topup request dependencies"""
    try:
        user_id = request.user["id"]
        
        # Test 1: Check wallet
        wallet_res = supabase.table("wallets") \
            .select("id, is_active") \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        
        wallet_status = "✅ Found" if wallet_res.data else "❌ Not found"
        wallet_active = "✅ Active" if wallet_res.data and wallet_res.data["is_active"] else "❌ Inactive"
        
        # Test 2: Check storage bucket
        try:
            bucket_list = supabase.storage.list_buckets()
            payments_bucket_exists = any(bucket.name == "payments" for bucket in bucket_list if hasattr(bucket_list, '__iter__'))
            bucket_status = "✅ Exists" if payments_bucket_exists else "❌ Missing"
        except Exception as e:
            bucket_status = f"❌ Error: {str(e)}"
        
        # Test 3: Check table structure
        try:
            # Try to query the topup_requests table structure
            test_query = supabase.table("topup_requests").select("*").limit(1).execute()
            table_status = "✅ Accessible"
        except Exception as e:
            table_status = f"❌ Error: {str(e)}"
        
        return jsonify({
            "user_id": user_id,
            "wallet": {
                "status": wallet_status,
                "active": wallet_active,
                "id": wallet_res.data["id"] if wallet_res.data else None
            },
            "storage": {
                "payments_bucket": bucket_status
            },
            "database": {
                "topup_requests_table": table_status
            },
            "image_processing": {
                "functions": "✅ Available" if 'compress_image' in globals() and 'hash_image' in globals() else "❌ Missing"
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Test failed: {str(e)}"}), 500


@visitor_bp.route("/topup-request", methods=["POST"])
@require_auth(["visitor"])
def create_topup_request():
    try:
        if "image" not in request.files:
            return jsonify({"error": "Image is required"}), 400

        data = request.form
        file = request.files["image"]

        if "amount" not in data:
            return jsonify({"error": "Amount required"}), 400

        try:
            amount = int(data["amount"])
            if amount <= 0:
                return jsonify({"error": "Invalid amount"}), 400
        except ValueError:
            return jsonify({"error": "Amount must be a valid number"}), 400

        user_id = request.user["id"]

        # Read and validate file
        try:
            raw_bytes = file.read()
            if len(raw_bytes) == 0:
                return jsonify({"error": "Empty file uploaded"}), 400
            if len(raw_bytes) > 5 * 1024 * 1024:
                return jsonify({"error": "Image too large (max 5MB)"}), 400
        except Exception as e:
            return jsonify({"error": f"Failed to read uploaded file: {str(e)}"}), 400

        # Process image
        try:
            image_hash = hash_image(raw_bytes)
            compressed = compress_image(raw_bytes)
        except Exception as e:
            return jsonify({"error": f"Failed to process image: {str(e)}"}), 400

        # Get wallet
        try:
            wallet_res = supabase.table("wallets") \
                .select("id, is_active") \
                .eq("user_id", user_id) \
                .single() \
                .execute()

            if not wallet_res.data:
                return jsonify({"error": "Wallet not found"}), 404
            
            if not wallet_res.data["is_active"]:
                return jsonify({"error": "Wallet inactive"}), 403

            wallet_id = wallet_res.data["id"]
        except Exception as e:
            return jsonify({"error": f"Failed to fetch wallet: {str(e)}"}), 500

        # Upload to storage
        try:
            path = f"topups/{image_hash}.jpg"
            upload_result = supabase.storage.from_("payments").upload(
                path,
                compressed,
                {"content-type": "image/jpeg"}
            )
            
            # Check if upload was successful
            if hasattr(upload_result, 'error') and upload_result.error:
                return jsonify({"error": f"Failed to upload image: {upload_result.error}"}), 500
                
        except Exception as e:
            return jsonify({"error": f"Failed to upload image to storage: {str(e)}"}), 500

        # Insert topup request
        try:
            insert_result = supabase.table("topup_requests").insert({
                "user_id": user_id,
                "wallet_id": wallet_id,
                "amount": amount,
                "image_path": path,
                "image_hash": image_hash
            }).execute()
            
            if hasattr(insert_result, 'error') and insert_result.error:
                return jsonify({"error": f"Failed to create topup request: {insert_result.error}"}), 500
                
        except Exception as e:
            error_msg = str(e)
            if "duplicate" in error_msg.lower() or "unique" in error_msg.lower():
                return jsonify({"error": "Duplicate payment proof detected"}), 409
            return jsonify({"error": f"Failed to create topup request: {error_msg}"}), 500

        return jsonify({"status": "pending"}), 201

    except Exception as e:
        # Catch-all error handler
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500



