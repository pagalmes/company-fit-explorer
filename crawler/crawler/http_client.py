"""
Async HTTP client with retry logic and anti-bot measures.
"""
import asyncio
import logging
from typing import Optional, Dict
from urllib.parse import urlparse
import time

import aiohttp
from aiohttp import ClientTimeout, TCPConnector, ClientError

from config.settings import HTTP_CONFIG
from config.user_agents import get_realistic_headers
from database.operations import insert_crawl_log

logger = logging.getLogger(__name__)


class HTTPClient:
    """
    Async HTTP client with built-in retry logic, error handling,
    and realistic browser behavior.
    """
    
    def __init__(self):
        """Initialize the HTTP client with configuration from settings."""
        self.session: Optional[aiohttp.ClientSession] = None
        self.timeout = ClientTimeout(total=HTTP_CONFIG["timeout"])
        self.retry_attempts = HTTP_CONFIG["retry_attempts"]
        self.retry_delay = HTTP_CONFIG["retry_delay"]
        self.retry_backoff = HTTP_CONFIG["retry_backoff"]
        
    async def __aenter__(self):
        """Async context manager entry."""
        await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def start(self):
        """
        Start the HTTP client session.
        
        Creates a new aiohttp ClientSession with appropriate configuration.
        """
        if self.session is None:
            connector = TCPConnector(
                limit=HTTP_CONFIG["max_connections"],
                limit_per_host=HTTP_CONFIG["max_connections_per_host"],
                ttl_dns_cache=300,
                force_close=False,
            )
            
            self.session = aiohttp.ClientSession(
                connector=connector,
                timeout=self.timeout,
                trust_env=True,
            )
            logger.info("HTTP client session started")
    
    async def close(self):
        """
        Close the HTTP client session.
        
        Should be called when the client is no longer needed.
        """
        if self.session is not None:
            await self.session.close()
            self.session = None
            logger.info("HTTP client session closed")
    
    async def get(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, str]] = None,
        log_crawl: bool = True,
    ) -> Optional[str]:
        """
        Perform an async GET request with retry logic.
        
        Args:
            url: URL to fetch
            headers: Optional additional headers to include
            params: Optional query parameters
            log_crawl: Whether to log this request to the database
            
        Returns:
            str: Response text, or None if all retries failed
        """
        if self.session is None:
            await self.start()
        
        # Build headers with realistic browser behavior
        request_headers = get_realistic_headers()
        if headers:
            request_headers.update(headers)
        
        # Add Referer header for better legitimacy
        parsed_url = urlparse(url)
        referer = f"{parsed_url.scheme}://{parsed_url.netloc}"
        request_headers["Referer"] = referer
        
        attempt = 0
        last_error = None
        start_time = time.time()
        
        while attempt < self.retry_attempts:
            attempt += 1
            
            try:
                logger.debug(f"GET request to {url} (attempt {attempt}/{self.retry_attempts})")
                
                async with self.session.get(
                    url,
                    headers=request_headers,
                    params=params,
                    allow_redirects=True,
                    ssl=False,  # Some career pages have SSL issues
                ) as response:
                    response_time_ms = int((time.time() - start_time) * 1000)
                    
                    # Check status code
                    if response.status == 200:
                        content = await response.text()
                        
                        if log_crawl:
                            await insert_crawl_log(
                                url=url,
                                status="success",
                                response_time_ms=response_time_ms,
                            )
                        
                        logger.info(f"Successfully fetched {url} ({len(content)} bytes)")
                        return content
                    
                    elif response.status == 429:
                        # Rate limited - wait longer
                        error_msg = f"Rate limited (429) on {url}"
                        logger.warning(error_msg)
                        last_error = error_msg
                        
                        if log_crawl:
                            await insert_crawl_log(
                                url=url,
                                status="rate_limited",
                                error_message=error_msg,
                                response_time_ms=response_time_ms,
                            )
                        
                        # Exponential backoff with extra delay for rate limiting
                        wait_time = self.retry_delay * (self.retry_backoff ** attempt) * 2
                        logger.info(f"Waiting {wait_time}s before retry...")
                        await asyncio.sleep(wait_time)
                        continue
                    
                    elif response.status in [403, 401]:
                        # Forbidden/Unauthorized - might be blocking us
                        error_msg = f"Access denied ({response.status}) on {url}"
                        logger.warning(error_msg)
                        last_error = error_msg
                        
                        if log_crawl:
                            await insert_crawl_log(
                                url=url,
                                status="access_denied",
                                error_message=error_msg,
                                response_time_ms=response_time_ms,
                            )
                        
                        # Try one more time with different headers
                        request_headers = get_realistic_headers()
                        await asyncio.sleep(self.retry_delay * attempt)
                        continue
                    
                    else:
                        error_msg = f"HTTP {response.status} on {url}"
                        logger.warning(error_msg)
                        last_error = error_msg
                        
                        if log_crawl:
                            await insert_crawl_log(
                                url=url,
                                status=f"http_{response.status}",
                                error_message=error_msg,
                                response_time_ms=response_time_ms,
                            )
                        
                        await asyncio.sleep(self.retry_delay * attempt)
                        continue
            
            except asyncio.TimeoutError:
                error_msg = f"Timeout on {url}"
                logger.warning(error_msg)
                last_error = error_msg
                
                if log_crawl:
                    await insert_crawl_log(
                        url=url,
                        status="timeout",
                        error_message=error_msg,
                    )
                
                await asyncio.sleep(self.retry_delay * attempt)
                continue
            
            except ClientError as e:
                error_msg = f"Client error on {url}: {str(e)}"
                logger.warning(error_msg)
                last_error = error_msg
                
                if log_crawl:
                    await insert_crawl_log(
                        url=url,
                        status="client_error",
                        error_message=error_msg,
                    )
                
                await asyncio.sleep(self.retry_delay * (self.retry_backoff ** attempt))
                continue
            
            except Exception as e:
                error_msg = f"Unexpected error on {url}: {str(e)}"
                logger.error(error_msg, exc_info=True)
                last_error = error_msg
                
                if log_crawl:
                    await insert_crawl_log(
                        url=url,
                        status="error",
                        error_message=error_msg,
                    )
                
                await asyncio.sleep(self.retry_delay * (self.retry_backoff ** attempt))
                continue
        
        # All retries exhausted
        logger.error(f"All retries exhausted for {url}. Last error: {last_error}")
        return None
    
    async def post(
        self,
        url: str,
        data: Optional[Dict] = None,
        json: Optional[Dict] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Optional[str]:
        """
        Perform an async POST request with retry logic.
        
        Args:
            url: URL to post to
            data: Form data to send
            json: JSON data to send
            headers: Optional additional headers
            
        Returns:
            str: Response text, or None if all retries failed
        """
        if self.session is None:
            await self.start()
        
        request_headers = get_realistic_headers()
        if headers:
            request_headers.update(headers)
        
        attempt = 0
        last_error = None
        
        while attempt < self.retry_attempts:
            attempt += 1
            
            try:
                logger.debug(f"POST request to {url} (attempt {attempt}/{self.retry_attempts})")
                
                async with self.session.post(
                    url,
                    data=data,
                    json=json,
                    headers=request_headers,
                    allow_redirects=True,
                    ssl=False,
                ) as response:
                    if response.status == 200:
                        content = await response.text()
                        logger.info(f"Successfully posted to {url}")
                        return content
                    else:
                        error_msg = f"HTTP {response.status} on POST to {url}"
                        logger.warning(error_msg)
                        last_error = error_msg
                        await asyncio.sleep(self.retry_delay * attempt)
                        continue
            
            except Exception as e:
                error_msg = f"Error on POST to {url}: {str(e)}"
                logger.error(error_msg, exc_info=True)
                last_error = error_msg
                await asyncio.sleep(self.retry_delay * (self.retry_backoff ** attempt))
                continue
        
        logger.error(f"All retries exhausted for POST to {url}. Last error: {last_error}")
        return None


