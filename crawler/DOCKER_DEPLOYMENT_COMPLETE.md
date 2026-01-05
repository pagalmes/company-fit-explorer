# 🐳 Docker Deployment - Complete!

The Career Crawler is now fully containerized and ready to run with Docker!

## ✅ What Was Added

### Docker Files (7 new files)

1. **Dockerfile** - Containerizes the Python application
2. **docker-compose.yml** - Orchestrates app + PostgreSQL
3. **api.py** - REST API with FastAPI (460+ lines)
4. **.dockerignore** - Optimizes Docker builds
5. **start.sh** - One-command startup script
6. **API_REQUESTS.md** - Complete API documentation with examples
7. **DOCKER_GUIDE.md** - Comprehensive Docker guide

### Updated Files

- **requirements.txt** - Added FastAPI, Uvicorn, Pydantic

---

## 🚀 Quick Start (3 commands)

```bash
# 1. Start everything
docker-compose up -d

# 2. Check health
curl http://localhost:8000/health

# 3. View API docs
open http://localhost:8000/docs
```

Or use the startup script:

```bash
./start.sh
```

---

## 🎯 What You Can Do Now

### 1. Start a Crawl via API

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {
        "name": "OpenAI",
        "career_url": "https://openai.com/careers"
      }
    ]
  }'
```

**Response:**
```json
{
  "job_id": "crawl_20251117_120000_0",
  "message": "Crawl job started for 1 companies",
  "companies_count": 1
}
```

### 2. Check Crawl Status

```bash
curl http://localhost:8000/crawl/crawl_20251117_120000_0
```

### 3. List All Jobs

```bash
curl http://localhost:8000/jobs
```

### 4. Get Statistics

```bash
curl http://localhost:8000/stats
```

### 5. Use Interactive Docs

Visit http://localhost:8000/docs in your browser for a full interactive API where you can test all endpoints!

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information |
| GET | `/health` | Health check |
| POST | `/crawl` | Start crawl job |
| GET | `/crawl/{job_id}` | Get job status |
| GET | `/crawl` | List all jobs |
| GET | `/companies` | List companies |
| GET | `/jobs` | List all jobs |
| GET | `/jobs/{company_id}` | Get company jobs |
| GET | `/stats` | Get statistics |
| GET | `/logs` | Get crawl logs |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│          Client (curl/browser)          │
└──────────────────┬──────────────────────┘
                   │ HTTP
                   ▼
┌─────────────────────────────────────────┐
│      FastAPI (Port 8000)                │
│  ┌────────────────────────────────┐     │
│  │  REST API Endpoints            │     │
│  │  - POST /crawl                 │     │
│  │  - GET /jobs                   │     │
│  │  - GET /companies              │     │
│  └────────────────────────────────┘     │
│                 │                        │
│                 ▼                        │
│  ┌────────────────────────────────┐     │
│  │  CareerCrawler                 │     │
│  │  - Session Manager             │     │
│  │  - Rate Limiter                │     │
│  │  - ATS Detector                │     │
│  │  - Generic Parser              │     │
│  └────────────────────────────────┘     │
└──────────────────┬──────────────────────┘
                   │ asyncpg
                   ▼
┌─────────────────────────────────────────┐
│      PostgreSQL (Port 5432)             │
│  ┌────────────────────────────────┐     │
│  │  Tables:                       │     │
│  │  - companies                   │     │
│  │  - jobs                        │     │
│  │  - crawl_logs                  │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

---

## 📦 Docker Services

### crawler_api
- **Image**: Custom (built from Dockerfile)
- **Port**: 8000 → 8000
- **Features**:
  - FastAPI REST API
  - Background task processing
  - Auto-restart on failure
  - Health checks

### postgres
- **Image**: postgres:15-alpine
- **Port**: 5432 → 5432
- **Data**: Persistent volume
- **Features**:
  - Automatic health checks
  - Password protected
  - Data persistence

---

## 🔧 Configuration

### Environment Variables (docker-compose.yml)

```yaml
environment:
  DB_HOST: postgres          # Database host
  DB_PORT: 5432             # Database port
  DB_NAME: career_crawler    # Database name
  DB_USER: crawler          # Database user
  DB_PASSWORD: ***          # Change this!
  LOG_LEVEL: INFO           # Logging level
```

### Ports

- **8000**: API server
- **5432**: PostgreSQL (optional, can be removed in production)

---

## 📊 Complete Workflow Example

```bash
# 1. Start services
docker-compose up -d

# 2. Wait for health
sleep 10

# 3. Check health
curl http://localhost:8000/health

# 4. Start crawl with multiple companies
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "OpenAI", "career_url": "https://openai.com/careers"},
      {"name": "Anthropic", "career_url": "https://www.anthropic.com/careers"},
      {"name": "Scale AI", "career_url": "https://scale.com/careers"}
    ]
  }'

# Response: {"job_id": "crawl_20251117_120000_0", ...}

# 5. Check status (wait a minute)
sleep 60
curl http://localhost:8000/crawl/crawl_20251117_120000_0

# 6. List all companies tracked
curl http://localhost:8000/companies

# 7. Get all jobs
curl http://localhost:8000/jobs

# 8. Get statistics
curl http://localhost:8000/stats

