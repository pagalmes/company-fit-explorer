#!/usr/bin/env python3
"""
Example script to crawl Riot Games for product security positions.

Usage:
    python riot_games_crawler.py
"""
import requests
import time
import sys

# Configuration
API_URL = "http://localhost:8000"


def crawl_riot_games_security():
    """Crawl Riot Games for product security positions."""
    
    print("🎮 Crawling Riot Games for Security Positions...")
    print("=" * 60)
    
    # Start the crawl
    try:
        response = requests.post(
            f"{API_URL}/crawl",
            json={
                "companies": [
                    {
                        "name": "Riot Games",
                        "career_url": "https://www.riotgames.com/en/work-with-us"
                    }
                ],
                "filter": {
                    "predefined_filter": "security"
                }
            }
        )
        response.raise_for_status()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to API. Is it running?")
        print("   Start with: docker-compose up -d")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    
    job_id = response.json()["job_id"]
    print(f"✅ Crawl started: {job_id}")
    print(f"⏳ Waiting for completion...\n")
    
    # Poll for completion
    dots = 0
    while True:
        status = requests.get(f"{API_URL}/crawl/{job_id}").json()
        
        if status["status"] == "completed":
            print(f"\n✅ Crawl completed in {status.get('duration_seconds', 0):.0f}s")
            print(f"📊 Found {status['summary']['total_jobs_found']} security positions\n")
            break
        elif status["status"] == "failed":
            print(f"\n❌ Crawl failed: {status.get('error', 'Unknown error')}")
            return None
        
        # Show progress
        print(".", end="", flush=True)
        dots += 1
        if dots % 10 == 0:
            print(f" [{dots * 2}s]", end="", flush=True)
        
        time.sleep(2)
    
    # Get the company_id
    companies = requests.get(f"{API_URL}/companies").json()
    riot_company = next((c for c in companies if "Riot" in c["name"]), None)
    
    if not riot_company:
        print("❌ Error: Riot Games not found in database")
        return None
    
    company_id = riot_company["company_id"]
    
    print(f"\n{'=' * 60}")
    print(f"🎯 Riot Games Security Positions")
    print(f"{'=' * 60}\n")
    
    # Get all security jobs for Riot Games
    jobs = requests.get(f"{API_URL}/jobs/{company_id}").json()
    
    if not jobs:
        print("No security positions found.")
        print("\nThis could mean:")
        print("  • No security positions are currently open")
        print("  • The career page structure has changed")
        print("  • The filter was too restrictive")
        print("\nTry crawling without a filter to see all jobs:")
        print('  curl -X POST http://localhost:8000/crawl -d \'{"companies":[...]}\' ')
        return None
    
    # Display jobs
    for i, job in enumerate(jobs, 1):
        print(f"\n{i}. {job['title']}")
        print(f"   {'─' * 50}")
        print(f"   📍 Location: {job.get('location', 'Not specified')}")
        print(f"   🔗 Apply: {job['application_url']}")
        
        if job.get('description'):
            desc = job['description']
            if len(desc) > 200:
                desc = desc[:200] + "..."
            # Clean up whitespace
            desc = ' '.join(desc.split())
            print(f"   📝 {desc}")
        
        if job.get('requirements'):
            req = job['requirements']
            if len(req) > 150:
                req = req[:150] + "..."
            req = ' '.join(req.split())
            print(f"   ✓  {req}")
        
        print(f"   📅 Scraped: {job['scraped_at'][:10]}")
    
    print(f"\n{'=' * 60}")
    print(f"✅ Total: {len(jobs)} security positions found!")
    print(f"{'=' * 60}\n")
    
    # Filter for "Product Security" specifically
    print("🔍 Filtering for 'Product Security' specifically...")
    product_security = [
        j for j in jobs 
        if 'product' in j['title'].lower() and 'security' in j['title'].lower()
    ]
    
    if product_security:
        print(f"\n📌 Product Security Roles ({len(product_security)}):")
        for job in product_security:
            print(f"   • {job['title']}")
            print(f"     {job['application_url']}\n")
    else:
        print("   No jobs with 'Product Security' in the title.")
        print("   But the results above include all security-related positions.\n")
    
    return jobs


def main():
    """Main function."""
    try:
        jobs = crawl_riot_games_security()
        
        if jobs:
            print("\n💡 Next steps:")
            print("   • Visit the links to apply")
            print("   • Export results: python utils.py export")
            print("   • View in browser: http://localhost:8000/docs")
            print("   • Schedule regular checks (see RIOT_GAMES_EXAMPLE.md)")
        
        print("\n✨ Done!\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()


