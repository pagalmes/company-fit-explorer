# Keyword Filtering & Search Guide

The Career Crawler now supports powerful keyword filtering at **two levels**:

1. **Filter During Crawl** - Only store relevant jobs (saves database space)
2. **Search Stored Jobs** - Query jobs already in the database

---

## 1. Filter During Crawl (Recommended!)

### Why Filter During Crawl?

- ✅ **Save Database Space** - Don't store irrelevant jobs
- ✅ **Faster Searches** - Smaller, more focused dataset
- ✅ **More Relevant Results** - Only jobs you care about
- ✅ **Reduce Noise** - No manual filtering later

### Predefined Filters

Use predefined filters for common job searches:

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

**Available Predefined Filters:**

| Filter | Description | Keywords |
|--------|-------------|----------|
| `security` | Application security, infosec jobs | security, infosec, cybersecurity, appsec, penetration testing, vulnerability |
| `backend` | Backend engineering roles | backend, api, server, microservices, python, java, go |
| `frontend` | Frontend/UI development | frontend, react, vue, angular, javascript, typescript |
| `devops` | DevOps & SRE roles | devops, sre, kubernetes, docker, aws, terraform, ci/cd |
| `ml` | Machine learning & AI | machine learning, ml, ai, deep learning, pytorch, nlp |
| `senior` | Senior-level positions | senior, lead, principal, staff (excludes junior/intern) |
| `remote` | Remote-friendly jobs | remote, work from home, distributed |

### Custom Filters

Create your own filter with specific criteria:

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "OpenAI", "career_url": "https://openai.com/careers"}
    ],
    "filter": {
      "keywords": ["python", "security", "api"],
      "title_keywords": ["engineer", "developer"],
      "excluded_keywords": ["junior", "intern"],
      "required_keywords": ["remote"],
      "min_keyword_matches": 2
    }
  }'
```

**Filter Options:**

- **`keywords`**: Match ANY of these (searches title, description, requirements)
- **`title_keywords`**: Match ANY in the job title specifically
- **`required_keywords`**: ALL must be present (otherwise job excluded)
- **`excluded_keywords`**: If ANY present, job is excluded
- **`min_keyword_matches`**: Minimum number of keyword matches required

---

## 2. Search Stored Jobs

### Basic Keyword Search

Search jobs already in the database:

```bash
# Search for security jobs
curl "http://localhost:8000/jobs?keywords=security"

# Multiple keywords (OR logic)
curl "http://localhost:8000/jobs?keywords=security,python"

# Search in title only
curl "http://localhost:8000/jobs?title_keywords=senior,engineer"

# Filter by location
curl "http://localhost:8000/jobs?location=san%20francisco"

# Combine filters
curl "http://localhost:8000/jobs?keywords=security&location=remote"
```

### Full-Text Search

Use PostgreSQL full-text search with relevance ranking:

```bash
# Full-text search
curl "http://localhost:8000/search?q=application%20security%20engineer"

# Results are ranked by relevance
curl "http://localhost:8000/search?q=python%20backend%20api"
```

### Predefined Search Endpoints

Quick access to common searches:

```bash
# Get all security jobs
curl "http://localhost:8000/jobs/security"
```

---

## Complete Examples

### Example 1: Security Jobs Only

**Goal**: Only store security-related positions

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Company A", "career_url": "https://companya.com/careers"},
      {"name": "Company B", "career_url": "https://companyb.com/careers"}
    ],
    "filter": {
      "predefined_filter": "security"
    }
  }'
```

**Result**: Only jobs mentioning security, cybersecurity, appsec, etc. are stored.

---

### Example 2: Senior Backend Engineers

**Goal**: Only senior backend positions, exclude frontend

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Tech Co", "career_url": "https://techco.com/careers"}
    ],
    "filter": {
      "title_keywords": ["senior", "staff", "principal"],
      "keywords": ["backend", "api", "microservices"],
      "excluded_keywords": ["frontend", "mobile"],
      "min_keyword_matches": 1
    }
  }'
```

---

### Example 3: Remote ML/AI Positions

**Goal**: Only remote machine learning jobs

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "AI Startup", "career_url": "https://aistart.com/careers"}
    ],
    "filter": {
      "required_keywords": ["remote"],
      "keywords": ["machine learning", "deep learning", "nlp", "pytorch"],
      "title_keywords": ["ml", "machine learning", "ai"],
      "min_keyword_matches": 1
    }
  }'
```

**Result**: Only remote jobs with ML/AI in title and ML-related keywords.

---

### Example 4: Python Security Engineers (Specific)

**Goal**: Very targeted search - Python security engineers

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Security Co", "career_url": "https://securityco.com/careers"}
    ],
    "filter": {
      "required_keywords": ["python", "security"],
      "title_keywords": ["security", "engineer"],
      "excluded_keywords": ["junior", "intern", "entry level"],
      "min_keyword_matches": 2
    }
  }'
```

---

## Workflow Comparison

### Without Filtering (Old Way)

```bash
# 1. Crawl everything
curl -X POST http://localhost:8000/crawl \
  -d '{"companies":[{"name":"BigCorp","career_url":"..."}]}'

# Result: 500 jobs stored

# 2. Search later
curl "http://localhost:8000/jobs?keywords=security"

# Result: 25 security jobs found (but 475 irrelevant jobs in DB)
```

### With Filtering (New Way)

```bash
# 1. Crawl with filter
curl -X POST http://localhost:8000/crawl \
  -d '{
    "companies":[{"name":"BigCorp","career_url":"..."}],
    "filter":{"predefined_filter":"security"}
  }'

# Result: 25 security jobs stored (475 filtered out)

