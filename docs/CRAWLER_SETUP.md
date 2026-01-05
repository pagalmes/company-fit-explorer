# Career Crawler Integration Setup

This guide explains how to set up and run the integrated career crawler service.

## Architecture Overview

The integrated system consists of:

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   Next.js    │   │  LLM Server  │   │ Crawler API  │    │
│  │   :3000      │   │    :3002     │   │    :8000     │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│         │                                      │            │
│         │                              ┌───────┴───────┐    │
│         │                              │               │    │
│         ▼                              ▼               ▼    │
│  ┌──────────────┐              ┌──────────────┐ ┌────────┐ │
│  │   Supabase   │              │ PostgreSQL   │ │Scheduler│ │
│  │   (Cloud)    │              │   :5433      │ │(24h)    │ │
│  └──────────────┘              └──────────────┘ └────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

Add these to your `.env.local` file:

### Required for Crawler

```bash
# PostgreSQL password for the crawler database
CRAWLER_DB_PASSWORD=your-secure-password-here
```

### Optional Scheduler Configuration

```bash
# How often to crawl (default: 24 hours)
CRAWL_INTERVAL_HOURS=24

# Companies per batch (default: 10)
BATCH_SIZE=10

# Delay between batches in seconds (default: 60)
BATCH_DELAY_SECONDS=60

# Log level (default: INFO)
LOG_LEVEL=INFO
```

### Optional Sync Configuration

```bash
# For syncing job counts to Supabase (uses existing Supabase keys)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional webhook for job notifications
SYNC_WEBHOOK_URL=https://your-webhook-endpoint.com/jobs
```

## Quick Start

### 1. Start All Services

```bash
# Build and start everything
docker compose up --build

# Or run in background
docker compose up -d --build
```

### 2. Verify Services Are Running

```bash
# Check all services
docker compose ps

# Check crawler health
curl http://localhost:8000/health

# Check crawler stats
curl http://localhost:8000/stats
```

### 3. Test the Crawler

```bash
# Crawl a company
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Anthropic", "domain": "anthropic.com"}
    ]
  }'

# Check crawl status
curl http://localhost:8000/crawl/{job_id}

# Search for jobs
curl "http://localhost:8000/jobs?keywords=engineer"
```

## Service Details

### Crawler API (Port 8000)

The FastAPI-based crawler with these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/crawl` | POST | Start a crawl job |
| `/crawl/{job_id}` | GET | Check crawl status |
| `/discover` | GET | Find career page URL |
| `/jobs` | GET | List jobs with filters |
| `/search` | GET | Full-text job search |
| `/companies` | GET | List tracked companies |
| `/stats` | GET | Crawler statistics |
| `/health` | GET | Health check |

### Scheduler Service

Runs every 24 hours (configurable) to:

1. Find companies not crawled in the last 24 hours
2. Crawl them in batches (10 at a time by default)
3. Sync job counts to Supabase
4. (Optional) Send webhook notifications for new jobs

### PostgreSQL Database (Port 5433)

Stores crawler data:

- `companies` - Tracked companies and their career URLs
- `jobs` - Scraped job postings
- `crawl_logs` - Crawl history and errors

## Scaling Considerations

### Performance Estimates

| Companies | Crawl Time | Recommended Setup |
|-----------|------------|-------------------|
| 10-50 | ~5-15 min | Default settings |
| 50-200 | ~30-60 min | Increase batch size to 20 |
| 200-500 | ~2-4 hours | Multiple worker instances |
| 500+ | ~4+ hours | Distributed crawling |

### Rate Limiting

The crawler has built-in protections:

- 20 requests/minute per domain
- 2-5 second delays between requests
- Exponential backoff on failures
- Respects robots.txt

### Adjusting for Scale

For more companies, modify `docker-compose.yml`:

```yaml
crawler-scheduler:
  environment:
    BATCH_SIZE: 20              # Increase batch size
    BATCH_DELAY_SECONDS: 30     # Reduce delay
    CRAWL_INTERVAL_HOURS: 12    # More frequent crawls
```

## Monitoring

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f crawler-api
docker compose logs -f crawler-scheduler
```

### Health Checks

```bash
# Crawler API health
curl http://localhost:8000/health

# Scheduler heartbeat (inside container)
docker compose exec crawler-scheduler cat /tmp/scheduler_heartbeat
```

### Database Access

```bash
# Connect to crawler database
docker compose exec crawler-db psql -U crawler -d career_crawler

# View job counts
SELECT c.name, COUNT(j.job_id) as jobs
FROM companies c
LEFT JOIN jobs j ON c.company_id = j.company_id AND j.is_active = true
GROUP BY c.company_id
ORDER BY jobs DESC;
```

## Troubleshooting

### Crawler Not Finding Jobs

1. Check the career page is accessible:
   ```bash
   curl http://localhost:8000/discover?company_name=CompanyName
   ```

2. Review crawl logs:
   ```bash
   curl http://localhost:8000/logs?limit=10
   ```

3. Check for JavaScript-heavy pages (may need Playwright)

### Database Connection Issues

1. Ensure PostgreSQL is healthy:
   ```bash
   docker compose ps crawler-db
   ```

2. Check credentials in `.env.local`

3. Verify network connectivity:
   ```bash
   docker compose exec crawler-api ping crawler-db
   ```

### Rate Limiting (429 Errors)

Increase delays in crawler config:

```python
# crawler/config/settings.py
RATE_LIMIT_CONFIG = {
    "requests_per_minute": 10,  # Reduce from 20
    "min_delay": 5.0,           # Increase from 2
    "max_delay": 10.0,          # Increase from 5
}
```

## Development

### Running Locally (Without Docker)

```bash
# Start PostgreSQL
docker compose up -d crawler-db

# Install Python dependencies
cd crawler
pip install -r requirements.txt
pip install -r requirements.scheduler.txt

# Run crawler API
python api.py

# In another terminal, run scheduler
python scheduler.py
```

### Adding New ATS Parsers

1. Create parser in `crawler/scrapers/parsers/`
2. Inherit from `BaseParser`
3. Add detection logic in `crawler/scrapers/detector.py`

See `crawler/README.md` for detailed instructions.



