/**
 * Utility for merging user preferences from multiple sources
 *
 * User preferences can be stored in two places:
 * 1. user_preferences table (separate table) - newer approach
 * 2. user_profile JSONB field in user_company_data - legacy/admin import format
 *
 * This utility provides a centralized way to merge these sources.
 */

export interface UserPreferencesFromProfile {
  watchlistCompanyIds?: number[];
  removedCompanyIds?: number[];
  viewMode?: 'explore' | 'watchlist';
}

export interface UserPreferencesFromTable {
  watchlist_company_ids?: number[];
  removed_company_ids?: number[];
  view_mode?: 'explore' | 'watchlist';
}

export interface MergedPreferences {
  watchlistCompanyIds: number[];
  removedCompanyIds: number[];
  viewMode: 'explore' | 'watchlist';
}

/**
 * Merge preferences from user_profile and user_preferences table
 *
 * Priority logic:
 * - If user_profile has data (length > 0), use it (handles admin imports and legacy data)
 * - Otherwise, use user_preferences table data
 * - Fall back to empty arrays/defaults if both are empty
 */
export function mergeUserPreferences(
  profilePrefs: UserPreferencesFromProfile | null | undefined,
  tablePrefs: UserPreferencesFromTable | null | undefined
): MergedPreferences {
  const watchlistFromProfile = profilePrefs?.watchlistCompanyIds || [];
  const watchlistFromTable = tablePrefs?.watchlist_company_ids || [];
  const removedFromProfile = profilePrefs?.removedCompanyIds || [];
  const removedFromTable = tablePrefs?.removed_company_ids || [];

  return {
    watchlistCompanyIds: watchlistFromProfile.length > 0 ? watchlistFromProfile : watchlistFromTable,
    removedCompanyIds: removedFromProfile.length > 0 ? removedFromProfile : removedFromTable,
    viewMode: profilePrefs?.viewMode || tablePrefs?.view_mode || 'explore'
  };
}
