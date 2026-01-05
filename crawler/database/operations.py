"""
Database CRUD operations for companies, jobs, and crawl logs.
"""
from typing import Dict, List, Optional
from datetime import datetime
import logging
from .connection import db_pool

logger = logging.getLogger(__name__)


# Company Operations
async def insert_company(name: str, career_page_url: str, ats_type: Optional[str] = None) -> int:
    """
    Insert a new company into the database.
    
    Args:
        name: Company name
        career_page_url: URL to company's career page
        ats_type: Type of ATS detected (optional)
        
    Returns:
        int: The company_id of the inserted company
    """
    query = """
        INSERT INTO companies (name, career_page_url, ats_type)
        VALUES ($1, $2, $3)
        ON CONFLICT (career_page_url) 
        DO UPDATE SET 
            name = EXCLUDED.name,
            ats_type = EXCLUDED.ats_type,
            updated_at = CURRENT_TIMESTAMP
        RETURNING company_id
    """
    try:
        company_id = await db_pool.fetchval(query, name, career_page_url, ats_type)
        logger.info(f"Inserted/updated company: {name} (ID: {company_id})")
        return company_id
    except Exception as e:
        logger.error(f"Error inserting company {name}: {e}")
        raise


async def get_company_by_url(career_page_url: str) -> Optional[Dict]:
    """
    Retrieve a company by its career page URL.
    
    Args:
        career_page_url: URL to search for
        
    Returns:
        Dict with company data or None if not found
    """
    query = "SELECT * FROM companies WHERE career_page_url = $1"
    try:
        row = await db_pool.fetchrow(query, career_page_url)
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Error fetching company by URL {career_page_url}: {e}")
        raise


async def update_company_crawl_time(company_id: int):
    """
    Update the last_crawled timestamp for a company.
    
    Args:
        company_id: ID of the company
    """
    query = """
        UPDATE companies 
        SET last_crawled = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE company_id = $1
    """
    try:
        await db_pool.execute(query, company_id)
        logger.debug(f"Updated crawl time for company_id: {company_id}")
    except Exception as e:
        logger.error(f"Error updating crawl time for company {company_id}: {e}")
        raise


# Job Operations
async def insert_job(
    company_id: int,
    title: str,
    description: Optional[str] = None,
    requirements: Optional[str] = None,
    location: Optional[str] = None,
    application_url: Optional[str] = None,
    posted_date: Optional[datetime] = None,
) -> int:
    """
    Insert a new job posting into the database.
    
    Args:
        company_id: ID of the company
        title: Job title
        description: Job description
        requirements: Job requirements
        location: Job location
        application_url: URL to apply for the job
        posted_date: Date the job was posted
        
    Returns:
        int: The job_id of the inserted job
    """
    query = """
        INSERT INTO jobs (
            company_id, title, description, requirements, 
            location, application_url, posted_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (company_id, title, location)
        DO UPDATE SET
            description = EXCLUDED.description,
            requirements = EXCLUDED.requirements,
            application_url = EXCLUDED.application_url,
            posted_date = EXCLUDED.posted_date,
            is_active = TRUE,
            updated_at = CURRENT_TIMESTAMP
        RETURNING job_id
    """
    try:
        job_id = await db_pool.fetchval(
            query, company_id, title, description, 
            requirements, location, application_url, posted_date
        )
        logger.info(f"Inserted/updated job: {title} at {location} (ID: {job_id})")
        return job_id
    except Exception as e:
        logger.error(f"Error inserting job {title}: {e}")
        raise


async def get_jobs_by_company(company_id: int, active_only: bool = True) -> List[Dict]:
    """
    Retrieve all jobs for a specific company.
    
    Args:
        company_id: ID of the company
        active_only: If True, only return active jobs
        
    Returns:
        List of job dictionaries
    """
    query = "SELECT * FROM jobs WHERE company_id = $1"
    if active_only:
        query += " AND is_active = TRUE"
    query += " ORDER BY scraped_at DESC"
    
    try:
        rows = await db_pool.fetch(query, company_id)
        return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"Error fetching jobs for company {company_id}: {e}")
        raise


async def mark_jobs_inactive(company_id: int, active_job_ids: List[int]):
    """
    Mark jobs as inactive if they're not in the active list.
    
    This is useful after a crawl to mark jobs that no longer appear on the career page.
    
    Args:
        company_id: ID of the company
        active_job_ids: List of job IDs that are still active
    """
    query = """
        UPDATE jobs
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE company_id = $1 AND job_id != ALL($2::int[])
    """
    try:
        await db_pool.execute(query, company_id, active_job_ids)
        logger.info(f"Marked inactive jobs for company_id: {company_id}")
    except Exception as e:
        logger.error(f"Error marking jobs inactive for company {company_id}: {e}")
        raise


# Crawl Log Operations
async def insert_crawl_log(
    url: str,
    status: str,
    error_message: Optional[str] = None,
    response_time_ms: Optional[int] = None,
):
    """
    Insert a crawl log entry.
    
    Args:
        url: URL that was crawled
        status: Status of the crawl (success, error, timeout, etc.)
        error_message: Error message if applicable
        response_time_ms: Response time in milliseconds
    """
    query = """
        INSERT INTO crawl_logs (url, status, error_message, response_time_ms)
        VALUES ($1, $2, $3, $4)
    """
    try:
        await db_pool.execute(query, url, status, error_message, response_time_ms)
        logger.debug(f"Logged crawl: {url} - {status}")
    except Exception as e:
        logger.error(f"Error inserting crawl log for {url}: {e}")
        # Don't raise - logging should not break the crawl


async def get_recent_crawl_logs(limit: int = 100) -> List[Dict]:
    """
    Retrieve recent crawl logs.
    
    Args:
        limit: Maximum number of logs to return
        
    Returns:
        List of crawl log dictionaries
    """
    query = """
        SELECT * FROM crawl_logs 
        ORDER BY timestamp DESC 
        LIMIT $1
    """
    try:
        rows = await db_pool.fetch(query, limit)
        return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"Error fetching crawl logs: {e}")
        raise


async def get_crawl_stats() -> Dict:
    """
    Get statistics about crawl operations.
    
    Returns:
        Dict with crawl statistics
    """
    query = """
        SELECT 
            COUNT(*) as total_crawls,
            COUNT(*) FILTER (WHERE status = 'success') as successful_crawls,
            COUNT(*) FILTER (WHERE status = 'error') as failed_crawls,
            AVG(response_time_ms) as avg_response_time_ms
        FROM crawl_logs
        WHERE timestamp > NOW() - INTERVAL '24 hours'
    """
    try:
        row = await db_pool.fetchrow(query)
        return dict(row) if row else {}
    except Exception as e:
        logger.error(f"Error fetching crawl stats: {e}")
        raise


