"""
Main Flask app entry point
"""

from flask import Flask, jsonify
from flask_cors import CORS

from routes.admin import admin_bp
from routes.stall import stall_bp
from routes.auth_log import auth_bp
from routes.visitor import visitor_bp

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(stall_bp, url_prefix="/api/stall")    
    app.register_blueprint(visitor_bp, url_prefix="/api/visitor") 
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    @app.route("/")
    def root():
        return jsonify({
            "service": "Arcade QR Wallet API",
            "version": "1.0.0"
        })

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
