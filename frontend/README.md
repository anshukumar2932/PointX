# 🎮 Arcade Wallet Frontend

React-based frontend for the Arcade QR Wallet System with real-time QR code generation and scanning.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The app will open at `http://localhost:3000` and proxy API calls to `http://localhost:5000`.

## 📱 Features

### QR Code Generation
- **Real-time QR generation** for wallets and stalls
- **Download & Print** QR codes directly from browser
- **JSON data format** with version control

### QR Code Scanning
- **Camera-based scanning** using device camera
- **Real-time detection** with jsQR library
- **Error handling** for invalid QR codes

### Role-Based Dashboards

#### 👑 Admin Dashboard
- Create users and stalls
- Manage wallets and balances
- View all transactions and plays
- Generate QR codes for any wallet/stall
- Top up visitor wallets
- Freeze problematic accounts

#### 🎪 Stall Dashboard
- Scan visitor wallet QR codes
- Start games and charge entry fees
- Submit scores and auto-calculate rewards
- View play history and earnings
- Generate stall QR code for display

#### 🎮 Visitor Dashboard
- Display wallet QR code for payments
- Browse available games
- Scan stall QR codes to play
- View transaction history
- Real-time balance updates

## 🔧 Technical Stack

- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **qrcode.react** - QR code generation
- **jsQR** - QR code scanning
- **CSS Grid/Flexbox** - Responsive layouts

## 📱 QR Code Format

### Visitor Wallet QR
```json
{
  "type": "visitor",
  "wallet_id": "uuid",
  "name": "User Name",
  "version": "1.0"
}
```

### Stall Game QR
```json
{
  "type": "stall", 
  "stall_id": "uuid",
  "stall_name": "Game Name",
  "price_per_play": 10,
  "reward_multiplier": 5.0,
  "version": "1.0"
}
```

## 🎯 Game Flow

1. **Visitor shows wallet QR** → Stall scans → Payment processed
2. **Visitor plays game** → Stall enters score → Reward calculated
3. **Points transferred automatically** → Both balances updated

## 🔐 Security Features

- **JWT authentication** with role-based access
- **Server-side validation** for all transactions
- **Real-time balance updates** prevent double spending
- **Camera permissions** handled gracefully

## 📦 Build & Deploy

```bash
# Production build
npm run build

# Serve static files
npx serve -s build
```

## 🎨 Customization

The UI uses CSS custom properties for easy theming:

```css
:root {
  --primary-color: #4f46e5;
  --success-color: #10b981;
  --error-color: #ef4444;
}
```

## 📱 Mobile Support

- **Responsive design** works on all screen sizes
- **Camera access** for QR scanning on mobile
- **Touch-friendly** buttons and interactions
- **PWA ready** - can be installed as mobile app

---

**Ready for production arcade operations!** 🎪