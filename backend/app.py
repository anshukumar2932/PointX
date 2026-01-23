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
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Load configuration
    config_name = config_name or os.getenv('FLASK_ENV', 'development')
    
    # For now, use basic configuration until we fix the config import
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['DEBUG'] = os.getenv('FLASK_ENV') == 'development'
    
    # Setup logging
    setup_logging(app)
    
    # Setup CORS
    setup_cors(app)
    
    # Setup API documentation
    setup_api_docs(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register middleware
    register_middleware(app)
    
    return app


def setup_logging(app):
    """Configure application logging"""
    if not app.debug and not app.testing:
        # Create logs directory if it doesn't exist (for local development)
        # Render handles logging automatically
        try:
            if not os.path.exists('logs'):
                os.mkdir('logs')
            
            # Setup file handler with rotation
            file_handler = RotatingFileHandler(
                'logs/pointx.log', 
                maxBytes=10240000, 
                backupCount=10
            )
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
            ))
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
        except Exception:
            # If file logging fails (e.g., on Render), just use console
            pass
        
        app.logger.setLevel(logging.INFO)
        app.logger.info('PointX application startup')


def setup_cors(app):
    """Configure CORS settings"""
    allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
    
    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Visitor-Wallet-ID"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
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
    
    @app.before_request
    def log_request_info():
        if not app.debug:
            app.logger.info(f'{request.method} {request.url} - {request.remote_addr}')
    
    @app.after_request
    def after_request(response):
        # Add security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        if not app.debug:
            app.logger.info(f'Response: {response.status_code}')
        
        return response


# Create the application instance for Render auto-detection
app = create_app()

if __name__ == "__main__":
    # Get port from environment variable
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"Starting PointX API on port {port}")
    print(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
    print(f"Debug mode: {debug}")
    
    app.run(
        host="0.0.0.0", 
        port=port, 
        debug=debug
    )
