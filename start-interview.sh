#!/bin/bash
# Quick start script for the Interview feature with Ollama
# This runs a lightweight stack for just the interview functionality

set -e

COMPOSE_FILE="docker-compose.interview.yml"

echo "============================================"
echo "🎙️  Career Interview - Quick Start"
echo "============================================"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "   Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "❌ Error: Docker daemon is not running"
    echo "   Please start Docker and try again"
    exit 1
fi

# Parse arguments
ACTION=${1:-up}

case $ACTION in
    up|start)
        echo "🚀 Starting Interview services..."
        docker-compose -f $COMPOSE_FILE up -d
        
        echo ""
        echo "============================================"
        echo "✅ Services started!"
        echo "============================================"
        echo ""
        echo "🌐 App:      http://localhost:3000"
        echo "💬 Interview: http://localhost:3000/interview"
        echo "🤖 Ollama:   http://localhost:11434"
        echo ""
        echo "⏳ First run downloads Llama 3.2 3B (~2GB)."
        echo "   Check model download progress:"
        echo "   docker logs -f interview-ollama-init"
        echo ""
        echo "📊 View all logs:"
        echo "   docker-compose -f $COMPOSE_FILE logs -f"
        ;;
        
    down|stop)
        echo "🛑 Stopping Interview services..."
        docker-compose -f $COMPOSE_FILE down
        echo "✅ Services stopped."
        ;;
        
    restart)
        echo "🔄 Restarting Interview services..."
        docker-compose -f $COMPOSE_FILE restart
        echo "✅ Services restarted."
        ;;
        
    logs)
        docker-compose -f $COMPOSE_FILE logs -f
        ;;
        
    status)
        echo "📊 Service Status:"
        docker-compose -f $COMPOSE_FILE ps
        echo ""
        echo "🤖 Ollama Models:"
        docker exec interview-ollama ollama list 2>/dev/null || echo "   Ollama not running"
        ;;
        
    pull-model)
        MODEL=${2:-llama4:scout}
        echo "📥 Pulling model: $MODEL"
        docker exec interview-ollama ollama pull $MODEL
        ;;
        
    rebuild)
        echo "🔨 Rebuilding containers..."
        docker-compose -f $COMPOSE_FILE build --no-cache
        docker-compose -f $COMPOSE_FILE up -d
        echo "✅ Rebuild complete."
        ;;
        
    *)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  up, start     Start all interview services (default)"
        echo "  down, stop    Stop all services"
        echo "  restart       Restart all services"
        echo "  logs          Follow service logs"
        echo "  status        Show service status and available models"
        echo "  pull-model    Pull a specific Ollama model (e.g., ./start-interview.sh pull-model llama3.2:3b)"
        echo "  rebuild       Rebuild and restart containers"
        ;;
esac

