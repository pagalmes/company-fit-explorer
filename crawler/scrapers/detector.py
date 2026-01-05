"""
ATS (Applicant Tracking System) detection module.

Analyzes URLs and page structure to identify the ATS platform
and route to the appropriate parser.
"""
import re
import logging
from typing import Optional, Tuple
from bs4 import BeautifulSoup
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class ATSDetector:
    """
    Detects which ATS platform is being used on a career page.
    """
    
    # ATS type constants
    ATS_GREENHOUSE = "greenhouse"
    ATS_LEVER = "lever"
    ATS_WORKDAY = "workday"
    ATS_JOBVITE = "jobvite"
    ATS_ASHBY = "ashby"
    ATS_BAMBOOHR = "bamboohr"
    ATS_GENERIC = "generic"
    
    def __init__(self):
        """Initialize the ATS detector."""
        self.ats_patterns = {
            self.ATS_GREENHOUSE: {
                'url_patterns': [
                    re.compile(r'greenhouse\.io', re.I),
                    re.compile(r'boards\.greenhouse\.io', re.I),
                ],
                'meta_patterns': [
                    ('meta', {'name': 'generator', 'content': re.compile(r'greenhouse', re.I)}),
                ],
                'script_patterns': [
                    re.compile(r'greenhouse', re.I),
                ],
            },
            self.ATS_LEVER: {
                'url_patterns': [
                    re.compile(r'lever\.co', re.I),
                    re.compile(r'jobs\.lever\.co', re.I),
                ],
                'meta_patterns': [
                    ('meta', {'name': 'generator', 'content': re.compile(r'lever', re.I)}),
                ],
                'script_patterns': [
                    re.compile(r'lever', re.I),
                ],
            },
            self.ATS_WORKDAY: {
                'url_patterns': [
                    re.compile(r'myworkdayjobs\.com', re.I),
                    re.compile(r'workday\.com', re.I),
                ],
                'meta_patterns': [],
                'script_patterns': [
                    re.compile(r'workday', re.I),
                ],
            },
            self.ATS_JOBVITE: {
                'url_patterns': [
                    re.compile(r'jobvite\.com', re.I),
                    re.compile(r'jobs\.jobvite\.com', re.I),
                ],
                'meta_patterns': [],
                'script_patterns': [
                    re.compile(r'jobvite', re.I),
                ],
            },
            self.ATS_ASHBY: {
                'url_patterns': [
                    re.compile(r'ashbyhq\.com', re.I),
                    re.compile(r'jobs\.ashbyhq\.com', re.I),
                ],
                'meta_patterns': [],
                'script_patterns': [
                    re.compile(r'ashby', re.I),
                ],
            },
            self.ATS_BAMBOOHR: {
                'url_patterns': [
                    re.compile(r'bamboohr\.com', re.I),
                ],
                'meta_patterns': [],
                'script_patterns': [
                    re.compile(r'bamboohr', re.I),
                ],
            },
        }
    
    def detect_from_url(self, url: str) -> Optional[str]:
        """
        Detect ATS type from URL patterns.
        
        Args:
            url: URL to analyze
            
        Returns:
            str: ATS type or None if not detected
        """
        for ats_type, patterns in self.ats_patterns.items():
            for pattern in patterns['url_patterns']:
                if pattern.search(url):
                    logger.info(f"Detected {ats_type} from URL: {url}")
                    return ats_type
        
        return None
    
    def detect_from_html(self, soup: BeautifulSoup) -> Optional[str]:
        """
        Detect ATS type from HTML content.
        
        Args:
            soup: BeautifulSoup object of the page
            
        Returns:
            str: ATS type or None if not detected
        """
        # Check meta tags
        for ats_type, patterns in self.ats_patterns.items():
            for tag_name, attrs in patterns['meta_patterns']:
                if soup.find(tag_name, attrs):
                    logger.info(f"Detected {ats_type} from meta tags")
                    return ats_type
        
        # Check script tags
        scripts = soup.find_all('script')
        for script in scripts:
            script_content = script.string or ''
            for ats_type, patterns in self.ats_patterns.items():
                for pattern in patterns['script_patterns']:
                    if pattern.search(script_content):
                        logger.info(f"Detected {ats_type} from script content")
                        return ats_type
        
        # Check for specific HTML structure patterns
        # Greenhouse often has specific class names
        if soup.find(class_=re.compile(r'greenhouse', re.I)):
            logger.info("Detected greenhouse from CSS class")
            return self.ATS_GREENHOUSE
        
        # Lever has specific patterns
        if soup.find(class_=re.compile(r'lever', re.I)):
            logger.info("Detected lever from CSS class")
            return self.ATS_LEVER
        
        return None
    
    def detect(self, url: str, html: str = None) -> Tuple[str, float]:
        """
        Detect ATS type with confidence score.
        
        Args:
            url: URL to analyze
            html: Optional HTML content to analyze
            
        Returns:
            Tuple of (ats_type, confidence) where confidence is 0.0-1.0
        """
        # First try URL detection (highest confidence)
        ats_from_url = self.detect_from_url(url)
        if ats_from_url:
            return (ats_from_url, 1.0)
        
        # If we have HTML, try HTML detection
        if html:
            soup = BeautifulSoup(html, 'lxml')
            ats_from_html = self.detect_from_html(soup)
            if ats_from_html:
                return (ats_from_html, 0.8)
        
        # Default to generic scraper
        logger.info(f"No specific ATS detected for {url}, using generic scraper")
        return (self.ATS_GENERIC, 0.5)
    
    def get_parser_for_ats(self, ats_type: str):
        """
        Get the appropriate parser class for an ATS type.
        
        Args:
            ats_type: Detected ATS type
            
        Returns:
            Parser class for the ATS type
        """
        # Import here to avoid circular dependencies
        from .parsers.generic import GenericParser
        
        # Map ATS types to parser classes
        parser_map = {
            self.ATS_GENERIC: GenericParser,
            # For now, all ATS types use the generic parser
            # In the future, add specific parsers:
            # self.ATS_GREENHOUSE: GreenhouseParser,
            # self.ATS_LEVER: LeverParser,
        }
        
        # Default to generic parser for ATS types without specific parsers
        parser_class = parser_map.get(ats_type, GenericParser)
        
        logger.debug(f"Using parser {parser_class.__name__} for ATS type {ats_type}")
        return parser_class


# Global detector instance
ats_detector = ATSDetector()


