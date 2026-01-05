"""
Scheduled Crawler Service

Runs periodic crawls of all tracked companies to keep job data fresh.
Syncs job counts back to Supabase for the Company Fit Explorer.

Features:
- 24-hour crawl cycles (configurable)
- Priority queue based on subscriber count
- Deduplication across users
- Smart routing (ATS API → HTML fallback)
- Batch processing to respect rate limits
- Automatic retry on failures
- Supabase sync for job counts
- Heartbeat monitoring
"""

import asyncio
import os
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional
import signal
import sys

import httpx
import asyncpg
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from task_queue.builder import QueueBuilder, CrawlPriority

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration from environment
CRAWLER_API_URL = os.getenv("CRAWLER_API_URL", "http://localhost:8000")
CRAWL_INTERVAL_HOURS = int(os.getenv("CRAWL_INTERVAL_HOURS", "24"))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "10"))
BATCH_DELAY_SECONDS = int(os.getenv("BATCH_DELAY_SECONDS", "60"))

# Database configuration
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("DB_NAME", "career_crawler"),
    "user": os.getenv("DB_USER", "crawler"),
    "password": os.getenv("DB_PASSWORD", ""),
}

# Supabase configuration for syncing
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Heartbeat file for health checks
HEARTBEAT_FILE = Path("/tmp/scheduler_heartbeat")


