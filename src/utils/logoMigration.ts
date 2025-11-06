/**
 * Logo Migration Utility
 *
 * Handles migration from Clearbit to Logo.dev URLs
 * Automatically updates old logo URLs when loading data
 */

import { getCompanyLogo, isFallbackLogo } from './logoProvider';
import { Company } from '../types';

/**
 * Migrate a single logo URL from Clearbit to Logo.dev
 * Extracts the domain and regenerates the URL with the new provider
 *
 * @param oldLogoUrl - Old logo URL (potentially from Clearbit)
 * @param companyName - Company name for fallback
 * @returns Updated logo URL using Logo.dev
 */
export const migrateLogoURL = (oldLogoUrl: string, companyName?: string): string => {
  // If already using Logo.dev or is a fallback, no migration needed
  if (oldLogoUrl.includes('img.logo.dev') || isFallbackLogo(oldLogoUrl)) {
    return oldLogoUrl;
  }

  // Extract domain from Clearbit URL
  // Format: https://logo.clearbit.com/domain.com
  if (oldLogoUrl.includes('logo.clearbit.com/')) {
    const domain = oldLogoUrl.split('logo.clearbit.com/')[1]?.split('?')[0];
    if (domain) {
      return getCompanyLogo(domain, companyName);
    }
  }

  // If we can't parse it, use fallback
  return getCompanyLogo(undefined, companyName);
};

/**
 * Migrate a company object's logo URL
 * Updates the logo URL in place
 *
 * @param company - Company object to migrate
 * @returns Company with updated logo URL
 */
export const migrateCompanyLogo = (company: Company): Company => {
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
  return logoUrl.includes('logo.clearbit.com');
};
