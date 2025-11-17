/**
 * External Links Utility
 *
 * Generates external research links for companies on-the-fly.
 * No data storage required - links are computed dynamically when needed.
 */

import { Company } from '../types';

export interface ExternalLinks {
  website?: string;
  linkedin?: string;
  glassdoor?: string;
  crunchbase?: string;
}

/**
 * Generate external research links for a company
 *
 * @param company - Company object
 * @returns Object with website, LinkedIn, Glassdoor, and Crunchbase URLs
 */
export function generateExternalLinks(company: Company): ExternalLinks {
  const companyName = company.name;

  // Extract root domain from careerUrl if available
  let websiteUrl: string | undefined;
  if (company.careerUrl) {
    try {
      const url = new URL(company.careerUrl);
      // Extract root domain (e.g., careers.airbnb.com -> airbnb.com)
      const hostname = url.hostname;
      const parts = hostname.split('.');

      // Get the last 2 parts (domain.tld) or 3 for .co.uk style TLDs
      let rootDomain: string;
      if (parts.length >= 2) {
        const secondLevel = parts[parts.length - 2];

        // Handle multi-part TLDs like .co.uk, .com.au, etc.
        if (['co', 'com', 'org', 'net', 'gov', 'edu', 'ac'].includes(secondLevel) && parts.length >= 3) {
          rootDomain = parts.slice(-3).join('.');
        } else {
          rootDomain = parts.slice(-2).join('.');
        }
      } else {
        rootDomain = hostname;
      }

      websiteUrl = `https://${rootDomain}`;
    } catch {
      // If URL parsing fails, skip website link
    }
  }

  return {
    website: websiteUrl,
    linkedin: generateGoogleSearchUrl(companyName, 'LinkedIn'),
    glassdoor: generateGoogleSearchUrl(companyName, 'Glassdoor'),
    crunchbase: generateGoogleSearchUrl(companyName, 'Crunchbase')
  };
}

/**
 * Generate a Google search URL for finding a company on a specific platform
 */
function generateGoogleSearchUrl(companyName: string, platformName: string): string {
  const query = `${companyName} on ${platformName}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Get external links for a company, generating them if missing
 *
 * @param company - Company object
 * @returns External links (existing or generated)
 */
export function getExternalLinks(company: Company): ExternalLinks {
  // If company already has external links, use them
  if (company.externalLinks && Object.keys(company.externalLinks).length > 0) {
    return company.externalLinks;
  }

  // Otherwise, generate them on-the-fly
  return generateExternalLinks(company);
}
