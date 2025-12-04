# Docker Deployment Guide

This guide explains how to run the Company Fit Explorer application using Docker containers.

## Prerequisites

- Docker and Docker Compose installed on your system
- A `.env` file with your configuration (copy from `.env.example`)

## Architecture

The application consists of two containerized services:

1. **app** - Next.js frontend application (port 3000)
2. **llm-server** - LLM API server for Anthropic integration (port 3002)

Both services communicate via a private Docker network (`app-network`).

## Quick Start

### 1. Ensure environment variables are set

Make sure you have a `.env.local` file with your Supabase credentials:

```bash
cp .env.example .env.local
# Edit .env.local with your actual credentials
```

### 2. Build and start the containers

**Option A: Use the helper script (recommended)**

```bash
./docker-rebuild.sh
```

**Option B: Manual build**

```bash
# Load environment variables and build
export $(cat .env.local | grep -v '^#' | xargs)
docker-compose build
docker-compose up -d
```

The `-d` flag runs the containers in detached mode (background).

> **Important**: Environment variables must be loaded before building because Next.js bakes `NEXT_PUBLIC_*` variables into the client-side code at build time.

### 3. Verify the services are running

```bash
docker-compose ps
```

You should see both `app` and `llm-server` with status "Up".

### 4. View logs

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for a specific service
docker-compose logs app
docker-compose logs llm-server
```

## Accessing the Application

Once the containers are running:

- **Web Application**: http://localhost:3000
- **LLM API Server**: http://localhost:3002

## Managing Containers

### Stop the services

```bash
docker-compose down
```

### Restart the services

```bash
docker-compose restart
```

### Rebuild and restart after code changes

**Recommended: Use the helper script**

```bash
./docker-rebuild.sh
```

**Or manually:**

```bash
export $(cat .env.local | grep -v '^#' | xargs)
docker-compose down
docker-compose build
docker-compose up -d
```

> **Note**: Always load environment variables before building to ensure `NEXT_PUBLIC_*` variables are embedded in the client-side code.

## Environment Variables

The following environment variables are required (set them in your `.env` file):

### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### LLM Configuration
- `ANTHROPIC_API_KEY` - Your Anthropic API key for Claude

### Internal Configuration
- `NEXT_PUBLIC_LLM_SERVER_URL` - Set to `http://llm-server:3002` (internal Docker network)

## Troubleshooting

### "Supabase environment variables not found. Using mock client for build."

This console error means the Next.js build didn't have access to your Supabase credentials. 

**Solution**: Rebuild with environment variables:

```bash
./docker-rebuild.sh
```

This ensures `NEXT_PUBLIC_*` variables are embedded in the client-side JavaScript during the build.

### Port already in use

If you see an error like "port is already allocated", stop any conflicting services:

```bash
# Find what's using port 3000
lsof -i :3000

# Stop a specific container
docker stop <container-name>
```

### Container crashes or won't start

Check the logs for errors:

```bash
docker-compose logs <service-name>
```

### Rebuild from scratch

If you encounter issues, try a clean rebuild:

```bash
export $(cat .env.local | grep -v '^#' | xargs)
docker-compose down -v  # -v removes volumes
docker-compose build --no-cache
docker-compose up -d
```

## Production Considerations

For production deployment:

1. Use a reverse proxy (nginx, Caddy) in front of the containers
2. Set up SSL/TLS certificates
3. Configure proper secrets management (don't commit `.env` files)
4. Set up health checks and monitoring
5. Configure container restart policies
6. Use Docker volumes for persistent data if needed

## Development vs Production

### Development Mode

For local development with hot-reload, use the regular npm scripts instead:

```bash
npm run dev:full
```

### Production Mode

The Docker setup is optimized for production with:
- Multi-stage builds for smaller images
- Standalone Next.js output
- Production-optimized Node.js settings
- Security hardening (non-root user)

## Container Specifications

### App Container
- Base: Node.js 20 Alpine
- Size: ~150MB (optimized with standalone build)
- User: nextjs (non-root)
- Exposed Port: 3000

### LLM Server Container
- Base: Node.js 20 Alpine
- Size: ~50MB
- Production dependencies only
- Exposed Port: 3002

## Updating the Application

To update the application after pulling new code:

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

## Support

For issues or questions:
- Check the main README.md
- Review the application logs
- Consult the troubleshooting documentation

