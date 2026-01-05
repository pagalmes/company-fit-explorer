"""
Priority Queue Builder

Builds a deduplicated, prioritized queue of companies to crawl based on:
1. Number of user subscriptions (more subscribers = higher priority)
2. Time since last crawl (stale companies first)
3. Cache expiration (expired cache = needs refresh)

This ensures:
- Each company is only crawled once per cycle (deduplication)
- Popular companies are crawled first
- Fresh data is available when users need it
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from enum import IntEnum

import asyncpg

from config.settings import DATABASE_CONFIG

logger = logging.getLogger(__name__)


class CrawlPriority(IntEnum):
    """Priority levels for crawl queue."""
    CRITICAL = 1    # Cache expired + high subscribers
    HIGH = 2        # High subscribers
    NORMAL = 3      # Normal priority
    LOW = 4         # Low subscribers, recently crawled
    BACKGROUND = 5  # No subscribers, maintenance crawl


@dataclass
class CompanyToCrawl:
    """Company queued for crawling."""
    company_id: int
    name: str
    career_url: str
    subscriber_count: int
    last_crawled: Optional[datetime]
    cache_expires_at: Optional[datetime]
    ats_type: Optional[str]
    priority: CrawlPriority = CrawlPriority.NORMAL
    
    def to_dict(self) -> Dict:
        return {
            "company_id": self.company_id,
            "name": self.name,
            "career_url": self.career_url,
            "subscriber_count": self.subscriber_count,
            "ats_type": self.ats_type,
            "priority": self.priority.value,
        }


@dataclass
class QueueStats:
    """Statistics about the built queue."""
    total_companies: int
    unique_companies: int
    total_subscribers: int
    by_priority: Dict[str, int] = field(default_factory=dict)
    by_ats_type: Dict[str, int] = field(default_factory=dict)
    estimated_duration_minutes: float = 0.0


class QueueBuilder:
    """
    Builds optimized crawl queues from user subscriptions.
    
    Features:
    - Deduplicates companies across all users
    - Prioritizes by subscriber count
    - Filters to stale/expired cache only
    - Estimates crawl duration
    """
    
    def __init__(self, cache_ttl_hours: int = 24):
        self.cache_ttl_hours = cache_ttl_hours
        self.db_pool: Optional[asyncpg.Pool] = None
        
    async def initialize(self):
        """Initialize database connection."""
        self.db_pool = await asyncpg.create_pool(
            host=DATABASE_CONFIG["host"],
            port=DATABASE_CONFIG["port"],
            database=DATABASE_CONFIG["database"],
            user=DATABASE_CONFIG["user"],
            password=DATABASE_CONFIG["password"],
            min_size=2,
            max_size=5,
        )
        logger.info("QueueBuilder initialized")
        
    async def shutdown(self):
        """Clean shutdown."""
        if self.db_pool:
            await self.db_pool.close()
        logger.info("QueueBuilder shutdown")
        
    async def get_subscribed_companies(self) -> List[CompanyToCrawl]:
        """
        Get all companies with active subscriptions, deduplicated and sorted by priority.
        
        Returns:
            List of companies sorted by priority (highest first)
        """
        query = """
            SELECT 
                c.company_id,
                c.name,
                c.career_page_url,
                c.ats_type,
                c.last_crawled,
                jc.expires_at as cache_expires_at,
                COUNT(DISTINCT cs.user_id) as subscriber_count
            FROM companies c
            LEFT JOIN company_subscriptions cs ON c.company_id = cs.company_id
            LEFT JOIN job_cache jc ON c.company_id = jc.company_id
            GROUP BY c.company_id, c.name, c.career_page_url, c.ats_type, c.last_crawled, jc.expires_at
            HAVING COUNT(DISTINCT cs.user_id) > 0
            ORDER BY subscriber_count DESC, c.last_crawled ASC NULLS FIRST
        """
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query)
            
        companies = []
        for row in rows:
            company = CompanyToCrawl(
                company_id=row["company_id"],
                name=row["name"],
                career_url=row["career_page_url"],
                subscriber_count=row["subscriber_count"],
                last_crawled=row["last_crawled"],
                cache_expires_at=row["cache_expires_at"],
                ats_type=row["ats_type"],
            )
            company.priority = self._calculate_priority(company)
            companies.append(company)
            
        logger.info(f"Found {len(companies)} companies with subscriptions")
        return companies
        
    async def get_stale_companies(self, max_age_hours: Optional[int] = None) -> List[CompanyToCrawl]:
        """
        Get companies that need refreshing (cache expired or stale).
        
        Args:
            max_age_hours: Override default cache TTL
            
        Returns:
            List of stale companies, prioritized
        """
        ttl = max_age_hours or self.cache_ttl_hours
        cutoff = datetime.utcnow() - timedelta(hours=ttl)
        
        query = """
            SELECT 
                c.company_id,
                c.name,
                c.career_page_url,
                c.ats_type,
                c.last_crawled,
                jc.expires_at as cache_expires_at,
                COALESCE(sub.subscriber_count, 0) as subscriber_count
            FROM companies c
            LEFT JOIN job_cache jc ON c.company_id = jc.company_id
            LEFT JOIN (
                SELECT company_id, COUNT(DISTINCT user_id) as subscriber_count
                FROM company_subscriptions
                GROUP BY company_id
            ) sub ON c.company_id = sub.company_id
            WHERE 
                jc.expires_at IS NULL 
                OR jc.expires_at < NOW()
                OR c.last_crawled IS NULL 
                OR c.last_crawled < $1
            ORDER BY 
                subscriber_count DESC,
                c.last_crawled ASC NULLS FIRST
        """
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query, cutoff)
            
        companies = []
        for row in rows:
            company = CompanyToCrawl(
                company_id=row["company_id"],
                name=row["name"],
                career_url=row["career_page_url"],
                subscriber_count=row["subscriber_count"],
                last_crawled=row["last_crawled"],
                cache_expires_at=row["cache_expires_at"],
                ats_type=row["ats_type"],
            )
            company.priority = self._calculate_priority(company)
            companies.append(company)
            
        logger.info(f"Found {len(companies)} stale companies needing refresh")
        return companies
        
    def _calculate_priority(self, company: CompanyToCrawl) -> CrawlPriority:
        """
        Calculate crawl priority based on subscribers and cache state.
        """
        now = datetime.utcnow()
        cache_expired = (
            company.cache_expires_at is None or 
            company.cache_expires_at < now
        )
        
        if cache_expired and company.subscriber_count >= 5:
            return CrawlPriority.CRITICAL
        elif company.subscriber_count >= 5:
            return CrawlPriority.HIGH
        elif company.subscriber_count >= 1:
            return CrawlPriority.NORMAL
        elif company.subscriber_count == 0 and cache_expired:
            return CrawlPriority.LOW
        else:
            return CrawlPriority.BACKGROUND
            
    def estimate_duration(self, companies: List[CompanyToCrawl]) -> float:
        """
        Estimate total crawl duration in minutes.
        
        Uses ATS type to estimate - API calls are faster.
        """
        total_seconds = 0.0
        
        for company in companies:
            if company.ats_type in ("greenhouse", "lever", "ashby", "workable"):
                # ATS API: ~3 seconds
                total_seconds += 3
            else:
                # HTML scraping: ~20 seconds
                total_seconds += 20
                
        return total_seconds / 60
        
    async def build_queue(self, include_all: bool = False) -> tuple[List[CompanyToCrawl], QueueStats]:
        """
        Build the optimized crawl queue.
        
        Args:
            include_all: If True, include all subscribed companies.
                        If False, only include stale/expired ones.
                        
        Returns:
            Tuple of (companies list, statistics)
        """
        if include_all:
            companies = await self.get_subscribed_companies()
        else:
            companies = await self.get_stale_companies()
            
        # Sort by priority
        companies.sort(key=lambda c: (c.priority.value, -c.subscriber_count))
        
        # Calculate stats
        stats = QueueStats(
            total_companies=len(companies),
            unique_companies=len(set(c.company_id for c in companies)),
            total_subscribers=sum(c.subscriber_count for c in companies),
        )
        
        # Count by priority
        for priority in CrawlPriority:
            count = sum(1 for c in companies if c.priority == priority)
            if count > 0:
                stats.by_priority[priority.name] = count
                
        # Count by ATS type
        for company in companies:
            ats = company.ats_type or "unknown"
            stats.by_ats_type[ats] = stats.by_ats_type.get(ats, 0) + 1
            
        stats.estimated_duration_minutes = self.estimate_duration(companies)
        
        logger.info(f"Built queue: {stats.unique_companies} companies, "
                   f"estimated {stats.estimated_duration_minutes:.1f} minutes")
        
        return companies, stats


async def main():
    """Test the queue builder."""
    builder = QueueBuilder()
    
    try:
        await builder.initialize()
        
        companies, stats = await builder.build_queue(include_all=True)
        
        print("\n" + "=" * 60)
        print("Queue Build Results")
        print("=" * 60)
        print(f"Total companies: {stats.total_companies}")
        print(f"Unique companies: {stats.unique_companies}")
        print(f"Total subscribers: {stats.total_subscribers}")
        print(f"Estimated duration: {stats.estimated_duration_minutes:.1f} minutes")
        
        print("\nBy Priority:")
        for priority, count in stats.by_priority.items():
            print(f"  {priority}: {count}")
            
        print("\nBy ATS Type:")
        for ats, count in stats.by_ats_type.items():
            print(f"  {ats}: {count}")
            
        if companies:
            print("\nTop 5 companies:")
            for company in companies[:5]:
                print(f"  {company.priority.name}: {company.name} ({company.subscriber_count} subscribers)")
                
    finally:
        await builder.shutdown()


if __name__ == "__main__":
    asyncio.run(main())

