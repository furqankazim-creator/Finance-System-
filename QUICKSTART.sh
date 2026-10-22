#!/bin/bash

# Finance Management System — Quick Start Script
# This script sets up and runs the system locally

set -e  # Exit on error

echo "🚀 Finance Management System — Local Setup"
echo "==========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $(node --version) found"

# Check MongoDB (optional warning)
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not in PATH. Make sure MongoDB is running (local or cloud)"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Setup backend
echo ""
echo "📦 Setting up backend..."
cd backend

# Copy .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created backend/.env — EDIT THIS with your MongoDB & Supabase credentials"
    echo "   Then re-run this script"
    exit 1
fi

# Install dependencies
npm install > /dev/null 2>&1
echo "✅ Backend dependencies installed"

# Optionally seed database
read -p "Seed database with demo data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run seed
    echo "✅ Database seeded"
fi

# Setup frontend
echo ""
echo "📱 Setting up frontend..."
cd ../frontend

# Copy .env.local if not exists
if [ ! -f .env.local ]; then
    cp .env.local.example .env.local
    echo "✅ Created frontend/.env.local — EDIT THIS with your Supabase credentials"
    echo "   Then re-run this script"
    exit 1
fi

# Install dependencies
npm install > /dev/null 2>&1
echo "✅ Frontend dependencies installed"

echo ""
echo "✨ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Edit ./backend/.env with your Supabase & MongoDB credentials"
echo "  2. Edit ./frontend/.env.local with your Supabase credentials"
echo "  3. Run: npm run dev:all (from root) or:"
echo "     Terminal 1 (backend): cd backend && npm run dev"
echo "     Terminal 2 (frontend): cd frontend && npm run dev"
echo ""
echo "🌐 Open http://localhost:3000 and sign up with Supabase"
echo ""
