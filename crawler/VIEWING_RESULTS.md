# How to View Crawl Results

Complete guide to viewing and accessing your crawled job data.

---

## 🚀 Quick Answer

After starting a crawl, you have multiple ways to view results:

1. **Check crawl status** → See if it's done
2. **List all jobs** → View everything
3. **Filter jobs** → Search by keywords
4. **Export to CSV** → Download for analysis
5. **Interactive browser** → Use Swagger UI
6. **Database query** → Direct PostgreSQL access

---

## 📊 Step-by-Step Workflow

### Step 1: Start a Crawl

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Riot Games", "domain": "riotgames.com"}
    ],
    "filter": {
      "predefined_filter": "security"
    }
  }'
```

**Save the `job_id` from the response!**

```json
{
  "job_id": "crawl_20251117_120000_0",
  "message": "Crawl job started...",
  "companies_count": 1
}
```

---

### Step 2: Check Crawl Status

```bash
curl http://localhost:8000/crawl/crawl_20251117_120000_0
```

**Response (Running):**
```json
{
  "job_id": "crawl_20251117_120000_0",
  "status": "running",
  "companies_count": 1
}
```

**Response (Complete):**
```json
{
  "job_id": "crawl_20251117_120000_0",
  "status": "completed",
  "duration_seconds": 45,
  "summary": {
    "successful_companies": 1,
    "total_companies": 1,
    "total_jobs_found": 8
  }
}
```

---

### Step 3: View Results

Now you can view the jobs in multiple ways!

---

## 🎯 Method 1: List All Jobs (Simplest)

```bash
curl http://localhost:8000/jobs
```

**Response:**
```json
[
  {
    "job_id": 1,
    "company_name": "Riot Games",
    "title": "Product Security Engineer",
    "description": "We're looking for a Product Security Engineer...",
    "requirements": "5+ years of security experience...",
    "location": "Los Angeles, CA",
    "application_url": "https://www.riotgames.com/en/work-with-us/job/...",
    "posted_date": "2025-11-10T00:00:00",
    "scraped_at": "2025-11-17T12:05:30",
    "is_active": true
  },
  {
    "job_id": 2,
    "company_name": "Riot Games",
    "title": "Senior Application Security Engineer",
    ...
  }
]
```

### With Limit

```bash
# Get 100 jobs
curl "http://localhost:8000/jobs?limit=100"

# Get 10 jobs
curl "http://localhost:8000/jobs?limit=10"
```

---

## 🔍 Method 2: Search with Keywords

```bash
# Search for "product" in all fields
curl "http://localhost:8000/jobs?keywords=product"

# Multiple keywords (OR logic)
curl "http://localhost:8000/jobs?keywords=product,senior"

# Title search only
curl "http://localhost:8000/jobs?title_keywords=senior"

# Filter by location
curl "http://localhost:8000/jobs?location=remote"

# Combine filters
curl "http://localhost:8000/jobs?keywords=security&location=los%20angeles"
```

---

## 🏢 Method 3: View Jobs by Company

### First, get company list:

```bash
curl http://localhost:8000/companies
```

**Response:**
```json
[
  {
    "company_id": 1,
    "name": "Riot Games",
    "career_page_url": "https://www.riotgames.com/en/work-with-us",
    "ats_type": "generic",
    "last_crawled": "2025-11-17T12:05:30",
    "job_count": 8
  }
]
```

### Then get jobs for that company:

```bash
# Use the company_id from above
curl http://localhost:8000/jobs/1
```

---

## 🔎 Method 4: Full-Text Search

```bash
# Search with relevance ranking
curl "http://localhost:8000/search?q=product+security+engineer"
```

**Response (includes relevance score):**
```json
{
  "query": "product security engineer",
  "total": 3,
  "jobs": [
    {
      "job_id": 1,
      "company_name": "Riot Games",
      "title": "Product Security Engineer",
      "location": "Los Angeles, CA",
      "application_url": "https://...",
      "relevance": 0.95,
      "scraped_at": "2025-11-17T12:05:30"
    }
  ]
}
```

---

## 📱 Method 5: Interactive Browser (EASIEST!)

### Visit: http://localhost:8000/docs

1. **Swagger UI opens** with all endpoints
2. **Click on GET /jobs**
3. **Click "Try it out"**
4. **Click "Execute"**
5. **See results instantly!**

**You can:**
- Try different endpoints
- Filter with parameters
- See formatted JSON
- Download responses

### Screenshots (what you'll see):

```
GET /jobs
├─ Try it out (button)
├─ Parameters:
│  ├─ limit: 50
│  ├─ active_only: true
│  ├─ keywords: (optional)
│  └─ location: (optional)
├─ Execute (button)
└─ Response:
   └─ Pretty formatted JSON with all jobs
