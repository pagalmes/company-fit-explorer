"""
Taskiq task definitions for the crawler queue.

This module defines:
- Redis broker configuration
- Crawl task that uses smart routing (ATS API → HTML fallback)
- Cache update task
- Batch scheduling tasks
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import asyncpg
from taskiq import TaskiqScheduler
from taskiq_redis import RedisAsyncResultBackend, ListQueueBroker

from config.settings import DATABASE_CONFIG
from scrapers.ats_apis import fetch_jobs_via_api, Job

logger = logging.getLogger(__name__)

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Create the broker
broker = ListQueueBroker(
    url=REDIS_URL,
    queue_name="crawler_tasks",
).with_result_backend(
    RedisAsyncResultBackend(
        redis_url=REDIS_URL,
    )
)

# Database pool (initialized on worker startup)
_db_pool: Optional[asyncpg.Pool] = None


async def get_db_pool() -> asyncpg.Pool:
    """Get or create database connection pool."""
    global _db_pool
    if _db_pool is None:
        _db_pool = await asyncpg.create_pool(
            host=DATABASE_CONFIG["host"],
            port=DATABASE_CONFIG["port"],
            database=DATABASE_CONFIG["database"],
            user=DATABASE_CONFIG["user"],
            password=DATABASE_CONFIG["password"],
            min_size=2,
            max_size=10,
        )
    return _db_pool


@broker.task(retry_on_error=True, max_retries=3)
async def crawl_company_task(
    company_id: int,
    name: str,
    career_url: str,
    ats_type: Optional[str] = None,
) -> Dict:
    """
    Crawl a single company with smart routing.
    
    1. Try ATS API first (fast: 2-5 seconds)
    2. Fall back to HTML scraping if no API available
    3. Update job cache with 24-hour expiration
    
    Args:
        company_id: Database ID of the company
        name: Company name
        career_url: Career page URL
        ats_type: Known ATS type (optional, for optimization)
        
    Returns:
        Dict with crawl results
    """
    start_time = datetime.utcnow()
    result = {
        "company_id": company_id,
        "name": name,
        "success": False,
        "jobs_found": 0,
        "method": "unknown",
        "duration_ms": 0,
        "error": None,
    }
    
    try:
        logger.info(f"Crawling {name} ({career_url})")
        
        # Try ATS API first
        jobs, detected_ats, api_duration = await fetch_jobs_via_api(career_url)
        
        if jobs is not None:
            # ATS API succeeded
            result["method"] = f"api:{detected_ats}"
            result["jobs_found"] = len(jobs)
            result["success"] = True
            
            # Update cache
            await update_job_cache(
                company_id=company_id,
                jobs=jobs,
                ats_type=detected_ats,
                duration_ms=int(api_duration * 1000),
            )
            
            logger.info(f"✓ {name}: {len(jobs)} jobs via {detected_ats} API in {api_duration:.2f}s")
            
        else:
            # Fall back to HTML scraping
            # Import here to avoid circular dependency
            from main import CareerCrawler
            
            result["method"] = "html"
            
            crawler = CareerCrawler()
            await crawler.initialize()
            
            try:
                crawl_result = await crawler.crawl_company(name, career_url)
                result["jobs_found"] = crawl_result.get("jobs_inserted", 0)
                result["success"] = crawl_result.get("success", False)
                
                if crawl_result.get("errors"):
                    result["error"] = "; ".join(crawl_result["errors"])
                    
            finally:
                await crawler.shutdown()
                
            logger.info(f"✓ {name}: {result['jobs_found']} jobs via HTML scraping")
            
    except Exception as e:
        logger.error(f"✗ {name}: {e}", exc_info=True)
        result["error"] = str(e)
        
    finally:
        duration = (datetime.utcnow() - start_time).total_seconds()
        result["duration_ms"] = int(duration * 1000)
        
    return result


@broker.task
async def update_job_cache(
    company_id: int,
    jobs: List[Job],
    ats_type: str,
    duration_ms: int,
) -> bool:
    """
    Update the job cache for a company.
    
    Args:
        company_id: Database ID
        jobs: List of Job objects
        ats_type: Detected ATS type
        duration_ms: Crawl duration in milliseconds
        
    Returns:
        True if successful
    """
    pool = await get_db_pool()
    
    # Convert jobs to JSON
    jobs_json = json.dumps([
        job.to_dict() if hasattr(job, 'to_dict') else job
        for job in jobs
    ])
    
    query = """
        INSERT INTO job_cache (company_id, jobs, job_count, crawled_at, expires_at, ats_type, crawl_duration_ms)
        VALUES ($1, $2::jsonb, $3, NOW(), NOW() + INTERVAL '24 hours', $4, $5)
        ON CONFLICT (company_id) 
        DO UPDATE SET
            jobs = EXCLUDED.jobs,
            job_count = EXCLUDED.job_count,
            crawled_at = EXCLUDED.crawled_at,
            expires_at = EXCLUDED.expires_at,
            ats_type = EXCLUDED.ats_type,
            crawl_duration_ms = EXCLUDED.crawl_duration_ms,
            updated_at = NOW()
    """
    
    async with pool.acquire() as conn:
        await conn.execute(query, company_id, jobs_json, len(jobs), ats_type, duration_ms)
        
    # Also update company's last_crawled
    update_company = """
        UPDATE companies 
        SET last_crawled = NOW(), ats_type = $2
        WHERE company_id = $1
    """
    async with pool.acquire() as conn:
        await conn.execute(update_company, company_id, ats_type)
        
    logger.debug(f"Updated cache for company {company_id}: {len(jobs)} jobs, expires in 24h")
    return True


@broker.task
async def schedule_batch_crawl(
    companies: List[Dict],
    delay_between_ms: int = 1000,
) -> Dict:
    """
    Schedule a batch of companies for crawling.
    
    Args:
        companies: List of company dicts with company_id, name, career_url
        delay_between_ms: Delay between task scheduling (rate limiting)
        
    Returns:
        Dict with scheduling results
    """
    scheduled = 0
    failed = 0
    
    for company in companies:
        try:
            await crawl_company_task.kiq(
                company_id=company["company_id"],
                name=company["name"],
                career_url=company["career_url"],
                ats_type=company.get("ats_type"),
            )
            scheduled += 1
            
            # Small delay to avoid overwhelming Redis
            if delay_between_ms > 0:
                await asyncio.sleep(delay_between_ms / 1000)
                
        except Exception as e:
            logger.error(f"Failed to schedule {company['name']}: {e}")
            failed += 1
            
    logger.info(f"Scheduled {scheduled} crawl tasks ({failed} failed)")
    
    return {
        "scheduled": scheduled,
        "failed": failed,
        "total": len(companies),
    }


@broker.task
async def cleanup_expired_cache() -> int:
    """
    Clean up expired job cache entries.
    
    Returns:
        Number of entries deleted
    """
    pool = await get_db_pool()
    
    query = """
        DELETE FROM job_cache
        WHERE expires_at < NOW() - INTERVAL '7 days'
        RETURNING company_id
    """
    
    async with pool.acquire() as conn:
        result = await conn.fetch(query)
        
    deleted = len(result)
    if deleted > 0:
        logger.info(f"Cleaned up {deleted} expired cache entries")
        
    return deleted


@broker.task
async def get_cached_jobs(company_id: int) -> Optional[Dict]:
    """
    Get cached jobs for a company if not expired.
    
    Args:
        company_id: Database ID
        
    Returns:
        Dict with jobs and metadata, or None if cache miss
    """
    pool = await get_db_pool()
    
    query = """
        SELECT jobs, job_count, crawled_at, expires_at, ats_type
        FROM job_cache
        WHERE company_id = $1 AND expires_at > NOW()
    """
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, company_id)
        
    if row:
        return {
            "jobs": row["jobs"],
            "job_count": row["job_count"],
            "crawled_at": row["crawled_at"].isoformat(),
            "expires_at": row["expires_at"].isoformat(),
            "ats_type": row["ats_type"],
            "cache_hit": True,
        }
        
    return None


# Startup hook to initialize database pool
@broker.on_event("startup")
async def startup():
    """Initialize resources on worker startup."""
    logger.info("Worker starting up...")
    await get_db_pool()
    logger.info("Worker ready")


# Shutdown hook to cleanup
@broker.on_event("shutdown")
async def shutdown():
    """Cleanup resources on worker shutdown."""
    global _db_pool
    if _db_pool:
        await _db_pool.close()
        _db_pool = None
    logger.info("Worker shutdown complete")

