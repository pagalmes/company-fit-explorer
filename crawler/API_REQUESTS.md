# Career Crawler API - Sample Requests

This document contains sample HTTP requests to interact with the Career Crawler API.

## Quick Start with Docker

```bash
# Start the services
docker-compose up -d

# Wait for services to be healthy (about 10-15 seconds)
docker-compose ps

# Check if API is ready
curl http://localhost:8000/health
```

---

## API Endpoints

### Base URL
```
http://localhost:8000
```

---

## 1. Health Check

Check if the service is healthy and database is connected.

```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-17T12:00:00.000000"
}
```

---

## 2. Get API Info

Get information about available endpoints.

```bash
curl http://localhost:8000/
```

**Response:**
```json
{
  "name": "Career Crawler API",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "POST /crawl": "Start a new crawl job",
    "GET /crawl/{job_id}": "Get crawl job status",
    ...
  }
}
```

---

## 3. Start a Crawl Job

Start crawling one or more company career pages.

### Single Company

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

### Multiple Companies

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {
        "name": "OpenAI",
        "career_url": "https://openai.com/careers"
      },
      {
        "name": "Anthropic",
        "career_url": "https://www.anthropic.com/careers"
      },
      {
        "name": "Scale AI",
        "career_url": "https://scale.com/careers"
      }
    ]
  }'
```

**Response:**
```json
{
  "job_id": "crawl_20251117_120000_0",
  "message": "Crawl job started for 3 companies",
  "companies_count": 3
}
```

**Save the `job_id` to check status later!**

---

## 4. Check Crawl Job Status

Check the status of a running or completed crawl job.

```bash
# Replace {job_id} with the actual job_id from the previous response
curl http://localhost:8000/crawl/crawl_20251117_120000_0
```

**Response (Running):**
```json
{
  "job_id": "crawl_20251117_120000_0",
  "status": "running",
  "created_at": "2025-11-17T12:00:00.000000",
  "started_at": "2025-11-17T12:00:01.000000",
  "companies_count": 3
}
```

**Response (Completed):**
```json
{
  "job_id": "crawl_20251117_120000_0",
  "status": "completed",
  "created_at": "2025-11-17T12:00:00.000000",
  "started_at": "2025-11-17T12:00:01.000000",
  "completed_at": "2025-11-17T12:05:30.000000",
  "duration_seconds": 329,
  "companies_count": 3,
  "summary": {
    "successful_companies": 3,
    "total_companies": 3,
    "total_jobs_found": 45
  },
  "results": [
    {
      "company_name": "OpenAI",
      "success": true,
      "jobs_found": 15,
      "jobs_inserted": 15
    },
    ...
  ]
}
```

---

## 5. List All Crawl Jobs

Get a list of all crawl jobs (past and present).

```bash
curl http://localhost:8000/crawl
```

**Response:**
```json
{
  "total_jobs": 5,
  "jobs": [
    {
      "job_id": "crawl_20251117_120000_0",
      "status": "completed",
      "created_at": "2025-11-17T12:00:00.000000",
      "companies_count": 3
    },
    ...
  ]
}
```

---

## 6. List All Companies

Get all companies being tracked.

```bash
curl http://localhost:8000/companies
```

**Response:**
```json
[
  {
    "company_id": 1,
    "name": "OpenAI",
    "career_page_url": "https://openai.com/careers",
    "ats_type": "greenhouse",
    "last_crawled": "2025-11-17T12:05:30.000000",
    "job_count": 15
  },
  ...
]
```

---

## 7. List All Jobs

Get all active jobs across all companies.

### Default (50 jobs, active only)

```bash
curl http://localhost:8000/jobs
```

### With Custom Limit

```bash
curl "http://localhost:8000/jobs?limit=100"
```

### Include Inactive Jobs

```bash
curl "http://localhost:8000/jobs?limit=100&active_only=false"
```

**Response:**
```json
[
  {
    "job_id": 1,
    "company_name": "OpenAI",
    "title": "Senior Software Engineer",
    "description": "We are looking for...",
    "requirements": "5+ years experience...",
    "location": "San Francisco, CA",
    "application_url": "https://openai.com/careers/senior-software-engineer",
    "posted_date": "2025-11-10T00:00:00",
    "scraped_at": "2025-11-17T12:05:30.000000",
    "is_active": true
  },
  ...
]
```

---

## 8. Get Jobs for Specific Company

Get all jobs for a specific company by company_id.

```bash
# Replace {company_id} with the actual company ID
curl http://localhost:8000/jobs/1
```

**Response:**
```json
[
  {
    "job_id": 1,
    "company_name": "OpenAI",
    "title": "Senior Software Engineer",
    "description": "...",
    "requirements": "...",
    "location": "San Francisco, CA",
    "application_url": "https://openai.com/careers/...",
    "posted_date": "2025-11-10T00:00:00",
    "scraped_at": "2025-11-17T12:05:30.000000",
    "is_active": true
  },
  ...
]
```

---

## 9. Get Statistics

Get overall crawler statistics.

```bash
curl http://localhost:8000/stats
```

**Response:**
```json
{
  "total_companies": 10,
  "total_active_jobs": 150,
  "crawl_stats": {
    "total_crawls": 250,
    "successful_crawls": 240,
    "failed_crawls": 10,
    "avg_response_time_ms": 1250
  },
  "uptime": "running"
}
```

---

## 10. Get Crawl Logs

Get recent crawl logs.

### Default (50 logs)

```bash
curl http://localhost:8000/logs
```

### With Custom Limit

```bash
curl "http://localhost:8000/logs?limit=100"
```

**Response:**
```json
{
  "total": 50,
  "logs": [
    {
      "log_id": 1,
      "url": "https://openai.com/careers",
      "status": "success",
      "error_message": null,
      "response_time_ms": 1250,
      "timestamp": "2025-11-17T12:05:30.000000"
    },
    ...
  ]
}
```

---

## Complete Workflow Example

Here's a complete workflow from start to finish:

```bash
# 1. Check if service is healthy
curl http://localhost:8000/health

