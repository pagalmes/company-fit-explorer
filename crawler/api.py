"""
REST API for the career crawler.

Provides HTTP endpoints to trigger crawls and retrieve results.
"""
import asyncio
import logging
from typing import List, Dict, Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl, Field
import uvicorn

from main import CareerCrawler
from database.connection import db_pool
from database.operations import (
    get_company_by_url,
    get_jobs_by_company,
    get_recent_crawl_logs,
    get_crawl_stats,
)
from database.models import init_database
from database.search import search_jobs, search_jobs_fulltext, get_security_jobs
from scrapers.filters import JobFilter, get_filter
from discovery.career_page_finder import CareerPageFinder

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Pydantic models for request/response
class CompanyInput(BaseModel):
    """Input model for a company to crawl."""
    name: str = Field(..., description="Company name")
    career_url: Optional[HttpUrl] = Field(None, description="URL to the company's career page (optional - will auto-discover if not provided)")
    domain: Optional[str] = Field(None, description="Company domain (e.g., 'riotgames.com') - helps with discovery")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Riot Games",
                "domain": "riotgames.com"
            }
        }


class JobFilterInput(BaseModel):
    """Input model for job filtering."""
    keywords: Optional[List[str]] = Field(None, description="Keywords to search (any match)")
    required_keywords: Optional[List[str]] = Field(None, description="Keywords that must be present")
    excluded_keywords: Optional[List[str]] = Field(None, description="Keywords that exclude the job")
    title_keywords: Optional[List[str]] = Field(None, description="Keywords to search in title only")
    min_keyword_matches: int = Field(1, description="Minimum keyword matches required")
    predefined_filter: Optional[str] = Field(None, description="Use predefined filter: security, backend, frontend, devops, ml, senior, remote")
    
    class Config:
        json_schema_extra = {
            "example": {
                "predefined_filter": "security"
            }
        }


class CrawlRequest(BaseModel):
    """Request model for crawling companies."""
    companies: List[CompanyInput] = Field(..., description="List of companies to crawl")
    filter: Optional[JobFilterInput] = Field(None, description="Optional filter to only store matching jobs")
    
    class Config:
        json_schema_extra = {
            "example": {
                "companies": [
                    {
                        "name": "OpenAI",
                        "career_url": "https://openai.com/careers"
                    },
                    {
                        "name": "Anthropic",
                        "career_url": "https://www.anthropic.com/careers"
                    }
                ],
                "filter": {
                    "predefined_filter": "security"
                }
            }
        }


class CrawlResponse(BaseModel):
    """Response model for crawl results."""
    job_id: str
    message: str
    companies_count: int


class JobResponse(BaseModel):
    """Response model for a job."""
    job_id: int
    company_name: str
    title: str
    description: Optional[str]
    requirements: Optional[str]
    location: Optional[str]
    application_url: Optional[str]
    posted_date: Optional[datetime]
    scraped_at: datetime
    is_active: bool


class CompanyResponse(BaseModel):
    """Response model for a company."""
    company_id: int
    name: str
    career_page_url: str
    ats_type: Optional[str]
    last_crawled: Optional[datetime]
    job_count: int


class StatsResponse(BaseModel):
    """Response model for statistics."""
    total_companies: int
    total_active_jobs: int
    crawl_stats: Dict
    uptime: str


# Global crawler instance
crawler: Optional[CareerCrawler] = None

# Career page finder
career_finder: Optional[CareerPageFinder] = None

