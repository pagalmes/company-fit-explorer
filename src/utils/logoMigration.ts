/**
 * Logo Migration Utility
 *
 * Handles migration from Clearbit to Logo.dev URLs
 * Automatically updates old logo URLs when loading data
 */

import { getCompanyLogo, isFallbackLogo } from './logoProvider';
import { Company } from '../types';

/**
 * Migrate a single logo URL to the standardized proxy format
 * Handles Clearbit URLs, direct Logo.dev URLs, ui-avatars URLs, and normalizes all to use the proxy
 *
 * @param oldLogoUrl - Old logo URL (from Clearbit, Logo.dev, ui-avatars, or other)
 * @param companyName - Company name for fallback
 * @returns Updated logo URL using the proxy format
 */
export const migrateLogoURL = (oldLogoUrl: string, companyName?: string): string => {
  // If already using the proxy format with avatar prefix, no migration needed
  if (oldLogoUrl.includes('/api/logo') && oldLogoUrl.includes('domain=avatar:')) {
    return oldLogoUrl;
  }

  // If it's using the proxy format but not an avatar, check if we need to update
  if (oldLogoUrl.includes('/api/logo') && !oldLogoUrl.includes('ui-avatars.com')) {
    return oldLogoUrl;
  }

  // Convert direct ui-avatars.com URL to proxied format
  // Format: https://ui-avatars.com/api/?name=...&background=...
  if (oldLogoUrl.includes('ui-avatars.com')) {
    console.log(`[Migration] Converting direct ui-avatars URL to proxy format for ${companyName}`);
    // Use the fallback generator which now creates proxied URLs
    return getCompanyLogo(undefined, companyName);
  }

  // Extract domain from Logo.dev URL
  // Format: https://img.logo.dev/domain.com?token=...&format=...&size=...
  if (oldLogoUrl.includes('img.logo.dev/')) {
    const domain = oldLogoUrl.split('img.logo.dev/')[1]?.split('?')[0];
    if (domain) {
      console.log(`[Migration] Converting Logo.dev URL to proxy format for ${companyName || domain}`);
      return getCompanyLogo(domain, companyName);
    }
  }

  // Extract domain from Clearbit URL
  // Format: https://logo.clearbit.com/domain.com
  if (oldLogoUrl.includes('logo.clearbit.com/')) {
    const domain = oldLogoUrl.split('logo.clearbit.com/')[1]?.split('?')[0];
    if (domain) {
      console.log(`[Migration] Converting Clearbit URL to proxy format for ${companyName || domain}`);
      return getCompanyLogo(domain, companyName);
    }
  }

  // If we can't parse it, use fallback
  console.warn(`[Migration] Could not parse logo URL for ${companyName}, using fallback:`, oldLogoUrl);
  return getCompanyLogo(undefined, companyName);
};

/**
 * Extract domain from company career URL
 * Attempts to get a domain for Logo.dev lookup
 *
 * @param careerUrl - Company career URL
 * @returns Extracted domain or undefined
 */
const extractDomainFromCareerUrl = (careerUrl: string): string | undefined => {
  try {
    const url = new URL(careerUrl);
    return url.hostname;
  } catch {
    return undefined;
  }
};

/**
 * Migrate a company object's logo URL
 * Updates the logo URL in place, with special handling for fallback avatars
 *
 * @param company - Company object to migrate
 * @returns Company with updated logo URL
 */
export const migrateCompanyLogo = (company: Company): Company => {
  // If it's a fallback avatar, try to get the real logo using the domain from careerUrl
  if (isFallbackLogo(company.logo)) {
    const domain = extractDomainFromCareerUrl(company.careerUrl);
    if (domain) {
      console.log(`[Migration] Converting fallback avatar to Logo.dev for ${company.name} using domain ${domain}`);
      return {
        ...company,
        logo: getCompanyLogo(domain, company.name),
      };
    }
  }

  return {
    ...company,
    logo: migrateLogoURL(company.logo, company.name),
  };
};

/**
 * Migrate an array of companies' logo URLs
 * Updates all logo URLs in the array
 *
 * @param companies - Array of companies to migrate
 * @returns Array of companies with updated logo URLs
 */
export const migrateCompanyLogos = (companies: Company[]): Company[] => {
  return companies.map(migrateCompanyLogo);
};

/**
 * Check if a logo URL needs migration
 *
 * @param logoUrl - Logo URL to check
 * @returns True if migration is needed
 */
export const needsMigration = (logoUrl: string): boolean => {
  return logoUrl.includes('logo.clearbit.com') ||
         logoUrl.includes('img.logo.dev') ||
         isFallbackLogo(logoUrl);
};
