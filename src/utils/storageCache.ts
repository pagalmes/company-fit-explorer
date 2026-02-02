/**
 * Following js-cache-storage: Cache localStorage reads to reduce expensive I/O
 *
 * localStorage is synchronous and expensive. This utility caches reads in memory
 * and keeps the cache in sync with storage changes.
 */

// In-memory cache for localStorage values
const storageCache = new Map<string, string | null>();

/**
 * Get a value from localStorage with caching
 */
export function getCachedStorage(key: string): string | null {
  if (!storageCache.has(key)) {
    try {
      storageCache.set(key, localStorage.getItem(key));
    } catch {
      // localStorage may throw in incognito/private browsing
      storageCache.set(key, null);
    }
  }
  return storageCache.get(key) ?? null;
}

/**
 * Set a value in localStorage and update cache
 */
export function setCachedStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
    storageCache.set(key, value);
  } catch (error) {
    console.error('Failed to set localStorage:', error);
  }
}

/**
 * Remove a value from localStorage and cache
 */
export function removeCachedStorage(key: string): void {
  try {
    localStorage.removeItem(key);
    storageCache.delete(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
}

/**
 * Clear the cache (call when storage might have changed externally)
 */
export function clearStorageCache(): void {
  storageCache.clear();
}

// Invalidate cache when storage changes in another tab
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key) {
      storageCache.delete(e.key);
    } else {
      // e.key is null when storage.clear() was called
      storageCache.clear();
    }
  });

  // Invalidate cache when tab becomes visible (storage might have changed)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      storageCache.clear();
    }
  });
}
