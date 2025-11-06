/**
 * Company Validation Utility
 *
 * Handles company validation and preview generation with graceful fallbacks
 * when external APIs are not available.
 */

import { getCompanyByName } from './companySuggestions';
import { getCompanyLogo, generateFallbackLogo } from './logoProvider';

export interface CompanyPreview {
  name: string;
  domain: string;
  logo: string;
  description?: string;
  industry?: string;
  employees?: string;
  location?: string;
  confidence: 'high' | 'medium' | 'low'; // Confidence level in the data
}

/**
 * Generate a company preview with basic information
 * Uses multiple strategies to gather company data
 */
export const getCompanyPreview = async (companyName: string): Promise<CompanyPreview> => {
  try {
    const trimmedName = companyName.trim();
    
    // Strategy 1: Check if it's in our popular companies list
    const popularCompany = getCompanyByName(trimmedName);
    if (popularCompany) {
      return {
        name: popularCompany.name,
        domain: popularCompany.domain || generateDomainGuess(popularCompany.name),
        logo: popularCompany.logo,
        description: popularCompany.description,
        industry: popularCompany.industry,
        confidence: 'high'
      };
    }
    
    // Strategy 2: Generate intelligent guesses for domain and basic info
    const domainGuess = generateDomainGuess(trimmedName);

    // Strategy 3: Use centralized logo provider (Logo.dev with fallback)
    const logoUrl = getCompanyLogo(domainGuess, trimmedName);

    return {
      name: trimmedName,
      domain: domainGuess,
      logo: logoUrl,
      description: `Information about ${trimmedName}`,
      industry: guessIndustryFromName(trimmedName),
      confidence: 'medium'
    };
    
  } catch (error) {
    console.error('Error generating company preview:', error);
    
    // Ultimate fallback
    return {
      name: companyName.trim(),
      domain: generateDomainGuess(companyName.trim()),
      logo: generateFallbackLogo(companyName.trim()),
      description: `Company information for ${companyName.trim()}`,
      industry: 'Technology',
      confidence: 'low'
    };
  }
};

/**
 * Generate intelligent domain guesses based on company name
 */
const generateDomainGuess = (companyName: string): string => {
  const normalized = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove spaces
    .replace(/^the\s+/i, '') // Remove "the" prefix
    .replace(/\s+(inc|llc|corp|ltd|limited|company|co)$/i, ''); // Remove business suffixes
  
  return `${normalized}.com`;
};

// Logo generation is now handled by the centralized logoProvider utility

/**
 * Guess industry based on company name patterns
 */
const guessIndustryFromName = (companyName: string): string => {
  const name = companyName.toLowerCase();
  
  // AI/ML keywords
  if (name.includes('ai') || name.includes('artificial') || name.includes('machine learning') || 
      name.includes('neural') || name.includes('cognitive')) {
    return 'AI/ML';
  }
  
  // Fintech keywords
  if (name.includes('pay') || name.includes('bank') || name.includes('finance') || 
      name.includes('crypto') || name.includes('wallet') || name.includes('money')) {
    return 'Fintech';
  }
  
  // E-commerce keywords
  if (name.includes('shop') || name.includes('commerce') || name.includes('marketplace') || 
      name.includes('retail') || name.includes('store')) {
    return 'E-commerce';
  }
  
  // Healthcare keywords
  if (name.includes('health') || name.includes('medical') || name.includes('pharma') || 
      name.includes('bio') || name.includes('care')) {
    return 'Healthcare';
  }
  
  // Gaming keywords
  if (name.includes('game') || name.includes('gaming') || name.includes('play') || 
      name.includes('entertainment')) {
    return 'Gaming';
  }
  
  // Design keywords
  if (name.includes('design') || name.includes('creative') || name.includes('studio') || 
      name.includes('visual')) {
    return 'Design';
  }
  
  // Default fallback
  return 'Technology';
};

/**
 * Validate company data and provide confidence scoring
 */
export const validateCompanyData = (preview: CompanyPreview): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} => {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check for common issues
  if (preview.confidence === 'low') {
    issues.push('Limited company information available');
    suggestions.push('Double-check the company name spelling');
  }
  
  if (!preview.description || preview.description.includes('Information about')) {
    suggestions.push('Company description will be enhanced during analysis');
  }
  
  if (preview.logo.includes('ui-avatars.com')) {
    suggestions.push('Company logo will be updated if available');
  }
  
  return {
    isValid: preview.name.trim().length > 0,
    issues,
    suggestions
  };
};