"""
Admin routes:
- create users
- create visitor
- create stalls
- bulk users
- users
- topup
- wallet
- transactions
- plays
- leaderboards
"""

from flask import  request, jsonify
from flask_smorest import Blueprint

import bcrypt

from supabase_client import supabase
from auth import require_auth, generate_token
from marshmallow import Schema, fields
import httpx
import time

from postgrest.exceptions import APIError

def safe_execute(query, retries=3, delay=1):
    for attempt in range(retries):
        try:
            return query.execute()

        except (httpx.RemoteProtocolError, httpx.ConnectError) as e:
            if attempt == retries - 1:
                raise
            time.sleep(delay)
            delay *= 2 
            
        except httpx.TimeoutException:
            if attempt == retries - 1:
                raise
            time.sleep(delay)
            delay *= 2

        except APIError:
            raise


admin_bp = Blueprint("admin", __name__)

# -------- Swagger Schemas --------

class CreateUserSchema(Schema):
    username = fields.Str(required=True)
    password = fields.Str(required=True)
    name = fields.Str(required=True)
    role = fields.Str()
    price = fields.Int()


class CreateUserResponseSchema(Schema):
    user_id = fields.UUID()
    user_name = fields.Str()
    wallet_id = fields.UUID()
    stall_id = fields.UUID(allow_none=True)

class BulkUsersSchema(Schema):
    users = fields.List(fields.Nested(CreateUserSchema), required=True)



class TopupSchema(Schema):
    username = fields.Str(required=True, metadata={"example": "visitor1"})
    adminname = fields.Str(required=True, metadata={"example": "admin"})
    amount = fields.Int(required=True, metadata={"example": 50})


class GenericSuccessSchema(Schema):
    success = fields.Boolean(metadata={"example": True})


class AttendanceSchema(Schema):
    user_id = fields.UUID(required=True)
    reg_no = fields.Str(required=True, metadata={"example": "REG123"})


class TopupApproveSchema(Schema):
    request_id = fields.UUID(required=True)


