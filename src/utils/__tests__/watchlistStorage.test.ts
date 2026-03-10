import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isStorageAvailable,
  saveWatchlistToStorage,
  loadWatchlistFromStorage,
  clearWatchlistFromStorage,
  dispatchStorageChange,
  getWatchlistStorageSize,
} from '../watchlistStorage';

const WATCHLIST_KEY = 'cosmos-watchlist';
const LEGACY_KEY = 'cmf-explorer-watchlist';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    keys: () => Object.keys(store),
  };
})();

// Helper: expose keys for cleanup detection tests
const getKeys = () => Object.keys(localStorageMock['keys']?.() ?? {});

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isStorageAvailable', () => {
  it('returns true when localStorage is functional', () => {
    expect(isStorageAvailable()).toBe(true);
  });

  it('returns false when window is undefined', () => {
    const origWindow = global.window;
    // @ts-expect-error
    delete global.window;
    expect(isStorageAvailable()).toBe(false);
    global.window = origWindow;
  });
});

describe('loadWatchlistFromStorage', () => {
  it('returns empty set when no data stored', () => {
    const result = loadWatchlistFromStorage();
    expect(result.data).toEqual(new Set());
    expect(result.error).toBeUndefined();
  });

  it('loads stored company IDs as a Set', async () => {
    const data = {
      companyIds: [1, 2, 3],
      lastUpdated: new Date().toISOString(),
      version: 1,
    };
    localStorageMock.setItem(WATCHLIST_KEY, JSON.stringify(data));
    const result = loadWatchlistFromStorage();
    expect(result.data).toEqual(new Set([1, 2, 3]));
  });

  it('migrates legacy key to new key', () => {
    const legacyData = JSON.stringify({ companyIds: [5, 6], lastUpdated: '', version: 1 });
    localStorageMock.setItem(LEGACY_KEY, legacyData);
    const result = loadWatchlistFromStorage();
    expect(result.data).toEqual(new Set([5, 6]));
    // New key should exist
    expect(localStorageMock.getItem(WATCHLIST_KEY)).toBeTruthy();
    // Legacy key should be gone
    expect(localStorageMock.getItem(LEGACY_KEY)).toBeNull();
  });

  it('migrates array format (legacy) to current format', () => {
    // Old format was just an array of numbers
    localStorageMock.setItem(WATCHLIST_KEY, JSON.stringify([10, 20]));
    const result = loadWatchlistFromStorage();
    expect(result.data).toEqual(new Set([10, 20]));
    expect(result.migrated).toBe(true);
  });

  it('returns empty set for different userId', () => {
    const data = { companyIds: [1], lastUpdated: '', version: 1, userId: 'user-A' };
    localStorageMock.setItem(WATCHLIST_KEY, JSON.stringify(data));
    const result = loadWatchlistFromStorage('user-B');
    expect(result.data).toEqual(new Set());
  });

  it('returns data when userId matches', () => {
    const data = { companyIds: [1], lastUpdated: '', version: 1, userId: 'user-A' };
    localStorageMock.setItem(WATCHLIST_KEY, JSON.stringify(data));
    const result = loadWatchlistFromStorage('user-A');
    expect(result.data).toEqual(new Set([1]));
  });

  it('handles corrupted JSON gracefully', () => {
    localStorageMock.setItem(WATCHLIST_KEY, 'not-json!!!');
    const result = loadWatchlistFromStorage();
    expect(result.data).toEqual(new Set());
    expect(result.error).toBeDefined();
  });

  it('handles invalid data structure', () => {
    localStorageMock.setItem(WATCHLIST_KEY, JSON.stringify({ badKey: 'oops' }));
    const result = loadWatchlistFromStorage();
    expect(result.data).toEqual(new Set());
    expect(result.error).toBeDefined();
  });
});

describe('saveWatchlistToStorage', () => {
  it('saves a set of company IDs', async () => {
    const result = await saveWatchlistToStorage(new Set([1, 2, 3]));
    expect(result.success).toBe(true);
    const stored = localStorageMock.getItem(WATCHLIST_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.companyIds).toEqual(expect.arrayContaining([1, 2, 3]));
  });

  it('saves with userId when provided', async () => {
    await saveWatchlistToStorage(new Set([1]), 'user-123');
    const stored = JSON.parse(localStorageMock.getItem(WATCHLIST_KEY)!);
    expect(stored.userId).toBe('user-123');
  });

  it('includes version and lastUpdated', async () => {
    await saveWatchlistToStorage(new Set([1]));
    const stored = JSON.parse(localStorageMock.getItem(WATCHLIST_KEY)!);
    expect(stored.version).toBe(1);
    expect(stored.lastUpdated).toBeTruthy();
  });

  it('saves empty set', async () => {
    const result = await saveWatchlistToStorage(new Set());
    expect(result.success).toBe(true);
    const stored = JSON.parse(localStorageMock.getItem(WATCHLIST_KEY)!);
    expect(stored.companyIds).toEqual([]);
  });

  it('fails gracefully when localStorage throws on setItem', async () => {
    const throwingStorage = {
      ...localStorageMock,
      setItem: vi.fn(() => { throw new Error('QuotaExceededError'); }),
      getItem: vi.fn(() => null),
    };
    (throwingStorage as any).name = 'QuotaExceededError';
    vi.stubGlobal('localStorage', throwingStorage);

    const result = await saveWatchlistToStorage(new Set([1]));
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('clearWatchlistFromStorage', () => {
  it('removes the watchlist key', () => {
    localStorageMock.setItem(WATCHLIST_KEY, '{}');
    const result = clearWatchlistFromStorage();
    expect(result.success).toBe(true);
    expect(localStorageMock.getItem(WATCHLIST_KEY)).toBeNull();
  });

  it('succeeds even if key does not exist', () => {
    const result = clearWatchlistFromStorage();
    expect(result.success).toBe(true);
  });
});

describe('dispatchStorageChange', () => {
  it('dispatches a custom watchlist-storage-change event', () => {
    // vi.stubGlobal replaces window.localStorage but window itself is still the jsdom window.
    // Spy on window.dispatchEvent to verify the event is fired.
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const data = { companyIds: [1], lastUpdated: '', version: 1 as const };
    dispatchStorageChange(data);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('watchlist-storage-change');
    expect(event.detail).toEqual(data);
    dispatchSpy.mockRestore();
  });
});

describe('getWatchlistStorageSize', () => {
  it('returns 0 when no data stored', () => {
    expect(getWatchlistStorageSize()).toBe(0);
  });

  it('returns a positive number when data is stored', async () => {
    await saveWatchlistToStorage(new Set([1, 2, 3]));
    expect(getWatchlistStorageSize()).toBeGreaterThan(0);
  });
});
