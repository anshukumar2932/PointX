# PointX Backend API

QR-based Point Management System Backend

## Local Development

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
pip install -r requirements.txt
python app.py
```

## Render Deployment

1. In Render, select "backend" folder as root directory
2. Set environment variables:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_KEY` - Your Supabase service role key  
   - `SECRET_KEY` - Flask secret key
   - `JWT_SECRET` - JWT signing key
   - `ALLOWED_ORIGINS` - Frontend domain (e.g., https://your-frontend.netlify.app)

## API Documentation

- Health: `/api/health`
- Docs: `/docs`
- OpenAPI: `/openapi.json`

## Environment Variables

Required:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SECRET_KEY`
- `JWT_SECRET`

Optional:
- `FLASK_ENV` (default: development)
- `PORT` (default: 5000)
- `ALLOWED_ORIGINS` (default: http://localhost:3000)