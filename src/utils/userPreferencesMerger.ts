/**
 * Utility for merging user preferences from multiple sources
 *
 * User preferences can be stored in two places:
 * 1. user_preferences table — the SOURCE OF TRUTH (updated on every user action)
 * 2. user_profile JSONB field in user_company_data — legacy fallback (only from admin imports)
 *
 * IMPORTANT: The table MUST take priority over the JSONB profile because:
 * - ExplorationStateManager writes preferences to the table on every toggle/change
 * - ExplorationStateManager writes only CMF (not preferences) to the JSONB column
 * - The JSONB may contain stale preference data from an old admin import
 * - The profile fallback only exists for the edge case where an admin import
 *   wrote to JSONB but the table write failed
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

/** Use the primary source if it has data, otherwise fall back to the secondary source. */
function preferWithFallback(primary: number[], fallback: number[]): number[] {
  return primary.length > 0 ? primary : fallback;
}

/**
 * Merge preferences from user_preferences table (primary) and user_profile JSONB (fallback).
 */
export function mergeUserPreferences(
  profilePrefs: UserPreferencesFromProfile | null | undefined,
  tablePrefs: UserPreferencesFromTable | null | undefined
): MergedPreferences {
  // Table is the source of truth; profile is the legacy fallback
  const watchlistFromTable = tablePrefs?.watchlist_company_ids || [];
  const watchlistFromProfile = profilePrefs?.watchlistCompanyIds || [];
  const removedFromTable = tablePrefs?.removed_company_ids || [];
  const removedFromProfile = profilePrefs?.removedCompanyIds || [];

  return {
    watchlistCompanyIds: preferWithFallback(watchlistFromTable, watchlistFromProfile),
    removedCompanyIds: preferWithFallback(removedFromTable, removedFromProfile),
    viewMode: tablePrefs?.view_mode || profilePrefs?.viewMode || 'explore'
  };
}
