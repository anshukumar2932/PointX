# PointX Frontend Web Application

React-based web application for PointX QR-based Point Management System, providing comprehensive admin, stall, and visitor interfaces.

## Overview

The PointX frontend is a modern React application that delivers a responsive web experience for event management. It features role-based dashboards, real-time QR code operations, and comprehensive analytics tools.

## Features

### Admin Dashboard
- **System Overview**: Real-time statistics, user metrics, and activity monitoring
- **User Management**: Create, search, filter, and manage all system users
- **Enhanced Bulk User Creation**: CSV upload with advanced validation and error reporting
- **Wallet Management**: Monitor balances, perform top-ups, freeze/unfreeze wallets
- **Attendance Tracking**: QR-based attendance with camera scanning and manual entry
- **Analytics**: Comprehensive reporting, leaderboards, and play statistics
- **Transaction History**: Complete audit trail of all system operations
- **Payment Verification**: Image preview for top-up request approvals

### Stall Dashboard
- **QR Scanner**: Real-time camera scanning of visitor QR codes
- **Game Operations**: Start games, submit scores, manage player sessions
- **Play History**: Transaction history and earnings tracking
- **Wallet Monitoring**: Real-time balance and transaction details
- **Performance Analytics**: Stall-specific metrics and statistics

### Visitor Dashboard
- **Personal QR Code**: Unique QR code generation for game participation
- **Wallet Management**: Balance tracking and transaction history
- **Leaderboards**: Score comparisons and ranking systems
- **Game History**: Complete play history and achievement tracking

### Additional Features
- **QR Code Debugging**: Advanced QR testing and validation tools
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Real-Time Updates**: Live data synchronization with backend
- **Modern UI**: Clean, intuitive interface with consistent design system
- **Google Authentication**: Login with Google OAuth

## Getting Started

### Prerequisites
- **Node.js**: Version 16.0 or higher
- **npm**: Version 8.0 or higher (or yarn equivalent)
- **PointX Backend**: Running backend API server

### Installation Steps

1. **Clone Repository**:
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Environment**:
   Create `.env` file in the frontend directory:
   ```env
   REACT_APP_API_BASE_URL=https://your-backend-url.com/api
   # For local development: http://localhost:5000/api
   ```

4. **Start Development Server**:
   ```bash
   npm start
   # or
   yarn start
   ```

5. **Access Application**:
   Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Architecture

```
frontend/
├── public/                     # Static assets
│   ├── index.html             # Main HTML template
│   └── favicon.ico            # Application icon
├── src/                       # Source code
│   ├── components/            # React components
│   │   ├── AdminDashboard.js        # Main admin interface
│   │   ├── StallDashboard.js        # Stall operations interface
│   │   ├── VisitorDashboard.js      # Visitor interface
│   │   ├── Login.js                 # Authentication component
│   │   ├── Navigation.js            # Navigation component
│   │   ├── QRGenerator.js           # QR code generation
│   │   ├── QRScanner.js             # QR code scanning
│   │   ├── QRDebugger.js            # QR debugging tools
│   │   └── GoogleAuthDebug.js       # Google auth debugging
│   ├── api/                   # API client functions
│   │   ├── axios.js                 # HTTP client configuration
│   │   ├── admin.js                 # Admin API functions
│   │   └── stall.js                 # Stall API functions
│   ├── context/               # React context providers
│   │   └── AuthContext.js           # Authentication context
│   ├── App.js                 # Main application component
│   ├── index.js               # Application entry point
│   ├── index.css              # Global styles
│   └── clubhouse-decorations.css    # Clubhouse theme styles
├── package.json               # Dependencies and scripts
├── craco.config.js           # Build configuration
└── .env                      # Environment variables
```

## Key Dependencies

### Core Framework
- **react**: ^18.2.0 - React framework
- **react-dom**: ^18.2.0 - React DOM rendering
- **react-router-dom**: ^6.3.0 - Client-side routing

### HTTP & API
- **axios**: ^1.4.0 - HTTP client for API communication

### QR Code Functionality
- **html5-qrcode**: ^2.3.8 - Camera-based QR code scanning
- **qrcode**: ^1.5.3 - QR code generation
- **qrcode.react**: ^3.1.0 - React QR code components
- **jsqr**: ^1.4.0 - QR code decoding

### Data Processing
- **papaparse**: ^5.5.3 - CSV parsing for bulk operations

### Build Tools
- **@craco/craco**: ^7.1.0 - Create React App Configuration Override
- **react-scripts**: 5.0.1 - Build scripts and configuration