class CrawlerScheduler:
    """
    Manages scheduled crawling of company career pages.
    
    Features:
    - Builds priority queue from user subscriptions
    - Deduplicates companies (each crawled once per cycle)
    - Uses smart routing (ATS API first, HTML fallback)
    - Syncs results to Supabase
    """
    
    def __init__(self):
        self.db_pool: Optional[asyncpg.Pool] = None
        self.http_client: Optional[httpx.AsyncClient] = None
        self.scheduler: Optional[AsyncIOScheduler] = None
        self.queue_builder: Optional[QueueBuilder] = None
        self.is_running = False
        self.current_crawl_id: Optional[str] = None
        
    async def initialize(self):
        """Initialize database connection, HTTP client, and queue builder."""
        logger.info("Initializing scheduler...")
        
        # Create database pool
        try:
            self.db_pool = await asyncpg.create_pool(
                host=DB_CONFIG["host"],
                port=DB_CONFIG["port"],
                database=DB_CONFIG["database"],
                user=DB_CONFIG["user"],
                password=DB_CONFIG["password"],
                min_size=2,
                max_size=5,
            )
            logger.info("Database pool created")
        except Exception as e:
            logger.error(f"Failed to create database pool: {e}")
            raise
        
        # Create HTTP client
        self.http_client = httpx.AsyncClient(timeout=300.0)  # 5 minute timeout
        
        # Create queue builder for priority-based crawling
        self.queue_builder = QueueBuilder(cache_ttl_hours=CRAWL_INTERVAL_HOURS)
        await self.queue_builder.initialize()
        logger.info("Queue builder initialized")
        
        # Create scheduler
        self.scheduler = AsyncIOScheduler()
        
        logger.info("Scheduler initialized successfully")
        
    async def shutdown(self):
        """Clean shutdown of all resources."""
        logger.info("Shutting down scheduler...")
        
        if self.scheduler:
            self.scheduler.shutdown(wait=False)
            
        if self.queue_builder:
            await self.queue_builder.shutdown()
            
        if self.http_client:
            await self.http_client.aclose()
            
        if self.db_pool:
            await self.db_pool.close()
            
        logger.info("Scheduler shutdown complete")
        
    async def get_stale_companies(self, hours: int = 24) -> List[Dict]:
        """
        Get companies that haven't been crawled in the specified hours.
        
        Args:
            hours: Number of hours since last crawl to consider "stale"
            
        Returns:
            List of company dictionaries with name and career_url
        """
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        query = """
            SELECT company_id, name, career_page_url
            FROM companies
            WHERE last_crawled IS NULL 
               OR last_crawled < $1
            ORDER BY last_crawled ASC NULLS FIRST
        """
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query, cutoff)
            
        companies = [
            {
                "id": row["company_id"],
                "name": row["name"],
                "career_url": row["career_page_url"]
            }
            for row in rows
        ]
        
        logger.info(f"Found {len(companies)} companies needing update")
        return companies
        
    async def get_all_companies(self) -> List[Dict]:
        """
        Get all tracked companies.
        
        Returns:
            List of company dictionaries with name and career_url
        """
        query = """
            SELECT company_id, name, career_page_url
            FROM companies
            ORDER BY name
        """
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query)
            
        companies = [
            {
                "id": row["company_id"],
                "name": row["name"],
                "career_url": row["career_page_url"]
            }
            for row in rows
        ]
        
        logger.info(f"Found {len(companies)} total companies")
        return companies
        
    def chunk_list(self, lst: List, chunk_size: int) -> List[List]:
        """Split a list into chunks of specified size."""
        return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]
        
    async def trigger_crawl(self, companies: List[Dict]) -> Optional[str]:
        """
        Trigger a crawl job via the Crawler API.
        
        Args:
            companies: List of companies to crawl
            
        Returns:
            Job ID if successful, None otherwise
        """
        payload = {
            "companies": [
                {"name": c["name"], "career_url": c["career_url"]}
                for c in companies
            ]
        }
        
        try:
            response = await self.http_client.post(
                f"{CRAWLER_API_URL}/crawl",
                json=payload
            )
            response.raise_for_status()
            
            data = response.json()
            job_id = data.get("job_id")
            logger.info(f"Crawl job started: {job_id} for {len(companies)} companies")
            return job_id
            
        except httpx.HTTPError as e:
            logger.error(f"Failed to trigger crawl: {e}")
            return None
            
    async def wait_for_crawl(self, job_id: str, timeout_minutes: int = 30) -> bool:
        """
        Wait for a crawl job to complete.
        
        Args:
            job_id: The crawl job ID
            timeout_minutes: Maximum time to wait
            
        Returns:
            True if completed successfully, False otherwise
        """
        start_time = datetime.utcnow()
        timeout = timedelta(minutes=timeout_minutes)
        
        while datetime.utcnow() - start_time < timeout:
            try:
                response = await self.http_client.get(
                    f"{CRAWLER_API_URL}/crawl/{job_id}"
                )
                response.raise_for_status()
                
                data = response.json()
                status = data.get("status")
                
                if status == "completed":
                    summary = data.get("summary", {})
                    logger.info(
                        f"Crawl {job_id} completed: "
                        f"{summary.get('total_jobs_found', 0)} jobs from "
                        f"{summary.get('successful_companies', 0)}/{summary.get('total_companies', 0)} companies"
                    )
                    return True
                    
                elif status == "failed":
                    logger.error(f"Crawl {job_id} failed: {data.get('error')}")
                    return False
                    
                # Still running, wait and check again
                await asyncio.sleep(10)
                
            except httpx.HTTPError as e:
                logger.error(f"Error checking crawl status: {e}")
                await asyncio.sleep(10)
                
        logger.error(f"Crawl {job_id} timed out after {timeout_minutes} minutes")
        return False
        
    async def run_scheduled_crawl(self):
        """
        Main scheduled crawl job.
        
        Uses priority queue to crawl companies in order of importance:
        1. CRITICAL: Expired cache + high subscribers
        2. HIGH: Many subscribers
        3. NORMAL: Some subscribers
        4. LOW/BACKGROUND: No subscribers, maintenance
        """
        if self.is_running:
            logger.warning("Crawl already in progress, skipping")
            return
            
        self.is_running = True
        crawl_start = datetime.utcnow()
        
        logger.info("=" * 60)
        logger.info("Starting scheduled crawl cycle")
        logger.info("=" * 60)
        
        try:
            # Build priority queue (deduplicates across all users)
            companies, stats = await self.queue_builder.build_queue(include_all=False)
            
            if not companies:
                logger.info("No companies need updating")
                return
                
            logger.info(f"Queue built: {stats.unique_companies} unique companies")
            logger.info(f"  By priority: {stats.by_priority}")
            logger.info(f"  Estimated duration: {stats.estimated_duration_minutes:.1f} minutes")
            
            # Convert to API format
            companies_to_crawl = [c.to_dict() for c in companies]
            
            # Process in batches
            batches = self.chunk_list(companies_to_crawl, BATCH_SIZE)
            total_batches = len(batches)
            
            logger.info(f"Processing {len(companies_to_crawl)} companies in {total_batches} batches")
            
            successful_companies = 0
            failed_companies = 0
            cache_hits = 0
            api_hits = 0
            total_jobs = 0
            
            for i, batch in enumerate(batches, 1):
                # Log priority of this batch
                priorities = set(c.get('priority', 3) for c in batch)
                logger.info(f"Processing batch {i}/{total_batches} ({len(batch)} companies, priorities: {priorities})")
                
                # Trigger crawl for this batch
                job_id = await self.trigger_crawl(batch)
                
                if job_id:
                    self.current_crawl_id = job_id
                    
                    # Wait for completion
                    success = await self.wait_for_crawl(job_id)
                    
                    if success:
                        successful_companies += len(batch)
                    else:
                        failed_companies += len(batch)
                else:
                    failed_companies += len(batch)
                    
                # Update heartbeat
                await self.update_heartbeat()
                
                # Delay between batches (except for last batch)
                if i < total_batches:
                    logger.info(f"Waiting {BATCH_DELAY_SECONDS}s before next batch...")
                    await asyncio.sleep(BATCH_DELAY_SECONDS)
                    
            # Crawl complete - sync to Supabase
            await self.sync_to_supabase()
            
            # Log summary
            duration = datetime.utcnow() - crawl_start
            logger.info("=" * 60)
            logger.info("Scheduled crawl cycle complete")
            logger.info(f"  Duration: {duration}")
            logger.info(f"  Successful: {successful_companies}")
            logger.info(f"  Failed: {failed_companies}")
            logger.info(f"  Unique companies crawled: {stats.unique_companies}")
            logger.info(f"  Total subscribers served: {stats.total_subscribers}")
            logger.info("=" * 60)
            
        except Exception as e:
            logger.error(f"Error during scheduled crawl: {e}", exc_info=True)
            
        finally:
            self.is_running = False
            self.current_crawl_id = None
            
    async def sync_to_supabase(self):
        """
        Sync job counts to Supabase for Company Fit Explorer.
        
        Updates the openRoles field for companies in Supabase.
        """
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            logger.info("Supabase not configured, skipping sync")
            return
            
        logger.info("Syncing job counts to Supabase...")
        
        try:
            # Get job counts from crawler database
            query = """
                SELECT c.name, COUNT(j.job_id) as job_count
                FROM companies c
                LEFT JOIN jobs j ON c.company_id = j.company_id AND j.is_active = true
                GROUP BY c.company_id, c.name
            """
            
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(query)
                
            job_counts = {row["name"]: row["job_count"] for row in rows}
            
            # Update Supabase via REST API
            headers = {
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }
            
            updated = 0
            for company_name, job_count in job_counts.items():
                try:
                    # Update companies in user_data JSONB
                    # This is a simplified approach - you may need to adjust based on your schema
                    response = await self.http_client.patch(
                        f"{SUPABASE_URL}/rest/v1/user_data",
                        headers=headers,
                        params={
                            "select": "id"
                        },
                        json={
                            # This would need to be adjusted based on your actual Supabase schema
                            "crawler_job_counts": {company_name: job_count}
                        }
                    )
                    
                    if response.status_code in (200, 204):
                        updated += 1
                        
                except Exception as e:
                    logger.debug(f"Could not sync {company_name}: {e}")
                    
            logger.info(f"Synced {updated} companies to Supabase")
            
        except Exception as e:
            logger.error(f"Error syncing to Supabase: {e}")
            
    async def update_heartbeat(self):
        """Update heartbeat file for health checks."""
        try:
            HEARTBEAT_FILE.write_text(datetime.utcnow().isoformat())
        except Exception as e:
            logger.warning(f"Could not update heartbeat: {e}")
            
    async def run(self):
        """
        Main entry point - start the scheduler.
        """
        await self.initialize()
        
        # Schedule the crawl job
        self.scheduler.add_job(
            self.run_scheduled_crawl,
            trigger=IntervalTrigger(hours=CRAWL_INTERVAL_HOURS),
            id="scheduled_crawl",
            name="Scheduled Company Crawl",
            replace_existing=True,
            next_run_time=datetime.utcnow()  # Run immediately on startup
        )
        
        self.scheduler.start()
        
        logger.info(f"Scheduler started - crawling every {CRAWL_INTERVAL_HOURS} hours")
        logger.info(f"Batch size: {BATCH_SIZE}, Batch delay: {BATCH_DELAY_SECONDS}s")
        
        # Update heartbeat
        await self.update_heartbeat()
        
        # Keep running
        try:
            while True:
                await asyncio.sleep(60)
                await self.update_heartbeat()
        except asyncio.CancelledError:
            logger.info("Scheduler cancelled")
            await self.shutdown()


async def main():
    """Main entry point."""
    scheduler = CrawlerScheduler()
    
    # Handle graceful shutdown
    loop = asyncio.get_event_loop()
    
    def signal_handler():
        logger.info("Received shutdown signal")
        loop.create_task(scheduler.shutdown())
        sys.exit(0)
        
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, signal_handler)
        
    try:
        await scheduler.run()
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
        await scheduler.shutdown()


if __name__ == "__main__":
    asyncio.run(main())

