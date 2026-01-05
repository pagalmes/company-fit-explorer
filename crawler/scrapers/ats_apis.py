"""
Direct API integrations for major Applicant Tracking Systems.

These APIs return structured job data without HTML scraping,
reducing crawl time from 30-60 seconds to 2-5 seconds per company.

Supported ATS platforms:
- Greenhouse (boards-api.greenhouse.io)
- Lever (api.lever.co)
- Ashby (api.ashbyhq.com)
- Workable (apply.workable.com)
"""

import asyncio
import logging
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)


@dataclass
class Job:
    """Standardized job data structure."""
    title: str
    location: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    application_url: Optional[str] = None
    posted_date: Optional[datetime] = None
    department: Optional[str] = None
    employment_type: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            "title": self.title,
            "location": self.location,
            "description": self.description,
            "requirements": self.requirements,
            "application_url": self.application_url,
            "posted_date": self.posted_date.isoformat() if self.posted_date else None,
            "department": self.department,
            "employment_type": self.employment_type,
        }


class ATSApiClient(ABC):
    """Base class for ATS API clients."""
    
    name: str = "base"
    
    def __init__(self, timeout: float = 30.0):
        self.timeout = timeout
        
    @abstractmethod
    def matches_url(self, career_url: str) -> bool:
        """Check if this API client can handle the given career URL."""
        pass
    
    @abstractmethod
    def extract_company_slug(self, career_url: str) -> Optional[str]:
        """Extract the company identifier from the career URL."""
        pass
    
    @abstractmethod
    async def fetch_jobs(self, company_slug: str) -> List[Job]:
        """Fetch all jobs for a company via API."""
        pass
    
    async def get_jobs(self, career_url: str) -> Tuple[List[Job], float]:
        """
        Get jobs for a company from their career URL.
        
        Returns:
            Tuple of (jobs list, duration in seconds)
        """
        start = datetime.now()
        
        slug = self.extract_company_slug(career_url)
        if not slug:
            logger.warning(f"Could not extract company slug from {career_url}")
            return [], 0.0
            
        jobs = await self.fetch_jobs(slug)
        
        duration = (datetime.now() - start).total_seconds()
        logger.info(f"{self.name}: Fetched {len(jobs)} jobs for {slug} in {duration:.2f}s")
        
        return jobs, duration


