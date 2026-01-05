# Docker Deployment Guide

This guide explains how to run the Career Crawler using Docker and docker-compose.

## Quick Start

```bash
# 1. Start all services
docker-compose up -d

# 2. Wait for services to be ready (10-15 seconds)
docker-compose ps

# 3. Check API health
curl http://localhost:8000/health

# 4. View interactive API docs
open http://localhost:8000/docs
```

That's it! The API is now running and ready to accept requests.

---

## What Gets Started

When you run `docker-compose up`, two services start:

### 1. PostgreSQL Database (`postgres`)
- **Container**: `career_crawler_db`
- **Port**: 5432 (mapped to host)
- **Data**: Persisted in Docker volume `postgres_data`
- **Credentials**: 
  - Database: `career_crawler`
  - User: `crawler`
  - Password: `crawler_password_change_me`

### 2. Crawler API (`crawler_api`)
- **Container**: `career_crawler_api`
- **Port**: 8000 (mapped to host)
- **Logs**: Saved to `./logs` directory
- **Auto-restart**: Yes (unless stopped)

---

## Common Commands

### Starting Services

```bash
# Start all services in background
docker-compose up -d

# Start and view logs
docker-compose up

# Start only specific service
docker-compose up -d postgres
```

### Stopping Services

```bash
# Stop all services
docker-compose stop

# Stop and remove containers (data is preserved)
docker-compose down

# Stop and remove everything including volumes (⚠️ DELETES DATA)
docker-compose down -v
```

### Viewing Logs

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs -f crawler_api

# Last 100 lines
docker-compose logs --tail=100
```

### Service Status

```bash
# Check if services are running
docker-compose ps

# Check resource usage
docker stats career_crawler_api career_crawler_db
```

### Restarting Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart crawler_api
```

---

## Building and Rebuilding

### Build Image

```bash
# Build the crawler image
docker-compose build

# Build without cache (clean build)
docker-compose build --no-cache
```

### Rebuild After Code Changes

```bash
# Stop, rebuild, and restart
docker-compose down
docker-compose build
docker-compose up -d
```

---

## Accessing Services

### API

- **URL**: http://localhost:8000
- **Interactive docs**: http://localhost:8000/docs
- **Alternative docs**: http://localhost:8000/redoc
- **Health check**: http://localhost:8000/health

### Database

Connect directly to PostgreSQL:

```bash
# Using psql from host
psql -h localhost -p 5432 -U crawler -d career_crawler

# Using Docker exec
docker exec -it career_crawler_db psql -U crawler -d career_crawler
```

---

## Configuration

### Environment Variables

Edit `docker-compose.yml` to change:

```yaml
environment:
  DB_HOST: postgres
  DB_PORT: 5432
  DB_NAME: career_crawler
  DB_USER: crawler
  DB_PASSWORD: your_secure_password_here  # ← Change this!
  LOG_LEVEL: INFO
```

### Ports

Change mapped ports in `docker-compose.yml`:

```yaml
ports:
  - "8080:8000"  # Map to different host port
```

### Resource Limits

Add resource limits:

```yaml
crawler_api:
  # ... other config ...
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

---

## Data Persistence

### Database Volume

Data is stored in a Docker volume named `postgres_data`:

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect webcrawler_postgres_data

# Backup volume
docker run --rm -v webcrawler_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/db_backup.tar.gz /data

# Restore volume
docker run --rm -v webcrawler_postgres_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/db_backup.tar.gz -C /
```

### Logs Directory

Application logs are saved to `./logs` on the host:

```bash
ls -la logs/
```

---

## Development vs Production

### Development Setup

For development with live code reloading:

```yaml
crawler_api:
  # ... other config ...
  volumes:
    - ./:/app  # Mount code directory
  command: uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

### Production Setup

For production (current configuration):

1. **Change Database Password** in `docker-compose.yml`
2. **Use Environment File**:

```bash
# Create .env.prod
cat > .env.prod << EOF
DB_PASSWORD=super_secure_password_here
LOG_LEVEL=WARNING
EOF

