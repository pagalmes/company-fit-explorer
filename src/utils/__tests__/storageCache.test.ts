import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCachedStorage,
  setCachedStorage,
  removeCachedStorage,
  clearStorageCache,
} from '../storageCache';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: () => { store = {}; },
    _store: () => store,
  };
})();

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.clear();
  vi.clearAllMocks();
  clearStorageCache(); // reset in-memory cache between tests
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCachedStorage', () => {
  it('reads from localStorage on first access', () => {
    localStorageMock.setItem('key1', 'value1');
    const result = getCachedStorage('key1');
    expect(result).toBe('value1');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('key1');
  });

  it('returns null for missing key', () => {
    expect(getCachedStorage('missing')).toBeNull();
  });

  it('caches the value — subsequent reads do not hit localStorage again', () => {
    localStorageMock.setItem('key1', 'value1');
    getCachedStorage('key1'); // warm cache
    vi.clearAllMocks();
    getCachedStorage('key1'); // should use cache
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
  });

  it('returns cached null without re-reading localStorage', () => {
    getCachedStorage('absent'); // caches null
    vi.clearAllMocks();
    getCachedStorage('absent');
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
  });

  it('returns null and caches when localStorage throws', () => {
    localStorageMock.getItem.mockImplementationOnce(() => { throw new Error('SecurityError'); });
    const result = getCachedStorage('blocked');
    expect(result).toBeNull();
    // Second call should use cache (not throw again)
    vi.clearAllMocks();
    expect(getCachedStorage('blocked')).toBeNull();
    expect(localStorageMock.getItem).not.toHaveBeenCalled();
  });
});

describe('setCachedStorage', () => {
  it('writes to localStorage', () => {
    setCachedStorage('key1', 'value1');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('key1', 'value1');
  });

  it('updates the in-memory cache', () => {
    setCachedStorage('key1', 'value1');
    vi.clearAllMocks();
    const result = getCachedStorage('key1');
    expect(result).toBe('value1');
    expect(localStorageMock.getItem).not.toHaveBeenCalled(); // came from cache
  });

  it('does not throw when localStorage throws', () => {
    localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('QuotaExceededError'); });
    expect(() => setCachedStorage('key1', 'value1')).not.toThrow();
  });
});

describe('removeCachedStorage', () => {
  it('removes from localStorage', () => {
    setCachedStorage('key1', 'value1');
    removeCachedStorage('key1');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('key1');
  });

  it('removes from cache so next read re-fetches', () => {
    setCachedStorage('key1', 'value1');
    removeCachedStorage('key1');
    vi.clearAllMocks();
    getCachedStorage('key1');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('key1');
  });

  it('does not throw when localStorage throws', () => {
    localStorageMock.removeItem.mockImplementationOnce(() => { throw new Error('SecurityError'); });
    expect(() => removeCachedStorage('key1')).not.toThrow();
  });
});

describe('clearStorageCache', () => {
  it('forces re-read from localStorage on next access', () => {
    setCachedStorage('key1', 'value1');
    clearStorageCache();
    vi.clearAllMocks();
    localStorageMock.setItem('key1', 'updated');
    getCachedStorage('key1');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('key1');
  });
});
