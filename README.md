# 🎮 Arcade QR Wallet System

A secure, production-ready QR-based arcade wallet system for game fairs, carnivals, and events.

## 🏗️ System Overview

**Three User Roles:**
- **Visitors**: Play games and earn points
- **Stalls**: Run games, charge entry fees, give score-based rewards  
- **Admin**: Control wallets, stalls, and money flow

**Game Flow:**
1. Visitor scans QR code → pays entry fee
2. Visitor plays game → stall enters score (0-10)
3. System calculates reward: `score × multiplier`
4. Points transferred automatically to visitor

## 🔐 Security Features

- **Anti-fraud**: Play ID locks prevent double scanning
- **Score validation**: Server-side calculation prevents cheating
- **Wallet security**: Stalls can only reward earned points
- **Atomic transactions**: All transfers are database-guaranteed
- **Audit trail**: Every point movement is logged

## 🚀 Quick Start

### Backend Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Database Setup

```bash
# Run the SQL schema in your Supabase dashboard
# 1. Copy contents of database_schema.sql
# 2. Paste in Supabase SQL Editor
# 3. Execute

# Run the RPC functions
# 1. Copy contents of supabase_functions.sql  
# 2. Paste in Supabase SQL Editor
# 3. Execute
```

### Create Admin User

```bash
python setup_admin.py
```

### Start Backend Server

```bash
python app.py
```

### Frontend Setup

```bash
# Run the setup script
./setup_frontend.sh

# Or manually:
cd frontend
npm install
npm start
```

### Test System

```bash
python test_system.py
```

**🌐 Access the app at: http://localhost:3000**

## 📱 Frontend Features

### 🎨 Modern React Interface
- **Role-based dashboards** for Admin, Stall, and Visitor users
- **Real-time QR generation** with download/print functionality
- **Camera-based QR scanning** for seamless game interactions
- **Responsive design** works on desktop and mobile
- **Live balance updates** and transaction history

### 📱 QR Code System
- **Visitor wallet QR**: Show to stall operators for payment
- **Stall game QR**: Display at games for visitors to scan
- **Real-time generation**: Create QR codes instantly in browser
- **Print & download**: Physical QR codes for events

### 🎮 Game Flow Interface
1. **Visitor Dashboard**: Show wallet QR → View games → Scan stall QR
2. **Stall Dashboard**: Scan visitor QR → Enter score → Auto-reward
3. **Admin Dashboard**: Create users/stalls → Monitor system → Top up wallets

## 📡 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/create-user` - Admin creates visitor accounts
- `POST /api/create-stall` - Admin creates stall accounts

### Game Flow
- `POST /api/play` - Start game (visitor scans QR)
- `POST /api/submit-score` - Submit score and calculate reward

### Wallet Management
- `GET /api/wallet/{wallet_id}` - Get wallet info
- `POST /api/topup` - Admin tops up wallets

### Admin Panel
- `GET /api/admin/wallets` - View all wallets
- `GET /api/admin/transactions` - View all transactions
- `GET /api/admin/plays` - View all game plays
- `POST /api/admin/freeze/{wallet_id}` - Freeze wallet

### Stall Management
- `GET /api/stalls` - List all stalls
- `GET /api/stall/{stall_id}/plays` - Get stall play history

## 🎯 Game Example

**Ring Toss Game Setup:**
- Price per play: 10 points
- Reward multiplier: 5.0x

**Game Session:**
1. Visitor scans QR → pays 10 points
2. Visitor plays → scores 7.5/10
3. Reward calculated: 7.5 × 5.0 = 37.5 → 38 points
4. Visitor receives 38 points automatically

## 🗄️ Database Schema

```sql
users (id, username, password_hash, role)
wallets (id, user_id, user_name, balance, is_active)
stalls (id, stall_name, wallet_id, price_per_play, reward_multiplier)
transactions (id, from_wallet, to_wallet, points_amount, type, stall_id)
plays (id, visitor_wallet, stall_id, price_paid, score, reward_given)
```

## 🔧 Configuration

### Environment Variables (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret
```

### Stall Configuration
Each stall has:
- `price_per_play`: Entry fee in points
- `reward_multiplier`: Points per score point

## 🧪 Testing

The system includes comprehensive tests:

```bash
# Test complete game flow
python test_system.py

# Manual API testing with curl
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 🛡️ Security Considerations

1. **Server-side validation**: All calculations happen on backend
2. **Role-based access**: Users can only access their authorized functions
3. **Wallet freezing**: Admin can disable problematic accounts
4. **Transaction logging**: Complete audit trail for all point movements
5. **Rate limiting**: Prevents rapid-fire QR scanning

## 🚀 Production Deployment

### Using Gunicorn
```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

### Environment Variables for Production
- Set strong `JWT_SECRET`
- Use production Supabase instance
- Enable HTTPS
- Configure proper CORS origins

## 📊 Monitoring

Key metrics to monitor:
- Transaction volume
- Failed payment attempts  
- Wallet balances
- Play completion rates
- Score distributions

## 🔄 Extending the System

Easy additions:
- **QR Code Generation**: Add QR endpoints for wallets/stalls
- **Leaderboards**: Track high scores across games
- **Prize Redemption**: Convert points to physical prizes
- **Multi-event Support**: Separate wallet pools per event
- **Mobile App**: React Native frontend

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Built for real-world arcade operations** 🎪
Scales from small carnivals to large festivals 🎡