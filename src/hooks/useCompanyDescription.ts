import { useState, useCallback } from 'react';
import { Company, UserCMF, getCMFCombinedText } from '../types';

interface UseCompanyDescriptionResult {
  isLoading: boolean;
  error: string | null;
  fetchDescription: (company: Company, userCMF: UserCMF) => Promise<string | null>;
}

/**
 * Hook for lazy-loading company descriptions via the Anthropic analyze API.
 *
 * Usage:
 * ```tsx
 * const { isLoading, error, fetchDescription } = useCompanyDescription();
 *
 * useEffect(() => {
 *   if (selectedCompany && !selectedCompany.description) {
 *     fetchDescription(selectedCompany, userCMF).then(description => {
 *       if (description) {
 *         // Update company with description
 *       }
 *     });
 *   }
 * }, [selectedCompany]);
 * ```
 */
export function useCompanyDescription(): UseCompanyDescriptionResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDescription = useCallback(async (
    company: Company,
    userCMF: UserCMF
  ): Promise<string | null> => {
    // Don't fetch if already has description
    if (company.description) {
      return company.description;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert CMFItem arrays to combined "Short: Detailed" format for LLM analysis
      const mustHavesForLLM = (userCMF.mustHaves || []).map(getCMFCombinedText);
      const wantToHaveForLLM = (userCMF.wantToHave || []).map(getCMFCombinedText);

      const response = await fetch('/api/llm/anthropic/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request: {
            companyName: company.name,
            userCMF: {
              targetRole: userCMF.targetRole || 'Exploring career opportunities',
              mustHaves: mustHavesForLLM,
              wantToHave: wantToHaveForLLM,
              experience: userCMF.experience || [],
              targetCompanies: userCMF.targetCompanies || 'Open to exploring various companies and industries'
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data?.description) {
        return result.data.description;
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch description';
      setError(errorMessage);
      console.error('Failed to fetch company description:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    fetchDescription,
  };
}
