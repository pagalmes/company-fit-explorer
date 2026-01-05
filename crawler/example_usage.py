"""
Example usage of the career crawler.

This script demonstrates how to use the crawler with real examples.
"""
import asyncio
from main import CareerCrawler


async def example_single_company():
    """
    Example: Crawl a single company's career page.
    """
    print("Example 1: Crawling a single company\n")
    
    companies = [
        {
            "name": "OpenAI",
            "career_url": "https://openai.com/careers"
        }
    ]
    
    crawler = CareerCrawler()
    results = await crawler.crawl(companies)
    
    for result in results:
        print(f"Company: {result['company_name']}")
        print(f"Jobs found: {result.get('jobs_found', 0)}")
        print(f"Jobs inserted: {result.get('jobs_inserted', 0)}")
        print()


async def example_multiple_companies():
    """
    Example: Crawl multiple companies concurrently.
    """
    print("Example 2: Crawling multiple companies\n")
    
    companies = [
        {
            "name": "Anthropic",
            "career_url": "https://www.anthropic.com/careers"
        },
        {
            "name": "Scale AI",
            "career_url": "https://scale.com/careers"
        },
        {
            "name": "Mistral AI",
            "career_url": "https://mistral.ai/careers"
        }
    ]
    
    crawler = CareerCrawler()
    results = await crawler.crawl(companies)
    
    # Print summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    total_jobs = sum(r.get('jobs_inserted', 0) for r in results)
    successful = sum(1 for r in results if r.get('success'))
    
    print(f"Companies crawled: {successful}/{len(companies)}")
    print(f"Total jobs found: {total_jobs}")
    print()
    
    for result in results:
        status = "✓" if result.get('success') else "✗"
        print(f"{status} {result['company_name']}: {result.get('jobs_inserted', 0)} jobs")


async def example_with_database_query():
    """
    Example: Crawl companies and then query the database for results.
    """
    print("Example 3: Crawl and query database\n")
    
    from database.connection import db_pool
    from database.operations import get_company_by_url, get_jobs_by_company
    
    companies = [
        {
            "name": "Example Tech Company",
            "career_url": "https://example.com/careers"
        }
    ]
    
    # Crawl
    crawler = CareerCrawler()
    await crawler.initialize()
    
    try:
        results = await crawler.crawl_companies(companies)
        
        # Query the database
        for company_info in companies:
            company = await get_company_by_url(company_info['career_url'])
            if company:
                jobs = await get_jobs_by_company(company['company_id'])
                print(f"\n{company['name']}:")
                print(f"  ATS Type: {company.get('ats_type', 'Unknown')}")
                print(f"  Last Crawled: {company.get('last_crawled', 'Never')}")
                print(f"  Active Jobs: {len(jobs)}")
                
                # Print first 3 jobs as sample
                for i, job in enumerate(jobs[:3], 1):
                    print(f"\n  Job {i}:")
                    print(f"    Title: {job['title']}")
                    print(f"    Location: {job.get('location', 'Not specified')}")
                    print(f"    URL: {job.get('application_url', 'N/A')}")
    
    finally:
        await crawler.shutdown()


async def example_custom_crawler():
    """
    Example: Use the crawler with custom settings.
    """
    print("Example 4: Custom crawler configuration\n")
    
    # Create crawler with custom settings
    crawler = CareerCrawler()
    crawler.max_concurrent_tasks = 5  # Adjust concurrency
    
    companies = [
        {"name": "Company A", "career_url": "https://companya.com/careers"},
        {"name": "Company B", "career_url": "https://companyb.com/jobs"},
        {"name": "Company C", "career_url": "https://companyc.com/careers"},
    ]
    
    await crawler.initialize()
    
    try:
        # Crawl companies one by one with custom logic
        for company in companies:
            print(f"Crawling {company['name']}...")
            result = await crawler.crawl_company(company['name'], company['career_url'])
            
            # Add custom handling based on results
            if result['success']:
                print(f"  ✓ Success: {result['jobs_inserted']} jobs")
            else:
                print(f"  ✗ Failed: {result.get('errors', [])}")
            
            # Add custom delay between companies if needed
            await asyncio.sleep(5)
    
    finally:
        await crawler.shutdown()


def main():
    """
    Main function to run examples.
    """
    print("="*80)
    print("Career Crawler - Example Usage")
    print("="*80)
    print()
    print("Choose an example to run:")
    print("1. Single company crawl")
    print("2. Multiple companies crawl")
    print("3. Crawl and query database")
    print("4. Custom crawler configuration")
    print()
    
    choice = input("Enter choice (1-4) or 'all' to run all examples: ").strip()
    
    if choice == '1':
        asyncio.run(example_single_company())
    elif choice == '2':
        asyncio.run(example_multiple_companies())
    elif choice == '3':
        asyncio.run(example_with_database_query())
    elif choice == '4':
        asyncio.run(example_custom_crawler())
    elif choice.lower() == 'all':
        print("\nRunning all examples...\n")
        asyncio.run(example_single_company())
        asyncio.run(example_multiple_companies())
        asyncio.run(example_with_database_query())
        asyncio.run(example_custom_crawler())
    else:
        print("Invalid choice. Please run again and select 1-4 or 'all'.")


if __name__ == "__main__":
    main()


