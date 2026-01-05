"""
Generic career page parser that works with most career pages.
"""
import logging
from typing import List, Dict, Optional
from bs4 import BeautifulSoup

from ..base_scraper import BaseScraper
from ..extractors import JobDataExtractor

logger = logging.getLogger(__name__)


class GenericParser(BaseScraper):
    """
    Generic parser that attempts to extract job information from
    any career page using common patterns.
    
    This parser should work as a fallback for pages that don't use
    a recognized ATS platform.
    """
    
    async def get_job_links(self, career_page_url: str) -> List[str]:
        """
        Extract all job posting links from a career page.
        
        Args:
            career_page_url: URL of the company's career page
            
        Returns:
            List of job posting URLs
        """
        logger.info(f"Extracting job links from: {career_page_url}")
        
        soup = await self.fetch_html(career_page_url)
        if not soup:
            logger.error(f"Failed to fetch HTML from {career_page_url}")
            return []
        
        # Use the extractor to find job links
        job_links = self.extractor.extract_job_links(soup, career_page_url)
        
        # If we didn't find any links using standard patterns, try more aggressive search
        if not job_links:
            logger.info("No links found with standard patterns, trying broader search")
            job_links = self._extract_links_broad(soup, career_page_url)
        
        return job_links
    
    def _extract_links_broad(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """
        Broader link extraction when standard patterns fail.
        
        Args:
            soup: BeautifulSoup object of the page
            base_url: Base URL for resolving relative URLs
            
        Returns:
            List of potential job posting URLs
        """
        from urllib.parse import urljoin
        import re
        
        job_links = []
        
        # Look for any links that might be job postings
        all_links = soup.find_all('a', href=True)
        
        for link in all_links:
            href = link.get('href', '')
            text = link.get_text().strip().lower()
            
            # Skip navigation and external links
            if any(skip in text for skip in ['home', 'about', 'contact', 'login', 'sign in']):
                continue
            
            # Look for job-related keywords in the link or nearby text
            job_keywords = [
                'engineer', 'developer', 'designer', 'manager', 'analyst',
                'director', 'lead', 'senior', 'junior', 'intern',
                'specialist', 'coordinator', 'associate', 'consultant',
            ]
            
            if any(keyword in text for keyword in job_keywords):
                # This might be a job link
                if href.startswith('/'):
                    href = urljoin(base_url, href)
                elif not href.startswith('http'):
                    href = urljoin(base_url, href)
                
                if href not in job_links and href != base_url:
                    job_links.append(href)
        
        logger.info(f"Broad search found {len(job_links)} potential job links")
        return job_links
    
    async def parse_job_posting(self, job_url: str) -> Optional[Dict]:
        """
        Parse a single job posting page.
        
        Args:
            job_url: URL of the job posting
            
        Returns:
            Dict with job data or None if parsing failed
        """
        logger.debug(f"Parsing job posting: {job_url}")
        
        soup = await self.fetch_html(job_url)
        if not soup:
            logger.error(f"Failed to fetch HTML from {job_url}")
            return None
        
        try:
            # Extract all available data
            text_content = soup.get_text()
            
            job_data = {
                'title': self.extractor.extract_title(soup),
                'description': self.extractor.extract_description(soup),
                'requirements': self.extractor.extract_requirements(soup),
                'location': self.extractor.extract_location(soup, text_content),
                'application_url': self.extractor.extract_application_url(soup, job_url),
                'posted_date': self.extractor.extract_posted_date(soup, text_content),
            }
            
            # If no specific application URL found, use the job URL itself
            if not job_data['application_url']:
                job_data['application_url'] = job_url
            
            # Validate that we at least got a title
            if not self.validate_job_data(job_data):
                logger.warning(f"Invalid job data extracted from {job_url}")
                return None
            
            logger.debug(f"Successfully parsed job: {job_data['title']}")
            return job_data
            
        except Exception as e:
            logger.error(f"Error parsing job posting {job_url}: {e}", exc_info=True)
            return None


