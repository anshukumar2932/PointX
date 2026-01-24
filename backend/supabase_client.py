"""
PointX Supabase Client Configuration
Handles database connection with environment-based configuration
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client
import logging

# Setup logging
logger = logging.getLogger(__name__)

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

# Load .env file if it exists
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    logger.info(f"Loaded environment from {ENV_PATH}")
else:
    logger.warning(f"No .env file found at {ENV_PATH}")

# Get Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

# Validate required configuration
if not SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL environment variable is required. "
        "Please set it in your .env file or environment."
    )

if not SUPABASE_KEY:
    raise RuntimeError(
        "SUPABASE_KEY (or SUPABASE_SERVICE_KEY) environment variable is required. "
        "Please set it in your .env file or environment."
    )

# Validate URL format
if not SUPABASE_URL.startswith(('http://', 'https://')):
    raise RuntimeError(
        f"Invalid SUPABASE_URL format: {SUPABASE_URL}. "
        "URL must start with http:// or https://"
    )

try:
    # Create Supabase client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Supabase client initialized successfully")

    # Test connection (optional - can be disabled in production)
    if os.getenv('FLASK_ENV') == 'development':
        try:
            # Simple test query to verify connection
            test_result = supabase.table('users').select('id').limit(1).execute()
            logger.info("Supabase connection test successful")
        except Exception as e:
            logger.warning(f"Supabase connection test failed: {e}")
            
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    raise RuntimeError(f"Supabase initialization failed: {e}")

# Export client
__all__ = ['supabase']
