# PointX - QR-Based Point Management System

A comprehensive event management platform featuring QR code-based point transactions, web-based interfaces, and real-time game scoring.

## Overview

PointX is a complete ecosystem for managing points, games, and transactions at events. It supports multiple user roles (Admin, Operator, Visitor) with dedicated web interfaces and a robust API backend.

### Key Features

- **QR-Based Gaming**: Scan QR codes to start games and submit scores
- **Point Management**: Real-time wallet transactions and balance tracking
- **Multi-Role System**: Admin, Operator, and Visitor roles with specific permissions
- **Web-Based Interface**: Responsive React application for all devices
- **Analytics**: Comprehensive dashboards with leaderboards and statistics
- **Secure Authentication**: JWT-based auth with role-based access control
- **Real-Time Updates**: Live transaction processing and balance updates

## Architecture

```
PointX/
├── backend/              # Flask API Server
│   ├── routes/          # API endpoints (admin, stall, visitor, auth)
│   ├── app.py          # Main Flask application
│   ├── auth.py         # Authentication middleware
│   ├── supabase_client.py # Database client
│   └── requirements.txt # Python dependencies
├── frontend/            # React Web Application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── api/       # API client functions
│   │   └── context/   # Authentication context
│   └── package.json   # Node.js dependencies
└── docs/               # Documentation
```

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Supabase account and project

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials
pip install -r requirements.txt
python app.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
# Update REACT_APP_API_BASE_URL in .env
npm start
```

## Deployment

### Backend (Render/Railway/Heroku)
1. Connect your GitHub repository
2. **Set root directory to "backend"**
3. Configure environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SECRET_KEY`
   - `JWT_SECRET`
   - `ALLOWED_ORIGINS`

### Frontend (Netlify/Vercel)
1. Connect your GitHub repository
2. **Set root directory to "frontend"**
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
4. Environment variables:
   - `REACT_APP_API_BASE_URL=https://your-backend-url.com/api`

## Configuration

### Environment Variables

