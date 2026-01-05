#!/bin/bash
# Quick start script for Career Crawler

set -e

echo "================================="
echo "Career Crawler - Quick Start"
echo "================================="
echo ""

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✓ Docker and docker-compose are installed"
echo ""

# Stop any existing containers
echo "Stopping any existing containers..."
docker-compose down 2>/dev/null || true

# Build and start services
echo "Building and starting services..."
docker-compose up -d --build

echo ""
echo "Waiting for services to be ready..."

# Wait for database
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U crawler &> /dev/null; then
        echo "✓ Database is ready"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for API
echo "Waiting for API to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health &> /dev/null; then
        echo "✓ API is ready"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "================================="
echo "✓ Career Crawler is running!"
echo "================================="
echo ""
echo "API URL:              http://localhost:8000"
echo "Interactive API docs: http://localhost:8000/docs"
echo "Alternative docs:     http://localhost:8000/redoc"
echo ""
echo "Quick test:"
echo "  curl http://localhost:8000/health"
echo ""
echo "Start a crawl:"
echo '  curl -X POST http://localhost:8000/crawl \\'
echo '    -H "Content-Type: application/json" \\'
echo '    -d '"'"'{"companies":[{"name":"Example","career_url":"https://example.com/careers"}]}'"'"
echo ""
echo "View logs:"
echo "  docker-compose logs -f"
echo ""
echo "Stop services:"
echo "  docker-compose down"
echo ""
echo "See API_REQUESTS.md for more examples!"
echo ""


