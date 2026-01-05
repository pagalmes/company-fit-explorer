"""
Task queue module for optimized crawling.

This module provides:
- Priority queue builder (deduplicates user subscriptions)
- Taskiq task definitions
- Worker configuration

Note: This module was renamed from 'queue' to 'task_queue' to avoid
shadowing Python's built-in 'queue' module.
"""

from .builder import QueueBuilder, CrawlPriority
from .tasks import broker, crawl_company_task

__all__ = [
    "QueueBuilder",
    "CrawlPriority",
    "broker",
    "crawl_company_task",
]

