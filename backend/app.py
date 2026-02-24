"""
PointX - QR-based Point Management System
Main Flask application entry point for Render deployment
"""

import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_smorest import Api
from datetime import datetime
import logging
from logging.handlers import RotatingFileHandler

from routes.admin import admin_bp
from routes.stall import stall_bp
from routes.auth_log import auth_bp
from routes.visitor import visitor_bp


def create_app(config_name=None):
    app = Flask(__name__)

    # Setup logging first
    setup_logging(app)
    
    # Configure CORS with better logging
    setup_cors(app)
    
    # Setup API docs
    setup_api_docs(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register middleware
    register_middleware(app)
    
    # Register routes (this will create the Api instance)
    register_blueprints(app)
    
    return app

def setup_logging(app):
    app.logger.setLevel(logging.INFO)

    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s'
    ))

    if not app.logger.handlers:
        app.logger.addHandler(handler)

    app.logger.info("Logging initialized")



def setup_cors(app):
    """Configure CORS settings"""
    allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
    
    # Clean up origins (remove whitespace)
    allowed_origins = [origin.strip() for origin in allowed_origins if origin.strip()]
    
    app.logger.info(f'CORS allowed origins: {allowed_origins}')
    
    # For local development, ensure localhost:3000 is always allowed
    if 'http://localhost:3000' not in allowed_origins:
        allowed_origins.append('http://localhost:3000')
    
    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Visitor-Wallet-ID"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        expose_headers=["Content-Type", "Authorization"]
    )


def setup_api_docs(app):
    """Configure API documentation"""
    app.config.update(
        API_TITLE="PointX API",
        API_VERSION="1.0.0",
        OPENAPI_VERSION="3.0.3",
        OPENAPI_URL_PREFIX="/",
        OPENAPI_SWAGGER_UI_PATH="/docs",
        OPENAPI_SWAGGER_UI_URL="https://cdn.jsdelivr.net/npm/swagger-ui-dist/",
        OPENAPI_REDOC_PATH="/redoc",
        OPENAPI_REDOC_URL="https://cdn.jsdelivr.net/npm/redoc/bundles/redoc.standalone.js"
    )


def register_blueprints(app):
    """Register all application blueprints"""
    api = Api(app)
    
    # Register API blueprints
    api.register_blueprint(admin_bp, url_prefix="/api/admin")
    api.register_blueprint(stall_bp, url_prefix="/api/stall")
    api.register_blueprint(visitor_bp, url_prefix="/api/visitor")
    api.register_blueprint(auth_bp, url_prefix="/api/auth")
    
    # Register non-API routes
    @app.route("/")
    def root():
        return jsonify({
            "service": "PointX API",
            "version": "1.0.0",
            "description": "QR-based Point Management System",
            "documentation": "/docs",
            "health_check": "/api/health",
            "timestamp": datetime.utcnow().isoformat()
        })

    @app.route("/api/debug")
    def debug():
        return jsonify({
            "message": "Debug endpoint working",
            "timestamp": datetime.utcnow().isoformat(),
            "debug_routes": {
                "public": ["/api/debug", "/api/health", "/api/info"],
                "operator": ["/api/stall/debug", "/api/stall/my-active-stalls", "/api/stall/wallet?stall_id=<stall_id>"],
                "visitor": ["/api/visitor/debug/topup", "/api/visitor/wallet"],
                "admin": ["/api/admin/storage-debug", "/api/admin/storage-debug?user_id=<user_id>"]
            },
            "request_info": {
                "method": request.method,
                "url": request.url,
                "origin": request.headers.get('Origin'),
                "user_agent": request.headers.get('User-Agent', '')[:100],
                "is_secure": request.is_secure,
                "scheme": request.scheme,
                "host": request.host
            }
        })

    @app.route("/api/<path:path>", methods=['OPTIONS'])
    def handle_options(path):
        """Handle all OPTIONS requests for CORS preflight"""
        app.logger.info(f'Handling OPTIONS preflight for: /api/{path}')
        app.logger.info(f'Origin: {request.headers.get("Origin")}')
        app.logger.info(f'Access-Control-Request-Method: {request.headers.get("Access-Control-Request-Method")}')
        app.logger.info(f'Access-Control-Request-Headers: {request.headers.get("Access-Control-Request-Headers")}')
        
        response = jsonify({"message": "CORS preflight OK"})
        origin = request.headers.get('Origin')
        
        # Allow localhost origins
        if origin and ('localhost' in origin or '127.0.0.1' in origin):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, content-type, Authorization, Accept, Origin, X-Requested-With, X-Visitor-Wallet-ID'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response.headers['Access-Control-Max-Age'] = '86400'  # Cache preflight for 24 hours
            app.logger.info(f'Set CORS headers for origin: {origin}')
        else:
            app.logger.warning(f'Rejected CORS preflight for origin: {origin}')
            
        return response

    @app.route("/api/health")
    def health():
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "environment": os.getenv('FLASK_ENV', 'development')
        })

    @app.route("/api/info")
    def info():
        return jsonify({
            "service": "PointX API",
            "version": "1.0.0",
            "description": "QR-based Point Management System for events and gaming",
            "features": [
                "QR Code Generation and Scanning",
                "Point Management System",
                "Real-time Balance Tracking",
                "Multi-role Authentication (Admin, Stall, Visitor)",
                "Transaction History",
                "Leaderboard System",
                "Attendance Tracking"
            ],
            "endpoints": {
                "authentication": "/api/auth",
                "admin": "/api/admin",
                "stall": "/api/stall", 
                "visitor": "/api/visitor"
            },
            "documentation": "/docs"
        })


def register_error_handlers(app):
    """Register global error handlers"""
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "error": "Bad Request",
            "message": "The request could not be understood by the server",
            "status_code": 400
        }), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            "error": "Unauthorized",
            "message": "Authentication required",
            "status_code": 401
        }), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            "error": "Forbidden",
            "message": "Insufficient permissions",
            "status_code": 403
        }), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "error": "Not Found",
            "message": "The requested resource was not found",
            "status_code": 404
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f'Server Error: {error}')
        return jsonify({
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
            "status_code": 500
        }), 500


def register_middleware(app):
    """Register middleware functions"""
    
    @app.after_request
    def after_request(response):
        # Add security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Add explicit CORS headers for debugging
        origin = request.headers.get('Origin')
        if origin and origin in ['http://localhost:3000', 'http://127.0.0.1:3000']:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, content-type, Authorization, Accept, Origin, X-Requested-With, X-Visitor-Wallet-ID'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            app.logger.info(f'Added explicit CORS headers for origin: {origin}')
        
        if not app.debug:
            app.logger.info(f'Response: {response.status_code}')
        
        return response


# Create the application instance for Render auto-detection
app = create_app()

if __name__ == "__main__":
    # Get port from environment variable
    port = int(os.getenv('PORT', 5000))
    # Force development mode for local testing
    debug = True
    
    app.run(
        host="0.0.0.0", 
        port=port, 
        debug=debug
    )
