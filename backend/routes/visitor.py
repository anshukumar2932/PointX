"""
Visitor routes:
- view wallet
- view stalls
"""

from flask import Blueprint, jsonify
from supabase_client import supabase

visitor_bp = Blueprint("visitor", __name__)


@visitor_bp.route("/wallet/<wallet_id>")
def get_wallet(wallet_id):
    """
    Uses RPC: get_wallet_details
    """
    result = supabase.rpc("get_wallet_details", {
        "p_wallet_id": wallet_id
    }).execute()

    return jsonify(result.data)


@visitor_bp.route("/stalls")
def get_stalls():
    stalls = supabase.table("stalls") \
        .select("id,stall_name,price_per_play,reward_multiplier") \
        .execute().data

    return jsonify(stalls)