## API Integration

The frontend integrates with the PointX backend API through a centralized API client:

### HTTP Client Configuration
```javascript
// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 10000,
});

// Request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### API Functions
```javascript
// src/api/admin.js
export const createUser = (data) => api.post('/admin/create-user', data);
export const bulkUsers = (users) => api.post('/admin/bulk-users', users);
export const getAllUsers = () => api.get('/admin/users');
export const adminTopup = (data) => api.post('/admin/topup', data);
```

## Enhanced Bulk User Creation

### New Features (v2.0.0)
- **CSV File Upload**: Drag-and-drop CSV file processing
- **Manual Text Entry**: Direct CSV text input for quick operations
- **Sample Template Download**: Pre-formatted CSV templates
- **Advanced Validation**: Real-time validation with detailed error reporting
- **Preview Mode**: Review users before creation with data preview table
- **Batch Processing**: Handle up to 100 users per operation
- **Progress Tracking**: Detailed success/error reporting

### CSV Format Support
```csv
username,password,role,name,price
visitor1,password123,visitor,John Doe,
visitor2,password456,visitor,Jane Smith,
stall1,stallpass123,stall,Game Stall 1,15
stall2,stallpass456,stall,Game Stall 2,20
admin2,adminpass123,admin,Admin User,
```

### Validation Features
- **Username Uniqueness**: Prevents duplicate usernames
- **Password Strength**: Minimum 6 characters requirement
- **Role Validation**: Ensures valid roles (visitor/stall/admin)
- **Data Sanitization**: Automatic data cleaning and formatting
- **Error Reporting**: Detailed feedback on validation failures

## UI/UX Design

### Design System
The application uses a consistent design system with:

```css
/* Color Palette */
:root {
  --primary: #4F46E5;      /* Indigo */
  --success: #10B981;      /* Green */
  --warning: #F59E0B;      /* Amber */
  --error: #EF4444;        /* Red */
  --background: #F9FAFB;   /* Light Gray */
  --surface: #FFFFFF;      /* White */
  --text-primary: #111827; /* Dark Gray */
  --text-secondary: #6B7280; /* Medium Gray */
}
```

### Responsive Design
- **Mobile-First**: Optimized for mobile devices with progressive enhancement
- **Breakpoints**: Responsive design for desktop, tablet, and mobile
- **Touch-Friendly**: Large touch targets and intuitive gestures
- **Accessibility**: WCAG 2.1 compliant with screen reader support

### Component Library
- **Reusable Components**: Consistent UI components across the application
- **Modular Design**: Easily maintainable and extensible component structure
- **Theme Support**: Centralized styling with CSS custom properties

## Authentication & Security

### Authentication Flow
```javascript
// src/context/AuthContext.js
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
    
    return true;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Security Features
- **JWT Token Management**: Secure token storage and automatic refresh
- **Role-Based Access Control**: UI elements adapt based on user permissions
- **XSS Protection**: Input sanitization and secure rendering
- **CSRF Protection**: Token-based request validation
- **Secure Storage**: Sensitive data handling best practices

## QR Code Operations

### QR Code Scanning
```javascript
// src/components/QRScanner.js
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScan }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.pause();
      },
      (error) => {
        // Handle scan errors
      }
    );

    return () => scanner.clear();
  }, [onScan]);

  return <div id="qr-reader" />;
};
```

### QR Code Generation
```javascript
// src/components/QRGenerator.js
import QRCode from 'qrcode.react';

const QRGenerator = ({ value, size = 256 }) => {
  return (
    <QRCode
      value={value}
      size={size}
      level="M"
      includeMargin={true}
      renderAs="canvas"
    />
  );
};
```

## Building for Production

### Build Process
```bash
# Create production build
npm run build

# Serve build locally for testing
npx serve -s build

# Analyze bundle size
npm run build -- --analyze
```

### Build Configuration
```javascript
// craco.config.js
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Custom webpack configuration
      return webpackConfig;
    },
  },
  babel: {
    plugins: [
      // Babel plugins
    ],
  },
};
```

### Environment Configuration
```env
# Production environment variables
REACT_APP_API_BASE_URL=https://your-production-api.com/api
REACT_APP_VERSION=$npm_package_version
REACT_APP_BUILD_DATE=$BUILD_DATE
```

## Deployment

### Netlify Deployment
1. **Connect Repository**: Link GitHub repository to Netlify
2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `build`
   - Node version: 16 or higher
3. **Environment Variables**: Set `REACT_APP_API_BASE_URL`
4. **Deploy**: Automatic deployment on git push

