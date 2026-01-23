/**
 * Storage utilities for removed companies functionality
 * Handles persistence of companies that users want to hide from exploration
 */

const REMOVED_COMPANIES_STORAGE_KEY = 'cosmos-removed-companies';
const LEGACY_REMOVED_KEY = 'cmf-explorer-removed-companies';

export const saveRemovedCompaniesToStorage = (companyIds: Set<number>): void => {
  try {
    localStorage.setItem(REMOVED_COMPANIES_STORAGE_KEY, JSON.stringify(Array.from(companyIds)));
  } catch (error) {
    console.error('Failed to save removed companies to localStorage:', error);
  }
};

export const loadRemovedCompaniesFromStorage = (): Set<number> => {
  try {
    let stored = localStorage.getItem(REMOVED_COMPANIES_STORAGE_KEY);

    // Migrate from legacy key if new key doesn't exist
    if (!stored) {
      const legacyStored = localStorage.getItem(LEGACY_REMOVED_KEY);
      if (legacyStored) {
        localStorage.setItem(REMOVED_COMPANIES_STORAGE_KEY, legacyStored);
        localStorage.removeItem(LEGACY_REMOVED_KEY);
        stored = legacyStored;
      }
    }

    if (stored) {
      const ids = JSON.parse(stored) as number[];
      return new Set(ids);
    }
  } catch (error) {
    console.error('Failed to load removed companies from localStorage:', error);
  }
  return new Set();
};

export const clearRemovedCompaniesStorage = (): void => {
  try {
    localStorage.removeItem(REMOVED_COMPANIES_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear removed companies from localStorage:', error);
  }
};

export const removeFromRemovedCompanies = (companyId: number): void => {
  try {
    const currentRemoved = loadRemovedCompaniesFromStorage();
    currentRemoved.delete(companyId);
    saveRemovedCompaniesToStorage(currentRemoved);
  } catch (error) {
    console.error('Failed to remove company from removed list:', error);
  }
};