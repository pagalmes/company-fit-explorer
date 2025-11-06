/**
 * Test Helper Utilities
 *
 * Common utilities for test files
 */

/**
 * Generate a consistent test logo URL
 * Mimics the production logo.dev format for testing
 */
export const getTestLogo = (domain: string): string => {
  return `https://img.logo.dev/${domain}?token=test-key`;
};
