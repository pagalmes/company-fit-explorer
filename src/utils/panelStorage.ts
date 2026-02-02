/**
 * Panel state storage utilities
 * Handles persistence of UI panel states like CMF collapse/expand
 *
 * Following js-cache-storage: Uses cached localStorage reads
 */

import { getCachedStorage, setCachedStorage, removeCachedStorage } from './storageCache';

const CMF_PANEL_STORAGE_KEY = 'cosmos-panel-state';
const LEGACY_PANEL_KEY = 'cmf-explorer-panel-state-v2';

export interface PanelState {
  cmfCollapsed: boolean;
  lastUpdated: string;
}

export const savePanelState = (state: Partial<PanelState>): void => {
  try {
    const currentState = loadPanelState();
    const newState: PanelState = {
      ...currentState,
      ...state,
      lastUpdated: new Date().toISOString()
    };
    setCachedStorage(CMF_PANEL_STORAGE_KEY, JSON.stringify(newState));
  } catch (error) {
    console.error('Failed to save panel state:', error);
  }
};

export const loadPanelState = (): PanelState => {
  try {
    let stored = getCachedStorage(CMF_PANEL_STORAGE_KEY);

    // Migrate from legacy key if new key doesn't exist
    if (!stored) {
      const legacyStored = getCachedStorage(LEGACY_PANEL_KEY);
      if (legacyStored) {
        setCachedStorage(CMF_PANEL_STORAGE_KEY, legacyStored);
        removeCachedStorage(LEGACY_PANEL_KEY);
        stored = legacyStored;
      }
    }

    if (stored) {
      return JSON.parse(stored) as PanelState;
    }
  } catch (error) {
    console.error('Failed to load panel state:', error);
  }

  return {
    cmfCollapsed: true,
    lastUpdated: new Date().toISOString()
  };
};