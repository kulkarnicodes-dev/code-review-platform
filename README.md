# 🚀 AI-Powered Code Review Platform

A production-ready, full-stack application that provides intelligent code analysis using Claude AI. Built with React, FastAPI, and MongoDB.

![CodeReview AI](https://img.shields.io/badge/CodeReview-AI-blue)
![React](https://img.shields.io/badge/React-18.2-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47a248)

## ✨ Features

### Core Features
- 🔍 **AI-Powered Code Review** - Intelligent analysis using Claude AI
- 📊 **Quality Scoring** - Comprehensive metrics for code quality
- 🐛 **Bug Detection** - Identify potential errors and issues
- ⚡ **Performance Suggestions** - Optimization recommendations
- 🔒 **Security Analysis** - Security vulnerability detection
- 🌐 **Multi-Language Support** - Python, JavaScript, Java, C++, and more

### Advanced Features
- 📈 **Analytics Dashboard** - Track your improvement over time
- 📜 **Review History** - Access all past code reviews
- 🎨 **Modern UI** - Sleek, responsive design with dark theme
- 🔐 **Secure Authentication** - JWT-based auth system
- 💾 **Persistent Storage** - MongoDB database integration

## 🏗️ Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   React     │ ───▶ │   FastAPI   │ ───▶ │   MongoDB   │
│  Frontend   │      │   Backend   │      │  Database   │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │  Claude AI  │
                     │     API     │
                     └─────────────┘
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Python** (v3.11 or higher)
- **MongoDB** (v7.0 or higher)
- **Docker** (optional, for containerized deployment)
- **Anthropic API Key** (get one at https://console.anthropic.com/)

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd code-review-platform
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   ```
   
   Edit `backend/.env` and add your Anthropic API key:
   ```env
   ANTHROPIC_API_KEY=your_api_key_here
   SECRET_KEY=your_secret_key_here
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Option 2: Manual Setup

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `MONGODB_URL` - MongoDB connection string
   - `SECRET_KEY` - Secret key for JWT tokens

5. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7.0
   
   # Or use your local MongoDB installation
   mongod
   ```

6. **Run the backend**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```env
   VITE_API_URL=http://localhost:8000/api/v1
   ```

4. **Run the frontend**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 📖 Usage Guide

### 1. Register an Account
- Navigate to http://localhost:5173 (or :3000 for Docker)
- Click "Sign Up"
- Enter your details and create an account

### 2. Submit Code for Review
- Log in to your account
- Navigate to "Review Code"
- Select your programming language
- Paste or type your code
- Click "Analyze Code"

### 3. View Results
- Review the AI-generated feedback
- Check scores for:
  - Code Quality
  - Readability
  - Performance
  - Security
- Review detailed suggestions for improvements

### 4. Track Your Progress
- Visit the Dashboard to see:
  - Total reviews
  - Average scores
  - Language usage statistics
  - Score trends over time

## 🔧 Configuration

### Backend Configuration

Edit `backend/.env`:

```env
# Database
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=code_review_db

# Security
SECRET_KEY=your-secret-key-min-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Service
ANTHROPIC_API_KEY=your-anthropic-api-key

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Environment
ENVIRONMENT=development
```

### Frontend Configuration

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## 📁 Project Structure

```
code-review-platform/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Core config and security
│   │   ├── models/        # Pydantic models
│   │   └── services/      # Business logic
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── utils/         # Utilities and store
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
└── README.md
```

## 🧪 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user

### Code Review
- `POST /api/v1/review/` - Submit code for review
- `GET /api/v1/review/{id}` - Get specific review
- `GET /api/v1/review/` - Get all user reviews
- `POST /api/v1/review/refactor` - Refactor code

### Analytics
- `GET /api/v1/analytics/stats` - Get user statistics

Full API documentation available at: http://localhost:8000/docs

## 🎨 Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Monaco Editor** - Code editor
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **Zustand** - State management
- **Axios** - HTTP client

### Backend
- **FastAPI** - Web framework
- **Motor** - Async MongoDB driver
- **Anthropic** - Claude AI integration
- **Pydantic** - Data validation
- **python-jose** - JWT tokens
- **passlib** - Password hashing

### Database
- **MongoDB** - NoSQL database

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Web server (production)

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Environment variable configuration
- MongoDB connection security

## 🚢 Deployment

### Production Deployment

1. **Update environment variables** for production
2. **Build and deploy** using Docker Compose:
   ```bash
   docker-compose -f docker-compose.yml up -d --build
   ```

3. **Configure domain** and SSL certificates
4. **Set up monitoring** and logging

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 📝 Environment Variables

### Required
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `SECRET_KEY` - JWT secret key (min 32 characters)
- `MONGODB_URL` - MongoDB connection string

### Optional
- `GITHUB_CLIENT_ID` - For GitHub OAuth
- `GITHUB_CLIENT_SECRET` - For GitHub OAuth
- `CORS_ORIGINS` - Allowed CORS origins

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Claude AI by Anthropic
- React community
- FastAPI community
- MongoDB team

## 📞 Support

For support, please open an issue in the repository or contact the maintainers.

---

**Built with ❤️ for the developer community**
