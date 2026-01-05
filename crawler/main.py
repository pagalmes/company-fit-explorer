"""
Main orchestration script for the career page web crawler.

This module coordinates all components to crawl company career pages,
extract job postings, and store them in the database.

Features:
- Smart routing: ATS API first (fast), HTML scraping fallback
- 24-hour job cache with automatic expiration
- Deduplication across user subscriptions
"""
import asyncio
import json
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta

import colorlog

from config.settings import LOGGING_CONFIG, CRAWLER_CONFIG
from database.connection import db_pool
from database.operations import (
    insert_company,
    get_company_by_url,
    update_company_crawl_time,
    insert_job,
    get_jobs_by_company,
    mark_jobs_inactive,
)
from crawler.session_manager import SessionManager
from scrapers.detector import ats_detector
from scrapers.ats_apis import fetch_jobs_via_api, get_ats_api_client

# Configure colored logging
handler = colorlog.StreamHandler()
handler.setFormatter(
    colorlog.ColoredFormatter(
        '%(log_color)s%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        log_colors={
            'DEBUG': 'cyan',
            'INFO': 'green',
            'WARNING': 'yellow',
            'ERROR': 'red',
            'CRITICAL': 'red,bg_white',
        }
    )
)

logger = logging.getLogger(__name__)
logger.addHandler(handler)
logger.setLevel(LOGGING_CONFIG["level"])

# Set logging for other modules
logging.basicConfig(level=LOGGING_CONFIG["level"], handlers=[handler])


