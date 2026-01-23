"""
WSGI entry point for PointX API
Use this file for production deployment with gunicorn
"""

from app import create_app

# Create the application instance
application = create_app()

if __name__ == "__main__":
    application.run()