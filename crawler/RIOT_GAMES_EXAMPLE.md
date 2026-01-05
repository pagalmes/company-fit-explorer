# Real-World Example: Riot Games Product Security Positions

This document shows how to crawl Riot Games for product security positions.

---

## Quick Start

### Using cURL (No URL Required!)

```bash
# 1. Start the crawler API
docker-compose up -d

# 2. Crawl Riot Games for security positions (AUTO-DISCOVERS URL!)
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {
        "name": "Riot Games",
        "domain": "riotgames.com"
      }
    ],
    "filter": {
      "predefined_filter": "security"
    }
  }'
```

**That's it!** Just the company name and domain - no manual URL hunting!

Or even simpler (slower but works):

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Riot Games"}
    ],
    "filter": {
      "predefined_filter": "security"
    }
  }'
```

**Response:**
```json
{
  "job_id": "crawl_20251117_120000_0",
  "message": "Crawl job started for 1 companies with filter: Predefined: security",
  "companies_count": 1
}
```

Save the `job_id` from the response!

---

### Check Crawl Status

```bash
# Replace with your actual job_id
curl http://localhost:8000/crawl/crawl_20251117_120000_0
```

**While Running:**
```json
{
  "job_id": "crawl_20251117_120000_0",
  "status": "running",
  "created_at": "2025-11-17T12:00:00",
  "started_at": "2025-11-17T12:00:01",
  "companies_count": 1,
  "filter": "Predefined: security"
}
```

**When Complete:**
```json
{
  "job_id": "crawl_20251117_120000_0",
  "status": "completed",
  "duration_seconds": 45,
  "summary": {
    "successful_companies": 1,
    "total_companies": 1,
    "total_jobs_found": 8
  },
  "results": [
    {
      "company_name": "Riot Games",
      "success": true,
      "jobs_found": 8,
      "jobs_inserted": 8
    }
  ]
}
```

---

### View Security Positions

```bash
# Get all Riot Games security jobs
curl "http://localhost:8000/companies"

# Find Riot Games company_id (e.g., 1), then:
curl "http://localhost:8000/jobs/1"
```

Or search across all jobs:

```bash
# All security jobs
curl "http://localhost:8000/jobs"

# Search for "product security" specifically
curl "http://localhost:8000/jobs?keywords=product"

# Full-text search
curl "http://localhost:8000/search?q=product+security"
```

---

## Using Python

### Complete Script

```python
import requests
import time
import json

# Configuration
API_URL = "http://localhost:8000"