```

---

## 📊 Method 6: Export to CSV

```bash
# Export all jobs to CSV
python utils.py export --output riot_jobs.csv
```

**Opens CSV with:**
- Company name
- Job title
- Location
- Application URL
- Posted date
- Scraped date

**Open in Excel, Google Sheets, or any spreadsheet app!**

---

## 💾 Method 7: Direct Database Access

### Using PostgreSQL CLI

```bash
# Connect to database
docker exec -it career_crawler_db psql -U crawler -d career_crawler

# Run queries
SELECT * FROM jobs WHERE is_active = true;

SELECT 
  c.name as company,
  j.title,
  j.location,
  j.application_url
FROM jobs j
JOIN companies c ON j.company_id = c.company_id
WHERE j.is_active = true
ORDER BY j.scraped_at DESC;
```

### Using Python

```python
import asyncpg
import asyncio

async def view_jobs():
    conn = await asyncpg.connect(
        host='localhost',
        port=5432,
        database='career_crawler',
        user='crawler',
        password='crawler_password_change_me'
    )
    
    jobs = await conn.fetch("""
        SELECT 
            c.name as company,
            j.title,
            j.location,
            j.application_url
        FROM jobs j
        JOIN companies c ON j.company_id = c.company_id
        WHERE j.is_active = true
        ORDER BY j.scraped_at DESC
        LIMIT 20
    """)
    
    for job in jobs:
        print(f"{job['company']}: {job['title']}")
        print(f"  Location: {job['location']}")
        print(f"  Apply: {job['application_url']}\n")
    
    await conn.close()

asyncio.run(view_jobs())
```

---

## 📈 Method 8: Get Statistics

```bash
# Overall stats
curl http://localhost:8000/stats
```

**Response:**
```json
{
  "total_companies": 1,
  "total_active_jobs": 8,
  "crawl_stats": {
    "total_crawls": 25,
    "successful_crawls": 24,
    "failed_crawls": 1,
    "avg_response_time_ms": 1250
  }
}
```

---

## 🐍 Complete Python Example

```python
import requests
import time

# 1. Start crawl
response = requests.post(
    "http://localhost:8000/crawl",
    json={
        "companies": [
            {"name": "Riot Games", "domain": "riotgames.com"}
        ],
        "filter": {"predefined_filter": "security"}
    }
)

job_id = response.json()["job_id"]
print(f"Crawl started: {job_id}")

# 2. Wait for completion
while True:
    status = requests.get(f"http://localhost:8000/crawl/{job_id}").json()
    if status["status"] == "completed":
        print(f"✓ Found {status['summary']['total_jobs_found']} jobs")
        break
    elif status["status"] == "failed":
        print("✗ Crawl failed")
        break
    print(".", end="", flush=True)
    time.sleep(2)

# 3. Get all jobs
jobs = requests.get("http://localhost:8000/jobs").json()

# 4. Display results
print(f"\n{'='*60}")
print(f"RESULTS: {len(jobs)} Security Jobs Found")
print(f"{'='*60}\n")

for i, job in enumerate(jobs, 1):
    print(f"{i}. {job['title']}")
    print(f"   Company: {job['company_name']}")
    print(f"   Location: {job.get('location', 'Not specified')}")
    print(f"   Apply: {job['application_url']}")
    print()

# 5. Search for specific roles
print("Searching for 'Product Security' roles...\n")
product_jobs = requests.get(
    "http://localhost:8000/jobs",
    params={"keywords": "product"}
).json()

for job in product_jobs:
    print(f"• {job['title']}")
```

**Save as `view_results.py` and run:**
```bash
python view_results.py
```

---

## 📋 Quick Reference Commands

```bash
# Check crawl status
curl http://localhost:8000/crawl/{job_id}

# View all jobs
curl http://localhost:8000/jobs

# View 100 jobs
curl "http://localhost:8000/jobs?limit=100"

# Search by keyword
curl "http://localhost:8000/jobs?keywords=security"

# Filter by location
curl "http://localhost:8000/jobs?location=remote"

# View companies
curl http://localhost:8000/companies

# View jobs for company ID 1
curl http://localhost:8000/jobs/1

# Full-text search
curl "http://localhost:8000/search?q=product+security"

# Get stats
curl http://localhost:8000/stats

