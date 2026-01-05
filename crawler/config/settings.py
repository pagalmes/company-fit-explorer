"""
Configuration settings for the web crawler.
"""
import os
from dotenv import load_dotenv

load_dotenv()


# Database Configuration
DATABASE_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "database": os.getenv("DB_NAME", "career_crawler"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
    "min_size": 5,
    "max_size": 20,
}

# HTTP Client Configuration
HTTP_CONFIG = {
    "timeout": 30,  # seconds
    "max_connections": 100,
    "max_connections_per_host": 10,
    "retry_attempts": 3,
    "retry_delay": 2,  # seconds
    "retry_backoff": 2,  # exponential backoff multiplier
}

# Rate Limiting Configuration
RATE_LIMIT_CONFIG = {
    "requests_per_minute": 20,  # per domain
    "min_delay": 2.0,  # minimum seconds between requests
    "max_delay": 5.0,  # maximum seconds between requests
}

# Crawler Configuration
CRAWLER_CONFIG = {
    "max_concurrent_tasks": 10,
    "respect_robots_txt": True,
    "follow_redirects": True,
    "max_redirects": 5,
}

# Logging Configuration
LOGGING_CONFIG = {
    "level": os.getenv("LOG_LEVEL", "INFO"),
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
}