# Background tasks tracker
crawl_tasks: Dict[str, Dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown.
    """
    # Startup
    logger.info("Starting up Career Crawler API...")
    
    # Initialize database
    try:
        await init_database()
        logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    # Initialize database pool
    await db_pool.initialize()
    logger.info("Database pool initialized")
    
    # Initialize crawler
    global crawler
    crawler = CareerCrawler()
    await crawler.initialize()
    logger.info("Crawler initialized")
    
    # Initialize career page finder
    global career_finder
    career_finder = CareerPageFinder(crawler.session_manager)
    logger.info("Career page finder initialized")
    
    logger.info("API ready to accept requests")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Career Crawler API...")
    if crawler:
        await crawler.shutdown()
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Career Crawler API",
    description="REST API for scraping job postings from company career pages",
    version="1.0.0",
    lifespan=lifespan,
)


async def run_crawl_task(job_id: str, companies: List[Dict], job_filter: Optional[JobFilter] = None):
    """
    Background task to run the crawler.
    
    Args:
        job_id: Unique job identifier
        companies: List of companies to crawl
        job_filter: Optional filter for jobs
    """
    crawl_tasks[job_id]["status"] = "running"
    crawl_tasks[job_id]["started_at"] = datetime.now()
    
    try:
        results = await crawler.crawl_companies(companies, job_filter=job_filter)
        
        crawl_tasks[job_id]["status"] = "completed"
        crawl_tasks[job_id]["completed_at"] = datetime.now()
        crawl_tasks[job_id]["results"] = results
        
        # Calculate summary
        successful = sum(1 for r in results if r.get('success'))
        total_jobs = sum(r.get('jobs_inserted', 0) for r in results)
        
        crawl_tasks[job_id]["summary"] = {
            "successful_companies": successful,
            "total_companies": len(companies),
            "total_jobs_found": total_jobs,
        }
        
        logger.info(f"Crawl job {job_id} completed: {total_jobs} jobs from {successful}/{len(companies)} companies")
        
    except Exception as e:
        logger.error(f"Crawl job {job_id} failed: {e}", exc_info=True)
        crawl_tasks[job_id]["status"] = "failed"
        crawl_tasks[job_id]["error"] = str(e)
        crawl_tasks[job_id]["completed_at"] = datetime.now()


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Career Crawler API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "POST /crawl": "Start a new crawl job (auto-discovers career URLs!)",
            "POST /discover": "Discover career page URL for a company",
            "GET /crawl/{job_id}": "Get crawl job status",
            "GET /crawl": "List all crawl jobs",
            "GET /companies": "List tracked companies",
            "GET /jobs": "List active jobs",
            "GET /jobs/{company_id}": "Get jobs for a specific company",
            "GET /stats": "Get crawler statistics",
            "GET /logs": "Get recent crawl logs",
            "GET /health": "Health check",
        }
    }


@app.post("/discover")
async def discover_career_page(
    company_name: str = Query(..., description="Company name"),
    domain: Optional[str] = Query(None, description="Optional company domain (e.g., 'riotgames.com')")
):
    """
    Discover the career page URL for a company.
    
    **Examples**:
    - `/discover?company_name=Riot Games`
    - `/discover?company_name=OpenAI&domain=openai.com`
    
    The system will try multiple strategies:
    1. Common URL patterns (/careers, /jobs, etc.)
    2. Search homepage for career links
    3. Multiple domain variations (.com, .io, .ai, etc.)
    """
    logger.info(f"Discovering career page for: {company_name}")
    
    career_url, method = await career_finder.discover(company_name, domain)
    
    if career_url:
        return {
            "company_name": company_name,
            "career_url": career_url,
            "discovery_method": method,
            "success": True
        }
    else:
        return {
            "company_name": company_name,
            "career_url": None,
            "discovery_method": method,
            "success": False,
            "message": "Could not find career page. Try providing the domain parameter."
        }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check database connection
        result = await db_pool.fetchval("SELECT 1")
        if result != 1:
            raise Exception("Database check failed")
        
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")


@app.post("/crawl", response_model=CrawlResponse)
async def start_crawl(request: CrawlRequest, background_tasks: BackgroundTasks):
    """
    Start a new crawl job.
    
    This endpoint accepts a list of companies and starts crawling them in the background.
    Returns a job_id that can be used to check the status.
    
    **Auto-Discovery**: You can now provide just the company name!
    - Provide `name` and optionally `domain` (e.g., "riotgames.com")
    - System will automatically find the career page
    - Or provide `career_url` directly for faster crawling
    
    **Filtering**: You can filter jobs during crawl to only store relevant positions:
    - Use `predefined_filter` for common searches (security, backend, frontend, etc.)
    - Or specify custom `keywords`, `required_keywords`, `excluded_keywords`
    - Filtered jobs are never stored, saving database space
    """
    # Generate job ID
    job_id = f"crawl_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(crawl_tasks)}"
    
    # Auto-discover career URLs if not provided
    companies_to_discover = []
    companies_ready = []
    
    for c in request.companies:
        if c.career_url:
            # URL provided, use it directly
            companies_ready.append({"name": c.name, "career_url": str(c.career_url)})
        else:
            # No URL, need to discover
            companies_to_discover.append({"name": c.name, "domain": c.domain})
    
    # Discover career URLs for companies without URLs
    discovery_results = []
    if companies_to_discover:
        logger.info(f"Auto-discovering career pages for {len(companies_to_discover)} companies...")
        discovery_results = await career_finder.discover_batch(companies_to_discover)
        
        for result in discovery_results:
            if result['success']:
                companies_ready.append({
                    "name": result['name'],
                    "career_url": result['career_url']
                })
                logger.info(f"✓ Discovered {result['name']}: {result['career_url']}")
            else:
                logger.warning(f"✗ Could not find career page for {result['name']}")
    
    if not companies_ready:
        raise HTTPException(
            status_code=400,
            detail="No valid career URLs found. Please provide career_url or domain for at least one company."
        )
    
    companies = companies_ready
    
    # Create job filter if specified
    job_filter = None
    filter_description = "No filter"
    
    if request.filter:
        if request.filter.predefined_filter:
            job_filter = get_filter(request.filter.predefined_filter)
            filter_description = f"Predefined: {request.filter.predefined_filter}"
        else:
            job_filter = JobFilter(
                keywords=request.filter.keywords,
                required_keywords=request.filter.required_keywords,
                excluded_keywords=request.filter.excluded_keywords,
                title_keywords=request.filter.title_keywords,
                min_keyword_matches=request.filter.min_keyword_matches,
            )
            filter_description = f"Custom filter with {len(request.filter.keywords or [])} keywords"
    
    # Initialize task tracking
    crawl_tasks[job_id] = {
        "status": "queued",
        "companies": companies,
        "filter": filter_description,
        "discovery_results": discovery_results if discovery_results else None,
        "created_at": datetime.now(),
        "started_at": None,
        "completed_at": None,
    }
    
    # Start background task
    background_tasks.add_task(run_crawl_task, job_id, companies, job_filter)
    
    logger.info(f"Started crawl job {job_id} with {len(companies)} companies, filter: {filter_description}")
    
    return CrawlResponse(
        job_id=job_id,
        message=f"Crawl job started for {len(companies)} companies with filter: {filter_description}",
        companies_count=len(companies)
    )


@app.get("/crawl/{job_id}")
async def get_crawl_status(job_id: str):
    """
    Get the status of a crawl job.
    
    Args:
        job_id: The job ID returned from POST /crawl
    """
    if job_id not in crawl_tasks:
        raise HTTPException(status_code=404, detail=f"Crawl job {job_id} not found")
    
    task = crawl_tasks[job_id]
    
    response = {
        "job_id": job_id,
        "status": task["status"],
        "created_at": task["created_at"].isoformat(),
        "companies_count": len(task["companies"]),
    }
    
    if task.get("started_at"):
        response["started_at"] = task["started_at"].isoformat()
    
    if task.get("completed_at"):
        response["completed_at"] = task["completed_at"].isoformat()
        
        # Calculate duration
        duration = (task["completed_at"] - task["started_at"]).total_seconds()
        response["duration_seconds"] = duration
    
    if task.get("summary"):
        response["summary"] = task["summary"]
    
    if task.get("results"):
        response["results"] = task["results"]
    
    if task.get("error"):
        response["error"] = task["error"]
    
    return response


@app.get("/crawl")
async def list_crawl_jobs():
    """
    List all crawl jobs.
    """
    return {
        "total_jobs": len(crawl_tasks),
        "jobs": [
            {
                "job_id": job_id,
                "status": task["status"],
                "created_at": task["created_at"].isoformat(),
                "companies_count": len(task["companies"]),
            }
            for job_id, task in crawl_tasks.items()
        ]
    }


@app.get("/companies", response_model=List[CompanyResponse])
async def list_companies():
    """
    List all tracked companies.
    """
    companies = await db_pool.fetch("""
        SELECT 
            c.company_id,
            c.name,
            c.career_page_url,
            c.ats_type,
            c.last_crawled,
            COUNT(j.job_id) as job_count
        FROM companies c
        LEFT JOIN jobs j ON c.company_id = j.company_id AND j.is_active = true
        GROUP BY c.company_id
        ORDER BY c.name
    """)
    
    return [
        CompanyResponse(
            company_id=c['company_id'],
            name=c['name'],
            career_page_url=c['career_page_url'],
            ats_type=c['ats_type'],
            last_crawled=c['last_crawled'],
            job_count=c['job_count']
        )
        for c in companies
    ]


@app.get("/jobs", response_model=List[JobResponse])
async def list_jobs(
    limit: int = Query(50, description="Maximum number of jobs to return"),
    active_only: bool = Query(True, description="Only return active jobs"),
    keywords: Optional[str] = Query(None, description="Search keywords (comma-separated)"),
    title_keywords: Optional[str] = Query(None, description="Keywords to search in title only (comma-separated)"),
    location: Optional[str] = Query(None, description="Filter by location"),
    company_name: Optional[str] = Query(None, description="Filter by company name"),
):
    """
    List jobs with optional keyword filtering.
    
    **Examples**:
    - `/jobs?keywords=security,python` - Jobs mentioning security OR python
    - `/jobs?title_keywords=senior,engineer` - Jobs with senior OR engineer in title
    - `/jobs?location=remote` - Remote jobs
    - `/jobs?keywords=security&location=san+francisco` - Security jobs in SF
    """
    # Parse keywords
    keyword_list = [k.strip() for k in keywords.split(',')] if keywords else None
    title_keyword_list = [k.strip() for k in title_keywords.split(',')] if title_keywords else None
    
    # Use search if filters provided
    if keyword_list or title_keyword_list or location or company_name:
        jobs = await search_jobs(
            keywords=keyword_list,
            title_keywords=title_keyword_list,
            location=location,
            company_name=company_name,
            active_only=active_only,
            limit=limit
        )
    else:
        # Default query without filters
        query = """
            SELECT j.*, c.name as company_name
            FROM jobs j
            JOIN companies c ON j.company_id = c.company_id
        """
        
        if active_only:
            query += " WHERE j.is_active = true"
        
        query += " ORDER BY j.scraped_at DESC LIMIT $1"
        
        jobs = await db_pool.fetch(query, limit)
        jobs = [dict(j) for j in jobs]
    
    return [
        JobResponse(
            job_id=j['job_id'],
            company_name=j['company_name'],
            title=j['title'],
            description=j['description'],
            requirements=j['requirements'],
            location=j['location'],
            application_url=j['application_url'],
            posted_date=j['posted_date'],
            scraped_at=j['scraped_at'],
            is_active=j['is_active']
        )
        for j in jobs
    ]


@app.get("/jobs/{company_id}", response_model=List[JobResponse])
async def get_company_jobs(company_id: int):
    """
    Get all jobs for a specific company.
    """
    jobs = await db_pool.fetch("""
        SELECT j.*, c.name as company_name
        FROM jobs j
        JOIN companies c ON j.company_id = c.company_id
        WHERE j.company_id = $1 AND j.is_active = true
        ORDER BY j.scraped_at DESC
    """, company_id)
    
    if not jobs:
        raise HTTPException(status_code=404, detail=f"No jobs found for company {company_id}")
    
    return [
        JobResponse(
            job_id=j['job_id'],
            company_name=j['company_name'],
            title=j['title'],
            description=j['description'],
            requirements=j['requirements'],
            location=j['location'],
            application_url=j['application_url'],
            posted_date=j['posted_date'],
            scraped_at=j['scraped_at'],
            is_active=j['is_active']
        )
        for j in jobs
    ]


@app.get("/stats", response_model=StatsResponse)
async def get_stats():
    """
    Get crawler statistics.
    """
    # Get counts
    company_count = await db_pool.fetchval("SELECT COUNT(*) FROM companies")
    job_count = await db_pool.fetchval("SELECT COUNT(*) FROM jobs WHERE is_active = true")
    
    # Get crawl stats
    crawl_stats = await get_crawl_stats()
    
    return StatsResponse(
        total_companies=company_count,
        total_active_jobs=job_count,
        crawl_stats=crawl_stats,
        uptime="running"
    )


@app.get("/logs")
async def get_logs(limit: int = Query(50, description="Number of logs to return")):
    """
    Get recent crawl logs.
    """
    logs = await get_recent_crawl_logs(limit)
    
    return {
        "total": len(logs),
        "logs": [
            {
                "log_id": log['log_id'],
                "url": log['url'],
                "status": log['status'],
                "error_message": log['error_message'],
                "response_time_ms": log['response_time_ms'],
                "timestamp": log['timestamp'].isoformat()
            }
            for log in logs
        ]
    }


@app.get("/search")
async def search(
    q: str = Query(..., description="Search query"),
    limit: int = Query(50, description="Maximum results")
):
    """
    Full-text search across all job fields.
    
    **Example**: `/search?q=application+security+engineer`
    
    Uses PostgreSQL full-text search for relevance ranking.
    """
    results = await search_jobs_fulltext(q, active_only=True, limit=limit)
    
    return {
        "query": q,
        "total": len(results),
        "jobs": [
            {
                "job_id": j['job_id'],
                "company_name": j['company_name'],
                "title": j['title'],
                "location": j.get('location'),
                "application_url": j.get('application_url'),
                "relevance": j.get('relevance', 0),
                "scraped_at": j['scraped_at'].isoformat()
            }
            for j in results
        ]
    }


@app.get("/jobs/security")
async def get_security_jobs_endpoint(limit: int = Query(100, description="Maximum results")):
    """
    Get all security-related jobs.
    
    Searches for keywords like: security, infosec, cybersecurity, appsec, etc.
    """
    jobs = await get_security_jobs(active_only=True, limit=limit)
    
    return {
        "total": len(jobs),
        "jobs": [
            {
                "job_id": j['job_id'],
                "company_name": j['company_name'],
                "title": j['title'],
                "location": j.get('location'),
                "application_url": j.get('application_url'),
                "scraped_at": j['scraped_at'].isoformat()
            }
            for j in jobs
        ]
    }


if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )

