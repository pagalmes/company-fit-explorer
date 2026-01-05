"""
Data extraction utilities for parsing job information from HTML.
"""
import re
import logging
from typing import Optional, List, Dict
from bs4 import BeautifulSoup, Tag
from datetime import datetime

logger = logging.getLogger(__name__)


class JobDataExtractor:
    """
    Utilities for extracting structured job data from HTML content.
    """
    
    @staticmethod
    def clean_text(text: str) -> str:
        """
        Clean and normalize text content.
        
        Args:
            text: Raw text to clean
            
        Returns:
            str: Cleaned text
        """
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove leading/trailing whitespace
        text = text.strip()
        return text
    
    @staticmethod
    def extract_title(soup: BeautifulSoup) -> Optional[str]:
        """
        Extract job title from HTML.
        
        Tries multiple common patterns for job titles.
        
        Args:
            soup: BeautifulSoup object of the page
            
        Returns:
            str: Job title or None
        """
        # Common selectors for job titles
        selectors = [
            ('h1', {'class': re.compile(r'job.*title|title.*job|position.*title', re.I)}),
            ('h1', {'class': re.compile(r'heading|header', re.I)}),
            ('h2', {'class': re.compile(r'job.*title|title.*job', re.I)}),
            ('div', {'class': re.compile(r'job.*title|title.*job', re.I)}),
            ('span', {'class': re.compile(r'job.*title|title.*job', re.I)}),
            ('h1', {}),  # Fallback to first h1
        ]
        
        for tag_name, attrs in selectors:
            element = soup.find(tag_name, attrs)
            if element:
                title = JobDataExtractor.clean_text(element.get_text())
                if title and len(title) > 5:  # Sanity check
                    logger.debug(f"Extracted title: {title}")
                    return title
        
        # Try meta tags
        meta_title = soup.find('meta', {'property': 'og:title'})
        if meta_title and meta_title.get('content'):
            title = JobDataExtractor.clean_text(meta_title['content'])
            logger.debug(f"Extracted title from meta: {title}")
            return title
        
        logger.warning("Could not extract job title")
        return None
    
    @staticmethod
    def extract_location(soup: BeautifulSoup, text_content: str = None) -> Optional[str]:
        """
        Extract job location from HTML.
        
        Args:
            soup: BeautifulSoup object of the page
            text_content: Optional raw text to search
            
        Returns:
            str: Location or None
        """
        # Common selectors for location
        selectors = [
            ('div', {'class': re.compile(r'location', re.I)}),
            ('span', {'class': re.compile(r'location', re.I)}),
            ('p', {'class': re.compile(r'location', re.I)}),
            ('li', {'class': re.compile(r'location', re.I)}),
        ]
        
        for tag_name, attrs in selectors:
            element = soup.find(tag_name, attrs)
            if element:
                location = JobDataExtractor.clean_text(element.get_text())
                if location and len(location) > 2:
                    logger.debug(f"Extracted location: {location}")
                    return location
        
        # Try to find location with regex patterns
        if text_content:
            location_patterns = [
                r'Location:\s*([^\n]+)',
                r'Office Location:\s*([^\n]+)',
                r'Work Location:\s*([^\n]+)',
            ]
            
            for pattern in location_patterns:
                match = re.search(pattern, text_content, re.IGNORECASE)
                if match:
                    location = JobDataExtractor.clean_text(match.group(1))
                    logger.debug(f"Extracted location with regex: {location}")
                    return location
        
        # Check meta tags
        meta_location = soup.find('meta', {'property': 'og:location'})
        if meta_location and meta_location.get('content'):
            return JobDataExtractor.clean_text(meta_location['content'])
        
        logger.debug("Could not extract location")
        return None
    
    @staticmethod
    def extract_description(soup: BeautifulSoup) -> Optional[str]:
        """
        Extract job description from HTML.
        
        Args:
            soup: BeautifulSoup object of the page
            
        Returns:
            str: Job description or None
        """
        # Common selectors for job descriptions
        selectors = [
            ('div', {'class': re.compile(r'description|job.*desc|about.*role|overview', re.I)}),
            ('section', {'class': re.compile(r'description|job.*desc|about.*role', re.I)}),
            ('div', {'id': re.compile(r'description|job.*desc', re.I)}),
        ]
        
        for tag_name, attrs in selectors:
            element = soup.find(tag_name, attrs)
            if element:
                # Get text but preserve some structure
                description = JobDataExtractor.clean_text(element.get_text())
                if description and len(description) > 50:
                    logger.debug(f"Extracted description ({len(description)} chars)")
                    return description
        
        logger.debug("Could not extract detailed description")
        return None
    
    @staticmethod
    def extract_requirements(soup: BeautifulSoup) -> Optional[str]:
        """
        Extract job requirements from HTML.
        
        Args:
            soup: BeautifulSoup object of the page
            
        Returns:
            str: Job requirements or None
        """
        # Common selectors for requirements
        selectors = [
            ('div', {'class': re.compile(r'requirements|qualifications|skills|must.*have', re.I)}),
            ('section', {'class': re.compile(r'requirements|qualifications|skills', re.I)}),
            ('div', {'id': re.compile(r'requirements|qualifications', re.I)}),
            ('ul', {'class': re.compile(r'requirements|qualifications', re.I)}),
        ]
        
        for tag_name, attrs in selectors:
            element = soup.find(tag_name, attrs)
            if element:
                requirements = JobDataExtractor.clean_text(element.get_text())
                if requirements and len(requirements) > 20:
                    logger.debug(f"Extracted requirements ({len(requirements)} chars)")
                    return requirements
        
        logger.debug("Could not extract requirements")
        return None
    
    @staticmethod
    def extract_application_url(soup: BeautifulSoup, base_url: str) -> Optional[str]:
        """
        Extract application URL from HTML.
        
        Args:
            soup: BeautifulSoup object of the page
            base_url: Base URL for resolving relative URLs
            
        Returns:
            str: Application URL or None
        """
        # Look for apply buttons/links
        apply_patterns = [
            re.compile(r'apply', re.I),
            re.compile(r'submit.*application', re.I),
        ]
        
        for pattern in apply_patterns:
            # Check links
            link = soup.find('a', {'class': pattern})
            if not link:
                link = soup.find('a', text=pattern)
            
            if link and link.get('href'):
                url = link['href']
                # Handle relative URLs
                if url.startswith('/'):
                    from urllib.parse import urljoin
                    url = urljoin(base_url, url)
                logger.debug(f"Extracted application URL: {url}")
                return url
            
            # Check buttons that might have data attributes
            button = soup.find('button', {'class': pattern})
            if button:
                url = button.get('data-url') or button.get('data-href')
                if url:
                    if url.startswith('/'):
                        from urllib.parse import urljoin
                        url = urljoin(base_url, url)
                    logger.debug(f"Extracted application URL from button: {url}")
                    return url
        
        logger.debug("Could not extract application URL")
        return None
    
    @staticmethod
    def extract_job_links(soup: BeautifulSoup, base_url: str) -> List[str]:
        """
        Extract all job posting links from a career page.
        
        Args:
            soup: BeautifulSoup object of the career page
            base_url: Base URL for resolving relative URLs
            
        Returns:
            List of job posting URLs
        """
        from urllib.parse import urljoin
        
        job_links = []
        
        # Common patterns for job listing links
        patterns = [
            ('a', {'class': re.compile(r'job.*link|position.*link|posting', re.I)}),
            ('a', {'href': re.compile(r'/job/|/jobs/|/position/|/careers/|/posting/', re.I)}),
        ]
        
        for tag_name, attrs in patterns:
            links = soup.find_all(tag_name, attrs)
            for link in links:
                href = link.get('href')
                if href:
                    # Skip anchor links
                    if href.startswith('#'):
                        continue
                    
                    # Handle relative URLs
                    if href.startswith('/'):
                        href = urljoin(base_url, href)
                    elif not href.startswith('http'):
                        href = urljoin(base_url, href)
                    
                    if href not in job_links:
                        job_links.append(href)
        
        logger.info(f"Extracted {len(job_links)} job links from {base_url}")
        return job_links
    
    @staticmethod
    def extract_posted_date(soup: BeautifulSoup, text_content: str = None) -> Optional[datetime]:
        """
        Extract job posted date from HTML.
        
        Args:
            soup: BeautifulSoup object of the page
            text_content: Optional raw text to search
            
        Returns:
            datetime: Posted date or None
        """
        # Look for time elements
        time_element = soup.find('time')
        if time_element:
            datetime_attr = time_element.get('datetime')
            if datetime_attr:
                try:
                    return datetime.fromisoformat(datetime_attr.replace('Z', '+00:00'))
                except:
                    pass
        
        # Look for common date patterns in text
        if text_content:
            date_patterns = [
                r'Posted:\s*(\d{4}-\d{2}-\d{2})',
                r'Posted on:\s*(\d{4}-\d{2}-\d{2})',
                r'Date Posted:\s*(\d{4}-\d{2}-\d{2})',
            ]
            
            for pattern in date_patterns:
                match = re.search(pattern, text_content)
                if match:
                    try:
                        return datetime.strptime(match.group(1), '%Y-%m-%d')
                    except:
                        pass
        
        logger.debug("Could not extract posted date")
        return None