### Vercel Deployment
1. **Import Project**: Connect GitHub repository
2. **Framework Preset**: Create React App
3. **Build Settings**: Automatic detection
4. **Environment Variables**: Configure API URL
5. **Deploy**: Automatic deployment with preview URLs

### Manual Deployment
```bash
# Build for production
npm run build

# Upload build/ directory to your web server
# Configure web server to serve index.html for all routes
```

## Development Workflow

### Development Scripts
```bash
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Eject from Create React App (irreversible)
npm run eject
```

### Code Quality Tools
```bash
# Install development dependencies
npm install --save-dev eslint prettier husky lint-staged

# Format code
npx prettier --write src/

# Lint code
npx eslint src/

# Pre-commit hooks
npx husky add .husky/pre-commit "lint-staged"
```

### Testing
```bash
# Run unit tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in CI mode
npm test -- --ci --coverage --watchAll=false
```

## Configuration & Customization

### Environment Variables
```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:5000/api

# Feature Flags
REACT_APP_ENABLE_DEBUG=true
REACT_APP_ENABLE_ANALYTICS=false

# Build Configuration
GENERATE_SOURCEMAP=false
REACT_APP_VERSION=$npm_package_version
```

### Custom Styling
```css
/* src/index.css */
:root {
  /* Override default colors */
  --primary: #your-brand-color;
  --secondary: #your-secondary-color;
}

/* Custom component styles */
.custom-button {
  background: var(--primary);
  border-radius: 8px;
  padding: 12px 24px;
}
```

## Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version compatibility
node --version
npm --version
```

**API Connection Issues**
- Verify `REACT_APP_API_BASE_URL` is correct
- Check CORS configuration on backend
- Ensure backend server is running and accessible
- Check browser network tab for specific error details

**QR Scanner Not Working**
- Ensure HTTPS connection (required for camera access)
- Check camera permissions in browser
- Verify camera is not being used by another application
- Test with different browsers and devices

**Performance Issues**
```bash
# Analyze bundle size
npm run build -- --analyze

# Check for memory leaks
# Use React DevTools Profiler
# Monitor network requests in browser DevTools
```

### Debug Mode
```javascript
// Enable debug logging
if (process.env.REACT_APP_ENABLE_DEBUG === 'true') {
  console.log('Debug mode enabled');
  // Additional debug configuration
}
```

## Performance Optimization

### Best Practices
- **Code Splitting**: Lazy load components with React.lazy()
- **Memoization**: Use React.memo() and useMemo() for expensive operations
- **Image Optimization**: Compress and serve images in modern formats
- **Bundle Analysis**: Regular bundle size monitoring and optimization

### Monitoring
```javascript
// Performance monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## Version History

### v2.0.0 (February 10, 2026) - Latest
- Added Club House Theme with custom styling
- Google Authentication integration
- Performance improvements and timeout optimizations
- Bug fixes for login and error handling

### v1.5.0 (January 28-29, 2026)
- Performance optimization for data fetching
- UI improvements and bug fixes
- Admin dashboard enhancements

### v1.4.0 (January 25-27, 2026)
- UI improvements and redesign
- QR code issue resolutions
- Authentication interceptor simplification

### v1.3.0 (January 24, 2026)
- Production deployment configuration
- CORS fixes and environment setup

### v1.2.0 (January 23, 2026)
- Enhanced bulk user creation with CSV validation
- Multi-role dashboard implementation

### v1.1.0 (January 18-23, 2026)
- Frontend development and component creation
- QR code integration

### v1.0.0 (January 18, 2026)
- Initial release

## Contributing

1. **Fork Repository**: Create your own fork of the project
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Follow Standards**: Use ESLint and Prettier for code formatting
4. **Add Tests**: Include tests for new functionality
5. **Update Documentation**: Keep README and comments current
6. **Submit Pull Request**: Create detailed pull request with description

### Code Style Guidelines
- Use functional components with hooks
- Follow React best practices and patterns
- Maintain consistent naming conventions
- Add PropTypes or TypeScript for type safety
- Write meaningful commit messages

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support & Resources

### Documentation
- [React Documentation](https://reactjs.org/docs)
- [Create React App Documentation](https://create-react-app.dev/docs)
- [Axios Documentation](https://axios-http.com/docs)

### Community
- [React Community](https://reactjs.org/community/support.html)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/reactjs)
- [GitHub Issues](https://github.com/your-repo/issues)

### Development Tools
- [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

---

**PointX Frontend** - Modern, responsive web application delivering comprehensive event management capabilities.