# 2. Start a crawl job
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {
        "name": "Example Company",
        "career_url": "https://example.com/careers"
      }
    ]
  }'

# Output: {"job_id": "crawl_20251117_120000_0", ...}

# 3. Check job status (wait a few seconds first)
sleep 5
curl http://localhost:8000/crawl/crawl_20251117_120000_0

# 4. List all companies
curl http://localhost:8000/companies

# 5. Get jobs (find company_id from step 4)
curl http://localhost:8000/jobs/1

# 6. View statistics
curl http://localhost:8000/stats

# 7. Check logs
curl http://localhost:8000/logs
```

---

## Using Python Requests

If you prefer Python:

```python
import requests
import json
import time

BASE_URL = "http://localhost:8000"

# Start a crawl
response = requests.post(
    f"{BASE_URL}/crawl",
    json={
        "companies": [
            {
                "name": "OpenAI",
                "career_url": "https://openai.com/careers"
            }
        ]
    }
)
job_id = response.json()["job_id"]
print(f"Started job: {job_id}")

# Check status
time.sleep(5)
status = requests.get(f"{BASE_URL}/crawl/{job_id}").json()
print(f"Status: {status['status']}")

# Get all jobs
jobs = requests.get(f"{BASE_URL}/jobs").json()
print(f"Found {len(jobs)} jobs")
```

---

## Using HTTPie

If you have HTTPie installed:

```bash
# Start a crawl
http POST localhost:8000/crawl companies:='[{"name":"OpenAI","career_url":"https://openai.com/careers"}]'

# Check status
http GET localhost:8000/crawl/crawl_20251117_120000_0

# List jobs
http GET localhost:8000/jobs limit==100
```

---

## Postman Collection

Import this into Postman for easy testing:

1. Create a new collection
2. Add requests for each endpoint above
3. Use environment variables:
   - `base_url`: `http://localhost:8000`
   - `job_id`: Save from crawl response

---

## Troubleshooting

### Service not responding

```bash
# Check if containers are running
docker-compose ps

# Check logs
docker-compose logs -f crawler_api

# Restart services
docker-compose restart
```

### Database connection error

```bash
# Check database is healthy
docker-compose ps postgres

# Check database logs
docker-compose logs postgres
```

### Jobs not found

Make sure you've run at least one crawl first:

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{"companies":[{"name":"Test","career_url":"https://example.com/careers"}]}'
```

---

## API Documentation

Once the service is running, visit:

- **Interactive API docs (Swagger)**: http://localhost:8000/docs
- **Alternative docs (ReDoc)**: http://localhost:8000/redoc

These provide interactive documentation where you can test all endpoints directly in your browser!


