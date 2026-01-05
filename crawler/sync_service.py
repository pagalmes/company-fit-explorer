"""
Sync Service for Company Fit Explorer

Syncs job data from the crawler PostgreSQL database to Supabase.
This allows the main application to display up-to-date job counts
and optionally receive notifications about new jobs.

Features:
- Sync job counts per company
- Match companies by name (fuzzy matching)
- Track new jobs since last sync
- Optional webhook notifications
"""

import asyncio
import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

import httpx
import asyncpg

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
WEBHOOK_URL = os.getenv("SYNC_WEBHOOK_URL")  # Optional webhook for notifications

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("DB_NAME", "career_crawler"),
    "user": os.getenv("DB_USER", "crawler"),
    "password": os.getenv("DB_PASSWORD", ""),
}


@dataclass
class JobCount:
    """Job count for a company."""
    company_name: str
    active_jobs: int
    new_jobs_24h: int
    last_crawled: Optional[datetime]


@dataclass
class SyncResult:
    """Result of a sync operation."""
    companies_synced: int
    companies_failed: int
    total_active_jobs: int
    new_jobs_24h: int
    duration_seconds: float


class SyncService:
    """
    Service to sync crawler data to Supabase.
    """
    
    def __init__(self):
        self.db_pool: Optional[asyncpg.Pool] = None
        self.http_client: Optional[httpx.AsyncClient] = None
        
    async def initialize(self):
        """Initialize connections."""
        self.db_pool = await asyncpg.create_pool(
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"],
            database=DB_CONFIG["database"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            min_size=2,
            max_size=5,
        )
        
        self.http_client = httpx.AsyncClient(timeout=30.0)
        logger.info("Sync service initialized")
        
    async def shutdown(self):
        """Clean shutdown."""
        if self.http_client:
            await self.http_client.aclose()
        if self.db_pool:
            await self.db_pool.close()
        logger.info("Sync service shutdown")
        
    async def get_job_counts(self) -> List[JobCount]:
        """
        Get job counts for all companies from the crawler database.
        
        Returns:
            List of JobCount objects
        """
        query = """
            SELECT 
                c.name,
                c.last_crawled,
                COUNT(j.job_id) FILTER (WHERE j.is_active = true) as active_jobs,
                COUNT(j.job_id) FILTER (
                    WHERE j.is_active = true 
                    AND j.scraped_at > NOW() - INTERVAL '24 hours'
                ) as new_jobs_24h
            FROM companies c
            LEFT JOIN jobs j ON c.company_id = j.company_id
            GROUP BY c.company_id, c.name, c.last_crawled
            ORDER BY c.name
        """
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query)
            
        return [
            JobCount(
                company_name=row["name"],
                active_jobs=row["active_jobs"],
                new_jobs_24h=row["new_jobs_24h"],
                last_crawled=row["last_crawled"]
            )
            for row in rows
        ]
        
    async def get_new_jobs(self, since_hours: int = 24) -> List[Dict]:
        """
        Get jobs posted in the last N hours.
        
        Args:
            since_hours: Number of hours to look back
            
        Returns:
            List of job dictionaries
        """
        query = """
            SELECT 
                j.job_id,
                c.name as company_name,
                j.title,
                j.location,
                j.application_url,
                j.scraped_at
            FROM jobs j
            JOIN companies c ON j.company_id = c.company_id
            WHERE j.is_active = true
              AND j.scraped_at > NOW() - INTERVAL '%s hours'
            ORDER BY j.scraped_at DESC
        """
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query % since_hours)
            
        return [dict(row) for row in rows]
        
    async def sync_to_supabase(self, job_counts: List[JobCount]) -> Tuple[int, int]:
        """
        Sync job counts to Supabase.
        
        This updates a crawler_data table in Supabase with the latest job counts.
        
        Args:
            job_counts: List of JobCount objects
            
        Returns:
            Tuple of (synced_count, failed_count)
        """
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            logger.warning("Supabase not configured, skipping sync")
            return 0, 0
            
        headers = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
        
        synced = 0
        failed = 0
        
        # Prepare batch data
        batch_data = []
        for jc in job_counts:
            batch_data.append({
                "company_name": jc.company_name,
                "active_jobs": jc.active_jobs,
                "new_jobs_24h": jc.new_jobs_24h,
                "last_crawled": jc.last_crawled.isoformat() if jc.last_crawled else None,
                "updated_at": datetime.utcnow().isoformat()
            })
            
        # Upsert to Supabase
        try:
            response = await self.http_client.post(
                f"{SUPABASE_URL}/rest/v1/crawler_job_counts",
                headers=headers,
                json=batch_data
            )
            
            if response.status_code in (200, 201, 204):
                synced = len(batch_data)
                logger.info(f"Synced {synced} companies to Supabase")
            else:
                failed = len(batch_data)
                logger.error(f"Supabase sync failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            failed = len(batch_data)
            logger.error(f"Error syncing to Supabase: {e}")
            
        return synced, failed
        
    async def send_webhook_notification(self, new_jobs: List[Dict]) -> bool:
        """
        Send webhook notification about new jobs.
        
        Args:
            new_jobs: List of new job dictionaries
            
        Returns:
            True if successful
        """
        if not WEBHOOK_URL or not new_jobs:
            return True
            
        payload = {
            "event": "new_jobs",
            "timestamp": datetime.utcnow().isoformat(),
            "job_count": len(new_jobs),
            "jobs": [
                {
                    "company": job["company_name"],
                    "title": job["title"],
                    "location": job.get("location"),
                    "url": job.get("application_url")
                }
                for job in new_jobs[:20]  # Limit to 20 jobs in notification
            ]
        }
        
        try:
            response = await self.http_client.post(WEBHOOK_URL, json=payload)
            response.raise_for_status()
            logger.info(f"Webhook notification sent for {len(new_jobs)} new jobs")
            return True
        except Exception as e:
            logger.error(f"Webhook notification failed: {e}")
            return False
            
    async def run_sync(self) -> SyncResult:
        """
        Run a complete sync operation.
        
        Returns:
            SyncResult with sync statistics
        """
        start_time = datetime.utcnow()
        
        logger.info("Starting sync operation...")
        
        # Get job counts from crawler DB
        job_counts = await self.get_job_counts()
        
        # Calculate totals
        total_active = sum(jc.active_jobs for jc in job_counts)
        total_new = sum(jc.new_jobs_24h for jc in job_counts)
        
        logger.info(f"Found {len(job_counts)} companies, {total_active} active jobs, {total_new} new in 24h")
        
        # Sync to Supabase
        synced, failed = await self.sync_to_supabase(job_counts)
        
        # Get new jobs for notification
        if total_new > 0:
            new_jobs = await self.get_new_jobs(24)
            await self.send_webhook_notification(new_jobs)
            
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        result = SyncResult(
            companies_synced=synced,
            companies_failed=failed,
            total_active_jobs=total_active,
            new_jobs_24h=total_new,
            duration_seconds=duration
        )
        
        logger.info(f"Sync completed in {duration:.2f}s")
        
        return result


async def main():
    """Standalone sync execution."""
    service = SyncService()
    
    try:
        await service.initialize()
        result = await service.run_sync()
        
        print(f"\nSync Results:")
        print(f"  Companies synced: {result.companies_synced}")
        print(f"  Companies failed: {result.companies_failed}")
        print(f"  Total active jobs: {result.total_active_jobs}")
        print(f"  New jobs (24h): {result.new_jobs_24h}")
        print(f"  Duration: {result.duration_seconds:.2f}s")
        
    finally:
        await service.shutdown()


if __name__ == "__main__":
    asyncio.run(main())



