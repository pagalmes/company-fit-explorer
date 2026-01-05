"""
Base scraper class with common functionality for all parsers.
"""
import logging
from typing import Optional, List, Dict
from abc import ABC, abstractmethod
from bs4 import BeautifulSoup

from crawler.session_manager import SessionManager
from .extractors import JobDataExtractor
from .filters import JobFilter

logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """
    Abstract base class for all scrapers.
    
    Provides common functionality and defines the interface
    that all specific scrapers must implement.
    """
    
    def __init__(self, session_manager: SessionManager, job_filter: Optional[JobFilter] = None):
        """
        Initialize the base scraper.
        
        Args:
            session_manager: SessionManager instance for making HTTP requests
            job_filter: Optional JobFilter to filter jobs during crawling
        """
        self.session = session_manager
        self.extractor = JobDataExtractor()
        self.job_filter = job_filter
    
    async def fetch_html(self, url: str) -> Optional[BeautifulSoup]:
        """
        Fetch and parse HTML from a URL.
        
        Args:
            url: URL to fetch
            
        Returns:
            BeautifulSoup object or None if fetch failed
        """
        html = await self.session.get(url)
        if html:
            return BeautifulSoup(html, 'lxml')
        return None
    
    @abstractmethod
    async def get_job_links(self, career_page_url: str) -> List[str]:
        """
        Extract all job posting links from a career page.
        
        Must be implemented by subclasses.
        
        Args:
            career_page_url: URL of the company's career page
            
        Returns:
            List of job posting URLs
        """
        pass
    
    @abstractmethod
    async def parse_job_posting(self, job_url: str) -> Optional[Dict]:
        """
        Parse a single job posting page.
        
        Must be implemented by subclasses.
        
        Args:
            job_url: URL of the job posting
            
        Returns:
            Dict with job data (title, description, requirements, location, etc.)
            or None if parsing failed
        """
        pass
    
    async def scrape_company(self, career_page_url: str) -> List[Dict]:
        """
        Scrape all jobs from a company's career page.
        
        This is the main entry point for scraping a company.
        
        Args:
            career_page_url: URL of the company's career page
            
        Returns:
            List of job data dictionaries
        """
        logger.info(f"Starting to scrape company: {career_page_url}")
        
        try:
            # Get all job links
            job_links = await self.get_job_links(career_page_url)
            logger.info(f"Found {len(job_links)} job postings")
            
            if not job_links:
                logger.warning(f"No job links found on {career_page_url}")
                return []
            
            # Parse each job posting
            jobs = []
            filtered_count = 0
            
            for i, job_url in enumerate(job_links, 1):
                logger.info(f"Parsing job {i}/{len(job_links)}: {job_url}")
                
                job_data = await self.parse_job_posting(job_url)
                if job_data:
                    job_data['application_url'] = job_url
                    
                    # Apply filter if configured
                    if self.job_filter:
                        if self.job_filter.matches(job_data):
                            jobs.append(job_data)
                            logger.debug(f"Job matches filter: {job_data['title']}")
                        else:
                            filtered_count += 1
                            logger.debug(f"Job filtered out: {job_data['title']}")
                    else:
                        jobs.append(job_data)
                else:
                    logger.warning(f"Failed to parse job at {job_url}")
            
            if filtered_count > 0:
                logger.info(f"Filtered out {filtered_count} jobs that didn't match criteria")
            
            logger.info(f"Successfully scraped {len(jobs)} jobs from {career_page_url}")
            return jobs
            
        except Exception as e:
            logger.error(f"Error scraping company {career_page_url}: {e}", exc_info=True)
            return []
    
    def validate_job_data(self, job_data: Dict) -> bool:
        """
        Validate that job data has minimum required fields.
        
        Args:
            job_data: Job data dictionary to validate
            
        Returns:
            bool: True if valid, False otherwise
        """
        required_fields = ['title']
        
        for field in required_fields:
            if not job_data.get(field):
                logger.warning(f"Job data missing required field: {field}")
                return False
        
        return True

