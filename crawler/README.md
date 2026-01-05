# Career Page Web Crawler

A modern, asynchronous web crawler designed to scrape job postings from company career pages. This crawler is integrated with Company Fit Explorer to provide real-time job data.

## Integration with Company Fit Explorer

This crawler is part of the Company Fit Explorer project and runs as a Docker service alongside the main application. See [docs/CRAWLER_SETUP.md](../docs/CRAWLER_SETUP.md) for the integrated setup guide.

### Quick Start (Integrated)

```bash
# From the project root
docker compose up --build
```

This starts all services including:
- Next.js app on port 3000
- LLM server on port 3002
- Crawler API on port 8000
- Crawler scheduler (24-hour updates)
- PostgreSQL for crawler data on port 5433

## Features

- **Async Architecture**: Built with `aiohttp` for high-performance concurrent scraping
- **Anti-Bot Measures**: User-agent rotation, realistic headers, randomized delays, and rate limiting
- **Modular ATS Detection**: Automatically detects and adapts to different ATS platforms
- **PostgreSQL Storage**: Structured data storage with async database operations
- **Auto-Discovery**: Automatically finds career page URLs from company name/domain
- **Job Filtering**: Filter for specific roles (security, backend, frontend, etc.)
- **Full-Text Search**: PostgreSQL full-text search for finding jobs
- **24-Hour Scheduling**: Automatic crawling of stale companies
- **Supabase Sync**: Syncs job counts to Company Fit Explorer

## Standalone Usage

If running the crawler independently:

### Installation

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up PostgreSQL and create `.env` file:
   ```bash
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=career_crawler
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

4. Initialize the database:
   ```bash
   python setup.py
   ```

### Basic Usage

```python
from main import CareerCrawler

# Initialize crawler
crawler = CareerCrawler()

# Add companies to crawl
companies = [
    {"name": "Example Corp", "career_url": "https://example.com/careers"},
]

# Run the crawler
await crawler.crawl(companies)
```

### API Usage

```bash
# Start the API
python api.py

# Crawl companies (auto-discovers career URLs)
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "OpenAI", "domain": "openai.com"}
    ]
  }'

# Search jobs
curl "http://localhost:8000/jobs?keywords=engineer,python"

# Full-text search
curl "http://localhost:8000/search?q=security+engineer"
```

## Project Structure

```
crawler/
├── api.py                 # FastAPI REST API
├── main.py                # Core crawler logic
├── scheduler.py           # 24-hour scheduled crawling
├── sync_service.py        # Supabase sync service
├── config/                # Configuration
│   ├── settings.py        # Rate limits, timeouts
│   └── user_agents.py     # User agent rotation
├── database/              # Database layer
│   ├── connection.py      # Connection pooling
│   ├── models.py          # Schema definition
│   ├── operations.py      # CRUD operations
│   └── search.py          # Search functions
├── scrapers/              # Scraping logic
│   ├── base_scraper.py    # Base scraper class
│   ├── detector.py        # ATS detection
│   ├── extractors.py      # Data extraction
│   ├── filters.py         # Job filtering
│   └── parsers/           # ATS-specific parsers
│       └── generic.py     # Generic HTML parser
├── discovery/             # Career page discovery
│   └── career_page_finder.py
├── Dockerfile             # API container
├── Dockerfile.scheduler   # Scheduler container
├── requirements.txt       # Python dependencies
└── requirements.scheduler.txt  # Scheduler deps
```

## Configuration

Edit `config/settings.py` to adjust:

### Rate Limiting

```python
RATE_LIMIT_CONFIG = {
    "requests_per_minute": 20,  # Per domain
    "min_delay": 2.0,           # Min seconds between requests
    "max_delay": 5.0,           # Max seconds between requests
}
```

### HTTP Client

```python
HTTP_CONFIG = {
    "timeout": 30,              # Request timeout
    "retry_attempts": 3,        # Retries on failure
    "retry_delay": 2,           # Base retry delay
}
```

### Crawler

```python
CRAWLER_CONFIG = {
    "max_concurrent_tasks": 10, # Parallel company crawls
    "respect_robots_txt": True, # Honor robots.txt
}
```

## Database Schema

- **companies**: Company info and career page URLs
- **jobs**: Job postings with title, description, requirements, location
- **crawl_logs**: Audit trail of crawl attempts and errors

## Anti-Bot Features

- Rotating pool of realistic user agents
- Randomized delays (2-5 seconds) between requests
- Realistic browser headers
- Per-domain rate limiting
- Exponential backoff on failures
- Connection pooling

## Extending

### Adding a New ATS Parser

1. Create a parser in `scrapers/parsers/`:

```python
from .base import BaseParser

class GreenhouseParser(BaseParser):
    def can_parse(self, html: str, url: str) -> bool:
        return 'greenhouse.io' in url

    async def parse_jobs(self, html: str, url: str) -> List[Job]:
        # Extraction logic here
        pass
```

2. Register in `scrapers/detector.py`

### Adding Custom Filters

```python
from scrapers.filters import JobFilter

# Custom filter for ML jobs
ml_filter = JobFilter(
    keywords=['machine learning', 'ml', 'ai', 'deep learning'],
    required_keywords=['python'],
    excluded_keywords=['intern', 'junior']
)

# Use when crawling
await crawler.crawl_companies(companies, job_filter=ml_filter)
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /crawl` | Start crawl job |
| `GET /crawl/{id}` | Get job status |
| `GET /discover` | Find career URL |
| `GET /jobs` | List/filter jobs |
| `GET /search` | Full-text search |
| `GET /companies` | List companies |
| `GET /stats` | Statistics |
| `GET /health` | Health check |
| `GET /logs` | Crawl logs |

## License

MIT
