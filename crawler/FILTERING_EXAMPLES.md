# Keyword Filtering - Sample Requests

Quick reference for common filtering scenarios.

---

## Predefined Filters

### Security Jobs Only

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "OpenAI", "career_url": "https://openai.com/careers"},
      {"name": "Anthropic", "career_url": "https://www.anthropic.com/careers"}
    ],
    "filter": {
      "predefined_filter": "security"
    }
  }'
```

**Searches for**: security, infosec, cybersecurity, appsec, application security, penetration testing, vulnerability, threat

---

### Backend Engineering

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Stripe", "career_url": "https://stripe.com/jobs"}
    ],
    "filter": {
      "predefined_filter": "backend"
    }
  }'
```

**Searches for**: backend, api, server, microservices, database, python, java, go, node.js, rest, graphql

**Excludes**: frontend, mobile, ios, android

---

### Frontend/UI Development

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Vercel", "career_url": "https://vercel.com/careers"}
    ],
    "filter": {
      "predefined_filter": "frontend"
    }
  }'
```

**Searches for**: frontend, react, vue, angular, javascript, typescript, css, html, ui, ux, web

**Excludes**: backend

---

### DevOps & SRE

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "HashiCorp", "career_url": "https://www.hashicorp.com/careers"}
    ],
    "filter": {
      "predefined_filter": "devops"
    }
  }'
```

**Searches for**: devops, sre, kubernetes, docker, aws, gcp, azure, terraform, ansible, ci/cd, jenkins, infrastructure

---

### Machine Learning / AI

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Hugging Face", "career_url": "https://huggingface.co/jobs"}
    ],
    "filter": {
      "predefined_filter": "ml"
    }
  }'
```

**Searches for**: machine learning, ml, ai, artificial intelligence, deep learning, pytorch, tensorflow, data science, nlp, computer vision, models

---

### Senior-Level Positions

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Netflix", "career_url": "https://jobs.netflix.com/"}
    ],
    "filter": {
      "predefined_filter": "senior"
    }
  }'
```

**Title must contain**: senior, lead, principal, staff

**Excludes**: junior, intern, entry

---

### Remote Jobs

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "GitLab", "career_url": "https://about.gitlab.com/jobs/"}
    ],
    "filter": {
      "predefined_filter": "remote"
    }
  }'
```

**Searches for**: remote, work from home, distributed, anywhere

---

## Custom Filters

### Python Security Engineers

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Security Co", "career_url": "https://example.com/careers"}
    ],
    "filter": {
      "required_keywords": ["python", "security"],
      "title_keywords": ["engineer", "developer"],
      "excluded_keywords": ["junior", "intern"],
      "min_keyword_matches": 2
    }
  }'
```

**Requirements**:
- MUST have both "python" AND "security"
- Title must have "engineer" OR "developer"
- Cannot have "junior" or "intern"

---

### Senior Backend Engineers (Remote)

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Remote Co", "career_url": "https://example.com/careers"}
    ],
    "filter": {
      "title_keywords": ["senior", "staff", "principal"],
      "keywords": ["backend", "api", "microservices", "distributed systems"],
      "required_keywords": ["remote"],
      "excluded_keywords": ["frontend", "mobile", "junior"],
      "min_keyword_matches": 2
    }
  }'
```

**Requirements**:
- Title must have senior/staff/principal
- Must mention "remote"
- Must have 2+ of: backend, api, microservices, distributed systems
- No frontend, mobile, or junior roles

---

### ML/AI Research (PhD Required)

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Research Lab", "career_url": "https://example.com/careers"}
    ],
    "filter": {
      "keywords": ["machine learning", "deep learning", "research", "nlp", "computer vision"],
      "required_keywords": ["phd", "research"],
      "title_keywords": ["research", "scientist"],
      "min_keyword_matches": 2
    }
  }'
```

---

### Golang/Rust Systems Engineers

```bash
curl -X POST http://localhost:8000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {"name": "Systems Co", "career_url": "https://example.com/careers"}
    ],
    "filter": {
      "keywords": ["golang", "go", "rust", "systems", "performance", "distributed"],
      "title_keywords": ["engineer", "developer"],
      "excluded_keywords": ["javascript", "frontend", "junior"],
      "min_keyword_matches": 2
    }
  }'
```

---

## Search Stored Jobs

### Basic Keyword Search

