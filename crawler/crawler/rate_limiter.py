"""
Rate limiting to avoid overwhelming servers and getting blocked.
"""
import asyncio
import logging
import random
from typing import Dict
from urllib.parse import urlparse
from datetime import datetime, timedelta
from collections import defaultdict

from config.settings import RATE_LIMIT_CONFIG

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Per-domain rate limiter with randomized delays to mimic human behavior.
    
    This class ensures that requests to the same domain are appropriately
    spaced out to avoid triggering anti-bot measures.
    """
    
    def __init__(self):
        """Initialize the rate limiter."""
        self.domain_locks: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
        self.last_request_time: Dict[str, datetime] = {}
        self.request_counts: Dict[str, int] = defaultdict(int)
        self.window_start: Dict[str, datetime] = {}
        
        self.requests_per_minute = RATE_LIMIT_CONFIG["requests_per_minute"]
        self.min_delay = RATE_LIMIT_CONFIG["min_delay"]
        self.max_delay = RATE_LIMIT_CONFIG["max_delay"]
    
    def _get_domain(self, url: str) -> str:
        """
        Extract domain from URL.
        
        Args:
            url: Full URL
            
        Returns:
            str: Domain name
        """
        parsed = urlparse(url)
        return parsed.netloc
    
    def _get_random_delay(self) -> float:
        """
        Generate a random delay between min and max delay.
        
        Returns:
            float: Delay in seconds
        """
        return random.uniform(self.min_delay, self.max_delay)
    
    async def acquire(self, url: str):
        """
        Acquire permission to make a request to the given URL.
        
        This method will block until it's safe to make the request,
        ensuring rate limits are respected.
        
        Args:
            url: URL to request
        """
        domain = self._get_domain(url)
        
        async with self.domain_locks[domain]:
            now = datetime.now()
            
            # Initialize window if needed
            if domain not in self.window_start:
                self.window_start[domain] = now
                self.request_counts[domain] = 0
            
            # Reset window if a minute has passed
            if now - self.window_start[domain] > timedelta(minutes=1):
                self.window_start[domain] = now
                self.request_counts[domain] = 0
                logger.debug(f"Reset rate limit window for {domain}")
            
            # Check if we've hit the rate limit for this minute
            if self.request_counts[domain] >= self.requests_per_minute:
                # Calculate how long to wait
                elapsed = (now - self.window_start[domain]).total_seconds()
                wait_time = 60 - elapsed
                
                if wait_time > 0:
                    logger.info(
                        f"Rate limit reached for {domain}. "
                        f"Waiting {wait_time:.1f}s..."
                    )
                    await asyncio.sleep(wait_time)
                    
                    # Reset window after waiting
                    self.window_start[domain] = datetime.now()
                    self.request_counts[domain] = 0
            
            # Check minimum delay since last request to this domain
            if domain in self.last_request_time:
                time_since_last = (now - self.last_request_time[domain]).total_seconds()
                delay = self._get_random_delay()
                
                if time_since_last < delay:
                    wait_time = delay - time_since_last
                    logger.debug(f"Delaying request to {domain} by {wait_time:.2f}s")
                    await asyncio.sleep(wait_time)
            else:
                # First request to this domain - add a small random delay anyway
                initial_delay = random.uniform(0.5, 1.5)
                await asyncio.sleep(initial_delay)
            
            # Update tracking
            self.last_request_time[domain] = datetime.now()
            self.request_counts[domain] += 1
            
            logger.debug(
                f"Acquired rate limit for {domain} "
                f"({self.request_counts[domain]}/{self.requests_per_minute} this minute)"
            )
    
    def get_stats(self, domain: str = None) -> Dict:
        """
        Get rate limiting statistics.
        
        Args:
            domain: Optional specific domain to get stats for
            
        Returns:
            Dict with rate limiting stats
        """
        if domain:
            return {
                "domain": domain,
                "requests_this_minute": self.request_counts.get(domain, 0),
                "last_request": self.last_request_time.get(domain),
            }
        else:
            return {
                "total_domains": len(self.request_counts),
                "per_domain": {
                    d: {
                        "requests_this_minute": self.request_counts[d],
                        "last_request": self.last_request_time.get(d),
                    }
                    for d in self.request_counts.keys()
                },
            }


# Global rate limiter instance
rate_limiter = RateLimiter()


