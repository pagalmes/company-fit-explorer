"""
Utility functions and CLI tools for managing the crawler.

This script provides helpful utilities for database management,
stats viewing, and maintenance tasks.
"""
import asyncio
import argparse
import sys
from datetime import datetime, timedelta
from typing import Optional

from database.connection import db_pool
from database.operations import get_recent_crawl_logs, get_crawl_stats


async def view_crawl_logs(limit: int = 50):
    """
    View recent crawl logs.
    
    Args:
        limit: Number of logs to display
    """
    await db_pool.initialize()
    
    try:
        logs = await get_recent_crawl_logs(limit)
        
        print(f"\n{'='*80}")
        print(f"Recent Crawl Logs (Last {len(logs)} entries)")
        print(f"{'='*80}\n")
        
        for log in logs:
            timestamp = log['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
            status_icon = "✓" if log['status'] == 'success' else "✗"
            
            print(f"{status_icon} [{timestamp}] {log['status'].upper()}")
            print(f"   URL: {log['url']}")
            
            if log.get('response_time_ms'):
                print(f"   Response Time: {log['response_time_ms']}ms")
            
            if log.get('error_message'):
                print(f"   Error: {log['error_message']}")
            
            print()
    
    finally:
        await db_pool.close()


async def view_stats():
    """
    View crawler statistics.
    """
    await db_pool.initialize()
    
    try:
        # Get crawl stats
        stats = await get_crawl_stats()
        
        print(f"\n{'='*80}")
        print("Crawler Statistics (Last 24 Hours)")
        print(f"{'='*80}\n")
        
        total = stats.get('total_crawls', 0)
        successful = stats.get('successful_crawls', 0)
        failed = stats.get('failed_crawls', 0)
        avg_time = stats.get('avg_response_time_ms', 0)
        
        success_rate = (successful / total * 100) if total > 0 else 0
        
        print(f"Total Crawls:      {total}")
        print(f"Successful:        {successful} ({success_rate:.1f}%)")
        print(f"Failed:            {failed}")
        print(f"Avg Response Time: {avg_time:.0f}ms")
        
        # Get company and job counts
        company_count = await db_pool.fetchval("SELECT COUNT(*) FROM companies")
        job_count = await db_pool.fetchval("SELECT COUNT(*) FROM jobs WHERE is_active = true")
        
        print(f"\nCompanies Tracked: {company_count}")
        print(f"Active Jobs:       {job_count}")
        
        # Get recent companies
        recent_companies = await db_pool.fetch("""
            SELECT name, last_crawled, ats_type
            FROM companies
            ORDER BY last_crawled DESC NULLS LAST
            LIMIT 5
        """)
        
        print(f"\n{'='*80}")
        print("Recently Crawled Companies")
        print(f"{'='*80}\n")
        
        for company in recent_companies:
            last_crawled = company['last_crawled']
            if last_crawled:
                time_str = last_crawled.strftime('%Y-%m-%d %H:%M:%S')
            else:
                time_str = "Never"
            
            ats = company['ats_type'] or "Unknown"
            print(f"  {company['name']}")
            print(f"    Last Crawled: {time_str}")
            print(f"    ATS Type: {ats}\n")
    
    finally:
        await db_pool.close()


async def list_companies():
    """
    List all tracked companies.
    """
    await db_pool.initialize()
    
    try:
        companies = await db_pool.fetch("""
            SELECT 
                c.company_id,
                c.name,
                c.career_page_url,
                c.ats_type,
                c.last_crawled,
                COUNT(j.job_id) as active_jobs
            FROM companies c
            LEFT JOIN jobs j ON c.company_id = j.company_id AND j.is_active = true
            GROUP BY c.company_id
            ORDER BY c.name
        """)
        
        print(f"\n{'='*80}")
        print(f"Tracked Companies ({len(companies)} total)")
        print(f"{'='*80}\n")
        
        for company in companies:
            print(f"ID: {company['company_id']}")
            print(f"Name: {company['name']}")
            print(f"URL: {company['career_page_url']}")
            print(f"ATS: {company['ats_type'] or 'Unknown'}")
            print(f"Active Jobs: {company['active_jobs']}")
            
            if company['last_crawled']:
                print(f"Last Crawled: {company['last_crawled'].strftime('%Y-%m-%d %H:%M:%S')}")
            else:
                print("Last Crawled: Never")
            
            print()
    
    finally:
        await db_pool.close()


async def list_jobs(company_id: Optional[int] = None, limit: int = 20):
    """
    List jobs, optionally filtered by company.
    
    Args:
        company_id: Optional company ID to filter by
        limit: Maximum number of jobs to display
    """
    await db_pool.initialize()
    
    try:
        if company_id:
            query = """
                SELECT j.*, c.name as company_name
                FROM jobs j
                JOIN companies c ON j.company_id = c.company_id
                WHERE j.company_id = $1 AND j.is_active = true
                ORDER BY j.scraped_at DESC
                LIMIT $2
            """
            jobs = await db_pool.fetch(query, company_id, limit)
            title = f"Active Jobs for Company ID {company_id}"
        else:
            query = """
                SELECT j.*, c.name as company_name
                FROM jobs j
                JOIN companies c ON j.company_id = c.company_id
                WHERE j.is_active = true
                ORDER BY j.scraped_at DESC
                LIMIT $1
            """
            jobs = await db_pool.fetch(query, limit)
            title = f"Active Jobs (Last {limit})"
        
        print(f"\n{'='*80}")
        print(title)
        print(f"{'='*80}\n")
        
        for job in jobs:
            print(f"Job ID: {job['job_id']}")
            print(f"Company: {job['company_name']}")
            print(f"Title: {job['title']}")
            
            if job['location']:
                print(f"Location: {job['location']}")
            
            if job['application_url']:
                print(f"Apply: {job['application_url']}")
            
            print(f"Scraped: {job['scraped_at'].strftime('%Y-%m-%d %H:%M:%S')}")
            print()
    
    finally:
        await db_pool.close()


async def cleanup_old_logs(days: int = 30):
    """
    Clean up old crawl logs.
    
    Args:
        days: Delete logs older than this many days
    """
    await db_pool.initialize()
    
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        
        result = await db_pool.execute("""
            DELETE FROM crawl_logs
            WHERE timestamp < $1
        """, cutoff_date)
        
        print(f"\nDeleted crawl logs older than {days} days")
        print(f"Cutoff date: {cutoff_date.strftime('%Y-%m-%d')}")
        print(f"Result: {result}")
    
    finally:
        await db_pool.close()


async def export_jobs_csv(output_file: str = "jobs_export.csv"):
    """
    Export active jobs to CSV file.
    
    Args:
        output_file: Path to output CSV file
    """
    await db_pool.initialize()
    
    try:
        import csv
        
        jobs = await db_pool.fetch("""
            SELECT 
                c.name as company_name,
                j.title,
                j.location,
                j.application_url,
                j.posted_date,
                j.scraped_at
            FROM jobs j
            JOIN companies c ON j.company_id = c.company_id
            WHERE j.is_active = true
            ORDER BY c.name, j.title
        """)
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Company', 'Title', 'Location', 'Application URL', 'Posted Date', 'Scraped Date'])
            
            for job in jobs:
                writer.writerow([
                    job['company_name'],
                    job['title'],
                    job['location'] or '',
                    job['application_url'] or '',
                    job['posted_date'].strftime('%Y-%m-%d') if job['posted_date'] else '',
                    job['scraped_at'].strftime('%Y-%m-%d %H:%M:%S'),
                ])
        
        print(f"\nExported {len(jobs)} jobs to {output_file}")
    
    finally:
        await db_pool.close()


def main():
    """
    CLI interface for utility functions.
    """
    parser = argparse.ArgumentParser(
        description="Career Crawler Utilities",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Logs command
    logs_parser = subparsers.add_parser('logs', help='View recent crawl logs')
    logs_parser.add_argument('--limit', type=int, default=50, help='Number of logs to show')
    
    # Stats command
    subparsers.add_parser('stats', help='View crawler statistics')
    
    # Companies command
    subparsers.add_parser('companies', help='List all tracked companies')
    
    # Jobs command
    jobs_parser = subparsers.add_parser('jobs', help='List active jobs')
    jobs_parser.add_argument('--company-id', type=int, help='Filter by company ID')
    jobs_parser.add_argument('--limit', type=int, default=20, help='Number of jobs to show')
    
    # Cleanup command
    cleanup_parser = subparsers.add_parser('cleanup', help='Clean up old crawl logs')
    cleanup_parser.add_argument('--days', type=int, default=30, help='Delete logs older than N days')
    
    # Export command
    export_parser = subparsers.add_parser('export', help='Export jobs to CSV')
    export_parser.add_argument('--output', default='jobs_export.csv', help='Output file path')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Execute command
    if args.command == 'logs':
        asyncio.run(view_crawl_logs(args.limit))
    elif args.command == 'stats':
        asyncio.run(view_stats())
    elif args.command == 'companies':
        asyncio.run(list_companies())
    elif args.command == 'jobs':
        asyncio.run(list_jobs(args.company_id, args.limit))
    elif args.command == 'cleanup':
        asyncio.run(cleanup_old_logs(args.days))
    elif args.command == 'export':
        asyncio.run(export_jobs_csv(args.output))


if __name__ == "__main__":
    main()


