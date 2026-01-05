"""
Session manager that coordinates HTTP client and rate limiter.
"""
import logging
from typing import Optional, Dict
from urllib.parse import urlparse

from .http_client import HTTPClient
from .rate_limiter import rate_limiter

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages HTTP sessions with rate limiting and anti-bot measures.
    
    This class provides a high-level interface for making HTTP requests
    while automatically handling rate limiting, retries, and logging.
    """
    
    def __init__(self):
        """Initialize the session manager."""
        self.http_client = HTTPClient()
        self._started = False
    
    async def start(self):
        """
        Start the session manager.
        
        Must be called before making any requests.
        """
        if not self._started:
            await self.http_client.start()
            self._started = True
            logger.info("Session manager started")
    
    async def close(self):
        """
        Close the session manager.
        
        Should be called when done with all requests.
        """
        if self._started:
            await self.http_client.close()
            self._started = False
            logger.info("Session manager closed")
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def get(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, str]] = None,
        respect_rate_limit: bool = True,
        log_crawl: bool = True,
    ) -> Optional[str]:
        """
        Fetch a URL with rate limiting and anti-bot measures.
        
        Args:
            url: URL to fetch
            headers: Optional additional headers
            params: Optional query parameters
            respect_rate_limit: Whether to apply rate limiting (default: True)
            log_crawl: Whether to log this request to the database
            
        Returns:
            str: Response content, or None if request failed
        """
        if not self._started:
            await self.start()
        
        # Apply rate limiting
        if respect_rate_limit:
            await rate_limiter.acquire(url)
        
        # Make the request
        content = await self.http_client.get(
            url=url,
            headers=headers,
            params=params,
            log_crawl=log_crawl,
        )
        
        return content
    
    async def post(
        self,
        url: str,
        data: Optional[Dict] = None,
        json: Optional[Dict] = None,
        headers: Optional[Dict[str, str]] = None,
        respect_rate_limit: bool = True,
    ) -> Optional[str]:
        """
        POST to a URL with rate limiting.
        
        Args:
            url: URL to post to
            data: Form data to send
            json: JSON data to send
            headers: Optional additional headers
            respect_rate_limit: Whether to apply rate limiting (default: True)
            
        Returns:
            str: Response content, or None if request failed
        """
        if not self._started:
            await self.start()
        
        # Apply rate limiting
        if respect_rate_limit:
            await rate_limiter.acquire(url)
        
        # Make the request
        content = await self.http_client.post(
            url=url,
            data=data,
            json=json,
            headers=headers,
        )
        
        return content
    
    def get_domain(self, url: str) -> str:
        """
        Extract domain from URL.
        
        Args:
            url: Full URL
            
        Returns:
            str: Domain name
        """
        parsed = urlparse(url)
        return parsed.netloc
    
    def get_rate_limit_stats(self, domain: str = None) -> Dict:
        """
        Get rate limiting statistics.
        
        Args:
            domain: Optional specific domain to get stats for
            
        Returns:
            Dict with rate limiting stats
        """
        return rate_limiter.get_stats(domain)


