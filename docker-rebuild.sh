#!/bin/bash
# Helper script to rebuild and restart Docker containers with environment variables

set -e

echo "🔄 Loading environment variables from .env.local..."
export $(cat .env.local | grep -v '^#' | xargs)

echo "🛑 Stopping existing containers..."
docker-compose down

echo "🔨 Rebuilding containers..."
docker-compose build

echo "🚀 Starting containers..."
docker-compose up -d

echo "✅ Done! Containers are running."
echo ""
echo "📊 View logs with: docker-compose logs -f"
echo "🌐 Access app at: http://localhost:3000"

