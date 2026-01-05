"""
Setup script for initializing the career crawler.

Run this script once to set up the database and verify the installation.
"""
import asyncio
import logging
import sys

from database.models import init_database
from database.connection import db_pool

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def setup():
    """
    Initialize the database and verify setup.
    """
    print("="*80)
    print("Career Crawler Setup")
    print("="*80)
    print()
    
    # Step 1: Initialize database schema
    print("Step 1: Initializing database schema...")
    try:
        await init_database()
        print("✓ Database schema created successfully")
    except Exception as e:
        print(f"✗ Error creating database schema: {e}")
        print("\nPlease ensure:")
        print("  1. PostgreSQL is running")
        print("  2. Database credentials in .env are correct")
        print("  3. Database exists (or user has permission to create it)")
        sys.exit(1)
    
    # Step 2: Test database connection
    print("\nStep 2: Testing database connection...")
    try:
        await db_pool.initialize()
        # Try a simple query
        result = await db_pool.fetchval("SELECT 1")
        if result == 1:
            print("✓ Database connection successful")
        await db_pool.close()
    except Exception as e:
        print(f"✗ Error connecting to database: {e}")
        sys.exit(1)
    
    # Step 3: Verify dependencies
    print("\nStep 3: Verifying dependencies...")
    try:
        import aiohttp
        import asyncpg
        import bs4
        import lxml
        print("✓ All required dependencies are installed")
    except ImportError as e:
        print(f"✗ Missing dependency: {e}")
        print("\nPlease run: pip install -r requirements.txt")
        sys.exit(1)
    
    print("\n" + "="*80)
    print("Setup Complete!")
    print("="*80)
    print("\nYou can now run the crawler with:")
    print("  python main.py")
    print("\nOr use it in your code:")
    print("  from main import CareerCrawler")
    print("  crawler = CareerCrawler()")
    print("  await crawler.crawl(companies)")
    print()


if __name__ == "__main__":
    asyncio.run(setup())