class GreenhouseAPI(ATSApiClient):
    """
    Greenhouse ATS API client.
    
    API endpoint: https://boards-api.greenhouse.io/v1/boards/{company}/jobs
    """
    
    name = "greenhouse"
    API_BASE = "https://boards-api.greenhouse.io/v1/boards"
    
    def matches_url(self, career_url: str) -> bool:
        patterns = [
            r"greenhouse\.io",
            r"boards\.greenhouse\.io",
        ]
        return any(re.search(p, career_url, re.I) for p in patterns)
    
    def extract_company_slug(self, career_url: str) -> Optional[str]:
        # Pattern: boards.greenhouse.io/companyname
        # Or: job-boards.greenhouse.io/companyname
        patterns = [
            r"boards\.greenhouse\.io/([^/?#]+)",
            r"job-boards\.greenhouse\.io/([^/?#]+)",
            r"greenhouse\.io/([^/?#]+)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, career_url, re.I)
            if match:
                return match.group(1).lower()
        return None
    
    async def fetch_jobs(self, company_slug: str) -> List[Job]:
        url = f"{self.API_BASE}/{company_slug}/jobs"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                
                jobs = []
                for job_data in data.get("jobs", []):
                    jobs.append(Job(
                        title=job_data.get("title", ""),
                        location=job_data.get("location", {}).get("name"),
                        application_url=job_data.get("absolute_url"),
                        posted_date=self._parse_date(job_data.get("updated_at")),
                        department=self._get_department(job_data),
                    ))
                
                return jobs
                
            except httpx.HTTPError as e:
                logger.error(f"Greenhouse API error for {company_slug}: {e}")
                return []
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None
    
    def _get_department(self, job_data: Dict) -> Optional[str]:
        departments = job_data.get("departments", [])
        if departments:
            return departments[0].get("name")
        return None


class LeverAPI(ATSApiClient):
    """
    Lever ATS API client.
    
    API endpoint: https://api.lever.co/v0/postings/{company}
    """
    
    name = "lever"
    API_BASE = "https://api.lever.co/v0/postings"
    
    def matches_url(self, career_url: str) -> bool:
        patterns = [
            r"lever\.co",
            r"jobs\.lever\.co",
        ]
        return any(re.search(p, career_url, re.I) for p in patterns)
    
    def extract_company_slug(self, career_url: str) -> Optional[str]:
        # Pattern: jobs.lever.co/companyname
        patterns = [
            r"jobs\.lever\.co/([^/?#]+)",
            r"lever\.co/([^/?#]+)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, career_url, re.I)
            if match:
                return match.group(1).lower()
        return None
    
    async def fetch_jobs(self, company_slug: str) -> List[Job]:
        url = f"{self.API_BASE}/{company_slug}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                
                jobs = []
                for job_data in data:
                    location_parts = []
                    if job_data.get("categories", {}).get("location"):
                        location_parts.append(job_data["categories"]["location"])
                    if job_data.get("workplaceType"):
                        location_parts.append(job_data["workplaceType"])
                    
                    jobs.append(Job(
                        title=job_data.get("text", ""),
                        location=" - ".join(location_parts) if location_parts else None,
                        description=job_data.get("descriptionPlain"),
                        application_url=job_data.get("applyUrl") or job_data.get("hostedUrl"),
                        posted_date=self._parse_timestamp(job_data.get("createdAt")),
                        department=job_data.get("categories", {}).get("team"),
                        employment_type=job_data.get("categories", {}).get("commitment"),
                    ))
                
                return jobs
                
            except httpx.HTTPError as e:
                logger.error(f"Lever API error for {company_slug}: {e}")
                return []
    
    def _parse_timestamp(self, timestamp: Optional[int]) -> Optional[datetime]:
        if not timestamp:
            return None
        try:
            return datetime.fromtimestamp(timestamp / 1000)
        except (ValueError, OSError):
            return None


class AshbyAPI(ATSApiClient):
    """
    Ashby ATS API client.
    
    API endpoint: https://api.ashbyhq.com/posting-api/job-board/{company}
    """
    
    name = "ashby"
    API_BASE = "https://api.ashbyhq.com/posting-api/job-board"
    
    def matches_url(self, career_url: str) -> bool:
        patterns = [
            r"ashbyhq\.com",
            r"jobs\.ashbyhq\.com",
        ]
        return any(re.search(p, career_url, re.I) for p in patterns)
    
    def extract_company_slug(self, career_url: str) -> Optional[str]:
        # Pattern: jobs.ashbyhq.com/companyname
        patterns = [
            r"jobs\.ashbyhq\.com/([^/?#]+)",
            r"ashbyhq\.com/([^/?#]+)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, career_url, re.I)
            if match:
                return match.group(1).lower()
        return None
    
    async def fetch_jobs(self, company_slug: str) -> List[Job]:
        url = f"{self.API_BASE}/{company_slug}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                
                jobs = []
                for job_data in data.get("jobs", []):
                    jobs.append(Job(
                        title=job_data.get("title", ""),
                        location=job_data.get("location"),
                        description=job_data.get("descriptionHtml"),
                        application_url=job_data.get("applicationUrl") or job_data.get("jobUrl"),
                        posted_date=self._parse_date(job_data.get("publishedDate")),
                        department=job_data.get("department"),
                        employment_type=job_data.get("employmentType"),
                    ))
                
                return jobs
                
            except httpx.HTTPError as e:
                logger.error(f"Ashby API error for {company_slug}: {e}")
                return []
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None


class WorkableAPI(ATSApiClient):
    """
    Workable ATS API client.
    
    API endpoint: https://apply.workable.com/api/v1/widget/accounts/{company}
    """
    
    name = "workable"
    API_BASE = "https://apply.workable.com/api/v1/widget/accounts"
    
    def matches_url(self, career_url: str) -> bool:
        return "workable.com" in career_url.lower()
    
    def extract_company_slug(self, career_url: str) -> Optional[str]:
        # Pattern: apply.workable.com/companyname
        patterns = [
            r"apply\.workable\.com/([^/?#]+)",
            r"workable\.com/([^/?#]+)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, career_url, re.I)
            if match:
                slug = match.group(1).lower()
                if slug not in ["api", "v1", "widget"]:
                    return slug
        return None
    
    async def fetch_jobs(self, company_slug: str) -> List[Job]:
        url = f"{self.API_BASE}/{company_slug}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                
                jobs = []
                for job_data in data.get("jobs", []):
                    jobs.append(Job(
                        title=job_data.get("title", ""),
                        location=job_data.get("location", {}).get("city"),
                        application_url=job_data.get("url"),
                        department=job_data.get("department"),
                        employment_type=job_data.get("employment_type"),
                    ))
                
                return jobs
                
            except httpx.HTTPError as e:
                logger.error(f"Workable API error for {company_slug}: {e}")
                return []


# Registry of all ATS API clients
ATS_API_CLIENTS = [
    GreenhouseAPI(),
    LeverAPI(),
    AshbyAPI(),
    WorkableAPI(),
]


def get_ats_api_client(career_url: str) -> Optional[ATSApiClient]:
    """
    Get the appropriate ATS API client for a career URL.
    
    Args:
        career_url: The company's career page URL
        
    Returns:
        ATSApiClient instance if a matching API is found, None otherwise
    """
    for client in ATS_API_CLIENTS:
        if client.matches_url(career_url):
            return client
    return None


def detect_ats_type(career_url: str) -> Optional[str]:
    """
    Detect the ATS type from a career URL.
    
    Args:
        career_url: The company's career page URL
        
    Returns:
        ATS name (greenhouse, lever, ashby, workable) or None
    """
    client = get_ats_api_client(career_url)
    return client.name if client else None


async def fetch_jobs_via_api(career_url: str) -> Tuple[Optional[List[Job]], Optional[str], float]:
    """
    Attempt to fetch jobs via ATS API.
    
    Args:
        career_url: The company's career page URL
        
    Returns:
        Tuple of (jobs, ats_type, duration) or (None, None, 0) if no API available
    """
    client = get_ats_api_client(career_url)
    if not client:
        return None, None, 0.0
    
    jobs, duration = await client.get_jobs(career_url)
    return jobs, client.name, duration


# Convenience function for testing
async def test_ats_apis():
    """Test all ATS APIs with sample companies."""
    test_cases = [
        ("Anthropic (Ashby)", "https://jobs.ashbyhq.com/anthropic"),
        ("Stripe (Greenhouse)", "https://boards.greenhouse.io/stripe"),
        ("Notion (Lever)", "https://jobs.lever.co/notion"),
        ("Figma (Greenhouse)", "https://boards.greenhouse.io/figma"),
    ]
    
    print("\n" + "=" * 60)
    print("ATS API Integration Test")
    print("=" * 60)
    
    for name, url in test_cases:
        print(f"\nTesting: {name}")
        print(f"URL: {url}")
        
        jobs, ats_type, duration = await fetch_jobs_via_api(url)
        
        if jobs is not None:
            print(f"✓ ATS: {ats_type}")
            print(f"✓ Jobs found: {len(jobs)}")
            print(f"✓ Duration: {duration:.2f}s")
            if jobs:
                print(f"  Sample: {jobs[0].title}")
        else:
            print("✗ No API available, would fall back to HTML scraping")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(test_ats_apis())



