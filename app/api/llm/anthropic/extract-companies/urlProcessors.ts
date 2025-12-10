/**
 * URL Processors for Career/Job Links
 *
 * Handles platform-specific URL processing to:
 * 1. Filter out non-useful URLs (specific job posts)
 * 2. Convert URLs to more useful formats (company career pages)
 * 3. Clean tracking parameters
 *
 * Easy to extend with new platforms as needed.
 */

/**
 * Result of URL processing
 */
export interface ProcessedUrl {
  /** The processed URL, or null if URL should be discarded */
  url: string | null;
  /** Reason for processing decision (for debugging/logging) */
  reason: string;
}

/**
 * Base interface for platform-specific URL processors
 */
interface UrlProcessor {
  /** Check if this processor handles the given hostname */
  matches(hostname: string): boolean;
  /** Process the URL and return result */
  process(url: URL, companyName?: string): ProcessedUrl;
}

/**
 * LinkedIn URL Processor
 *
 * Patterns:
 * - Job posts: /jobs/view/[id] or /comm/jobs/view/[id] → DISCARD (too specific)
 * - Company jobs: /company/[name]/jobs → KEEP (clean params)
 * - Company page: /company/[name] → CONVERT to /company/[name]/jobs
 * - Other: DISCARD (not useful)
 */
class LinkedInProcessor implements UrlProcessor {
  matches(hostname: string): boolean {
    return hostname.includes('linkedin.com');
  }

  process(url: URL, _companyName?: string): ProcessedUrl {
    const path = url.pathname;

    // Discard specific job postings (not useful)
    if (path.includes('/jobs/view/') || path.includes('/comm/jobs/view/')) {
      return {
        url: null,
        reason: 'LinkedIn job post URL (too specific, discarded)'
      };
    }

    // Keep company career pages, clean params
    if (path.includes('/company/') && path.includes('/jobs')) {
      url.search = ''; // Remove all tracking params
      return {
        url: url.toString(),
        reason: 'LinkedIn company jobs page (cleaned)'
      };
    }

    // Convert company pages to jobs pages
    if (path.match(/^\/company\/[^\/]+\/?$/)) {
      url.pathname = path.replace(/\/$/, '') + '/jobs';
      url.search = '';
      return {
        url: url.toString(),
        reason: 'LinkedIn company page → converted to jobs page'
      };
    }

    // Other LinkedIn URLs - discard
    return {
      url: null,
      reason: 'LinkedIn URL (not a company/jobs page, discarded)'
    };
  }
}

/**
 * Indeed URL Processor
 *
 * Patterns:
 * - Job posts: /viewjob?jk=[id] → DISCARD
 * - Company pages: /cmp/[company-name] → KEEP (useful)
 * - Search results: /jobs?q=[query] → DISCARD
 */
class IndeedProcessor implements UrlProcessor {
  matches(hostname: string): boolean {
    return hostname.includes('indeed.com');
  }

  process(url: URL, _companyName?: string): ProcessedUrl {
    const path = url.pathname;

    // Discard specific job postings
    if (path.includes('/viewjob') || url.searchParams.has('jk')) {
      return {
        url: null,
        reason: 'Indeed job post URL (too specific, discarded)'
      };
    }

    // Keep company pages
    if (path.includes('/cmp/')) {
      url.search = ''; // Clean params
      return {
        url: url.toString(),
        reason: 'Indeed company page (cleaned)'
      };
    }

    // Discard search results and other URLs
    return {
      url: null,
      reason: 'Indeed URL (not a company page, discarded)'
    };
  }
}

/**
 * Welcome to the Jungle URL Processor
 *
 * Patterns:
 * - Job posts: /companies/[company]/jobs/[job-slug] → DISCARD
 * - Company pages: /companies/[company-name] → KEEP (useful)
 */
class WelcomeToTheJungleProcessor implements UrlProcessor {
  matches(hostname: string): boolean {
    return hostname.includes('welcometothejungle.com') ||
           hostname.includes('wttj.co');
  }

