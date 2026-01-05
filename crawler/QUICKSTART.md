# Quick Start Guide

Get up and running with the Career Page Web Crawler in minutes.

## Prerequisites

- Python 3.8 or higher
- PostgreSQL 12 or higher
- pip (Python package installer)

## Installation

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up PostgreSQL Database

Create a PostgreSQL database for the crawler:

```sql
CREATE DATABASE career_crawler;
```

### 3. Configure Environment

Copy the example environment file and edit it with your settings:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=career_crawler
DB_USER=your_username
DB_PASSWORD=your_password
LOG_LEVEL=INFO
```

### 4. Initialize Database

Run the setup script to create the database schema:

```bash
python setup.py
```

You should see:
```
✓ Database schema created successfully
✓ Database connection successful
✓ All required dependencies are installed
Setup Complete!
```

## Basic Usage

### Example 1: Simple Crawl

Create a Python script or use the interactive Python shell:

```python
import asyncio
from main import CareerCrawler

async def crawl():
    companies = [
        {
            "name": "Example Company",
            "career_url": "https://example.com/careers"
        }
    ]
    
    crawler = CareerCrawler()
    results = await crawler.crawl(companies)
    
    for result in results:
        print(f"Found {result['jobs_inserted']} jobs at {result['company_name']}")

# Run it
asyncio.run(crawl())
```

### Example 2: Using the Example Script

Run the provided example script:

```bash
python example_usage.py
```

Follow the prompts to run different example scenarios.

### Example 3: Running the Main Script

Edit `main.py` to add your companies, then run:

```bash
python main.py
```

## Viewing Results

### Query the Database

Connect to your PostgreSQL database to view results:

```sql
-- View all companies
SELECT * FROM companies;

-- View all jobs
SELECT c.name, j.title, j.location, j.application_url
FROM jobs j
JOIN companies c ON j.company_id = c.company_id
WHERE j.is_active = true
ORDER BY j.scraped_at DESC;

-- View crawl statistics
SELECT 
    status, 
    COUNT(*) as count,
    AVG(response_time_ms) as avg_response_time
FROM crawl_logs
GROUP BY status;
```

### Using Python

```python
import asyncio
from database.connection import db_pool
from database.operations import get_jobs_by_company

async def view_jobs():
    await db_pool.initialize()
    
    # Get jobs for a company (company_id = 1)
    jobs = await get_jobs_by_company(1)
    
    for job in jobs:
        print(f"{job['title']} - {job['location']}")
    
    await db_pool.close()

asyncio.run(view_jobs())
```

## Configuration

### Adjust Crawling Behavior

Edit `config/settings.py` to adjust:

**Rate Limiting:**
```python
RATE_LIMIT_CONFIG = {
    "requests_per_minute": 20,  # Requests per domain per minute
    "min_delay": 2.0,           # Min seconds between requests
    "max_delay": 5.0,           # Max seconds between requests
}
```

**Concurrency:**
```python
CRAWLER_CONFIG = {
    "max_concurrent_tasks": 10,  # Max companies to crawl simultaneously
}
```

**HTTP Client:**
```python
HTTP_CONFIG = {
    "timeout": 30,              # Request timeout in seconds
    "retry_attempts": 3,        # Number of retries on failure
    "retry_delay": 2,           # Base delay between retries
}
```

### Add More User Agents

Edit `config/user_agents.py` to add more user agent strings for better rotation.

## Common Issues

### Database Connection Error

**Problem:** Can't connect to PostgreSQL

**Solution:**
1. Verify PostgreSQL is running: `pg_isready`
2. Check credentials in `.env`
3. Ensure database exists: `createdb career_crawler`
4. Check PostgreSQL accepts connections from localhost

### No Jobs Found

**Problem:** Crawler runs but finds no jobs

**Possible reasons:**
1. The career page structure is unusual - the generic parser may need customization
2. The site requires JavaScript - consider using Playwright for JS-heavy sites
3. The site is blocking the crawler - check `crawl_logs` table for errors

**Solution:**
- Check the `crawl_logs` table for errors
- Try viewing the career page in a browser to see if jobs are visible
- Add logging to see what HTML is being fetched

### Rate Limited

**Problem:** Getting 429 (Too Many Requests) errors

**Solution:**
- Increase delays in `config/settings.py`
- Reduce `requests_per_minute`
- Check if the site has a `robots.txt` with crawl delay recommendations

## Next Steps

1. **Add Custom Parsers:** Create ATS-specific parsers in `scrapers/parsers/` for better extraction
2. **Schedule Crawls:** Use cron or a task scheduler to run regular crawls
3. **Add Monitoring:** Integrate with monitoring tools to track crawl health
4. **Export Data:** Add CSV/JSON export functionality for analysis
5. **Build Dashboard:** Create a web interface to view and search jobs

## Support

For issues or questions:
- Check the main README.md for detailed documentation
- Review the code comments in each module
- Look at example_usage.py for more usage patterns

## Best Practices

1. **Start Small:** Test with 1-2 companies before scaling up
2. **Monitor Logs:** Watch for errors and rate limit warnings
3. **Be Respectful:** Don't overwhelm servers - adjust rate limits appropriately
4. **Regular Maintenance:** Clean up old crawl logs periodically
5. **Update User Agents:** Keep user agent list current


