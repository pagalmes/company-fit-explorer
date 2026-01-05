"""
Database schema and models for the career crawler.
"""
import asyncio
import asyncpg
from config.settings import DATABASE_CONFIG
import logging

logger = logging.getLogger(__name__)


# SQL Schema Definitions
CREATE_COMPANIES_TABLE = """
CREATE TABLE IF NOT EXISTS companies (
    company_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    career_page_url TEXT NOT NULL UNIQUE,
    ats_type VARCHAR(50),
    last_crawled TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_JOBS_TABLE = """
CREATE TABLE IF NOT EXISTS jobs (
    job_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    requirements TEXT,
    location VARCHAR(255),
    application_url TEXT,
    posted_date TIMESTAMP,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_job_per_company UNIQUE(company_id, title, location)
);
"""

CREATE_CRAWL_LOGS_TABLE = """
CREATE TABLE IF NOT EXISTS crawl_logs (
    log_id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    response_time_ms INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

# Job cache with 24-hour TTL for optimized lookups
CREATE_JOB_CACHE_TABLE = """
CREATE TABLE IF NOT EXISTS job_cache (
    company_id INTEGER PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE,
    jobs JSONB NOT NULL DEFAULT '[]',
    job_count INTEGER NOT NULL DEFAULT 0,
    crawled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    ats_type VARCHAR(50),
    crawl_duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

# User subscriptions - links Supabase user_id to companies they're watching
CREATE_COMPANY_SUBSCRIPTIONS_TABLE = """
CREATE TABLE IF NOT EXISTS company_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notify_new_jobs BOOLEAN DEFAULT TRUE,
    last_notified_at TIMESTAMP,
    UNIQUE(user_id, company_id)
);
"""

# Indexes for better query performance
CREATE_JOBS_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scraped_at ON jobs(scraped_at);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_title_search ON jobs USING gin(to_tsvector('english', title));
"""

CREATE_CRAWL_LOGS_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_crawl_logs_timestamp ON crawl_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_status ON crawl_logs(status);
"""

CREATE_JOB_CACHE_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_job_cache_expires ON job_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_job_cache_crawled ON job_cache(crawled_at);
"""

CREATE_SUBSCRIPTIONS_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON company_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON company_subscriptions(company_id);
"""


async def init_database():
    """
    Initialize the database by creating all necessary tables and indexes.
    
    This function should be called once during application setup.
    """
    try:
        # Connect to database
        conn = await asyncpg.connect(
            host=DATABASE_CONFIG["host"],
            port=DATABASE_CONFIG["port"],
            database=DATABASE_CONFIG["database"],
            user=DATABASE_CONFIG["user"],
            password=DATABASE_CONFIG["password"],
        )
        
        logger.info("Connected to database, creating tables...")
        
        # Create tables
        await conn.execute(CREATE_COMPANIES_TABLE)
        logger.info("Created companies table")
        
        await conn.execute(CREATE_JOBS_TABLE)
        logger.info("Created jobs table")
        
        await conn.execute(CREATE_CRAWL_LOGS_TABLE)
        logger.info("Created crawl_logs table")
        
        await conn.execute(CREATE_JOB_CACHE_TABLE)
        logger.info("Created job_cache table")
        
        await conn.execute(CREATE_COMPANY_SUBSCRIPTIONS_TABLE)
        logger.info("Created company_subscriptions table")
        
        # Create indexes
        await conn.execute(CREATE_JOBS_INDEXES)
        logger.info("Created jobs indexes")
        
        await conn.execute(CREATE_CRAWL_LOGS_INDEXES)
        logger.info("Created crawl_logs indexes")
        
        await conn.execute(CREATE_JOB_CACHE_INDEXES)
        logger.info("Created job_cache indexes")
        
        await conn.execute(CREATE_SUBSCRIPTIONS_INDEXES)
        logger.info("Created subscriptions indexes")
        
        await conn.close()
        logger.info("Database initialization complete")
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise


if __name__ == "__main__":
    # Allow running this module directly to initialize the database
    logging.basicConfig(level=logging.INFO)
    asyncio.run(init_database())


