import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hasLegacyState,
  migrateLegacyState,
  clearLegacyState,
  applyMigratedState,
  logMigrationInstructions,
  autoMigrate,
} from '../migrateLegacyState';

// Provide a simple localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('hasLegacyState', () => {
  it('returns false when no legacy keys exist', () => {
    expect(hasLegacyState()).toBe(false);
  });

  it('returns true when cosmos-watchlist exists', () => {
    localStorageMock.setItem('cosmos-watchlist', '[1,2]');
    expect(hasLegacyState()).toBe(true);
  });

  it('returns true when cosmos-removed-companies exists', () => {
    localStorageMock.setItem('cosmos-removed-companies', '[3]');
    expect(hasLegacyState()).toBe(true);
  });

  it('returns true when cosmos-custom-companies exists', () => {
    localStorageMock.setItem('cosmos-custom-companies', '[]');
    expect(hasLegacyState()).toBe(true);
  });
});

describe('migrateLegacyState', () => {
  it('returns no-legacy-data result when storage is empty', () => {
    const result = migrateLegacyState();
    expect(result.success).toBe(true);
    expect(result.hasLegacyData).toBe(false);
  });

  it('migrates watchlist IDs', () => {
    localStorageMock.setItem('cosmos-watchlist', '[1,2,3]');
    const result = migrateLegacyState();
    expect(result.success).toBe(true);
    expect(result.hasLegacyData).toBe(true);
    expect(result.migratedState?.watchlistCompanyIds).toEqual([1, 2, 3]);
  });

  it('migrates removed company IDs', () => {
    localStorageMock.setItem('cosmos-removed-companies', '[5,6]');
    const result = migrateLegacyState();
    expect(result.migratedState?.removedCompanyIds).toEqual([5, 6]);
  });

  it('migrates custom companies', () => {
    const custom = [{ id: 99, name: 'Custom Co' }];
    localStorageMock.setItem('cosmos-custom-companies', JSON.stringify(custom));
    const result = migrateLegacyState();
    expect(result.migratedState?.addedCompanies).toEqual(custom);
  });

  it('generates codeToAdd snippet', () => {
    localStorageMock.setItem('cosmos-watchlist', '[1]');
    const result = migrateLegacyState();
    expect(result.codeToAdd).toBeTruthy();
    expect(result.codeToAdd).toContain('watchlistCompanyIds');
  });

  it('includes migration summary', () => {
    localStorageMock.setItem('cosmos-watchlist', '[1,2]');
    const result = migrateLegacyState();
    expect(result.migrationSummary).toContain('watchlisted');
  });

  it('handles empty arrays gracefully', () => {
    localStorageMock.setItem('cosmos-watchlist', '[]');
    localStorageMock.setItem('cosmos-removed-companies', '[]');
    const result = migrateLegacyState();
    expect(result.migratedState?.watchlistCompanyIds).toEqual([]);
    expect(result.migratedState?.removedCompanyIds).toEqual([]);
  });

  it('returns failure result on JSON parse error', () => {
    localStorageMock.setItem('cosmos-watchlist', 'not-valid-json');
    const result = migrateLegacyState();
    expect(result.success).toBe(false);
    expect(result.migrationSummary).toMatch(/failed/i);
  });
});

describe('clearLegacyState', () => {
  it('removes all legacy keys', () => {
    localStorageMock.setItem('cosmos-watchlist', '[1]');
    localStorageMock.setItem('cosmos-removed-companies', '[2]');
    localStorageMock.setItem('cosmos-custom-companies', '[]');
    clearLegacyState();
    expect(localStorageMock.getItem('cosmos-watchlist')).toBeNull();
    expect(localStorageMock.getItem('cosmos-removed-companies')).toBeNull();
    expect(localStorageMock.getItem('cosmos-custom-companies')).toBeNull();
  });

  it('does not throw if keys do not exist', () => {
    expect(() => clearLegacyState()).not.toThrow();
  });
});

describe('applyMigratedState', () => {
  it('merges migrated state onto active user profile', () => {
    const state = applyMigratedState({ watchlistCompanyIds: [1, 2] });
    expect(state.watchlistCompanyIds).toEqual([1, 2]);
  });

  it('defaults missing arrays to empty', () => {
    const state = applyMigratedState({});
    expect(Array.isArray(state.watchlistCompanyIds)).toBe(true);
    expect(Array.isArray(state.removedCompanyIds)).toBe(true);
    expect(Array.isArray(state.addedCompanies)).toBe(true);
  });
});

describe('logMigrationInstructions', () => {
  it('does not throw for no-legacy-data result', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => logMigrationInstructions({ success: true, hasLegacyData: false, migrationSummary: '' })).not.toThrow();
    consoleSpy.mockRestore();
  });

  it('does not throw for has-legacy-data result', () => {
    const consoleSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    const consoleSpy2 = vi.spyOn(console, 'group').mockImplementation(() => {});
    const consoleSpy3 = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleSpy4 = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    expect(() => logMigrationInstructions({
      success: true,
      hasLegacyData: true,
      migrationSummary: 'Found 1 watchlisted company.',
      codeToAdd: '// code',
    })).not.toThrow();
    consoleSpy.mockRestore();
    consoleSpy2.mockRestore();
    consoleSpy3.mockRestore();
    consoleSpy4.mockRestore();
  });
});

describe('autoMigrate', () => {
  it('returns false when no legacy data', () => {
    expect(autoMigrate()).toBe(false);
  });

  it('returns true when legacy data exists', () => {
    const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const consoleSpy2 = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleSpy3 = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    localStorageMock.setItem('cosmos-watchlist', '[1]');
    expect(autoMigrate()).toBe(true);
    consoleSpy.mockRestore();
    consoleSpy2.mockRestore();
    consoleSpy3.mockRestore();
  });
});