**Backend (.env)**
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
SECRET_KEY=your_flask_secret_key
JWT_SECRET=your_jwt_signing_key
ALLOWED_ORIGINS=https://your-frontend-domain.com
FLASK_ENV=production
PORT=5000
```

**Frontend (.env)**
```env
REACT_APP_API_BASE_URL=https://your-backend-url.com/api
```

## User Roles & Features

### Admin
- **Dashboard**: System overview with statistics
- **User Management**: Create, search, and manage all users
- **Bulk User Creation**: CSV upload with validation
- **Wallet Management**: View balances, top-ups, freeze wallets
- **Transaction History**: Complete audit trail
- **Analytics**: Leaderboards, play statistics
- **Attendance Tracking**: QR-based attendance marking

### Stall
- **QR Scanner**: Scan visitor QR codes to start games
- **Score Submission**: Enter and submit player scores
- **Play History**: View completed games and earnings
- **Wallet Info**: Check stall balance and transaction history

### Visitor
- **QR Code**: Personal QR code for game participation
- **Wallet**: View balance and transaction history
- **Leaderboard**: Compare scores with other players
- **Game History**: Track all played games and scores

## New Features

### Enhanced Bulk User Creation
- **CSV Upload**: Upload formatted CSV files with validation
- **Manual Entry**: Direct text input for quick bulk creation
- **Sample Templates**: Download pre-formatted CSV templates
- **Advanced Validation**: Username uniqueness, password strength, role validation
- **Error Reporting**: Detailed feedback on validation failures
- **Preview Mode**: Review users before creation
- **Batch Processing**: Handle up to 100 users per batch

### CSV Format
```csv
username,password,role,name,price,stall_name
visitor1,password123,visitor,John Doe,,
operator1,oppass123,operator,Operator One,,Game Stall 1
operator2,oppass456,operator,Operator Two,,
admin2,adminpass123,admin,Admin User,,
```

**Columns:**
- `username` (required): Unique username for login
- `password` (required): User password (min 6 characters)
- `role` (required): visitor, operator, or admin
- `name` (optional): Display name
- `price` (optional): Deprecated - not used
- `stall_name` (optional): For operators - assign to existing stall by name

**Architecture Notes:**
- Stalls are physical entities (booths/games) created separately via "Create Stall" tab
- Operators are users who operate stalls
- One operator can be assigned to multiple stalls
- Admins activate/deactivate operators for specific stalls via sessions
- Create stalls first, then create operators and assign them to stalls

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Admin APIs
- `GET /api/admin/users` - Get all users
- `POST /api/admin/create-user` - Create single user
- `POST /api/admin/bulk-users` - Bulk create users
- `GET /api/admin/wallets` - Get all wallets
- `POST /api/admin/topup` - Admin wallet top-up
- `GET /api/admin/plays` - Get play history
- `POST /api/admin/attendance` - Mark attendance

### Stall APIs
- `GET /api/stall/wallet` - Get stall wallet
- `POST /api/stall/play` - Start new game
- `POST /api/stall/submit-score` - Submit game score
- `GET /api/stall/history` - Get stall play history

### Visitor APIs
- `GET /api/visitor/wallet` - Get visitor wallet
- `GET /api/visitor/history` - Get visitor play history
- `GET /api/visitor/leaderboard` - Get leaderboard

## Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
export FLASK_ENV=development
python app.py
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

## Web Application Features

- **Responsive Design**: Optimized for desktop, tablet, and mobile browsers
- **Real-Time Updates**: Live data synchronization with backend
- **Camera Integration**: Browser-based QR code scanning
- **Offline Support**: Cached data and graceful error handling
- **Progressive Web App**: App-like experience in web browsers

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Granular permissions per user role
- **Password Hashing**: bcrypt encryption for user passwords
- **CORS Protection**: Configurable cross-origin resource sharing
- **Input Validation**: Comprehensive data validation and sanitization
- **SQL Injection Prevention**: Parameterized queries via Supabase

## Analytics & Reporting

- **Real-Time Dashboards**: Live statistics and metrics
- **Transaction Tracking**: Complete audit trail of all operations
- **Performance Metrics**: Game statistics and user engagement
- **Export Capabilities**: CSV export for external analysis
- **Leaderboards**: Dynamic ranking systems

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation at `/api/docs`

## Version History

### v2.1.0 (February 24, 2026) - Latest
- **Multi-Staff Architecture**: Complete separation of stalls (physical entities) from operators (users)
- **Operator Management**: Operators can be assigned to multiple stalls with session-based activation
- **Enhanced Admin APIs**: Added search endpoints for operators and stalls with real-time status
- **Stall Dashboard Updates**: Operators can view and select from multiple active stalls
- **CSV Improvements**: Updated bulk user creation to support operator role and stall assignments
- **API Enhancements**: New `/my-active-stalls` endpoint for operators to see their active assignments
- **Architecture Cleanup**: Removed legacy stall user creation, stalls now created independently

### v2.0.0 (February 10, 2026)
- **Added Club House Theme**: Complete UI redesign with clubhouse-inspired aesthetics
- **Google Authentication**: Integrated Google OAuth login functionality
- **Performance Improvements**: Increased timeout settings and optimized admin dashboard
- **Bug Fixes**: Resolved error bugs and login issues

### v1.5.0 (January 28-29, 2026)
- **Performance Optimization**: Reduced time taken to fetch routes
- **Query Improvements**: Fixed query-related bugs for better database performance
- **Bug Fixes**: Resolved pending score logic and various system bugs
- **Admin Enhancements**: Made admin dashboard faster and more responsive

### v1.4.0 (January 25-27, 2026)
- **UI Improvements**: Enhanced user interface with better visual design
- **QR Code Fixes**: Resolved all QR-related scanning and generation issues
- **Timeout Adjustments**: Increased timeout for better stability
- **Score System**: Fixed pending score resolution bugs
- **Authentication**: Simplified axios request/response interceptors

### v1.3.0 (January 24, 2026)
- **Production Deployment**: Production-ready configuration with CORS fixes
- **Environment Configuration**: Added API base URL to environment variables
- **Deployment Fixes**: Resolved multiple deployment issues for Vercel/Render
- **CORS Security**: Hardcoded domain support for production deployment
- **Community Contributions**: Merged pull requests with bug fixes and updates

### v1.2.0 (January 23, 2026)
- **Frontend Development**: Complete React-based web interface
- **Multi-Role Support**: Dedicated dashboards for Admin, Stall, and Visitor roles
- **Enhanced Bulk User Creation**: CSV upload with validation
- **QR Integration**: Browser-based QR scanning and generation

### v1.1.0 (January 18-23, 2026)
- **Core Features**: Basic point management and transaction system
- **Backend API**: Flask-based REST API with Supabase integration
- **Environment Setup**: Supabase and Flask configuration
- **Authentication**: JWT-based authentication system

### v1.0.0 (January 18, 2026)
- **Initial Release**: Project initialization and basic structure
- **Foundation**: Core architecture and database schema

---

**PointX** - Powering seamless event management through innovative QR technology.