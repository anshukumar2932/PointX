# PointX Backend API

Flask-based REST API server for the PointX QR-based Point Management System.

## Overview

The PointX backend provides a comprehensive REST API for managing users, wallets, transactions, and game operations. Built with Flask and Supabase, it supports multi-role authentication and real-time data processing.

## Features

### Core Functionality
- **JWT Authentication**: Secure token-based authentication with role-based access
- **Multi-Role System**: Admin, Stall, and Visitor roles with specific permissions
- **Wallet Management**: Real-time balance tracking and transaction processing
- **Game Operations**: QR-based game initiation and score submission
- **Analytics**: Comprehensive reporting and leaderboard systems
- **Cross-Platform**: CORS-enabled for web and mobile clients

### New Features (v2.0.0)
- **Enhanced Bulk User Creation**: CSV upload with advanced validation
- **Duplicate Detection**: Username uniqueness checking
- **Batch Processing**: Handle up to 100 users per operation
- **Detailed Error Reporting**: Comprehensive validation feedback
- **Enhanced Security**: Improved input validation and sanitization
- **Google OAuth Integration**: Login with Google authentication

## Architecture

```
backend/
├── routes/                 # API route modules
│   ├── __init__.py        # Route registration
│   ├── admin.py           # Admin endpoints
│   ├── stall.py           # Stall endpoints
│   ├── visitor.py         # Visitor endpoints
│   └── auth_log.py        # Authentication endpoints
├── app.py                 # Main Flask application
├── auth.py                # Authentication middleware
├── supabase_client.py     # Database client configuration
├── wsgi.py                # WSGI entry point for production
├── requirements.txt       # Python dependencies
├── .env                   # Environment configuration
└── logs/                  # Application logs
    └── pointx.log
```

## Installation & Setup

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Supabase account and project

### Local Development

1. **Clone and navigate to backend**:
   ```bash
   cd backend
   ```

