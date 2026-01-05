# ✅ Keyword Filtering & Search - Complete!

Advanced keyword filtering and search capabilities have been added to the Career Crawler!

---

## 🎯 What Was Added

### **3 New Modules:**

1. **`scrapers/filters.py`** (300+ lines)
   - `JobFilter` class for flexible filtering
   - 7 predefined filters (security, backend, frontend, devops, ml, senior, remote)
   - Keyword matching with regex support
   - Required/excluded keyword logic

2. **`database/search.py`** (200+ lines)
   - `search_jobs()` - Advanced keyword search
   - `search_jobs_fulltext()` - PostgreSQL full-text search with ranking
   - `get_security_jobs()` - Quick security job search
   - Multiple filter combinations

3. **`KEYWORD_FILTERING_GUIDE.md`** - Complete documentation

### **Updated Files:**
- `api.py` - Added filter support to crawl endpoint, search endpoints
- `main.py` - Pass filters to scraper
- `scrapers/base_scraper.py` - Apply filters during crawl

### **New API Endpoints:**
- `GET /search` - Full-text search
- `GET /jobs/security` - Quick security jobs
- `GET /jobs` - Enhanced with keyword filters

---

## 🚀 Two Powerful Approaches

### 1. Filter During Crawl (Recommended!)

Only store relevant jobs - saves 90%+ database space!

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "OpenAI", "career_url": "https://openai.com/careers"}
    ],
    "filter": {
      "predefined_filter": "security"
    }
  }'
```

**Result**: Only security jobs are stored in database.

### 2. Search Stored Jobs

Query jobs already in the database:

```bash
# Keyword search
curl "http://localhost:8000/jobs?keywords=security,python"

# Full-text search
curl "http://localhost:8000/search?q=application+security+engineer"

# Location filter
curl "http://localhost:8000/jobs?keywords=backend&location=remote"
```

---

## 📋 Predefined Filters

Use these common filters out of the box:

| Filter | Use For | Example |
|--------|---------|---------|
| **`security`** | AppSec, infosec jobs | `{"predefined_filter": "security"}` |
| **`backend`** | Backend engineering | `{"predefined_filter": "backend"}` |
| **`frontend`** | Frontend/UI dev | `{"predefined_filter": "frontend"}` |
| **`devops`** | DevOps & SRE | `{"predefined_filter": "devops"}` |
| **`ml`** | Machine learning/AI | `{"predefined_filter": "ml"}` |
| **`senior`** | Senior-level roles | `{"predefined_filter": "senior"}` |
| **`remote`** | Remote positions | `{"predefined_filter": "remote"}` |

---

## 🎨 Custom Filters

Create your own targeted filters:

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "TechCo", "career_url": "https://techco.com/careers"}
    ],
    "filter": {
      "keywords": ["python", "security", "api"],
      "title_keywords": ["engineer", "developer"],
      "required_keywords": ["remote"],
      "excluded_keywords": ["junior", "intern"],
      "min_keyword_matches": 2
    }
  }'
```

**Filter Options:**
- **`keywords`**: Match ANY (searches all fields)
- **`title_keywords`**: Match ANY in title
- **`required_keywords`**: ALL must be present
- **`excluded_keywords`**: Exclude if ANY present
- **`min_keyword_matches`**: Minimum matches needed

---

## 📊 Real-World Examples

### Example 1: Application Security Jobs

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Google", "career_url": "https://careers.google.com/"},
      {"name": "Meta", "career_url": "https://www.metacareers.com/"}
    ],
    "filter": {
      "predefined_filter": "security"
    }
  }'
```

**What it does**: Crawls Google and Meta, but only stores jobs related to security, infosec, cybersecurity, appsec, penetration testing, etc.

### Example 2: Senior Remote Backend Engineers

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Stripe", "career_url": "https://stripe.com/jobs"}
    ],
    "filter": {
      "title_keywords": ["senior", "staff", "principal"],
      "keywords": ["backend", "api", "microservices"],
      "required_keywords": ["remote"],
      "excluded_keywords": ["frontend", "junior"],
      "min_keyword_matches": 1
    }
  }'
```

**What it does**: Only stores senior-level backend positions that are remote.

### Example 3: Search Stored Jobs

After crawling, search what you've stored:

```bash
# Find Python security jobs
curl "http://localhost:8000/jobs?keywords=python,security"

# Find remote jobs in San Francisco
curl "http://localhost:8000/jobs?location=san%20francisco&keywords=remote"

# Full-text search
curl "http://localhost:8000/search?q=machine+learning+engineer"
```

---

## 🔍 How It Works

### Filter During Crawl (Flow)

```
1. Start crawl with filter
   ↓
2. Fetch career page
   ↓
3. Extract all job links
   ↓
4. For each job:
   - Parse job details
   - Check if matches filter
   - If YES: Store in database ✅
   - If NO: Skip (not stored) ❌
   ↓
5. Only relevant jobs in database
```