# Export to CSV
python utils.py export --output jobs.csv
```

---

## 🎨 Pretty Print JSON (Optional)

### Using jq (if installed)

```bash
curl http://localhost:8000/jobs | jq '.'

# Pretty print with colors
curl http://localhost:8000/jobs | jq '.[] | {title, company_name, location}'
```

### Using Python

```bash
curl http://localhost:8000/jobs | python -m json.tool
```

---

## 📊 Real Output Example

```bash
$ curl "http://localhost:8000/jobs?limit=3"
```

```json
[
  {
    "job_id": 1,
    "company_name": "Riot Games",
    "title": "Product Security Engineer",
    "description": "We're looking for a Product Security Engineer to join our security team...",
    "requirements": "5+ years of experience in application security, Expertise in threat modeling...",
    "location": "Los Angeles, CA",
    "application_url": "https://www.riotgames.com/en/work-with-us/job/12345",
    "posted_date": "2025-11-10T00:00:00",
    "scraped_at": "2025-11-17T12:05:30.123456",
    "is_active": true
  },
  {
    "job_id": 2,
    "company_name": "Riot Games",
    "title": "Senior Application Security Engineer",
    "description": "Join our AppSec team to build secure gaming experiences...",
    "requirements": "7+ years in security engineering, Experience with secure SDLC...",
    "location": "Remote",
    "application_url": "https://www.riotgames.com/en/work-with-us/job/12346",
    "posted_date": "2025-11-12T00:00:00",
    "scraped_at": "2025-11-17T12:05:45.234567",
    "is_active": true
  },
  {
    "job_id": 3,
    "company_name": "Riot Games",
    "title": "Security Operations Analyst",
    "description": "Monitor and respond to security incidents...",
    "requirements": "3+ years in security operations, SOC experience...",
    "location": "Dublin, Ireland",
    "application_url": "https://www.riotgames.com/en/work-with-us/job/12347",
    "posted_date": "2025-11-15T00:00:00",
    "scraped_at": "2025-11-17T12:06:00.345678",
    "is_active": true
  }
]
```

---

## 🎯 Recommended Workflow

### For Quick Viewing:
1. **Interactive Docs** → http://localhost:8000/docs
2. Click GET /jobs → Try it out → Execute

### For Analysis:
1. **Export to CSV** → `python utils.py export`
2. Open in Excel/Google Sheets

### For Integration:
1. **Use Python script** (see example above)
2. Process results programmatically

### For Custom Queries:
1. **Direct database access** with SQL
2. Complex joins and aggregations

---

## 💡 Tips

### 1. Bookmark Common Queries

```bash
# Save as aliases
alias view-jobs='curl http://localhost:8000/jobs | jq'
alias view-companies='curl http://localhost:8000/companies | jq'
alias view-stats='curl http://localhost:8000/stats | jq'
```

### 2. Use Interactive Docs

http://localhost:8000/docs is the **easiest way** for casual browsing!

### 3. Export for Sharing

```bash
python utils.py export --output jobs.csv
# Share CSV with team
```

### 4. Set Up Monitoring

```python
# Check daily for new jobs
import requests
from datetime import datetime, timedelta

yesterday = datetime.now() - timedelta(days=1)
jobs = requests.get("http://localhost:8000/jobs").json()

new_jobs = [j for j in jobs if j['scraped_at'] > yesterday.isoformat()]
print(f"{len(new_jobs)} new jobs since yesterday!")
```

---

## ❓ Troubleshooting

### No Jobs Returned

```bash
# Check if crawl completed
curl http://localhost:8000/crawl/{job_id}

# Check companies
curl http://localhost:8000/companies

# Check stats
curl http://localhost:8000/stats
```

### Jobs Exist But Can't See Them

```bash
# Check active_only parameter
curl "http://localhost:8000/jobs?active_only=false"

# Check database directly
docker exec -it career_crawler_db psql -U crawler -d career_crawler -c "SELECT COUNT(*) FROM jobs;"
```

---

## 🎉 Summary

**Viewing results is easy! You have many options:**

1. ✅ **Simple**: `curl http://localhost:8000/jobs`
2. ✅ **Interactive**: http://localhost:8000/docs
3. ✅ **Export**: `python utils.py export`
4. ✅ **Search**: `curl "http://localhost:8000/jobs?keywords=security"`
5. ✅ **Database**: Direct PostgreSQL access

**Start now:**
```bash
# View your results!
curl http://localhost:8000/jobs | python -m json.tool
```

Or visit: **http://localhost:8000/docs** (easiest!) 🚀