```bash
# Single keyword
curl "http://localhost:8000/jobs?keywords=security"

# Multiple keywords (OR logic)
curl "http://localhost:8000/jobs?keywords=security,python,golang"

# Title search
curl "http://localhost:8000/jobs?title_keywords=senior,staff"

# Location filter
curl "http://localhost:8000/jobs?location=san%20francisco"

# Combine filters
curl "http://localhost:8000/jobs?keywords=security&location=remote&limit=100"
```

---

### Full-Text Search

```bash
# Simple query
curl "http://localhost:8000/search?q=security+engineer"

# Complex query
curl "http://localhost:8000/search?q=senior+backend+python+api"

# Results ranked by relevance
curl "http://localhost:8000/search?q=application+security+penetration+testing"
```

---

### Predefined Endpoints

```bash
# Get all security jobs
curl "http://localhost:8000/jobs/security?limit=100"
```

---

## Combine Multiple Approaches

### 1. Filter During Crawl, Then Search

```bash
# Step 1: Crawl with broad filter
curl -X POST http://localhost:8000/crawl \
  -d '{
    "companies": [/* many companies */],
    "filter": {"predefined_filter": "backend"}
  }'

# Step 2: Search within results
curl "http://localhost:8000/jobs?keywords=python,golang&location=remote"
```

---

### 2. Multiple Crawls with Different Filters

```bash
# Crawl 1: Security jobs
curl -X POST http://localhost:8000/crawl \
  -d '{
    "companies": [/* companies */],
    "filter": {"predefined_filter": "security"}
  }'

# Crawl 2: Backend jobs
curl -X POST http://localhost:8000/crawl \
  -d '{
    "companies": [/* companies */],
    "filter": {"predefined_filter": "backend"}
  }'

# Search across both
curl "http://localhost:8000/jobs?keywords=python"
```

---

## Python Examples

### Predefined Filter

```python
import requests

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
print(f"Crawl started: {job_id}")
```

---

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

---

### Search After Crawling

```python
import requests
import time

# Start crawl
response = requests.post(
    "http://localhost:8000/crawl",
    json={
        "companies": [
            {"name": "Company", "career_url": "https://example.com/careers"}
        ],
        "filter": {"predefined_filter": "security"}
    }
)

job_id = response.json()["job_id"]

# Wait for completion
while True:
    status = requests.get(f"http://localhost:8000/crawl/{job_id}").json()
    if status["status"] == "completed":
        break
    time.sleep(5)

# Search results
jobs = requests.get(
    "http://localhost:8000/jobs",
    params={"keywords": "python", "limit": 50}
).json()

print(f"Found {len(jobs)} Python security jobs")
for job in jobs[:10]:
    print(f"- {job['title']} at {job['company_name']}")
```

---

### Full-Text Search

```python
import requests

results = requests.get(
    "http://localhost:8000/search",
    params={"q": "application security engineer", "limit": 50}
).json()

print(f"Found {results['total']} jobs")

for job in results['jobs']:
    print(f"{job['title']} at {job['company_name']}")
    print(f"  Relevance: {job['relevance']:.2f}")
    print(f"  URL: {job['application_url']}")
    print()
```

---

## Testing Your Filter

Before crawling many companies, test your filter:

```bash
# 1. Test on one company
curl -X POST http://localhost:8000/crawl \
  -d '{
    "companies": [{"name": "TestCo", "career_url": "https://test.com/careers"}],
    "filter": {"keywords": ["security"]}
  }'

# 2. Check what was stored
curl "http://localhost:8000/jobs?limit=20"

# 3. If too many/few results, adjust filter and try again
curl -X POST http://localhost:8000/crawl \
  -d '{
    "companies": [{"name": "TestCo", "career_url": "https://test.com/careers"}],
    "filter": {
      "keywords": ["security"],
      "title_keywords": ["engineer"],
      "min_keyword_matches": 1
    }
  }'
```

---

## Performance Comparison

### Without Filter (Store Everything)

```bash
curl -X POST http://localhost:8000/crawl \
  -d '{"companies":[{"name":"BigCorp","career_url":"..."}]}'

# Result: 500 jobs stored, 5 MB database
```

### With Filter (Store Only Relevant)

```bash
curl -X POST http://localhost:8000/crawl \
  -d '{
    "companies":[{"name":"BigCorp","career_url":"..."}],
    "filter":{"predefined_filter":"security"}
  }'

# Result: 25 jobs stored, 250 KB database (95% savings!)
```

---

## Interactive Testing

Visit **http://localhost:8000/docs** to test all endpoints interactively in your browser!

---

For complete documentation, see:
- `KEYWORD_FILTERING_GUIDE.md` - Full guide
- `FILTERING_COMPLETE.md` - Feature overview
- `API_REQUESTS.md` - All API examples