def crawl_riot_games_security():
    """Crawl Riot Games for product security positions."""
    
    print("🎮 Crawling Riot Games for Security Positions...")
    print("=" * 60)
    
    # Start the crawl
    response = requests.post(
        f"{API_URL}/crawl",
        json={
            "companies": [
                {
                    "name": "Riot Games",
                    "career_url": "https://www.riotgames.com/en/work-with-us"
                }
            ],
            "filter": {
                "predefined_filter": "security"
            }
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Error: {response.text}")
        return
    
    job_id = response.json()["job_id"]
    print(f"✅ Crawl started: {job_id}")
    print(f"⏳ Waiting for completion...\n")
    
    # Poll for completion
    while True:
        status = requests.get(f"{API_URL}/crawl/{job_id}").json()
        
        if status["status"] == "completed":
            print(f"✅ Crawl completed in {status['duration_seconds']}s")
            print(f"📊 Found {status['summary']['total_jobs_found']} security positions\n")
            break
        elif status["status"] == "failed":
            print(f"❌ Crawl failed: {status.get('error', 'Unknown error')}")
            return
        
        print(".", end="", flush=True)
        time.sleep(2)
    
    # Get the company_id
    companies = requests.get(f"{API_URL}/companies").json()
    riot_company = next(c for c in companies if "Riot" in c["name"])
    company_id = riot_company["company_id"]
    
    print(f"\n{'=' * 60}")
    print(f"🎯 Riot Games Security Positions")
    print(f"{'=' * 60}\n")
    
    # Get all security jobs for Riot Games
    jobs = requests.get(f"{API_URL}/jobs/{company_id}").json()
    
    if not jobs:
        print("No security positions found.")
        return
    
    # Display jobs
    for i, job in enumerate(jobs, 1):
        print(f"\n{i}. {job['title']}")
        print(f"   {'─' * 50}")
        print(f"   📍 Location: {job.get('location', 'Not specified')}")
        print(f"   🔗 Apply: {job['application_url']}")
        
        if job.get('description'):
            desc = job['description'][:200] + "..." if len(job['description']) > 200 else job['description']
            print(f"   📝 Description: {desc}")
        
        print(f"   📅 Scraped: {job['scraped_at']}")
    
    print(f"\n{'=' * 60}")
    print(f"✅ Total: {len(jobs)} product security positions found!")
    print(f"{'=' * 60}\n")
    
    # Search for specific keywords
    print("\n🔍 Filtering for 'Product Security' specifically...")
    product_security = [j for j in jobs if 'product' in j['title'].lower()]
    
    if product_security:
        print(f"\n📌 Product Security Roles ({len(product_security)}):")
        for job in product_security:
            print(f"   • {job['title']}")
            print(f"     {job['application_url']}\n")
    
    return jobs


if __name__ == "__main__":
    jobs = crawl_riot_games_security()
```

### Run It

```bash
python riot_games_crawler.py
```

---

## Expected Output

```
🎮 Crawling Riot Games for Security Positions...
============================================================
✅ Crawl started: crawl_20251117_120000_0
⏳ Waiting for completion...

..........
✅ Crawl completed in 45s
📊 Found 8 security positions

============================================================
🎯 Riot Games Security Positions
============================================================

1. Product Security Engineer
   ──────────────────────────────────────────────────
   📍 Location: Los Angeles, CA
   🔗 Apply: https://www.riotgames.com/en/work-with-us/job/...
   📝 Description: We're looking for a Product Security Engineer...
   📅 Scraped: 2025-11-17T12:05:30

2. Senior Application Security Engineer
   ──────────────────────────────────────────────────
   📍 Location: Remote
   🔗 Apply: https://www.riotgames.com/en/work-with-us/job/...
   📝 Description: Join our security team to protect...
   📅 Scraped: 2025-11-17T12:05:45

[... more jobs ...]

============================================================
✅ Total: 8 product security positions found!
============================================================

🔍 Filtering for 'Product Security' specifically...

📌 Product Security Roles (3):
   • Product Security Engineer
     https://www.riotgames.com/en/work-with-us/job/...

   • Senior Product Security Engineer
     https://www.riotgames.com/en/work-with-us/job/...

   • Lead Product Security Engineer
     https://www.riotgames.com/en/work-with-us/job/...
```

---

## More Specific Search

If you want ONLY product security (not all security roles):

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {
        "name": "Riot Games",
        "career_url": "https://www.riotgames.com/en/work-with-us"
      }
    ],
    "filter": {
      "keywords": ["security", "product", "appsec", "application"],
      "title_keywords": ["product security", "application security", "appsec"],
      "min_keyword_matches": 1
    }
  }'
```

---

## Alternative: Search After Full Crawl

If you want to crawl everything first, then search:

```bash
# 1. Crawl without filter
curl -X POST http://localhost:8000/crawl \
  -d '{
    "companies": [
      {"name": "Riot Games", "career_url": "https://www.riotgames.com/en/work-with-us"}
    ]
  }'

# 2. Search for product security
curl "http://localhost:8000/jobs?keywords=product,security"

# 3. Or full-text search
curl "http://localhost:8000/search?q=product+security"
```

---

## Using Interactive API Docs

1. Go to **http://localhost:8000/docs**
2. Find the **POST /crawl** endpoint
3. Click "Try it out"
4. Use this JSON:

```json
{
  "companies": [
    {
      "name": "Riot Games",
      "career_url": "https://www.riotgames.com/en/work-with-us"
    }
  ],
  "filter": {
    "predefined_filter": "security"
  }
}
```

5. Click "Execute"
6. Copy the `job_id`
7. Use **GET /crawl/{job_id}** to check status
8. Use **GET /jobs** to see results

---

## Saving Results

### Export to CSV

```bash
# After crawling, export all jobs
python utils.py export --output riot_security_jobs.csv
```

### Query Database Directly

```bash
docker exec -it career_crawler_db psql -U crawler -d career_crawler

# Then run:
SELECT title, location, application_url 
FROM jobs j
JOIN companies c ON j.company_id = c.company_id
WHERE c.name LIKE '%Riot%' 
  AND j.is_active = true
ORDER BY j.scraped_at DESC;
```

---

## Scheduling Regular Checks

To check for new positions regularly:

```python
import requests
import schedule
import time

def check_riot_security_jobs():
    """Check for new Riot Games security positions."""
    response = requests.post(
        "http://localhost:8000/crawl",
        json={
            "companies": [
                {
                    "name": "Riot Games",
                    "career_url": "https://www.riotgames.com/en/work-with-us"
                }
            ],
            "filter": {"predefined_filter": "security"}
        }
    )
    print(f"Crawl started: {response.json()['job_id']}")

# Check every day at 9 AM
schedule.every().day.at("09:00").do(check_riot_security_jobs)

while True:
    schedule.run_pending()
    time.sleep(60)
```

---

## Troubleshooting

### No Results Found

If the crawler doesn't find security jobs:

1. **Try without filter** to see all jobs:
   ```bash
   curl -X POST http://localhost:8000/crawl \
     -d '{"companies":[{"name":"Riot Games","career_url":"..."}]}'
   ```

2. **Check if jobs exist** by visiting the URL manually

3. **Try broader keywords**:
   ```json
   {
     "filter": {
       "keywords": ["security", "trust", "safety", "privacy"]
     }
   }
   ```

### Career Page Structure Changed

If Riot Games changes their career page structure:

1. Check the logs:
   ```bash
   docker-compose logs -f crawler_api
   ```

2. The generic parser should still work, but you might need to adjust

---

## Summary

**To find Riot Games product security positions:**

```bash
# 1. Start API
docker-compose up -d

# 2. Crawl with security filter
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Riot Games", "career_url": "https://www.riotgames.com/en/work-with-us"}
    ],
    "filter": {"predefined_filter": "security"}
  }'

# 3. Check results (wait ~1 minute)
curl "http://localhost:8000/jobs?keywords=product"
```

**That's it!** You'll have all product security positions from Riot Games stored in your database. 🎮🔒

