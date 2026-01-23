"""
Main Flask app entry point
"""

from flask import Flask, jsonify
from flask_cors import CORS
from flask_smorest import Api

from routes.admin import admin_bp
from routes.stall import stall_bp
from routes.auth_log import auth_bp
from routes.visitor import visitor_bp


def create_app():
    app = Flask(__name__)

    # ✅ CORS (FIXED)
    CORS(
        app,
        resources={r"/api/*": {"origins": [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://172.25.183.104:3000"
        ]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # 🔹 Swagger / OpenAPI
    app.config.update(
        API_TITLE="Arcade QR Wallet API",
        API_VERSION="1.0.0",
        OPENAPI_VERSION="3.0.3",
        OPENAPI_URL_PREFIX="/",
        OPENAPI_SWAGGER_UI_PATH="/docs",
        OPENAPI_SWAGGER_UI_URL="https://cdn.jsdelivr.net/npm/swagger-ui-dist/"
    )

    # 🔹 Smorest API
    api = Api(app)

    # ✅ REGISTER BLUEPRINTS VIA API
    api.register_blueprint(admin_bp, url_prefix="/api/admin")
    api.register_blueprint(stall_bp, url_prefix="/api/stall")
    api.register_blueprint(visitor_bp, url_prefix="/api/visitor")
    api.register_blueprint(auth_bp, url_prefix="/api/auth")

    # 🔹 Non-API routes
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