# Use in docker-compose
docker-compose --env-file .env.prod up -d
```

3. **Add Nginx Reverse Proxy** (recommended):

```yaml
# Add to docker-compose.yml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf
  depends_on:
    - crawler_api
```

4. **Enable HTTPS** with Let's Encrypt
5. **Add Rate Limiting** at the proxy level
6. **Configure Monitoring** (Prometheus, Grafana)

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs for errors
docker-compose logs crawler_api

# Check if port is already in use
lsof -i :8000

# Remove and recreate
docker-compose down
docker-compose up -d
```

### Database Connection Error

```bash
# Wait for database to be ready
docker-compose exec postgres pg_isready -U crawler

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Out of Disk Space

```bash
# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a

# Remove specific volumes (⚠️ deletes data)
docker volume rm webcrawler_postgres_data
```

### Permission Issues

```bash
# Fix logs directory permissions
sudo chown -R $USER:$USER logs/

# Or run with different user in Dockerfile
USER root  # in Dockerfile
```

### Container Keeps Restarting

```bash
# Check logs
docker-compose logs --tail=50 crawler_api

# Check health status
docker inspect career_crawler_api | grep -A 10 Health

# Disable restart policy temporarily
docker update --restart=no career_crawler_api
```

---

## Monitoring

### Health Checks

```bash
# API health
curl http://localhost:8000/health

# Database health
docker-compose exec postgres pg_isready -U crawler
```

### Resource Usage

```bash
# Real-time stats
docker stats career_crawler_api career_crawler_db

# Container details
docker inspect career_crawler_api
```

### Application Logs

```bash
# API logs
docker-compose logs -f crawler_api

# Database logs
docker-compose logs -f postgres

# Save logs to file
docker-compose logs > crawler_logs.txt
```

---

## Scaling

### Multiple API Instances

```bash
# Scale API to 3 instances
docker-compose up -d --scale crawler_api=3

# Add load balancer (Nginx/Traefik)
```

### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml crawler
```

### Using Kubernetes

Convert to Kubernetes deployment:

```bash
# Install kompose
brew install kompose  # or download

# Convert docker-compose to k8s
kompose convert -f docker-compose.yml
```

---

## Backup and Restore

### Backup

```bash
# Backup database
docker exec career_crawler_db pg_dump -U crawler career_crawler > backup.sql

# Backup with docker-compose
docker-compose exec postgres pg_dump -U crawler career_crawler > backup.sql
```

### Restore

```bash
# Restore database
docker exec -i career_crawler_db psql -U crawler career_crawler < backup.sql

# Or with docker-compose
cat backup.sql | docker-compose exec -T postgres psql -U crawler career_crawler
```

---

## Security Best Practices

1. **Change Default Passwords**
   ```yaml
   POSTGRES_PASSWORD: use_strong_password_here
   ```

2. **Use Docker Secrets** (Swarm mode):
   ```yaml
   secrets:
     db_password:
       external: true
   ```

3. **Don't Expose Database Port** in production:
   ```yaml
   postgres:
     # Remove or comment out
     # ports:
     #   - "5432:5432"
   ```

4. **Use Read-Only Filesystem**:
   ```yaml
   security_opt:
     - no-new-privileges:true
   read_only: true
   ```

5. **Scan Images for Vulnerabilities**:
   ```bash
   docker scan career_crawler_api
   ```

---

## Next Steps

1. **Deploy to Production**: Use a cloud provider (AWS, GCP, Azure)
2. **Add Monitoring**: Integrate with Prometheus/Grafana
3. **Set Up CI/CD**: Automate builds and deployments
4. **Add Authentication**: Protect API endpoints
5. **Scale Horizontally**: Add load balancer and multiple instances

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)

---

**Ready to Go!** 🚀

Your Career Crawler is now containerized and ready for deployment anywhere Docker runs.


