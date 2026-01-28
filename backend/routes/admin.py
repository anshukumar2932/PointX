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

        except httpx.RemoteProtocolError:
            if attempt == retries - 1:
                raise
            time.sleep(delay)
            delay *= 2

        except APIError:
            raise


admin_bp = Blueprint("admin", __name__)

# -------- Swagger Schemas --------

class CreateUserSchema(Schema):
    username = fields.Str(required=True, metadata={"example": "visitor1"})
    password = fields.Str(required=True, metadata={"example": "password123"})
    name = fields.Str(required=True, metadata={"example": "Visitor One"})
    role = fields.Str(metadata={"example": "visitor"})
    price = fields.Int(metadata={"example": 10})


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
@admin_bp.arguments(CreateUserSchema)
@admin_bp.response(200, CreateUserResponseSchema)
def create_visitor(data):
    hashed = bcrypt.hashpw(
        data["password"].encode(),
        bcrypt.gensalt()
    ).decode()

    result = safe_execute(
        supabase.rpc("admin_create_user", {
            "p_username": data["username"],
            "p_password_hash": hashed,
            "p_role": data.get("role", "visitor"),
            "p_wallet_name": data.get("name", data["username"]),
            "p_price_per_play": data.get("price")
        })
    )

    row = result.data[0]

    return jsonify({
        "user_id": row["out_user_id"],
        "user_name": row["out_user_name"],
        "wallet_id": row["out_wallet_id"],
        "stall_id": row["out_stall_id"]
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

    user = safe_execute(supabase.table("users").insert({
        "username": data["username"],
        "password_hash": hashed,
        "passwd" : data["password"],
        "role": "stall"
    })).data[0]

    wallet = safe_execute(supabase.table("wallets").insert({
        "user_id": user["id"],
        "username": data["username"],
        "balance": 0
    })).data[0]

    stall = safe_execute(supabase.table("stalls").insert({        
        "user_id": user["id"],
        "stall_name": data["username"],
        "wallet_id": wallet["id"],
        "price_per_play": data["price"]
    })).data[0]

    return jsonify({"stall_id": stall["id"]})


@admin_bp.route("/bulk-users", methods=["POST"])
@require_auth(["admin"])
@admin_bp.arguments(BulkUsersSchema)
@admin_bp.response(200)
def bulk_users():
    """
    Bulk create users with enhanced validation and error handling
    """
    inp = request.get_json()
    
    if not inp:
        return jsonify({"error": "Empty request body"}), 400
    
    if not isinstance(inp, list):
        return jsonify({"error": "Request body must be an array of user objects"}), 400
    
    if len(inp) == 0:
        return jsonify({"error": "No users provided"}), 400
    
    if len(inp) > 100:  # Limit bulk operations
        return jsonify({"error": "Maximum 100 users allowed per bulk operation"}), 400
    
    created_users = []
    errors = []
    
    for i, data in enumerate(inp):
        try:
            # Validate required fields
            if not data.get("username") or not data.get("password") or not data.get("role"):
                errors.append(f"User {i+1}: Missing required fields (username, password, role)")
                continue
            
            # Validate role
            if data["role"] not in ["visitor", "stall", "admin"]:
                errors.append(f"User {i+1}: Invalid role '{data['role']}'. Must be visitor, stall, or admin")
                continue
            
            # Check if username already exists
            existing_user = safe_execute(supabase.table("users").select("username").eq("username", data["username"]))
            if existing_user.data:
                errors.append(f"User {i+1}: Username '{data['username']}' already exists")
                continue
            
            # Hash password
            hashed = bcrypt.hashpw(
                data["password"].encode(),
                bcrypt.gensalt()
            ).decode()

            # Create user
            user = safe_execute(supabase.table("users").insert({
                "username": data["username"],
                "password_hash": hashed,
                "passwd": data["password"],
                "role": data["role"]
            })).data[0]

            # Create wallet with appropriate initial balance
            initial_balance = 100 if user["role"] == "visitor" else (10000 if user["role"] == "admin" else 0)
            wallet = safe_execute(supabase.table("wallets").insert({
                "user_id": user["id"],
                "username": data.get("name", data["username"]),  # Use name if provided, otherwise username
                "balance": initial_balance
            })).data[0]
            
            user_result = {
                "user_id": user["id"],
                "username": user["username"],
                "role": user["role"],
                "wallet_id": wallet["id"],
                "initial_balance": initial_balance
            }
            
            # Create stall if role is stall
            if user["role"] == "stall":
                price_per_play = data.get("price", 10)  # Default to 10 if not specified
                stall = safe_execute(supabase.table("stalls").insert({        
                    "user_id": user["id"],
                    "stall_name": data["username"],
                    "wallet_id": wallet["id"],
                    "price_per_play": price_per_play
                })).data[0]
                user_result["stall_id"] = stall["id"]
                user_result["price_per_play"] = price_per_play
            
            created_users.append(user_result)
            
        except Exception as e:
            errors.append(f"User {i+1} ({data.get('username', 'unknown')}): {str(e)}")
            continue
    
    # Return results
    response = {
        "success": len(created_users) > 0,
        "created_count": len(created_users),
        "error_count": len(errors),
        "created_users": created_users,
        "errors": errors
    }
    
    status_code = 200 if len(created_users) > 0 else 400
    return jsonify(response), status_code

@admin_bp.route("/users" , methods=["GET"])
@require_auth(["admin"])
def user_view():
    """
    Docstring for user_view
    """
    res=supabase.table("users")\
        .select("*")\
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
        .order("created_at", desc=True))

    # Enrich transactions with visitor usernames
    enriched_plays = []
    for play in res.data:
        # Get visitor username from wallet
        if play.get("from_wallet"):
            visitor_wallet_res = safe_execute(supabase.table("wallets") \
                .select("username, user_id") \
                .eq("id", play["from_wallet"]))
            
            if visitor_wallet_res.data:
                visitor_info = visitor_wallet_res.data[0]
                visitor_username = visitor_info.get("username", "Unknown User")
                visitor_id = visitor_info.get("user_id")
            else:
                visitor_username = "Unknown User"
                visitor_id = None
        else:
            visitor_username = "Unknown User"
            visitor_id = None
        
        # Get stall information
        if play.get("to_wallet"):
            stall_wallet_res = safe_execute(supabase.table("wallets") \
                .select("username") \
                .eq("id", play["to_wallet"]))
            
            stall_username = stall_wallet_res.data[0]["username"] if stall_wallet_res.data else "Unknown Stall"
        else:
            stall_username = "Unknown Stall"
        
        enriched_play = {
            **play,
            "visitor_username": visitor_username,
            "visitor_id": visitor_id,
            "stall_username": stall_username,
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


@admin_bp.route("/topup-image/<path:image_path>", methods=["GET"])
@require_auth(["admin"])
def get_topup_image(image_path):
    """Get signed URL for topup request image from private bucket"""
    try:
        # First, check if the file exists in storage
        try:
            file_list = supabase.storage.from_("payments").list(path="topups/")
            
            # Extract filename from path
            filename = image_path.split('/')[-1]
            file_exists = any(
                (f.get('name') == filename if isinstance(f, dict) else str(f) == filename)
                for f in file_list
            )
            
            if not file_exists:
                return jsonify({"error": f"File not found in storage: {filename}"}), 404
            
        except Exception as list_error:
            # Continue anyway, maybe the file exists but listing failed
            pass
        
        # For private buckets, create a signed URL (temporary access)
        # This creates a URL that expires in 1 hour (3600 seconds)
        try:
            signed_url_response = safe_execute(supabase.storage.from_("payments").create_signed_url(
                image_path, 
                expires_in=3600  # 1 hour expiration
            ))
            
            # Handle different response formats
            signed_url = None
            
            if hasattr(signed_url_response, 'error') and signed_url_response.error:
                return jsonify({"error": f"Failed to create signed URL: {signed_url_response.error}"}), 500
            
            # Extract signed URL from response
            if isinstance(signed_url_response, dict):
                if 'data' in signed_url_response and signed_url_response['data']:
                    signed_url = signed_url_response['data'].get('signedUrl')
                elif 'signedUrl' in signed_url_response:
                    signed_url = signed_url_response['signedUrl']
            elif hasattr(signed_url_response, 'data') and signed_url_response.data:
                if hasattr(signed_url_response.data, 'signedUrl'):
                    signed_url = signed_url_response.data.signedUrl
                elif isinstance(signed_url_response.data, dict):
                    signed_url = signed_url_response.data.get('signedUrl')
            
            if not signed_url:
                return jsonify({"error": "Failed to extract signed URL from response"}), 500
            
            # Validate the URL format
            if not signed_url.startswith(('http://', 'https://')):
                return jsonify({"error": f"Invalid signed URL format: {signed_url}"}), 500
            
            return jsonify({
                "url": signed_url,
                "expires_in": 3600,
                "method": "signed_url"
            }), 200
            
        except Exception as signed_url_error:
            # Fallback: Try to download the file and return it as base64
            try:
                download_response = supabase.storage.from_("payments").download(image_path)
                
                if hasattr(download_response, 'error') and download_response.error:
                    return jsonify({"error": f"Download failed: {download_response.error}"}), 500
                
                # Get the blob data
                blob_data = None
                if hasattr(download_response, 'data') and download_response.data:
                    blob_data = download_response.data
                elif isinstance(download_response, dict) and 'data' in download_response:
                    blob_data = download_response['data']
                
                if not blob_data:
                    return jsonify({"error": "No data received from download"}), 500
                
                # Convert blob to base64 for frontend display
                import base64
                if hasattr(blob_data, 'read'):
                    # If it's a file-like object
                    blob_bytes = blob_data.read()
                else:
                    # If it's already bytes
                    blob_bytes = blob_data
                
                base64_data = base64.b64encode(blob_bytes).decode('utf-8')
                
                # Determine MIME type based on file extension
                file_ext = image_path.lower().split('.')[-1]
                mime_type = {
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'png': 'image/png',
                    'gif': 'image/gif',
                    'webp': 'image/webp'
                }.get(file_ext, 'image/jpeg')
                
                data_url = f"data:{mime_type};base64,{base64_data}"
                
                return jsonify({
                    "url": data_url,
                    "method": "download_base64",
                    "size": len(blob_bytes)
                }), 200
                
            except Exception as download_error:
                return jsonify({"error": f"Both signed URL and download methods failed. Signed URL error: {signed_url_error}. Download error: {download_error}"}), 500
        
    except Exception as e:
        return jsonify({"error": f"Failed to get image: {str(e)}"}), 500


@admin_bp.route("/storage-debug", methods=["GET"])
@require_auth(["admin"])
def debug_storage():
    """Debug storage bucket and files"""
    try:
        debug_info = {
            "supabase_config": {},
            "bucket_info": {},
            "topups_folder": {},
            "sample_urls": {}
        }
        
        # Show Supabase configuration
        debug_info["supabase_config"] = {
            "supabase_url": supabase.url,
            "expected_storage_pattern": f"{supabase.url}/storage/v1/object/public/payments/[file-path]"
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
                "files": [f.get('name', str(f)) for f in files[:10]]  # First 10 files
            }
        except Exception as e:
            debug_info["topups_folder"] = {"error": str(e)}
        
        # Test URL generation for first file
        try:
            if debug_info["topups_folder"].get("files"):
                first_file = debug_info["topups_folder"]["files"][0]
                test_path = f"topups/{first_file}"
                
                # Test signed URL creation for private bucket
                try:
                    signed_url_response = supabase.storage.from_("payments").create_signed_url(test_path, 60)
                    debug_info["sample_urls"]["signed_url_test"] = {
                        "test_path": test_path,
                        "response_type": str(type(signed_url_response)),
                        "response": str(signed_url_response)
                    }
                except Exception as signed_error:
                    debug_info["sample_urls"]["signed_url_error"] = str(signed_error)
                
                # Test download method for private bucket
                try:
                    download_response = supabase.storage.from_("payments").download(test_path)
                    debug_info["sample_urls"]["download_test"] = {
                        "response_type": str(type(download_response)),
                        "has_data": hasattr(download_response, 'data') and download_response.data is not None
                    }
                except Exception as download_error:
                    debug_info["sample_urls"]["download_error"] = str(download_error)
                
        except Exception as e:
            debug_info["sample_urls"] = {"error": str(e)}
        
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
        .select("id, user_id, username, balance, is_active, created_at"))
    return jsonify(res.data)


@admin_bp.route("/leaderboard", methods=["GET"])
@require_auth(["visitor", "admin"])
def leaderboard():
    res = safe_execute(supabase.rpc("visitor_leaderboard"))
    return jsonify(res.data), 200

@admin_bp.route("/transactions", methods=["GET"])
@require_auth(["admin"])
def transactions():
    res = safe_execute(supabase.table("transactions") \
        .select("*") \
        .order("created_at", desc=True))
    return jsonify(res.data)

