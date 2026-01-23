# PointX

QR-based Point Management System for events and gaming.

## Project Structure

```
PointX/
├── backend/          # Flask API (deploy this folder to Render)
│   ├── routes/       # API routes
│   ├── .env         # Environment config
│   ├── app.py       # Main application
│   ├── wsgi.py      # WSGI entry point
│   └── render.yaml  # Render deployment config
└── frontend/        # React app (deploy to Netlify/Vercel)
    ├── src/         # Source code
    ├── .env         # Frontend config
    └── build/       # Production build
```

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
2. **Select "backend" folder as root directory**
3. Render will use `render.yaml` for configuration
4. Set environment variables in Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` 
   - `SECRET_KEY`
   - `JWT_SECRET`
   - `ALLOWED_ORIGINS` (your frontend domain)

### Frontend (Netlify/Vercel)
1. Connect GitHub repository  
2. **Select "frontend" folder as root directory**
3. Set build command: `npm run build`
4. Set publish directory: `build`
5. Add environment variable: `REACT_APP_API_BASE_URL=https://your-backend-url.onrender.com/api`

## Environment Variables

**Backend (.env):**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase service role key
- `SECRET_KEY` - Flask secret key
- `JWT_SECRET` - JWT signing key
- `ALLOWED_ORIGINS` - Frontend domain for CORS

**Frontend (.env):**
- `REACT_APP_API_BASE_URL` - Backend API URL