# 9. View logs
docker-compose logs -f crawler_api
```

---

## 🛠️ Common Operations

### Start Services
```bash
docker-compose up -d
# or
./start.sh
```

### Stop Services
```bash
docker-compose stop
```

### View Logs
```bash
# All logs
docker-compose logs -f

# API only
docker-compose logs -f crawler_api

# Database only
docker-compose logs -f postgres
```

### Restart Services
```bash
docker-compose restart
```

### Rebuild After Changes
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Check Status
```bash
docker-compose ps
```

### Access Database
```bash
docker exec -it career_crawler_db psql -U crawler -d career_crawler
```

---

## 📱 Testing with Different Tools

### cURL
```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{"companies":[{"name":"Test","career_url":"https://example.com/careers"}]}'
```

### Python requests
```python
import requests

response = requests.post(
    "http://localhost:8000/crawl",
    json={
        "companies": [
            {"name": "Test", "career_url": "https://example.com/careers"}
        ]
    }
)
print(response.json())
```

### HTTPie
```bash
http POST localhost:8000/crawl companies:='[{"name":"Test","career_url":"https://example.com/careers"}]'
```

### Postman
1. Import the API by pointing to `http://localhost:8000/openapi.json`
2. Use the interactive docs at `http://localhost:8000/docs`

---

## 🔍 Monitoring & Debugging

### Check Service Health
```bash
# API health
curl http://localhost:8000/health

# Database health
docker exec career_crawler_db pg_isready -U crawler
```

### View Resource Usage
```bash
docker stats career_crawler_api career_crawler_db
```

### Check Logs for Errors
```bash
docker-compose logs --tail=100 | grep -i error
```

### Access API Container
```bash
docker exec -it career_crawler_api bash
```

### Access Database
```bash
docker exec -it career_crawler_db psql -U crawler -d career_crawler
```

---

## 📈 Scaling

### Multiple API Instances
```bash
docker-compose up -d --scale crawler_api=3
```

Then add a load balancer (nginx/traefik) in front.

### Production Deployment
1. Use secrets for passwords
2. Remove database port exposure
3. Add reverse proxy (nginx)
4. Enable HTTPS
5. Add monitoring (Prometheus/Grafana)
6. Set up automated backups

---

## 🔒 Security Checklist

- [ ] Change default database password
- [ ] Remove database port exposure in production
- [ ] Add API authentication (API keys/OAuth)
- [ ] Use HTTPS in production
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Implement request validation
- [ ] Add CORS policies
- [ ] Use Docker secrets for sensitive data

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find what's using port 8000
lsof -i :8000

# Use different port
# Edit docker-compose.yml: "8080:8000"
```

### Database Connection Error
```bash
# Check database is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### API Not Responding
```bash
# Check logs
docker-compose logs crawler_api

# Rebuild
docker-compose down
docker-compose up -d --build
```

### Out of Memory
```bash
# Check usage
docker stats

# Add memory limits in docker-compose.yml
```

---

## 📚 Documentation Files

- **API_REQUESTS.md** - Complete API examples
- **DOCKER_GUIDE.md** - Comprehensive Docker guide
- **README.md** - Main project documentation
- **QUICKSTART.md** - Getting started guide

---

## 🎉 What's Great About This Setup

✅ **One Command Start**: `docker-compose up -d`  
✅ **Complete API**: Full REST API with FastAPI  
✅ **Interactive Docs**: Built-in Swagger UI  
✅ **Background Jobs**: Async crawling in background  
✅ **Persistent Data**: PostgreSQL volume  
✅ **Auto-Restart**: Services restart on failure  
✅ **Health Checks**: Built-in health monitoring  
✅ **Production Ready**: Can deploy anywhere Docker runs  
✅ **Fully Documented**: Complete examples and guides  

---

## 🚀 Next Steps

1. **Test the API**: Start with sample requests from API_REQUESTS.md
2. **Customize Config**: Edit docker-compose.yml for your needs
3. **Add Companies**: Create your list of companies to track
4. **Schedule Crawls**: Use cron or task scheduler
5. **Monitor Results**: Check stats and logs regularly
6. **Deploy**: Push to your favorite cloud provider

---

## 🌐 Deployment Options

This Docker setup works on:

- ✅ **Local Machine** (macOS, Linux, Windows)
- ✅ **AWS ECS/Fargate**
- ✅ **Google Cloud Run**
- ✅ **Azure Container Instances**
- ✅ **DigitalOcean App Platform**
- ✅ **Heroku**
- ✅ **Kubernetes** (any provider)
- ✅ **Your own VPS**

---

## 📞 Support

- **Interactive API Docs**: http://localhost:8000/docs
- **API Examples**: See API_REQUESTS.md
- **Docker Guide**: See DOCKER_GUIDE.md
- **Project Docs**: See README.md

---

## ✨ Summary

You now have a fully containerized, production-ready Career Crawler with:

- 🐳 Docker & docker-compose setup
- 🚀 FastAPI REST API
- 📊 PostgreSQL database
- 📝 Complete documentation
- 🧪 Sample requests
- 🔧 Easy configuration
- 📈 Ready to scale

**Start now:**
```bash
docker-compose up -d
curl http://localhost:8000/docs
```

Happy crawling! 🎉


