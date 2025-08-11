/**
 * Robust localStorage utilities for watchlist persistence
 * Following 2025 best practices for error handling and browser compatibility
 */

import { WatchlistData, StorageError } from '../types/watchlist';

const WATCHLIST_STORAGE_KEY = 'cmf-explorer-watchlist';
const STORAGE_VERSION = 1;
const MAX_RETRIES = 3;

/**
 * Detects QuotaExceededError across different browsers
 */
const isQuotaExceededError = (error: Error): boolean => {
  return (
    error.name === 'QuotaExceededError' || // Everything except Firefox
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // Firefox
    (error as any).code === 22 || // Everything except Firefox
    (error as any).code === 1014 // Firefox
  );
};

/**
 * Creates a typed StorageError from a generic Error
 */
const createStorageError = (error: Error, operation: string): StorageError => {
  if (isQuotaExceededError(error)) {
    return {
      type: 'quota_exceeded',
      message: `Storage quota exceeded while ${operation}. Consider clearing some data.`,
      originalError: error,
    };
  }

  if (error.name === 'SecurityError') {
    return {
      type: 'security',
      message: `Storage access denied (possibly private mode) while ${operation}.`,
      originalError: error,
    };
  }

  return {
    type: 'unknown',
    message: `Unexpected error while ${operation}: ${error.message}`,
    originalError: error,
  };
};

/**
 * Checks if localStorage is available and functional
 */
export const isStorageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets available storage space estimate
 */
export const getStorageInfo = async (): Promise<{ used: number; available: number } | null> => {
  if (!isStorageAvailable()) return null;
  
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0),
      };
    }
  } catch (error) {
    console.warn('Could not estimate storage:', error);
  }
  
  return null;
};

/**
 * Saves watchlist data to localStorage with comprehensive error handling
 */
export const saveWatchlistToStorage = async (
  companyIds: Set<number>,
  userId?: string
): Promise<{ success: boolean; error?: StorageError }> => {
  if (!isStorageAvailable()) {
    return {
      success: false,
      error: {
        type: 'not_supported',
        message: 'localStorage is not available (possibly server-side or private mode)',
      },
    };
  }

  const watchlistData: WatchlistData = {
    userId,
    companyIds: Array.from(companyIds),
    lastUpdated: new Date().toISOString(),
    version: STORAGE_VERSION,
  };

  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      const serialized = JSON.stringify(watchlistData);
      
      // Check if we might exceed quota (rough estimate: 2 bytes per character)
      const estimatedSize = serialized.length * 2;
      const storageInfo = await getStorageInfo();
      
      if (storageInfo && estimatedSize > storageInfo.available) {
        return {
          success: false,
          error: {
            type: 'quota_exceeded',
            message: `Estimated data size (${Math.round(estimatedSize / 1024)}KB) exceeds available storage (${Math.round(storageInfo.available / 1024)}KB)`,
          },
        };
      }

      localStorage.setItem(WATCHLIST_STORAGE_KEY, serialized);
      
      // Verify the write was successful
      const verification = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (verification !== serialized) {
        throw new Error('Storage verification failed');
      }

      return { success: true };
    } catch (error) {
      attempts++;
      const storageError = createStorageError(error as Error, 'saving watchlist');
      
      if (storageError.type === 'quota_exceeded' && attempts < MAX_RETRIES) {
        // Try to free up space by removing older data
        try {
          const keys = Object.keys(localStorage);
          const oldKeys = keys.filter(key => 
            key.startsWith('cmf-explorer-') && 
            key !== WATCHLIST_STORAGE_KEY
          );
          
          if (oldKeys.length > 0) {
            oldKeys.forEach(key => localStorage.removeItem(key));
            continue; // Retry after cleanup
          }
        } catch {
          // Cleanup failed, return error
        }
      }

      return { success: false, error: storageError };
    }
  }

  return {
    success: false,
    error: {
      type: 'unknown',
      message: `Failed to save after ${MAX_RETRIES} attempts`,
    },
  };
};

/**
 * Loads watchlist data from localStorage with migration support
 */
export const loadWatchlistFromStorage = (userId?: string): {
  data: Set<number>;
  error?: StorageError;
  migrated?: boolean;
} => {
  if (!isStorageAvailable()) {
    return {
      data: new Set(),
      error: {
        type: 'not_supported',
        message: 'localStorage is not available',
      },
    };
  }

  try {
    const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!stored) {
      return { data: new Set() };
    }

    const parsed = JSON.parse(stored) as WatchlistData;
    
    // Handle legacy data format (if it's just an array)
    if (Array.isArray(parsed)) {
      const migratedData: WatchlistData = {
        userId,
        companyIds: parsed,
        lastUpdated: new Date().toISOString(),
        version: STORAGE_VERSION,
      };
      
      // Save migrated data
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(migratedData));
      
      return {
        data: new Set(parsed),
        migrated: true,
      };
    }

    // Validate data structure
    if (!parsed.companyIds || !Array.isArray(parsed.companyIds)) {
      throw new Error('Invalid watchlist data structure');
    }

    // Check user context (for future multi-user support)
    if (userId && parsed.userId && parsed.userId !== userId) {
      return { data: new Set() }; // Return empty set for different user
    }

    return { data: new Set(parsed.companyIds) };
  } catch (error) {
    const storageError = createStorageError(error as Error, 'loading watchlist');
    
    // If data is corrupted, clear it and return empty set
    if (storageError.type === 'unknown') {
      try {
        localStorage.removeItem(WATCHLIST_STORAGE_KEY);
      } catch {
        // Ignore cleanup errors
      }
    }

    return {
      data: new Set(),
      error: storageError,
    };
  }
};

/**
 * Clears watchlist data from localStorage
 */
export const clearWatchlistFromStorage = (): { success: boolean; error?: StorageError } => {
  if (!isStorageAvailable()) {
    return {
      success: false,
      error: {
        type: 'not_supported',
        message: 'localStorage is not available',
      },
    };
  }

  try {
    localStorage.removeItem(WATCHLIST_STORAGE_KEY);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: createStorageError(error as Error, 'clearing watchlist'),
    };
  }
};

/**
 * Event-based storage change notification
 * Allows multiple hook instances to stay synchronized
 */
export const dispatchStorageChange = (data: WatchlistData): void => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('watchlist-storage-change', {
      detail: data,
    });
    window.dispatchEvent(event);
  }
};

/**
 * Estimates memory usage of current watchlist data
 */
export const getWatchlistStorageSize = (): number => {
  if (!isStorageAvailable()) return 0;
  
  try {
    const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    return stored ? stored.length * 2 : 0; // Rough estimate: 2 bytes per character
  } catch {
    return 0;
  }
};