### Search Stored Jobs (Flow)

```
1. Jobs already in database
   ↓
2. Query with keywords
   ↓
3. PostgreSQL searches:
   - Title field
   - Description field
   - Requirements field
   ↓
4. Return matching jobs
```

---

## 💾 Storage Savings

**Example**: Crawling 10 companies with 500 total jobs

**Without Filtering:**
- 500 jobs stored
- Database: ~5 MB
- All jobs in search results

**With Security Filter:**
- 25 security jobs stored (5%)
- Database: ~250 KB
- **95% storage savings!**
- Only relevant results

---

## 🎯 Use Cases

### Use Case 1: Job Search Tool
**Goal**: Build a job board for security professionals

```bash
# Crawl top tech companies, filter for security
curl -X POST http://localhost:8000/crawl \
  -d '{
    "companies": [/* 100 companies */],
    "filter": {"predefined_filter": "security"}
  }'

# Users search your database
curl "http://localhost:8000/jobs?keywords=appsec&location=remote"
```

### Use Case 2: Career Research
**Goal**: Track ML/AI job trends

```bash
# Crawl AI companies monthly
curl -X POST http://localhost:8000/crawl \
  -d '{
    "companies": [/* AI companies */],
    "filter": {"predefined_filter": "ml"}
  }'

# Analyze trends over time
curl "http://localhost:8000/jobs?keywords=llm,transformer"
```

### Use Case 3: Personal Job Hunt
**Goal**: Find your next role

```bash
# Very specific filter
curl -X POST http://localhost:8000/crawl \
  -d '{
    "companies": [/* your target companies */],
    "filter": {
      "title_keywords": ["senior", "staff"],
      "keywords": ["python", "backend", "distributed systems"],
      "required_keywords": ["remote"],
      "excluded_keywords": ["junior", "manager"]
    }
  }'
```

---

## 🛠️ New API Endpoints

### POST /crawl (Enhanced)

Now accepts optional `filter` parameter:

```json
{
  "companies": [...],
  "filter": {
    "predefined_filter": "security"
    // OR custom filter options
  }
}
```

### GET /jobs (Enhanced)

Now accepts keyword parameters:

```
/jobs?keywords=security,python&location=remote
```

### GET /search (NEW!)

Full-text search with relevance ranking:

```
/search?q=application+security+engineer
```

### GET /jobs/security (NEW!)

Quick access to security jobs:

```
/jobs/security?limit=100
```

---

## 📚 Documentation

- **`KEYWORD_FILTERING_GUIDE.md`** - Complete guide with examples
- **Interactive API docs**: http://localhost:8000/docs
- **`API_REQUESTS.md`** - Sample curl commands

---

## ✨ Benefits

### Before (Without Filtering)
```
❌ Store all 500 jobs
❌ 5 MB database
❌ Slow searches through irrelevant jobs
❌ Manual filtering required
```

### After (With Filtering)
```
✅ Store only 25 relevant jobs
✅ 250 KB database (95% savings)
✅ Fast, focused searches
✅ Automatic filtering during crawl
✅ Multiple search methods
✅ Full-text search with ranking
```

---

## 🚀 Getting Started

### 1. Start the API

```bash
docker-compose up -d
```

### 2. Crawl with Filter

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "OpenAI", "career_url": "https://openai.com/careers"}
    ],
    "filter": {
      "predefined_filter": "security"
    }
  }'
```

### 3. Check Results

```bash
# View all stored jobs
curl "http://localhost:8000/jobs"

# Search with keywords
curl "http://localhost:8000/jobs?keywords=python"

# Full-text search
curl "http://localhost:8000/search?q=security+engineer"
```

---

## 🎓 Learn More

### Interactive Examples

Visit the API docs for interactive testing:

**http://localhost:8000/docs**

Try the `/crawl` endpoint with different filters!

### Complete Guide

See `KEYWORD_FILTERING_GUIDE.md` for:
- Detailed examples
- Best practices
- Troubleshooting
- Python code examples
- Advanced filtering techniques

---

## 🎉 Summary

You can now:

✅ **Filter during crawl** - Only store relevant jobs  
✅ **Use predefined filters** - Security, backend, frontend, etc.  
✅ **Create custom filters** - Precise control over what to store  
✅ **Search stored jobs** - Keyword search across fields  
✅ **Full-text search** - PostgreSQL search with ranking  
✅ **Quick access** - Predefined endpoints for common searches  
✅ **Save storage** - 90%+ reduction in database size  
✅ **Faster searches** - Smaller, more focused dataset  

**Start using it now:**

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [{"name": "YourCompany", "career_url": "..."}],
    "filter": {"predefined_filter": "security"}
  }'
```

Happy filtering! 🔍


