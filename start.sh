#!/bin/bash

# AI-Powered Code Review Platform - Quick Start Script

echo "🚀 Starting AI-Powered Code Review Platform..."
echo ""

# Check if .env files exist
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env not found. Creating from template..."
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env - Please edit it and add your ANTHROPIC_API_KEY"
    echo ""
    read -p "Press Enter after you've added your API key..."
fi

if [ ! -f "frontend/.env" ]; then
    echo "⚠️  frontend/.env not found. Creating from template..."
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env"
    echo ""
fi

# Check for Docker
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "✅ Docker and Docker Compose found"
    echo ""
    echo "🐳 Starting with Docker Compose..."
    docker-compose up -d --build
    echo ""
    echo "✅ Application started!"
    echo ""
    echo "📱 Access points:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    echo ""
    echo "📊 View logs:"
    echo "   docker-compose logs -f"
    echo ""
    echo "🛑 Stop application:"
    echo "   docker-compose down"
else
    echo "⚠️  Docker not found. Starting in development mode..."
    echo ""
    
    # Check for Python
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 not found. Please install Python 3.11+"
        exit 1
    fi
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    
    # Check for MongoDB
    if ! command -v mongod &> /dev/null && ! docker ps | grep -q mongodb; then
        echo "⚠️  MongoDB not found. Starting MongoDB with Docker..."
        docker run -d -p 27017:27017 --name code-review-mongodb mongo:7.0
        echo "✅ MongoDB started"
    fi
    
    echo "🔧 Setting up backend..."
    cd backend
    
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    pip install -r requirements.txt
    
    echo "✅ Backend setup complete"
    echo "🚀 Starting backend on port 8000..."
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    
    cd ..
    
    echo ""
    echo "🔧 Setting up frontend..."
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    echo "✅ Frontend setup complete"
    echo "🚀 Starting frontend on port 5173..."
    npm run dev &
    FRONTEND_PID=$!
    
    cd ..
    
    echo ""
    echo "✅ Application started in development mode!"
    echo ""
    echo "📱 Access points:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    echo ""
    echo "🛑 Stop application:"
    echo "   Press Ctrl+C or run: kill $BACKEND_PID $FRONTEND_PID"
    
    # Wait for Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
    wait
fi