2. **Create virtual environment** (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run development server**:
   ```bash
   python app.py
   ```

The API will be available at `http://localhost:5000`

## Production Deployment

### Render Deployment (Recommended)

1. **Connect Repository**: Link your GitHub repository to Render
2. **Configure Service**:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn wsgi:app`
3. **Set Environment Variables** (see configuration section below)

### Alternative Platforms
- **Railway**: Similar setup, use `backend` as root directory
- **Heroku**: Add `Procfile` with `web: gunicorn wsgi:app`
- **DigitalOcean App Platform**: Configure with `backend` as source directory

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key

# Flask Configuration
SECRET_KEY=your_super_secret_flask_key_here
JWT_SECRET=your_jwt_signing_secret_key

# CORS Configuration
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://your-mobile-app.com

# Optional Configuration
FLASK_ENV=production
PORT=5000
```

### Required Variables
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Supabase service role key (not anon key)
- `SECRET_KEY`: Flask secret key for session management
- `JWT_SECRET`: Secret key for JWT token signing

### Optional Variables
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS
- `FLASK_ENV`: Environment mode (development/production)
- `PORT`: Server port (default: 5000)

## API Endpoints

### Authentication
```
POST /api/auth/login          # User login
POST /api/auth/logout         # User logout
```

### Admin Endpoints
```
# User Management
GET  /api/admin/users         # Get all users
POST /api/admin/create-user   # Create single user
POST /api/admin/bulk-users    # Bulk create users (visitors, operators, admins)
POST /api/admin/create-stall  # Create stall (physical entity, no user)

# Operator & Stall Management
GET  /api/admin/stalls              # Get all stalls with operator info
GET  /api/admin/search-operators    # Search operators with assignment status
GET  /api/admin/search-stalls       # Search stalls with operator info
POST /api/admin/assign-operator     # Assign operator to stall
POST /api/admin/remove-operator     # Remove operator from stall
POST /api/admin/activate-operator   # Activate operator session for stall
POST /api/admin/deactivate-operator # Deactivate operator session

# Wallet Management
GET  /api/admin/wallets       # Get all wallets
POST /api/admin/topup         # Admin wallet top-up
POST /api/admin/freeze/{id}   # Freeze wallet

# Analytics & Reporting
GET  /api/admin/plays         # Get all play transactions
GET  /api/admin/transactions  # Get all transactions
GET  /api/admin/leaderboard   # Get leaderboard

# Attendance
POST /api/admin/attendance    # Mark attendance

# Top-up Requests
GET  /api/admin/topup-requests     # Get pending requests
POST /api/admin/topup-approve      # Approve request
GET  /api/admin/topup-image/{path} # Get payment proof image
```

### Stall/Operator Endpoints
```
GET  /api/stall/my-active-stalls    # Get operator's active stalls
GET  /api/stall/wallet              # Get stall wallet info (legacy)
GET  /api/stall/history             # Get operator's play history
POST /api/stall/play                # Start new game (requires stall_id)
POST /api/stall/submit-score        # Submit game score
GET  /api/stall/pending-games       # Get pending games for active stalls
GET  /api/stall/visitor-balance/{id} # Get visitor balance
```

### Visitor Endpoints
```
GET /api/visitor/wallet       # Get visitor wallet
GET /api/visitor/history      # Get visitor play history
GET /api/visitor/leaderboard  # Get leaderboard
```

### Utility Endpoints
```
GET /api/health              # Health check
GET /api/docs                # API documentation
GET /api/openapi.json        # OpenAPI specification
```

## Authentication & Authorization

### JWT Token System
- **Login**: Returns JWT token valid for 24 hours
- **Authorization**: Include token in `Authorization: Bearer <token>` header
- **Role-Based Access**: Endpoints protected by user roles

### User Roles
- **Admin**: Full system access, user management, operator assignment, analytics
- **Operator**: Game operations at assigned stalls, score submission, stall management
- **Visitor**: Personal wallet, game history, leaderboard access

### Multi-Staff Architecture
- **Stalls**: Physical entities (booths/games) with no login credentials
- **Operators**: Users who operate stalls with login credentials
- **Sessions**: Admins activate/deactivate operators for specific stalls
- **Multi-Assignment**: One operator can be assigned to multiple stalls

## Enhanced Bulk User Creation

### New Bulk Upload Features
- **CSV Validation**: Comprehensive data validation before processing
- **Duplicate Detection**: Prevents creation of users with existing usernames
- **Batch Processing**: Handles up to 100 users per request
- **Error Reporting**: Detailed feedback on validation failures
- **Role-Specific Setup**: Automatic wallet and stall configuration

### API Request Format
```json
POST /api/admin/bulk-users
[
  {
    "username": "visitor1",
    "password": "password123",
    "role": "visitor",
    "name": "John Doe"
  },
  {
    "username": "operator1", 
    "password": "oppass123",
    "role": "operator",
    "name": "Operator One",
    "stall_name": "Game Stall 1"
  },
  {
    "username": "admin2",
    "password": "adminpass",
    "role": "admin",
    "name": "Admin User"
  }
]
```

### Response Format
```json
{
  "users": [
    {
      "user_id": "uuid",
      "user_name": "visitor1",
      "wallet_id": "uuid",
      "user_password": "password123",
      "role": "visitor"
    }
  ],
  "operator_assignments": [
    {
      "operator": "operator1",
      "stall": "Game Stall 1",
      "status": "assigned"
    }
  ]
}
```

## Database Schema

### Key Tables (Supabase)
- **users**: User accounts and authentication
- **wallets**: Point balances and wallet management
- **transactions**: All point transactions and transfers
- **stalls**: Stall configurations and pricing
- **attendance**: Event attendance tracking

### Database Functions (RPC)
- `admin_topup`: Secure wallet top-up operations
- `approve_topup_request`: Process top-up approvals
- `visitor_leaderboard`: Generate leaderboard rankings

## API Documentation

### Interactive Documentation
- **Swagger UI**: Available at `/api/docs` when server is running
- **OpenAPI Spec**: Available at `/api/openapi.json`

### Response Formats
All API responses follow consistent JSON format:
```json
{
  "data": {...},        // Success data
  "error": "message",   // Error message (if applicable)
  "success": true/false // Operation status
}
```

## Development

### Running Tests
```bash
# Install test dependencies
pip install pytest pytest-flask

# Run tests
pytest
```

### Code Quality
```bash
# Install development tools
pip install black flake8 mypy

# Format code
black .

# Lint code
flake8 .

# Type checking
mypy .
```

### Logging
- **Development**: Console output with DEBUG level
- **Production**: File logging to `logs/pointx.log`
- **Log Rotation**: Automatic log file rotation

## Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check Supabase project status and API limits
- Ensure service role key (not anon key) is used

**CORS Issues**
- Add your frontend domain to `ALLOWED_ORIGINS`
- Check browser console for specific CORS errors
- Verify preflight requests are handled correctly

**Authentication Failures**
- Check JWT secret key consistency
- Verify token expiration and refresh logic
- Ensure proper Authorization header format

**Performance Issues**
- Monitor Supabase usage and quotas
- Implement query optimization for large datasets
- Consider caching for frequently accessed data

### Debug Mode
```bash
export FLASK_ENV=development
export FLASK_DEBUG=1
python app.py
```

## Monitoring & Analytics

### Health Monitoring
- **Health Endpoint**: `/api/health` for uptime monitoring
- **Database Status**: Connection and query performance
- **Error Tracking**: Comprehensive error logging

### Performance Metrics
- **Response Times**: API endpoint performance tracking
- **Database Queries**: Query optimization and monitoring
- **User Activity**: Authentication and usage patterns

## Version History

### v2.1.0 (February 24, 2026) - Latest
- **Multi-Staff Architecture**: Complete separation of stalls (physical entities) from operators (users)
- **Operator Management**: Operators can be assigned to multiple stalls with session-based activation
- **Enhanced Admin APIs**: Added search endpoints for operators and stalls with real-time status
- **Stall Operations**: New `/my-active-stalls` endpoint for operators to view active assignments
- **CSV Improvements**: Updated bulk user creation to support operator role and stall assignments
- **API Enhancements**: Stall endpoints now require `stall_id` parameter for proper multi-stall support
- **Architecture Cleanup**: Removed legacy stall user creation, stalls now created independently

### v2.0.0 (February 10, 2026)
- Added Club House Theme
- Google Authentication integration
- Performance improvements and timeout optimizations
- Bug fixes for login and error handling

### v1.5.0 (January 28-29, 2026)
- Performance optimization for route fetching
- Query-related bug fixes
- Admin dashboard speed improvements

### v1.4.0 (January 25-27, 2026)
- UI improvements
- QR code issue resolutions
- Timeout adjustments
- Authentication interceptor simplification

### v1.3.0 (January 24, 2026)
- Production deployment configuration
- CORS fixes for production
- Environment variable setup

### v1.2.0 (January 23, 2026)
- Enhanced bulk user creation with CSV validation
- Frontend integration improvements

### v1.1.0 (January 18-23, 2026)
- Core features implementation
- Backend API development
- Supabase integration

### v1.0.0 (January 18, 2026)
- Initial release

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow PEP 8 coding standards
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request

## License

This project is licensed under the MIT License.

---

**PointX Backend** - Robust, scalable API powering seamless event management.
