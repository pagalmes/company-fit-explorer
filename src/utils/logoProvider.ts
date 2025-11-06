/**
 * Logo Provider Utility
 *
 * Centralized utility for generating company logo URLs.
 * Handles different logo providers and fallback strategies.
 *
 * Migration from Clearbit to Logo.dev (Clearbit shutting down)
 */

/**
 * Get the Logo.dev API key from environment variables
 * This is a public key (starts with pk_) and safe to use client-side
 */
const getLogoDevKey = (): string | undefined => {
  return process.env.NEXT_PUBLIC_LOGO_DEV_KEY;
};

/**
 * Generate a company logo URL using Logo.dev
 * Falls back to ui-avatars.com if domain is not provided or API key is missing
 *
 * @param domain - Company domain (e.g., "stripe.com", "openai.com")
 * @param companyName - Company name for fallback avatar generation
 * @returns Logo URL
 */
export const getCompanyLogo = (domain: string | undefined, companyName?: string): string => {
  // If no domain provided, use fallback
  if (!domain) {
    return generateFallbackLogo(companyName || 'Company');
  }

  const apiKey = getLogoDevKey();

  // If no API key configured, use fallback
  if (!apiKey) {
    console.warn('Logo.dev API key not configured. Using fallback logos. Set NEXT_PUBLIC_LOGO_DEV_KEY in .env.local');
    return generateFallbackLogo(companyName || domain);
  }

  // Use our proxy API route to avoid CORS issues
  // Logo.dev doesn't send Access-Control-Allow-Origin headers, which blocks
  // CSS background-image loads in Cytoscape
  return `/api/logo?domain=${encodeURIComponent(domain)}`;
};

/**
 * Generate a fallback logo using initials and a color based on the name
 * This provides a consistent, professional-looking placeholder
 *
 * @param name - Company or domain name
 * @returns Fallback logo URL using ui-avatars.com
 */
export const generateFallbackLogo = (name: string): string => {
  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Generate a consistent color based on name
  const colors = ['3B82F6', '10B981', 'F59E0B', 'EF4444', '8B5CF6', '06B6D4', 'F97316'];
  const colorIndex = name.length % colors.length;
  const backgroundColor = colors[colorIndex];

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${backgroundColor}&color=fff&size=128&font-size=0.5&bold=true`;
};

/**
 * Check if a URL is a fallback logo (ui-avatars)
 * Useful for UI to show different states or allow logo upload
 *
 * @param logoUrl - Logo URL to check
 * @returns True if this is a fallback logo
 */
export const isFallbackLogo = (logoUrl: string): boolean => {
  return logoUrl.includes('ui-avatars.com');
};

/**
 * Get logo with explicit size parameter
 * Note: Currently the proxy uses a fixed size of 128px
 * This function is provided for API compatibility but delegates to getCompanyLogo
 *
 * @param domain - Company domain
 * @param companyName - Company name for fallback
 * @param size - Desired size (currently ignored, proxy uses 128px)
 * @returns Logo URL via proxy
 * @deprecated Use getCompanyLogo instead - size parameter is not currently supported via proxy
 */
export const getCompanyLogoWithSize = (
  domain: string | undefined,
  companyName: string | undefined,
  _size: number = 128
): string => {
  // Delegate to main function - proxy currently uses fixed 128px size
  // TODO: Add size parameter support to /api/logo if needed
  return getCompanyLogo(domain, companyName);
};
