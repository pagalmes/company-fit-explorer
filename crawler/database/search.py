"""
Advanced search capabilities for jobs.
"""
import logging
from typing import List, Dict, Optional
from .connection import db_pool

logger = logging.getLogger(__name__)


async def search_jobs(
    keywords: Optional[List[str]] = None,
    title_keywords: Optional[List[str]] = None,
    location: Optional[str] = None,
    company_id: Optional[int] = None,
    company_name: Optional[str] = None,
    active_only: bool = True,
    limit: int = 100,
) -> List[Dict]:
    """
    Search for jobs with keyword filtering.
    
    Args:
        keywords: Keywords to search in title, description, requirements
        title_keywords: Keywords to search specifically in title
        location: Location filter (partial match)
        company_id: Filter by company ID
        company_name: Filter by company name (partial match)
        active_only: Only return active jobs
        limit: Maximum results to return
        
    Returns:
        List of matching job dictionaries
    """
    # Build dynamic query
    conditions = []
    params = []
    param_count = 1
    
    query = """
        SELECT 
            j.*,
            c.name as company_name,
            c.ats_type
        FROM jobs j
        JOIN companies c ON j.company_id = c.company_id
        WHERE 1=1
    """
    
    # Active filter
    if active_only:
        conditions.append("j.is_active = true")
    
    # Company filters
    if company_id:
        conditions.append(f"j.company_id = ${param_count}")
        params.append(company_id)
        param_count += 1
    
    if company_name:
        conditions.append(f"c.name ILIKE ${param_count}")
        params.append(f"%{company_name}%")
        param_count += 1
    
    # Location filter
    if location:
        conditions.append(f"j.location ILIKE ${param_count}")
        params.append(f"%{location}%")
        param_count += 1
    
    # Title keywords
    if title_keywords:
        title_conditions = []
        for keyword in title_keywords:
            title_conditions.append(f"j.title ILIKE ${param_count}")
            params.append(f"%{keyword}%")
            param_count += 1
        conditions.append(f"({' OR '.join(title_conditions)})")
    
    # General keywords (search across title, description, requirements)
    if keywords:
        keyword_conditions = []
        for keyword in keywords:
            keyword_conditions.append(
                f"(j.title ILIKE ${param_count} OR "
                f"j.description ILIKE ${param_count} OR "
                f"j.requirements ILIKE ${param_count})"
            )
            params.append(f"%{keyword}%")
            param_count += 1
        conditions.append(f"({' OR '.join(keyword_conditions)})")
    
    # Add conditions to query
    if conditions:
        query += " AND " + " AND ".join(conditions)
    
    # Order and limit
    query += f" ORDER BY j.scraped_at DESC LIMIT ${param_count}"
    params.append(limit)
    
    try:
        logger.info(f"Searching jobs with {len(keywords or [])} keywords")
        rows = await db_pool.fetch(query, *params)
        logger.info(f"Found {len(rows)} matching jobs")
        return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"Error searching jobs: {e}", exc_info=True)
        raise


async def search_jobs_fulltext(
    search_term: str,
    active_only: bool = True,
    limit: int = 100,
) -> List[Dict]:
    """
    Full-text search across all job fields using PostgreSQL text search.
    
    Args:
        search_term: Text to search for
        active_only: Only return active jobs
        limit: Maximum results to return
        
    Returns:
        List of matching job dictionaries with relevance ranking
    """
    query = """
        SELECT 
            j.*,
            c.name as company_name,
            c.ats_type,
            ts_rank(
                to_tsvector('english', 
                    COALESCE(j.title, '') || ' ' || 
                    COALESCE(j.description, '') || ' ' || 
                    COALESCE(j.requirements, '')
                ),
                to_tsquery('english', $1)
            ) as relevance
        FROM jobs j
        JOIN companies c ON j.company_id = c.company_id
        WHERE to_tsvector('english', 
                COALESCE(j.title, '') || ' ' || 
                COALESCE(j.description, '') || ' ' || 
                COALESCE(j.requirements, '')
            ) @@ to_tsquery('english', $1)
    """
    
    if active_only:
        query += " AND j.is_active = true"
    
    query += " ORDER BY relevance DESC, j.scraped_at DESC LIMIT $2"
    
    try:
        # Convert search term to tsquery format
        tsquery_term = ' & '.join(search_term.split())
        
        logger.info(f"Full-text search for: {search_term}")
        rows = await db_pool.fetch(query, tsquery_term, limit)
        logger.info(f"Found {len(rows)} matching jobs")
        return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"Error in full-text search: {e}", exc_info=True)
        # Fallback to simple LIKE search
        logger.info("Falling back to LIKE search")
        return await search_jobs(
            keywords=[search_term],
            active_only=active_only,
            limit=limit
        )


async def get_jobs_by_keywords(
    keywords: List[str],
    match_all: bool = False,
    active_only: bool = True,
    limit: int = 100,
) -> List[Dict]:
    """
    Get jobs matching specific keywords.
    
    Args:
        keywords: List of keywords to search for
        match_all: If True, require ALL keywords to match. If False, ANY keyword
        active_only: Only return active jobs
        limit: Maximum results to return
        
    Returns:
        List of matching job dictionaries
    """
    if match_all:
        # All keywords must match
        return await search_jobs(
            keywords=keywords,
            active_only=active_only,
            limit=limit
        )
    else:
        # Any keyword matches
        return await search_jobs(
            keywords=keywords,
            active_only=active_only,
            limit=limit
        )


async def get_security_jobs(active_only: bool = True, limit: int = 100) -> List[Dict]:
    """
    Get all security-related jobs.
    
    Args:
        active_only: Only return active jobs
        limit: Maximum results to return
        
    Returns:
        List of security job dictionaries
    """
    keywords = [
        "security", "infosec", "cybersecurity", "appsec",
        "application security", "penetration", "vulnerability"
    ]
    
    return await search_jobs(
        keywords=keywords,
        active_only=active_only,
        limit=limit
    )


