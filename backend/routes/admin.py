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
    """
    Docstring for create_visitor
    """

    data=request.json

    hashed = bcrypt.hashpw(
        data["password"].encode(),
        bcrypt.gensalt()
    ).decode()

    user = supabase.table("users").insert({
        "username": data["username"],
        "password_hash": hashed,
        "passwd" : data["password"],
        "role": data.get("role", "visitor")
    }).execute().data[0]

    wallet = supabase.table("wallets").insert({
        "user_id": user["id"],
        "username": data["name"],
        "balance": 100 if user["role"] == "visitor" else (10000 if user["role"] == "admin" else 0)
    }).execute().data[0]

    if user["role"]=="stall":
        stall = supabase.table("stalls").insert({        
            "user_id": user["id"],
            "stall_name": data["username"],
            "wallet_id": wallet["id"],
            "price_per_play": data["price"]
        }).execute().data[0]
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

    user = supabase.table("users").insert({
        "username": data["username"],
        "password_hash": hashed,
        "passwd" : data["password"],
        "role": "stall"
    }).execute().data[0]

    wallet = supabase.table("wallets").insert({
        "user_id": user["id"],
        "username": data["username"],
        "balance": 0
    }).execute().data[0]

    stall = supabase.table("stalls").insert({        
        "user_id": user["id"],
        "stall_name": data["username"],
        "wallet_id": wallet["id"],
        "price_per_play": data["price"]
    }).execute().data[0]

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

        user = supabase.table("users").insert({
            "username": data["username"],
            "password_hash": hashed,
            "passwd" : data["password"],
            "role": data.get("role", "visitor")
        }).execute().data[0]

        wallet = supabase.table("wallets").insert({
            "user_id": user["id"],
            "user_name": data["name"],
            "balance": 100 if user["role"] == "visitor" else (10000 if user["role"] == "admin" else 0)
        }).execute().data[0]
        if user["role"]=="stall":
            stall = supabase.table("stalls").insert({        
                "user_id": user["id"],
                "stall_name": data["username"],
                "wallet_id": wallet["id"],
                "price_per_play": data["price"]
            }).execute().data[0]
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

    res=supabase.table("wallets")\
        .select("id, is_active")\
        .eq("username", data["username"]) \
        .execute()
    
    if not res.data:
        return jsonify({"error": "Target wallet not found"}), 404
    
    if not res.data[0]["is_active"]:
        return jsonify({"error": "Target wallet is frozen"}), 403
    
    user = res.data[0]

    res=supabase.table("wallets")\
        .select("id,balance")\
        .eq("username", data["adminname"]) \
        .execute()
    
    if not res.data:
        return jsonify({"error": "Admin wallet not found"}), 404
    
    if (res.data[0]["balance"]<data["amount"]):
        return jsonify({"error": "Admin wallet has insufficient balance"}), 403

    admin=res.data[0]   

    result = supabase.rpc("admin_topup", {
        "payload": {
            "p_admin_wallet": admin["id"],
            "p_target_wallet": user["id"],
            "p_amount": data["amount"]
        }
    }).execute()


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
    res = supabase.table("transactions") \
        .select("*") \
        .eq("type", "play") \
        .order("created_at", desc=True) \
        .execute()

    # Enrich transactions with visitor usernames
    enriched_plays = []
    for play in res.data:
        # Get visitor username from wallet
        if play.get("from_wallet"):
            visitor_wallet_res = supabase.table("wallets") \
                .select("username, user_id") \
                .eq("id", play["from_wallet"]) \
                .execute()
            
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
            stall_wallet_res = supabase.table("wallets") \
                .select("username") \
                .eq("id", play["to_wallet"]) \
                .execute()
            
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

    wallet_res = supabase.table("wallets") \
        .select("id, user_id, username") \
        .eq("user_id", data["user_id"]) \
        .execute()

    if not wallet_res.data:
        return jsonify({"error": "Wallet not found for user"}), 404

    wallet = wallet_res.data[0]

    attendance_res = supabase.table("attendance").insert({
        "user_id": wallet["user_id"],
        "username": wallet["username"],   
        "reg_no": data["reg_no"],
        "wallet_id": wallet["id"]
    }).execute()

    return jsonify({
        "success": True,
        "attendance": attendance_res.data[0]
    }), 201

    
@admin_bp.route("/freeze/<wallet_id>", methods=["POST"])
@require_auth(["admin"])
@admin_bp.response(200, GenericSuccessSchema)
def freeze_wallet(wallet_id):
    supabase.table("wallets") \
        .update({"is_active": False}) \
        .eq("id", wallet_id) \
        .execute()

    return jsonify({"success": True})

@admin_bp.route("/topup-requests", methods=["GET"])
@require_auth(["admin"])
def pending_topups():
    res = supabase.table("topup_requests") \
        .select("id, user_id, wallet_id, amount, image_path, created_at, wallets(username)") \
        .eq("status", "pending") \
        .order("created_at") \
        .execute()

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

@admin_bp.route("/topup-approve", methods=["POST"])
@require_auth(["admin"])
@admin_bp.arguments(TopupApproveSchema)
@admin_bp.response(200)
def approve_topup(data):

    data = request.json

    result = supabase.rpc("approve_topup_request", {
        "p_request_id": data["request_id"],
        "p_admin_id": request.user["id"]
    }).execute()

    return jsonify(result.data), 200

@admin_bp.route("/wallets", methods=["GET"])
@require_auth(["admin"])
def wallets():
    res = supabase.table("wallets") \
        .select("id, user_id, username, balance, is_active, created_at") \
        .execute()
    return jsonify(res.data)


@admin_bp.route("/leaderboard", methods=["GET"])
@require_auth(["visitor", "admin"])
def leaderboard():
    res = supabase.rpc("visitor_leaderboard").execute()
    return jsonify(res.data), 200

@admin_bp.route("/transactions", methods=["GET"])
@require_auth(["admin"])
def transactions():
    res = supabase.table("transactions") \
        .select("*") \
        .order("created_at", desc=True) \
        .execute()
    return jsonify(res.data)

