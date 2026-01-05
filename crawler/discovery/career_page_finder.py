"""
Automatic career page discovery for companies.

This module finds the career/jobs page URL for a company given just the company name.
"""
import asyncio
import logging
import re
from typing import Optional, List, Dict, Tuple
from urllib.parse import urljoin, urlparse

import aiohttp
from bs4 import BeautifulSoup

from crawler.session_manager import SessionManager

logger = logging.getLogger(__name__)


class CareerPageFinder:
    """
    Discovers career page URLs for companies.
    
    Uses multiple strategies:
    1. Common URL patterns (company.com/careers, /jobs, etc.)
    2. Search company homepage for career links
    3. Google search fallback (optional)
    """
    
    # Common career page patterns
    CAREER_PATTERNS = [
        "/careers",
        "/jobs",
        "/work-with-us",
        "/join-us",
        "/opportunities",
        "/employment",
        "/job-openings",
        "/career",
        "/join",
        "/about/careers",
        "/company/careers",
        "/company/jobs",
        "/en/careers",
        "/en/jobs",
    ]
    
    # Career-related keywords to search for in links
    CAREER_KEYWORDS = [
        "career", "careers", "job", "jobs", "work-with-us", "join-us",
        "opportunities", "employment", "hiring", "join", "openings"
    ]
    
    def __init__(self, session_manager: Optional[SessionManager] = None):
        """
        Initialize career page finder.
        
        Args:
            session_manager: Optional SessionManager for HTTP requests
        """
        self.session = session_manager
        self._own_session = session_manager is None
    
    async def __aenter__(self):
        """Async context manager entry."""
        if self._own_session:
            self.session = SessionManager()
            await self.session.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self._own_session and self.session:
            await self.session.close()
    
    def _normalize_company_name(self, company_name: str) -> str:
        """
        Normalize company name for URL generation.
        
        Args:
            company_name: Company name
            
        Returns:
            str: Normalized name suitable for URLs
        """
        # Remove common suffixes
        name = re.sub(r'\b(Inc|LLC|Ltd|Corp|Corporation|Company|Co)\b\.?', '', company_name, flags=re.IGNORECASE)
        # Remove special characters
        name = re.sub(r'[^\w\s-]', '', name)
        # Convert to lowercase and replace spaces with hyphens
        name = name.strip().lower().replace(' ', '')
        return name
    
    def _generate_base_urls(self, company_name: str) -> List[str]:
        """
        Generate possible base URLs for a company.
        
        Args:
            company_name: Company name
            
        Returns:
            List of possible base URLs
        """
        normalized = self._normalize_company_name(company_name)
        
        return [
            f"https://{normalized}.com",
            f"https://www.{normalized}.com",
            f"https://{normalized}.io",
            f"https://{normalized}.ai",
            f"https://{normalized}.co",
        ]
    
    def _generate_career_urls(self, base_url: str) -> List[str]:
        """
        Generate possible career page URLs from a base URL.
        
        Args:
            base_url: Base company URL
            
        Returns:
            List of possible career page URLs
        """
        return [urljoin(base_url, pattern) for pattern in self.CAREER_PATTERNS]
    
    async def _try_url(self, url: str) -> bool:
        """
        Check if a URL exists and returns 200.
        
        Args:
            url: URL to check
            
        Returns:
            bool: True if URL is valid and accessible
        """
        try:
            html = await self.session.get(url, respect_rate_limit=False)
            if html and len(html) > 1000:  # Must have substantial content
                logger.debug(f"Found valid URL: {url}")
                return True
        except Exception as e:
            logger.debug(f"URL not accessible: {url} - {e}")
        return False
    
    async def _find_career_link_in_html(self, base_url: str, html: str) -> Optional[str]:
        """
        Search HTML for career page links.
        
        Args:
            base_url: Base URL for resolving relative links
            html: HTML content to search
            
        Returns:
            str: Career page URL if found, None otherwise
        """
        try:
            soup = BeautifulSoup(html, 'lxml')
            
            # Look for links with career-related text or URLs
            for link in soup.find_all('a', href=True):
                href = link['href']
                text = link.get_text().lower()
                
                # Check if link text contains career keywords
                if any(keyword in text for keyword in self.CAREER_KEYWORDS):
                    # Resolve relative URLs
                    if href.startswith('/'):
                        href = urljoin(base_url, href)
                    elif not href.startswith('http'):
                        href = urljoin(base_url, href)
                    
                    logger.debug(f"Found career link by text: {href}")
                    return href
                
                # Check if URL contains career keywords
                if any(keyword in href.lower() for keyword in self.CAREER_KEYWORDS):
                    if href.startswith('/'):
                        href = urljoin(base_url, href)
                    elif not href.startswith('http'):
                        href = urljoin(base_url, href)
                    
                    logger.debug(f"Found career link by URL: {href}")
                    return href
            
        except Exception as e:
            logger.debug(f"Error parsing HTML: {e}")
        
        return None
    
    async def discover(
        self,
        company_name: str,
        company_domain: Optional[str] = None
    ) -> Tuple[Optional[str], str]:
        """
        Discover the career page URL for a company.
        
        Args:
            company_name: Name of the company
            company_domain: Optional known domain (e.g., "riotgames.com")
            
        Returns:
            Tuple of (career_url, method) where method describes how it was found
        """
        logger.info(f"Discovering career page for: {company_name}")
        
        # Strategy 1: Try known domain with common patterns
        if company_domain:
            base_url = company_domain if company_domain.startswith('http') else f"https://{company_domain}"
            logger.info(f"Trying known domain: {base_url}")
            
            # Try common career page patterns
            for career_url in self._generate_career_urls(base_url):
                if await self._try_url(career_url):
                    logger.info(f"✓ Found via pattern: {career_url}")
                    return (career_url, "pattern_match")
            
            # Try searching homepage for career link
            html = await self.session.get(base_url, respect_rate_limit=False)
            if html:
                career_url = await self._find_career_link_in_html(base_url, html)
                if career_url and await self._try_url(career_url):
                    logger.info(f"✓ Found via homepage search: {career_url}")
                    return (career_url, "homepage_search")
        
        # Strategy 2: Generate possible domains and try patterns
        logger.info("Trying generated domains...")
        base_urls = self._generate_base_urls(company_name)
        
        for base_url in base_urls:
            # First check if base URL is accessible
            if not await self._try_url(base_url):
                continue
            
            logger.info(f"Found accessible domain: {base_url}")
            
            # Try career page patterns
            for career_url in self._generate_career_urls(base_url):
                if await self._try_url(career_url):
                    logger.info(f"✓ Found via pattern: {career_url}")
                    return (career_url, "pattern_match")
            
            # Search homepage for career link
            html = await self.session.get(base_url, respect_rate_limit=False)
            if html:
                career_url = await self._find_career_link_in_html(base_url, html)
                if career_url and await self._try_url(career_url):
                    logger.info(f"✓ Found via homepage search: {career_url}")
                    return (career_url, "homepage_search")
        
        logger.warning(f"Could not find career page for: {company_name}")
        return (None, "not_found")
    
    async def discover_batch(
        self,
        companies: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """
        Discover career pages for multiple companies.
        
        Args:
            companies: List of dicts with 'name' and optional 'domain' keys
            
        Returns:
            List of dicts with 'name', 'career_url', and 'discovery_method'
        """
        results = []
        
        for company in companies:
            name = company['name']
            domain = company.get('domain')
            
            career_url, method = await self.discover(name, domain)
            
            results.append({
                'name': name,
                'career_url': career_url,
                'discovery_method': method,
                'success': career_url is not None
            })
        
        return results


async def find_career_page(
    company_name: str,
    company_domain: Optional[str] = None
) -> Optional[str]:
    """
    Convenience function to find a single company's career page.
    
    Args:
        company_name: Name of the company
        company_domain: Optional known domain
        
    Returns:
        str: Career page URL or None
    """
    async with CareerPageFinder() as finder:
        career_url, method = await finder.discover(company_name, company_domain)
        return career_url


