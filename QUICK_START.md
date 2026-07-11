# ⚡ Quick Reference Guide

## 🚀 Fastest Way to Run the Project

### Option 1: Docker (Recommended - 3 steps)

1. **Add your Anthropic API key**
   ```bash
   # Edit backend/.env and add:
   ANTHROPIC_API_KEY=your_api_key_here
   ```

2. **Start the application**
   ```bash
   docker-compose up -d --build
   ```

3. **Open in browser**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs

### Option 2: Using Start Script

1. **Make script executable**
   ```bash
   chmod +x start.sh
   ```

2. **Run the script**
   ```bash
   ./start.sh
   ```

3. **Follow the prompts**

### Option 3: Manual Development

**Terminal 1 - Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Edit .env and add ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 3 - MongoDB (if not installed):**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:7.0
```

## 📝 Essential Commands

### Docker
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Rebuild
docker-compose up -d --build
```

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload

# Run with specific host/port
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔑 Required Environment Variables

### backend/.env
```env
MONGODB_URL=mongodb://mongodb:27017
DATABASE_NAME=code_review_db
SECRET_KEY=your-secret-key-min-32-chars
ANTHROPIC_API_KEY=your-anthropic-api-key
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### frontend/.env
```env
VITE_API_URL=http://localhost:8000/api/v1
```

## 🎯 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | Main application (dev) |
| Frontend | http://localhost:3000 | Main application (Docker) |
| Backend API | http://localhost:8000 | REST API |
| API Docs | http://localhost:8000/docs | Interactive API documentation |
| MongoDB | mongodb://localhost:27017 | Database |

## 🔍 Troubleshooting

### "Module not found" error
```bash
# Backend
pip install -r requirements.txt

# Frontend
npm install
```

### "Port already in use"
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### MongoDB connection error
```bash
# Start MongoDB with Docker
docker run -d -p 27017:27017 --name mongodb mongo:7.0
```

### API key not working
- Check if ANTHROPIC_API_KEY is set in backend/.env
- Verify API key is valid at console.anthropic.com
- Ensure no extra spaces in .env file

## 📚 Project Structure Overview

```
code-review-platform/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API routes (auth, review, analytics)
│   │   ├── core/        # Config, database, security
│   │   ├── models/      # Pydantic models
│   │   └── services/    # Business logic & AI
│   ├── requirements.txt
│   └── .env
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/  # Navbar, Sidebar
│   │   ├── pages/       # Login, Dashboard, Review, History
│   │   ├── services/    # API client
│   │   └── utils/       # Store, helpers
│   ├── package.json
│   └── .env
├── docker-compose.yml    # Multi-container setup
├── README.md            # Full documentation
├── DEPLOYMENT.md        # Deployment guide
├── PROJECT_GUIDE.md     # Presentation guide
└── start.sh            # Quick start script
```

## 🎓 First-Time Setup Checklist

- [ ] Get Anthropic API key from console.anthropic.com
- [ ] Copy .env.example files to .env
- [ ] Add API key to backend/.env
- [ ] Install Docker (or Python + Node.js)
- [ ] Run application
- [ ] Create an account
- [ ] Submit test code
- [ ] Check results

## 📱 Testing the Application

1. **Register an account** at /register
2. **Login** at /login
3. **Go to Review Code** page
4. **Paste sample code:**
   ```python
   def add(a, b):
       return a + b
   ```
5. **Click "Analyze Code"**
6. **View AI feedback**
7. **Check Dashboard** for stats
8. **View History** for past reviews

## 🔧 Common Customizations

### Change API Port
```bash
# Backend: Edit docker-compose.yml or run with:
uvicorn app.main:app --port 9000
```

### Change Frontend Port
```bash
# Edit frontend/vite.config.js:
server: { port: 3001 }
```

### Add New Language Support
1. Add to language list in `frontend/src/pages/ReviewCode.jsx`
2. Test with sample code
3. AI will automatically analyze

## 💡 Quick Tips

- **Frontend auto-refreshes** on code changes
- **Backend auto-reloads** with --reload flag
- **API docs are interactive** - try them at /docs
- **Check logs** if something fails
- **Use Docker** for easiest setup
- **Read PROJECT_GUIDE.md** before presentations

## 📞 Getting Help

1. Check README.md for detailed docs
2. Check DEPLOYMENT.md for production setup
3. Check PROJECT_GUIDE.md for viva prep
4. View API docs at /docs
5. Check application logs

## ✅ Verification Checklist

Run these to verify everything works:

```bash
# Backend health check
curl http://localhost:8000/health

# Frontend loads
curl http://localhost:5173

# MongoDB is running
docker ps | grep mongodb

# API documentation loads
curl http://localhost:8000/docs
```

All should return successful responses!

---

**Ready to code! 🚀**
