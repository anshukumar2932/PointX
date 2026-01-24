# PointX Deployment Guide

## Backend Deployment (Render)

### Environment Variables to Set in Render Dashboard:

```
FLASK_ENV=production
SECRET_KEY=<generate-a-strong-secret-key>
DEBUG=false
JWT_SECRET=<generate-a-strong-jwt-secret>
JWT_EXPIRATION_HOURS=24
SUPABASE_URL=https://sqcyytvdjeenzwpdlcjc.supabase.co
SUPABASE_KEY=<your-actual-supabase-service-role-key>
ALLOWED_ORIGINS=https://pointx-fyi.vercel.app,https://your-custom-domain.com
LOG_LEVEL=INFO
UPLOAD_FOLDER=uploads
MAX_FILE_SIZE=16777216
```

### Render Configuration:
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn --bind 0.0.0.0:$PORT app:app`
- **Root Directory**: Select `backend` folder

## Frontend Deployment (Vercel)

### Environment Variables to Set in Vercel Dashboard:

```
REACT_APP_API_BASE_URL=https://your-backend-app.onrender.com/api
GENERATE_SOURCEMAP=false
```

### Vercel Configuration:
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Root Directory**: Select `frontend` folder

## Local Development Setup

### Backend (.env):
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your local values
```

### Frontend (.env):
```bash
cp frontend/.env.example frontend/.env
# Edit frontend/.env with local API URL
```

## Security Notes

- Never commit actual secrets to version control
- Use strong, unique secrets for production
- Rotate secrets regularly
- Use environment-specific configurations
- Enable CORS only for trusted domains in production

## Testing Deployment

1. **Backend Health Check**: `https://your-backend-app.onrender.com/api/health`
2. **Frontend**: `https://your-frontend-app.vercel.app`
3. **API Documentation**: `https://your-backend-app.onrender.com/docs`