#!/bin/bash
# Helper script to rebuild and restart Docker containers with environment variables

set -e

echo "🔄 Checking environment configuration..."

# Ensure .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local not found"
    echo "   Please create .env.local with your configuration"
    exit 1
fi

# Create .env symlink if it doesn't exist (docker-compose auto-loads .env)
if [ ! -L .env ] && [ ! -f .env ]; then
    echo "🔗 Creating .env symlink to .env.local..."
    ln -s .env.local .env
fi

echo "🛑 Stopping existing containers..."
docker-compose down

echo "🔨 Rebuilding containers..."
docker-compose build

echo "🚀 Starting containers..."
docker-compose up -d

echo ""
echo "✅ Done! Containers are running."
echo ""
echo "📊 View logs with: docker-compose logs -f"
echo "🌐 Access app at: http://localhost:3000"
echo "🧪 LLM API at: http://localhost:3002"

