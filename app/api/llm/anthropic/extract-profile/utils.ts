/**
 * Pure utility functions for the extract-profile route.
 *
 * Extracted into a separate file so they can be unit-tested without
 * exporting them from route.ts — Next.js rejects non-HTTP-verb exports
 * from API route files at build time.
 */

export interface CMFItem {
  short: string;
  detailed: string;
}

export type ExtractionConfidence = 'high' | 'medium' | 'low';

export interface ExtractionResult {
  name: string;
  targetRole: string;
  targetCompanies: string;
  mustHaves: CMFItem[];
  wantToHave: CMFItem[];
  experience: string[];
  extractionConfidence: ExtractionConfidence;
  extractionIssues: string[];
}

export function isPDF(mimeType: string): boolean {
  return mimeType === 'application/pdf' || mimeType.includes('pdf');
}

/**
 * Parse the structured output from Claude.
 * With structured outputs the JSON is guaranteed valid — this just deserialises it.
 */
export function parseProfileResponse(responseText: string): ExtractionResult {
  try {
    return JSON.parse(responseText) as ExtractionResult;
  } catch (error) {
    console.error('Failed to parse profile extraction response:', error);
    console.error('Raw response:', responseText);
    throw new Error(`Failed to parse profile extraction response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }
}

/**
 * Calculate API cost.
 * Pricing constants kept here so they're easy to update when rates change.
 */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  // Claude Sonnet 4.5 pricing: $5/1M input, $25/1M output
  const INPUT_PRICE_PER_M = 5;
  const OUTPUT_PRICE_PER_M = 25;

  return (inputTokens / 1_000_000) * INPUT_PRICE_PER_M +
         (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_M;
}