  process(url: URL, _companyName?: string): ProcessedUrl {
    const path = url.pathname;

    // Discard specific job postings
    if (path.match(/\/companies\/[^\/]+\/jobs\//)) {
      return {
        url: null,
        reason: 'WTTJ job post URL (too specific, discarded)'
      };
    }

    // Keep company pages
    if (path.match(/\/companies\/[^\/]+\/?$/)) {
      url.search = ''; // Clean params
      return {
        url: url.toString(),
        reason: 'WTTJ company page (cleaned)'
      };
    }

    return {
      url: null,
      reason: 'WTTJ URL (not a company page, discarded)'
    };
  }
}

/**
 * ZipRecruiter URL Processor
 *
 * Patterns:
 * - Job posts: /c/[company]/job/[id] → DISCARD
 * - Company pages: /c/[company-name] → KEEP
 */
class ZipRecruiterProcessor implements UrlProcessor {
  matches(hostname: string): boolean {
    return hostname.includes('ziprecruiter.com');
  }

  process(url: URL, _companyName?: string): ProcessedUrl {
    const path = url.pathname;

    // Discard specific job postings
    if (path.match(/\/c\/[^\/]+\/job\//)) {
      return {
        url: null,
        reason: 'ZipRecruiter job post URL (too specific, discarded)'
      };
    }

    // Keep company pages
    if (path.match(/\/c\/[^\/]+\/?$/)) {
      url.search = ''; // Clean params
      return {
        url: url.toString(),
        reason: 'ZipRecruiter company page (cleaned)'
      };
    }

    return {
      url: null,
      reason: 'ZipRecruiter URL (not a company page, discarded)'
    };
  }
}

/**
 * Generic URL Processor (fallback for unknown platforms)
 *
 * For direct company websites or unknown platforms:
 * - Keep the URL
 * - Clean common tracking parameters
 */
class GenericProcessor implements UrlProcessor {
  matches(_hostname: string): boolean {
    return true; // Matches everything (fallback)
  }

  process(url: URL, _companyName?: string): ProcessedUrl {
    // Common tracking parameters to remove
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'ref', 'source', 'trackingId', 'refId', 'lipi', 'midToken', 'trk',
      'trkEmail', 'eid', 'otpToken', 'fbclid', 'gclid', 'msclkid'
    ];

    trackingParams.forEach(param => url.searchParams.delete(param));

    return {
      url: url.toString(),
      reason: 'Generic URL (cleaned tracking params)'
    };
  }
}

/**
 * Email Tracking URL Processor
 *
 * Filters out email click-tracking wrapper URLs (SendGrid, Mailchimp, etc.)
 * These are massive redirect URLs that don't provide useful career page info
 */
class EmailTrackingProcessor implements UrlProcessor {
  matches(hostname: string): boolean {
    return hostname.includes('sendgrid.net') ||
           hostname.includes('mailchimp.com') ||
           hostname.includes('click.') ||
           hostname.match(/\.ct\./i) !== null; // Click tracking domains
  }

  process(url: URL, _companyName?: string): ProcessedUrl {
    return {
      url: null,
      reason: 'Email tracking wrapper (discarded - not useful)'
    };
  }
}

/**
 * Registry of all URL processors
 * Order matters: first match wins (except Generic which is last)
 */
const processors: UrlProcessor[] = [
  new EmailTrackingProcessor(), // Filter email tracking first
  new LinkedInProcessor(),
  new IndeedProcessor(),
  new WelcomeToTheJungleProcessor(),
  new ZipRecruiterProcessor(),
  new GenericProcessor(), // Always last (fallback)
];

/**
 * Process a career/job URL using platform-specific logic
 *
 * @param url - The URL to process
 * @param companyName - Optional company name for context
 * @returns Processed URL or null if URL should be discarded
 */
export function processCareerUrl(url: string, companyName?: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Find the first matching processor
    const processor = processors.find(p => p.matches(hostname));

    if (!processor) {
      // Should never happen due to GenericProcessor fallback
      console.warn('No processor found for URL:', url);
      return url;
    }

    const result = processor.process(urlObj, companyName);

    // Log processing decision for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`URL Processing: ${result.reason}`, {
        original: url,
        processed: result.url,
        processor: processor.constructor.name
      });
    }

    return result.url;

  } catch (error) {
    // If URL parsing fails, log and return original
    console.error('Failed to parse URL:', url, error);
    return url;
  }
}

/**
 * Batch process multiple career URLs
 *
 * @param urls - Array of URLs to process
 * @param companyName - Optional company name for context
 * @returns Array of processed URLs (nulls filtered out)
 */
export function processCareerUrls(
  urls: string[],
  companyName?: string
): string[] {
  return urls
    .map(url => processCareerUrl(url, companyName))
    .filter((url): url is string => url !== null);
}
