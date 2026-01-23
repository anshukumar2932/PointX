# PointX

QR-based Point Management System for events and gaming.

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
# Update REACT_APP_API_BASE_URL in .env for production
npm install
npm start
```

## Deployment

### Backend (Render)
1. Connect GitHub repository
2. Set environment variables in Render dashboard
3. Deploy using `render.yaml`

### Frontend (Netlify/Vercel)
1. Connect GitHub repository  
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add environment variable: `REACT_APP_API_BASE_URL`

## Environment Variables

**Backend (.env):**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase service role key
- `SECRET_KEY` - Flask secret key
- `JWT_SECRET` - JWT signing key

**Frontend (.env):**
- `REACT_APP_API_BASE_URL` - Backend API URL