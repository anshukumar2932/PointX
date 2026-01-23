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

from flask import Blueprint, request, jsonify
import bcrypt

from supabase_client import supabase
from auth import require_auth, generate_token

admin_bp = Blueprint("admin", __name__)

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
def admin_topup():
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
    Docstring for plays_view
    """
    res=supabase.table("transactions")\
    .eq("type","play")\
    .excute()

    return jsonify(res.data)

@admin_bp.route("/attendance", methods=["POST"])
@require_auth(["admin"])
def attendance():
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
        .select("id, user_id, wallet_id, amount, image_path, created_at") \
        .eq("status", "pending") \
        .order("created_at") \
        .execute()

    return jsonify(res.data)

@admin_bp.route("/topup-approve", methods=["POST"])
@require_auth(["admin"])
def approve_topup():
    data = request.json

    result = supabase.rpc("approve_topup_request", {
        "p_request_id": data["request_id"],
        "p_admin_id": request.user["id"]
    }).execute()

    return jsonify(result.data), 200