class CareerCrawler:
    """
    Main crawler class that orchestrates the entire crawling process.
    
    Features:
    - Smart routing: tries ATS API first (2-5s), falls back to HTML (15-30s)
    - Job cache with 24-hour TTL
    - Concurrent crawling with rate limiting
    """
    
    def __init__(self, use_cache: bool = True, cache_ttl_hours: int = 24):
        """
        Initialize the career crawler.
        
        Args:
            use_cache: Whether to check/update job cache
            cache_ttl_hours: Cache time-to-live in hours
        """
        self.session_manager: Optional[SessionManager] = None
        self.max_concurrent_tasks = CRAWLER_CONFIG["max_concurrent_tasks"]
        self.use_cache = use_cache
        self.cache_ttl_hours = cache_ttl_hours
    
    async def initialize(self):
        """
        Initialize the crawler and all its components.
        
        Must be called before starting to crawl.
        """
        logger.info("Initializing career crawler...")
        
        # Initialize database pool
        await db_pool.initialize()
        logger.info("Database pool initialized")
        
        # Initialize session manager
        self.session_manager = SessionManager()
        await self.session_manager.start()
        logger.info("Session manager started")
        
        logger.info("Career crawler initialization complete")
    
    async def shutdown(self):
        """
        Gracefully shutdown the crawler.
        
        Should be called when done crawling.
        """
        logger.info("Shutting down career crawler...")
        
        if self.session_manager:
            await self.session_manager.close()
            logger.info("Session manager closed")
        
        await db_pool.close()
        logger.info("Database pool closed")
        
        logger.info("Career crawler shutdown complete")
    
    async def get_cached_jobs(self, company_id: int) -> Optional[Dict]:
        """
        Check if we have fresh cached jobs for a company.
        
        Args:
            company_id: Database ID of the company
            
        Returns:
            Dict with cached jobs if fresh, None if cache miss or expired
        """
        if not self.use_cache:
            return None
            
        query = """
            SELECT jobs, job_count, crawled_at, expires_at, ats_type
            FROM job_cache
            WHERE company_id = $1 AND expires_at > NOW()
        """
        
        row = await db_pool.fetchrow(query, company_id)
        
        if row:
            logger.info(f"Cache hit for company {company_id}: {row['job_count']} jobs")
            return {
                "jobs": row["jobs"],
                "job_count": row["job_count"],
                "crawled_at": row["crawled_at"],
                "expires_at": row["expires_at"],
                "ats_type": row["ats_type"],
                "cache_hit": True,
            }
            
        return None
    
    async def update_job_cache(
        self, 
        company_id: int, 
        jobs: List[Dict], 
        ats_type: str,
        duration_ms: int
    ):
        """
        Update the job cache for a company.
        
        Args:
            company_id: Database ID
            jobs: List of job dictionaries
            ats_type: Detected ATS type
            duration_ms: Crawl duration in milliseconds
        """
        if not self.use_cache:
            return
            
        jobs_json = json.dumps(jobs)
        
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
        
        await db_pool.execute(query, company_id, jobs_json, len(jobs), ats_type, duration_ms)
        logger.debug(f"Updated cache for company {company_id}: {len(jobs)} jobs, expires in 24h")
    
    async def crawl_company_smart(
        self, 
        company_name: str, 
        career_page_url: str,
        company_id: Optional[int] = None,
        job_filter: Optional['JobFilter'] = None,
        force_refresh: bool = False
    ) -> Dict:
        """
        Smart crawl with cache check and ATS API prioritization.
        
        Flow:
        1. Check cache - return if fresh (< 24h old)
        2. Try ATS API - fast (2-5 seconds)
        3. Fall back to HTML scraping - slower (15-30 seconds)
        
        Args:
            company_name: Name of the company
            career_page_url: Career page URL
            company_id: Optional pre-fetched company ID
            job_filter: Optional job filter
            force_refresh: Skip cache check
            
        Returns:
            Dict with crawl results
        """
        start_time = datetime.now()
        
        stats = {
            'company_name': company_name,
            'success': False,
            'jobs_found': 0,
            'jobs_inserted': 0,
            'method': 'unknown',
            'cache_hit': False,
            'duration_ms': 0,
            'errors': [],
        }
        
        try:
            # Get or create company in database
            if company_id is None:
                company_id = await insert_company(company_name, career_page_url)
            
            # Step 1: Check cache (unless force refresh)
            if not force_refresh and self.use_cache:
                cached = await self.get_cached_jobs(company_id)
                if cached:
                    stats['success'] = True
                    stats['jobs_found'] = cached['job_count']
                    stats['jobs_inserted'] = cached['job_count']
                    stats['method'] = 'cache'
                    stats['cache_hit'] = True
                    stats['duration_ms'] = int((datetime.now() - start_time).total_seconds() * 1000)
                    logger.info(f"Cache hit for {company_name}: {cached['job_count']} jobs")
                    return stats
            
            # Step 2: Try ATS API first (much faster)
            api_client = get_ats_api_client(career_page_url)
            
            if api_client:
                logger.info(f"Trying {api_client.name} API for {company_name}")
                jobs, api_duration = await api_client.get_jobs(career_page_url)
                
                if jobs:
                    stats['method'] = f'api:{api_client.name}'
                    stats['jobs_found'] = len(jobs)
                    stats['success'] = True
                    
                    # Convert Job objects to dicts and insert
                    job_dicts = [job.to_dict() for job in jobs]
                    
                    # Update cache
                    duration_ms = int(api_duration * 1000)
                    await self.update_job_cache(company_id, job_dicts, api_client.name, duration_ms)
                    
                    # Also insert into jobs table for search
                    for job_data in job_dicts:
                        try:
                            await insert_job(
                                company_id=company_id,
                                title=job_data.get('title'),
                                description=job_data.get('description'),
                                requirements=job_data.get('requirements'),
                                location=job_data.get('location'),
                                application_url=job_data.get('application_url'),
                                posted_date=job_data.get('posted_date'),
                            )
                            stats['jobs_inserted'] += 1
                        except Exception as e:
                            # Ignore duplicate errors
                            if 'unique_job_per_company' not in str(e):
                                logger.debug(f"Job insert: {e}")
                    
                    await update_company_crawl_time(company_id)
                    
                    elapsed = (datetime.now() - start_time).total_seconds()
                    stats['duration_ms'] = int(elapsed * 1000)
                    logger.info(f"✓ {company_name}: {len(jobs)} jobs via {api_client.name} API in {elapsed:.2f}s")
                    return stats
            
            # Step 3: Fall back to HTML scraping
            logger.info(f"Falling back to HTML scraping for {company_name}")
            stats['method'] = 'html'
            
            # Use the standard crawl_company method
            html_result = await self.crawl_company(company_name, career_page_url, job_filter)
            
            stats['success'] = html_result.get('success', False)
            stats['jobs_found'] = html_result.get('jobs_found', 0)
            stats['jobs_inserted'] = html_result.get('jobs_inserted', 0)
            stats['errors'] = html_result.get('errors', [])
            
            # Update cache if successful
            if stats['success'] and stats['jobs_found'] > 0:
                # Fetch the jobs we just inserted to cache them
                jobs_query = """
                    SELECT title, location, description, requirements, application_url, posted_date
                    FROM jobs
                    WHERE company_id = $1 AND is_active = true
                """
                rows = await db_pool.fetch(jobs_query, company_id)
                job_dicts = [dict(row) for row in rows]
                
                duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
                await self.update_job_cache(company_id, job_dicts, 'html', duration_ms)
            
        except Exception as e:
            error_msg = f"Error in smart crawl for {company_name}: {e}"
            logger.error(error_msg, exc_info=True)
            stats['errors'].append(error_msg)
        
        finally:
            stats['duration_ms'] = int((datetime.now() - start_time).total_seconds() * 1000)
            
        return stats
    
    async def crawl_company(self, company_name: str, career_page_url: str, job_filter: Optional['JobFilter'] = None) -> Dict:
        """
        Crawl a single company's career page.
        
        Args:
            company_name: Name of the company
            career_page_url: URL to the company's career page
            
        Returns:
            Dict with crawl statistics
        """
        logger.info(f"Starting crawl for {company_name}: {career_page_url}")
        start_time = datetime.now()
        
        stats = {
            'company_name': company_name,
            'success': False,
            'jobs_found': 0,
            'jobs_inserted': 0,
            'errors': [],
        }
        
        try:
            # Get or create company in database
            company_id = await insert_company(company_name, career_page_url)
            
            # Fetch the career page to detect ATS
            html = await self.session_manager.get(career_page_url)
            if not html:
                error_msg = f"Failed to fetch career page: {career_page_url}"
                logger.error(error_msg)
                stats['errors'].append(error_msg)
                return stats
            
            # Detect ATS type
            ats_type, confidence = ats_detector.detect(career_page_url, html)
            logger.info(f"Detected ATS: {ats_type} (confidence: {confidence})")
            
            # Update company with detected ATS type
            await insert_company(company_name, career_page_url, ats_type)
            
            # Get appropriate parser for the ATS
            parser_class = ats_detector.get_parser_for_ats(ats_type)
            parser = parser_class(self.session_manager, job_filter=job_filter)
            
            # Scrape all jobs from the company
            jobs = await parser.scrape_company(career_page_url)
            stats['jobs_found'] = len(jobs)
            
            if not jobs:
                logger.warning(f"No jobs found for {company_name}")
                stats['success'] = True  # Still successful, just no jobs
                return stats
            
            # Insert jobs into database
            job_ids = []
            for job_data in jobs:
                try:
                    job_id = await insert_job(
                        company_id=company_id,
                        title=job_data.get('title'),
                        description=job_data.get('description'),
                        requirements=job_data.get('requirements'),
                        location=job_data.get('location'),
                        application_url=job_data.get('application_url'),
                        posted_date=job_data.get('posted_date'),
                    )
                    job_ids.append(job_id)
                    stats['jobs_inserted'] += 1
                except Exception as e:
                    error_msg = f"Error inserting job {job_data.get('title')}: {e}"
                    logger.error(error_msg)
                    stats['errors'].append(error_msg)
            
            # Mark jobs not in this crawl as inactive
            if job_ids:
                await mark_jobs_inactive(company_id, job_ids)
            
            # Update last crawled time
            await update_company_crawl_time(company_id)
            
            stats['success'] = True
            elapsed = (datetime.now() - start_time).total_seconds()
            logger.info(
                f"Completed crawl for {company_name}: "
                f"{stats['jobs_inserted']}/{stats['jobs_found']} jobs inserted "
                f"in {elapsed:.2f}s"
            )
            
        except Exception as e:
            error_msg = f"Unexpected error crawling {company_name}: {e}"
            logger.error(error_msg, exc_info=True)
            stats['errors'].append(error_msg)
        
        return stats
    
    async def crawl_companies(
        self, 
        companies: List[Dict], 
        job_filter: Optional['JobFilter'] = None,
        use_smart_crawl: bool = True,
        force_refresh: bool = False
    ) -> List[Dict]:
        """
        Crawl multiple companies concurrently.
        
        Args:
            companies: List of dicts with 'name' and 'career_url' keys
            job_filter: Optional job filter
            use_smart_crawl: Use smart routing (cache → API → HTML)
            force_refresh: Skip cache check
            
        Returns:
            List of statistics for each company
        """
        logger.info(f"Starting to crawl {len(companies)} companies (smart={use_smart_crawl})")
        
        # Create tasks with concurrency limit
        semaphore = asyncio.Semaphore(self.max_concurrent_tasks)
        
        async def crawl_with_semaphore(company):
            async with semaphore:
                if use_smart_crawl:
                    return await self.crawl_company_smart(
                        company['name'],
                        company['career_url'],
                        company_id=company.get('company_id'),
                        job_filter=job_filter,
                        force_refresh=force_refresh
                    )
                else:
                    return await self.crawl_company(
                        company['name'],
                        company['career_url'],
                        job_filter=job_filter
                    )
        
        tasks = [crawl_with_semaphore(company) for company in companies]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        stats_list = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error crawling {companies[i]['name']}: {result}")
                stats_list.append({
                    'company_name': companies[i]['name'],
                    'success': False,
                    'error': str(result),
                })
            else:
                stats_list.append(result)
        
        # Log summary
        successful = sum(1 for s in stats_list if s.get('success'))
        total_jobs = sum(s.get('jobs_inserted', 0) for s in stats_list)
        cache_hits = sum(1 for s in stats_list if s.get('cache_hit'))
        api_hits = sum(1 for s in stats_list if 'api:' in s.get('method', ''))
        
        logger.info(
            f"Crawl complete: {successful}/{len(companies)} companies successful, "
            f"{total_jobs} total jobs inserted "
            f"(cache: {cache_hits}, API: {api_hits}, HTML: {successful - cache_hits - api_hits})"
        )
        
        return stats_list
    
    async def crawl(self, companies: List[Dict]) -> List[Dict]:
        """
        Main entry point for crawling.
        
        Initializes the crawler, crawls companies, and shuts down.
        
        Args:
            companies: List of dicts with 'name' and 'career_url' keys
            
        Returns:
            List of statistics for each company
        """
        await self.initialize()
        
        try:
            results = await self.crawl_companies(companies)
            return results
        finally:
            await self.shutdown()


async def main():
    """
    Example usage of the career crawler.
    """
    # Example companies to crawl
    companies = [
        {
            "name": "Example Company 1",
            "career_url": "https://example1.com/careers"
        },
        {
            "name": "Example Company 2",
            "career_url": "https://example2.com/jobs"
        },
    ]
    
    crawler = CareerCrawler()
    results = await crawler.crawl(companies)
    
    # Print results
    print("\n" + "="*80)
    print("CRAWL RESULTS")
    print("="*80)
    for result in results:
        print(f"\nCompany: {result['company_name']}")
        print(f"Success: {result['success']}")
        print(f"Jobs Found: {result.get('jobs_found', 0)}")
        print(f"Jobs Inserted: {result.get('jobs_inserted', 0)}")
        if result.get('errors'):
            print(f"Errors: {', '.join(result['errors'])}")


if __name__ == "__main__":
    # Run the crawler
    asyncio.run(main())

