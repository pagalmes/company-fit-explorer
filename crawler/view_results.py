#!/usr/bin/env python3
"""
Simple script to view crawl results.

Usage:
    python view_results.py
"""
import requests
import sys

API_URL = "http://localhost:8000"


def view_all_jobs(limit=20):
    """View all jobs."""
    print("\n" + "="*60)
    print("ALL JOBS")
    print("="*60 + "\n")
    
    try:
        jobs = requests.get(f"{API_URL}/jobs", params={"limit": limit}).json()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to API")
        print("   Is it running? Start with: docker-compose up -d")
        sys.exit(1)
    
    if not jobs:
        print("No jobs found.")
        print("\nHave you run a crawl yet?")
        print("Try: python riot_games_crawler.py")
        return
    
    for i, job in enumerate(jobs, 1):
        print(f"{i}. {job['title']}")
        print(f"   {'─'*50}")
        print(f"   Company: {job['company_name']}")
        print(f"   Location: {job.get('location', 'Not specified')}")
        print(f"   Apply: {job['application_url']}")
        print(f"   Scraped: {job['scraped_at'][:10]}")
        print()
    
    print(f"Showing {len(jobs)} jobs (use --limit to see more)")


def view_companies():
    """View all companies."""
    print("\n" + "="*60)
    print("TRACKED COMPANIES")
    print("="*60 + "\n")
    
    companies = requests.get(f"{API_URL}/companies").json()
    
    if not companies:
        print("No companies tracked yet.")
        return
    
    for company in companies:
        print(f"• {company['name']}")
        print(f"  URL: {company['career_page_url']}")
        print(f"  Active Jobs: {company['job_count']}")
        print(f"  Last Crawled: {company.get('last_crawled', 'Never')}")
        print()


def view_stats():
    """View crawler statistics."""
    print("\n" + "="*60)
    print("CRAWLER STATISTICS")
    print("="*60 + "\n")
    
    stats = requests.get(f"{API_URL}/stats").json()
    
    print(f"Total Companies: {stats['total_companies']}")
    print(f"Active Jobs: {stats['total_active_jobs']}")
    print()
    
    crawl_stats = stats.get('crawl_stats', {})
    if crawl_stats:
        print("Crawl Stats (Last 24h):")
        print(f"  Total Crawls: {crawl_stats.get('total_crawls', 0)}")
        print(f"  Successful: {crawl_stats.get('successful_crawls', 0)}")
        print(f"  Failed: {crawl_stats.get('failed_crawls', 0)}")
        print(f"  Avg Response Time: {crawl_stats.get('avg_response_time_ms', 0):.0f}ms")


def search_jobs(keyword):
    """Search jobs by keyword."""
    print("\n" + "="*60)
    print(f"SEARCH RESULTS: '{keyword}'")
    print("="*60 + "\n")
    
    jobs = requests.get(
        f"{API_URL}/jobs",
        params={"keywords": keyword}
    ).json()
    
    if not jobs:
        print(f"No jobs found matching '{keyword}'")
        return
    
    for i, job in enumerate(jobs, 1):
        print(f"{i}. {job['title']}")
        print(f"   {job['company_name']} • {job.get('location', 'Remote')}")
        print(f"   {job['application_url']}")
        print()
    
    print(f"Found {len(jobs)} jobs")


def view_recent_crawls():
    """View recent crawl jobs."""
    print("\n" + "="*60)
    print("RECENT CRAWL JOBS")
    print("="*60 + "\n")
    
    crawls = requests.get(f"{API_URL}/crawl").json()
    
    jobs = crawls.get('jobs', [])
    if not jobs:
        print("No crawl jobs yet.")
        return
    
    for job in jobs[:10]:
        status_icon = "✓" if job['status'] == 'completed' else "⏳" if job['status'] == 'running' else "✗"
        print(f"{status_icon} {job['job_id']}")
        print(f"   Status: {job['status']}")
        print(f"   Companies: {job['companies_count']}")
        print(f"   Created: {job['created_at']}")
        print()


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="View crawler results")
    parser.add_argument('--jobs', action='store_true', help='View all jobs')
    parser.add_argument('--companies', action='store_true', help='View companies')
    parser.add_argument('--stats', action='store_true', help='View statistics')
    parser.add_argument('--crawls', action='store_true', help='View recent crawls')
    parser.add_argument('--search', help='Search jobs by keyword')
    parser.add_argument('--limit', type=int, default=20, help='Limit results')
    parser.add_argument('--all', action='store_true', help='Show everything')
    
    args = parser.parse_args()
    
    # If no args, show everything
    if not any([args.jobs, args.companies, args.stats, args.crawls, args.search]) or args.all:
        view_stats()
        view_companies()
        view_all_jobs(args.limit)
    else:
        if args.stats:
            view_stats()
        if args.companies:
            view_companies()
        if args.jobs:
            view_all_jobs(args.limit)
        if args.crawls:
            view_recent_crawls()
        if args.search:
            search_jobs(args.search)
    
    print("\n💡 Tips:")
    print("  • View in browser: http://localhost:8000/docs")
    print("  • Export to CSV: python utils.py export")
    print("  • Search: python view_results.py --search security")
    print()


if __name__ == "__main__":
    main()