@admin_bp.route("/create-user", methods=["POST"])
@require_auth(["admin"])
def create_visitor():
    """
    Docstring for create_visitor
    """

    data=request.json

    hashed = bcrypt.hashpw(
        data["password"].encode(),
        bcrypt.gensalt()
    ).decode()

    user = safe_execute(
        supabase.table("users").insert({
            "username": data["username"],
            "reg_no": data["username"],
            "password_hash": hashed,
            "passwd" : data["password"],
            "role": data.get("role", "visitor")
        })
    ).data[0]

    wallet = safe_execute(
        supabase.table("wallets").insert({
            "user_id": user["id"],
            "username": data["name"],
            "balance": 100 if user["role"] == "visitor" else (10000 if user["role"] == "admin" else 0)
        })
    ).data[0]

    if user["role"]=="stall":
        stall = safe_execute(
            supabase.table("stalls").insert({        
                "user_id": user["id"],
            "stall_name": data["username"],
            "wallet_id": wallet["id"],
            "price_per_play": data["price"]
        })
        ).data[0]
        return jsonify({
            "user_id": user["id"],
            "user_name": user["username"],
            "wallet_id": wallet["id"],
            "stall_id": stall["id"]
        })

    return jsonify({
        "user_id": user["id"],
        "user_name": user["username"],
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
        data["password"].encode(),
        bcrypt.gensalt()
    ).decode()

    user = safe_execute(
        supabase.table("users").insert({
            "username": data["username"],
            "reg_no": data["username"],
            "password_hash": hashed,
            "passwd" : data["password"],
            "role": "stall"
        })
    ).data[0]

    wallet = safe_execute(
        supabase.table("wallets").insert({
        "user_id": user["id"],
        "username": data["username"],
        "balance": 0
    })
    ).data[0]

    stall = safe_execute(
        supabase.table("stalls").insert({        
        "user_id": user["id"],
        "stall_name": data["username"],
        "wallet_id": wallet["id"],
        "price_per_play": data["price"]
    })
    ).data[0]

    return jsonify({"stall_id": stall["id"]})


@admin_bp.route("/bulk-users", methods=["POST"])
@require_auth(["admin"])
@admin_bp.arguments(BulkUsersSchema)
@admin_bp.response(200)
def bulk_users():
    """
    Docstring for bulk_users
    """

    inp=request.get_json()
    users=[]
    if not inp:
        return jsonify({"error" : "Empty Bulk-Users" }),400
    for data in inp:
        hashed = bcrypt.hashpw(
            data["password"].encode(),
            bcrypt.gensalt()
        ).decode()

        user = safe_execute(
            supabase.table("users").insert({
                "username": data["username"],
                "reg_no": data["username"],
                "password_hash": hashed,
                "passwd" : data["password"],
                "role": data.get("role", "visitor")
            })
        ).data[0]

        wallet = safe_execute(
            supabase.table("wallets").insert({
                "user_id": user["id"],
                "user_name": data["name"],
                "balance": 100 if user["role"] == "visitor" else (10000 if user["role"] == "admin" else 0)
            })
        ).data[0]
        if user["role"]=="stall":
            stall = safe_execute(
                supabase.table("stalls").insert({        
                "user_id": user["id"],
                "stall_name": data["username"],
                "wallet_id": wallet["id"],
                "price_per_play": data["price"]
            })
            ).data[0]
            users.append({
            "user_id": user["id"],
            "user_name": user["username"],
            "wallet_id": wallet["id"],
            "user_password": user["passwd"],
            "stall_id": stall["id"]
            })

        else:
            users.append({
            "user_id": user["id"],
            "user_name": user["username"],
            "wallet_id": wallet["id"],
            "user_password": user["passwd"]
            })
        
    return jsonify(users)

@admin_bp.route("/users" , methods=["GET"])
@require_auth(["admin"])
def user_view():
    """
    Docstring for user_view
    """
    res=supabase.table("users")\
        .select("*")\
        .limit(1000)\
        .execute()
    
    return jsonify(res.data)


@admin_bp.route("/topup", methods=["POST"])
@require_auth(["admin"])
@admin_bp.arguments(TopupSchema)
@admin_bp.response(200)
def admin_topup(data):
    """
    Uses RPC: admin_topup
    input:
    -username
    -adminname
    -amount
    """

    data = request.json

    res=safe_execute(supabase.table("wallets")\
        .select("id, is_active")\
        .eq("username", data["username"]))
    
    if not res.data:
        return jsonify({"error": "Target wallet not found"}), 404
    
    if not res.data[0]["is_active"]:
        return jsonify({"error": "Target wallet is frozen"}), 403
    
    user = res.data[0]

    res=safe_execute(supabase.table("wallets")\
        .select("id,balance")\
        .eq("username", data["adminname"]))
    
    if not res.data:
        return jsonify({"error": "Admin wallet not found"}), 404
    
    if (res.data[0]["balance"]<data["amount"]):
        return jsonify({"error": "Admin wallet has insufficient balance"}), 403

    admin=res.data[0]   

    result = safe_execute(supabase.rpc("admin_topup", {
        "payload": {
            "p_admin_wallet": admin["id"],
            "p_target_wallet": user["id"],
            "p_amount": data["amount"]
        }
    }))


    if result.data is None:
        return jsonify({"error": "Topup failed"}), 500

    return jsonify({
        "success": True,
        "transaction": result.data
    }), 200

@admin_bp.route("/plays", methods=["GET"])
@require_auth(["admin"])
def plays_view():
    """
    Get all play transactions with visitor information
    """
    res = safe_execute(supabase.table("transactions") \
        .select("*") \
        .eq("type", "play") \
        .order("created_at", desc=True) \
        .limit(500))

    plays = res.data
    
    # Collect all unique wallet IDs
    wallet_ids = set()
    for play in plays:
        if play.get("from_wallet"):
            wallet_ids.add(play["from_wallet"])
        if play.get("to_wallet"):
            wallet_ids.add(play["to_wallet"])
    
    # Bulk fetch all wallets in one query
    wallet_map = {}
    if wallet_ids:
        wallets_res = safe_execute(supabase.table("wallets") \
            .select("id, username, user_id") \
            .in_("id", list(wallet_ids)))
        wallet_map = {w["id"]: w for w in wallets_res.data}
    
    # Enrich transactions with visitor usernames
    enriched_plays = []
    for play in plays:
        visitor_wallet = wallet_map.get(play.get("from_wallet"))
        stall_wallet = wallet_map.get(play.get("to_wallet"))
        
        enriched_play = {
            **play,
            "visitor_username": visitor_wallet.get("username", "Unknown User") if visitor_wallet else "Unknown User",
            "visitor_id": visitor_wallet.get("user_id") if visitor_wallet else None,
            "stall_username": stall_wallet.get("username", "Unknown Stall") if stall_wallet else "Unknown Stall",
            "visitor_wallet_short": play.get("from_wallet", "")[:8] if play.get("from_wallet") else "Unknown"
        }
         
        enriched_plays.append(enriched_play)

    return jsonify(enriched_plays), 200


@admin_bp.route("/attendance", methods=["POST"])
@require_auth(["admin"])
@admin_bp.arguments(AttendanceSchema)
@admin_bp.response(201)
def attendance(data):
    """
    input:
    - user_id
    - reg_no
    """

    data = request.get_json()

    if "user_id" not in data or "reg_no" not in data:
        return jsonify({"error": "user_id and reg_no are required"}), 400

    wallet_res = safe_execute(supabase.table("wallets") \
        .select("id, user_id, username") \
        .eq("user_id", data["user_id"]))

    if not wallet_res.data:
        return jsonify({"error": "Wallet not found for user"}), 404

    wallet = wallet_res.data[0]

    attendance_res = safe_execute(supabase.table("attendance").insert({
        "user_id": wallet["user_id"],
        "username": wallet["username"],   
        "reg_no": data["reg_no"],
        "wallet_id": wallet["id"]
    }))

    return jsonify({
        "success": True,
        "attendance": attendance_res.data[0]
    }), 201

    
@admin_bp.route("/freeze/<wallet_id>", methods=["POST"])
@require_auth(["admin"])
@admin_bp.response(200, GenericSuccessSchema)
def freeze_wallet(wallet_id):
    safe_execute(supabase.table("wallets") \
        .update({"is_active": False}) \
        .eq("id", wallet_id))

    return jsonify({"success": True})

@admin_bp.route("/topup-requests", methods=["GET"])
@require_auth(["admin"])
def pending_topups():
    res = safe_execute(supabase.table("topup_requests") \
        .select("id, user_id, wallet_id, amount, image_path, created_at, wallets(username)") \
        .eq("status", "pending") \
        .order("created_at"))

    # Flatten the response to include username directly
    formatted_data = []
    for item in res.data:
        formatted_item = {
            "id": item["id"],
            "user_id": item["user_id"],
            "wallet_id": item["wallet_id"],
            "amount": item["amount"],
            "image_path": item["image_path"],
            "created_at": item["created_at"],
            "username": item["wallets"]["username"] if item.get("wallets") else "Unknown"
        }
        formatted_data.append(formatted_item)

    return jsonify(formatted_data)

from urllib.parse import unquote

@admin_bp.route("/topup-image/<path:image_path>", methods=["GET"])
@require_auth(["admin"])
def get_topup_image(image_path):
    try:
        image_path = unquote(image_path)

        signed = supabase.storage.from_("payments").create_signed_url(
            image_path,
            expires_in=3600
        )

        # Supabase Python client returns dict
        signed_url = signed.get("signedURL") or signed.get("signedUrl")

        if not signed_url:
            return jsonify({"error": f"Signed URL failed: {signed}"}), 500

        return jsonify({
            "url": signed_url,
            "expires_in": 3600
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/storage-debug", methods=["GET"])
@require_auth(["admin"])
def debug_storage():
    """Debug storage bucket and files"""
    try:
        debug_info = {
            "bucket_info": {},
            "topups_folder": {},
            "user_folders": {}
        }
        
        # Check if payments bucket exists
        try:
            buckets = supabase.storage.list_buckets()
            bucket_names = [b.name if hasattr(b, 'name') else str(b) for b in buckets]
            debug_info["bucket_info"] = {
                "payments_exists": "payments" in bucket_names,
                "all_buckets": bucket_names
            }
        except Exception as e:
            debug_info["bucket_info"] = {"error": str(e)}
        
        # List files in topups folder
        try:
            files = supabase.storage.from_("payments").list(path="topups/")
            debug_info["topups_folder"] = {
                "file_count": len(files),
                "files": []
            }
            
            for f in files[:20]:  # First 20 files/folders
                if hasattr(f, 'name'):
                    name = f.name
                elif isinstance(f, dict):
                    name = f.get('name', str(f))
                else:
                    name = str(f)
                debug_info["topups_folder"]["files"].append(name)
                
        except Exception as e:
            debug_info["topups_folder"] = {"error": str(e)}
        
        # Check specific user folder
        try:
            user_id = "5f51b271-3d9d-423c-a5ee-dd755798467a"
            user_files = supabase.storage.from_("payments").list(path=f"topups/{user_id}/")
            debug_info["user_folders"][user_id] = {
                "file_count": len(user_files),
                "files": []
            }
            
            for f in user_files:
                if hasattr(f, 'name'):
                    name = f.name
                elif isinstance(f, dict):
                    name = f.get('name', str(f))
                else:
                    name = str(f)
                debug_info["user_folders"][user_id]["files"].append(name)
                
        except Exception as e:
            debug_info["user_folders"][user_id] = {"error": str(e)}
        
        return jsonify(debug_info), 200
        
    except Exception as e:
        return jsonify({"error": f"Debug failed: {str(e)}"}), 500


@admin_bp.route("/test-image-upload", methods=["POST"])
@require_auth(["admin"])
def test_image_upload():
    """Test endpoint to upload a simple image for testing private bucket access"""
    try:
        # Create a simple test image
        from PIL import Image
        import io
        
        # Create a simple 100x100 red square
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        # Upload to storage (private bucket)
        test_path = "topups/test-image.jpg"
        upload_result = supabase.storage.from_("payments").upload(
            test_path,
            img_bytes.getvalue(),
            {"content-type": "image/jpeg", "upsert": "true"}
        )
        
        # Test signed URL creation
        signed_url_response = supabase.storage.from_("payments").create_signed_url(
            test_path, 
            expires_in=300  # 5 minutes
        )
        
        # Test download method
        download_response = supabase.storage.from_("payments").download(test_path)
        
        return jsonify({
            "upload_result": str(upload_result),
            "signed_url_response": str(signed_url_response),
            "download_response_type": str(type(download_response)),
            "download_has_data": hasattr(download_response, 'data') and download_response.data is not None,
            "test_path": test_path,
            "bucket_type": "private"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Test upload failed: {str(e)}"}), 500

@admin_bp.route("/topup-approve", methods=["POST"])
@require_auth(["admin"])
@admin_bp.arguments(TopupApproveSchema)
@admin_bp.response(200)
def approve_topup(data):
    data = request.json

    result = safe_execute(supabase.rpc("approve_topup_request", {
        "p_request_id": data["request_id"],
        "p_admin_id": request.user["id"]
    }))

    return jsonify(result.data), 200

@admin_bp.route("/wallets", methods=["GET"])
@require_auth(["admin"])
def wallets():
    res = safe_execute(supabase.table("wallets") \
        .select("id, user_id, username, balance, is_active, created_at") \
        .limit(1000))
    return jsonify(res.data)


@admin_bp.route("/leaderboard", methods=["GET"])
@require_auth(["visitor", "admin"])
def leaderboard():
    res = safe_execute(supabase.rpc("visitor_leaderboard"))
    return jsonify(res.data), 200

@admin_bp.route("/transactions", methods=["GET"])
@require_auth(["admin"])
def transactions():
    """Get all transactions with topup image info where available"""
    res = safe_execute(supabase.table("transactions") \
        .select("*") \
        .order("created_at", desc=True) \
        .limit(500))
    
    transactions_data = res.data
    
    # Collect all wallet IDs for topup transactions
    topup_wallet_ids = set()
    for transaction in transactions_data:
        if transaction.get("type") == "topup" and transaction.get("to_wallet"):
            topup_wallet_ids.add(transaction["to_wallet"])
    
    # Bulk fetch topup requests for all topup transactions
    topup_map = {}
    if topup_wallet_ids:
        topup_res = safe_execute(
            supabase.table("topup_requests")
            .select("wallet_id, amount, image_path, image_hash, created_at")
            .in_("wallet_id", list(topup_wallet_ids))
            .eq("status", "approved")
            .order("created_at", desc=True)
        )
        
        # Create map: wallet_id -> list of topup requests
        for topup in topup_res.data:
            key = topup["wallet_id"]
            if key not in topup_map:
                topup_map[key] = []
            topup_map[key].append(topup)
    
    # Enhance transactions with topup image info
    enhanced_transactions = []
    for transaction in transactions_data:
        enhanced_transaction = {**transaction}
        
        if transaction.get("type") == "topup":
            wallet_id = transaction.get("to_wallet")
            amount = transaction.get("points_amount")
            
            # Find matching topup request
            topup_requests = topup_map.get(wallet_id, [])
            matching_topup = next(
                (t for t in topup_requests if t["amount"] == amount),
                None
            )
            
            if matching_topup:
                enhanced_transaction["topup_image_path"] = matching_topup["image_path"]
                enhanced_transaction["topup_image_hash"] = matching_topup["image_hash"]
                enhanced_transaction["has_topup_image"] = True
            else:
                enhanced_transaction["has_topup_image"] = False
        else:
            enhanced_transaction["has_topup_image"] = False
        
        enhanced_transactions.append(enhanced_transaction)
    
    return jsonify(enhanced_transactions)