# 2. All results are relevant
curl "http://localhost:8000/jobs"

# Result: 25 security jobs (100% relevant)
```

---

## Python Examples

### Filter During Crawl

```python
import requests

# Crawl only security jobs
response = requests.post(
    "http://localhost:8000/crawl",
    json={
        "companies": [
            {"name": "OpenAI", "career_url": "https://openai.com/careers"}
        ],
        "filter": {
            "predefined_filter": "security"
        }
    }
)

job_id = response.json()["job_id"]
print(f"Started crawl: {job_id}")
```

### Custom Filter

```python
import requests

response = requests.post(
    "http://localhost:8000/crawl",
    json={
        "companies": [
            {"name": "TechCo", "career_url": "https://techco.com/careers"}
        ],
        "filter": {
            "keywords": ["python", "golang", "rust"],
            "title_keywords": ["backend", "infrastructure"],
            "required_keywords": ["remote"],
            "excluded_keywords": ["junior", "intern"],
            "min_keyword_matches": 1
        }
    }
)
```

### Search Stored Jobs

```python
import requests

# Keyword search
jobs = requests.get(
    "http://localhost:8000/jobs",
    params={
        "keywords": "security,python",
        "location": "remote",
        "limit": 100
    }
).json()

print(f"Found {len(jobs)} jobs")

for job in jobs[:5]:
    print(f"- {job['title']} at {job['company_name']}")
```

### Full-Text Search

```python
import requests

results = requests.get(
    "http://localhost:8000/search",
    params={"q": "application security engineer"}
).json()

print(f"Found {results['total']} jobs")

for job in results['jobs']:
    print(f"- {job['title']} at {job['company_name']} (relevance: {job['relevance']:.2f})")
```

---

## Advanced Tips

### 1. Combine Multiple Filters

```bash
# Senior backend OR devops, remote only, no frontend
curl -X POST http://localhost:8000/crawl \
  -d '{
    "filter": {
      "title_keywords": ["senior", "staff", "principal"],
      "keywords": ["backend", "devops", "infrastructure", "api"],
      "required_keywords": ["remote"],
      "excluded_keywords": ["frontend", "mobile", "junior"],
      "min_keyword_matches": 1
    }
  }'
```

### 2. Use Regex-Like Patterns

Keywords support word boundaries, so:
- `"security"` matches "Security Engineer" ✅
- `"security"` matches "Cybersecurity" ❌ (use "cybersecurity" too)

### 3. Optimize for Your Use Case

**Broad Search** (find many jobs):
```json
{
  "keywords": ["engineer", "developer", "architect"],
  "min_keyword_matches": 1
}
```

**Narrow Search** (very specific):
```json
{
  "required_keywords": ["python", "security"],
  "title_keywords": ["engineer"],
  "excluded_keywords": ["junior", "intern"]
}
```

### 4. Test Your Filters

Before crawling 100 companies, test on one:

```bash
# Test filter on one company
curl -X POST http://localhost:8000/crawl \
  -d '{
    "companies":[{"name":"Test","career_url":"..."}],
    "filter":{"keywords":["security"]}
  }'

# Check results
curl "http://localhost:8000/jobs?limit=10"

# Adjust filter and re-crawl if needed
```

---

## Performance Impact

### Storage Savings

Example: Crawling 10 companies with 50 jobs each = 500 jobs

**Without Filter:**
- 500 jobs stored
- Database size: ~5 MB
- Search through all 500 jobs

**With Security Filter:**
- 25 jobs stored (5% match rate)
- Database size: ~250 KB (95% savings)
- Search through only 25 relevant jobs

### Crawl Speed

Filtering adds minimal overhead:
- Each job: +1-2ms for filter check
- 500 jobs: +1 second total
- Worth it for 95% storage savings!

---

## Best Practices

1. **Filter at Crawl Time** - More efficient than storing everything
2. **Use Predefined Filters** - Tested and optimized
3. **Test Filters First** - Crawl one company to verify
4. **Be Specific** - Use `title_keywords` for better precision
5. **Exclude Noise** - Use `excluded_keywords` liberally
6. **Combine Methods** - Filter during crawl + search later

---

## Troubleshooting

### Too Few Results?

- Reduce `min_keyword_matches`
- Add more keywords (synonyms)
- Remove `required_keywords`
- Check spelling of keywords

### Too Many Results?

- Increase `min_keyword_matches`
- Add `required_keywords`
- Add more `excluded_keywords`
- Use `title_keywords` for specificity

### No Results?

- Remove all filters and crawl again
- Check if jobs exist on career page
- Try broader keywords
- Check filter logic (required vs optional)

---

## API Reference

### POST /crawl (with filter)

```json
{
  "companies": [...],
  "filter": {
    "keywords": ["python", "security"],
    "required_keywords": ["remote"],
    "excluded_keywords": ["junior"],
    "title_keywords": ["engineer"],
    "min_keyword_matches": 1
  }
}
```

### GET /jobs (with search)

```
/jobs?keywords=security,python&location=remote&limit=100
```

### GET /search (full-text)

```
/search?q=application+security+engineer&limit=50
```

### GET /jobs/security (predefined)

```
/jobs/security?limit=100
```

---

## Summary

**Two Powerful Options:**

1. **Filter During Crawl** (Recommended)
   - Only stores relevant jobs
   - Saves database space
   - Faster searches

2. **Search Stored Jobs**
   - Query existing jobs
   - Full-text search
   - Multiple filter options

**Use Both!** Filter during crawl for broad categories, then search within results for specific needs.

---

For more examples, see:
- `API_REQUESTS.md` - Complete API documentation
- Interactive API docs: http://localhost:8000/docs


