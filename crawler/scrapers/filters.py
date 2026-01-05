"""
Job filtering utilities for targeting specific job types.
"""
import re
import logging
from typing import List, Optional, Dict

logger = logging.getLogger(__name__)


class JobFilter:
    """
    Filter jobs based on keywords, titles, and requirements.
    
    This allows you to only store jobs that match your criteria,
    saving database space and making searches more relevant.
    """
    
    def __init__(
        self,
        keywords: Optional[List[str]] = None,
        required_keywords: Optional[List[str]] = None,
        excluded_keywords: Optional[List[str]] = None,
        title_keywords: Optional[List[str]] = None,
        min_keyword_matches: int = 1,
    ):
        """
        Initialize job filter.
        
        Args:
            keywords: Optional keywords to search for (any match)
            required_keywords: Keywords that MUST be present
            excluded_keywords: Keywords that exclude the job if present
            title_keywords: Keywords to specifically search in title
            min_keyword_matches: Minimum number of keyword matches required
        """
        self.keywords = [k.lower() for k in (keywords or [])]
        self.required_keywords = [k.lower() for k in (required_keywords or [])]
        self.excluded_keywords = [k.lower() for k in (excluded_keywords or [])]
        self.title_keywords = [k.lower() for k in (title_keywords or [])]
        self.min_keyword_matches = min_keyword_matches
        
        # Compile regex patterns for efficiency
        self.keyword_patterns = [
            re.compile(r'\b' + re.escape(k) + r'\b', re.IGNORECASE)
            for k in self.keywords
        ]
        self.required_patterns = [
            re.compile(r'\b' + re.escape(k) + r'\b', re.IGNORECASE)
            for k in self.required_keywords
        ]
        self.excluded_patterns = [
            re.compile(r'\b' + re.escape(k) + r'\b', re.IGNORECASE)
            for k in self.excluded_keywords
        ]
        self.title_patterns = [
            re.compile(r'\b' + re.escape(k) + r'\b', re.IGNORECASE)
            for k in self.title_keywords
        ]
    
    def matches(self, job_data: Dict) -> bool:
        """
        Check if a job matches the filter criteria.
        
        Args:
            job_data: Dictionary with job information
            
        Returns:
            bool: True if job matches criteria, False otherwise
        """
        # Combine all text fields for searching (handle None values)
        text_to_search = " ".join([
            job_data.get('title') or '',
            job_data.get('description') or '',
            job_data.get('requirements') or '',
            job_data.get('location') or '',
        ]).lower()
        
        # Check excluded keywords first (fast rejection)
        if self.excluded_patterns:
            for pattern in self.excluded_patterns:
                if pattern.search(text_to_search):
                    logger.debug(f"Job excluded due to keyword: {pattern.pattern}")
                    return False
        
        # Check required keywords
        if self.required_patterns:
            for pattern in self.required_patterns:
                if not pattern.search(text_to_search):
                    logger.debug(f"Job missing required keyword: {pattern.pattern}")
                    return False
        
        # Check title-specific keywords
        if self.title_patterns:
            title = job_data.get('title', '').lower()
            title_match = any(pattern.search(title) for pattern in self.title_patterns)
            if not title_match:
                logger.debug(f"Job title doesn't match required keywords")
                return False
        
        # Check general keywords (need minimum matches)
        if self.keyword_patterns:
            matches = sum(
                1 for pattern in self.keyword_patterns
                if pattern.search(text_to_search)
            )
            if matches < self.min_keyword_matches:
                logger.debug(
                    f"Job has {matches} keyword matches, "
                    f"need {self.min_keyword_matches}"
                )
                return False
        
        logger.debug(f"Job matches filter: {job_data.get('title')}")
        return True
    
    def get_matched_keywords(self, job_data: Dict) -> List[str]:
        """
        Get list of keywords that matched in the job.
        
        Args:
            job_data: Dictionary with job information
            
        Returns:
            List of matched keywords
        """
        text_to_search = " ".join([
            job_data.get('title', ''),
            job_data.get('description', ''),
            job_data.get('requirements', ''),
        ]).lower()
        
        matched = []
        for i, pattern in enumerate(self.keyword_patterns):
            if pattern.search(text_to_search):
                matched.append(self.keywords[i])
        
        for i, pattern in enumerate(self.required_patterns):
            if pattern.search(text_to_search):
                matched.append(self.required_keywords[i])
        
        return list(set(matched))  # Remove duplicates


# Predefined filters for common job searches
PREDEFINED_FILTERS = {
    "security": JobFilter(
        keywords=[
            "security", "infosec", "cybersecurity", "appsec", 
            "application security", "security engineer", "penetration testing",
            "vulnerability", "threat", "security analyst"
        ],
        title_keywords=["security"],
        min_keyword_matches=1
    ),
    
    "backend": JobFilter(
        keywords=[
            "backend", "api", "server", "microservices", "database",
            "python", "java", "go", "node.js", "rest", "graphql"
        ],
        title_keywords=["backend", "server", "api"],
        excluded_keywords=["frontend", "mobile", "ios", "android"],
        min_keyword_matches=1
    ),
    
    "frontend": JobFilter(
        keywords=[
            "frontend", "react", "vue", "angular", "javascript", "typescript",
            "css", "html", "ui", "ux", "web"
        ],
        title_keywords=["frontend", "ui", "ux", "web"],
        excluded_keywords=["backend"],
        min_keyword_matches=1
    ),
    
    "devops": JobFilter(
        keywords=[
            "devops", "sre", "kubernetes", "docker", "aws", "gcp", "azure",
            "terraform", "ansible", "ci/cd", "jenkins", "infrastructure"
        ],
        title_keywords=["devops", "sre", "infrastructure", "platform"],
        min_keyword_matches=1
    ),
    
    "ml": JobFilter(
        keywords=[
            "machine learning", "ml", "ai", "artificial intelligence",
            "deep learning", "pytorch", "tensorflow", "data science",
            "nlp", "computer vision", "models"
        ],
        title_keywords=["ml", "machine learning", "ai", "data science"],
        min_keyword_matches=1
    ),
    
    "senior": JobFilter(
        title_keywords=["senior", "lead", "principal", "staff"],
        excluded_keywords=["junior", "intern", "entry"],
        min_keyword_matches=1
    ),
    
    "remote": JobFilter(
        keywords=["remote", "work from home", "distributed", "anywhere"],
        min_keyword_matches=1
    ),
}


def get_filter(filter_name: str) -> Optional[JobFilter]:
    """
    Get a predefined filter by name.
    
    Args:
        filter_name: Name of the predefined filter
        
    Returns:
        JobFilter instance or None if not found
    """
    return PREDEFINED_FILTERS.get(filter_name.lower())

