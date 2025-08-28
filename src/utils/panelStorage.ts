/**
 * Panel state storage utilities
 * Handles persistence of UI panel states like CMF collapse/expand
 */

const CMF_PANEL_STORAGE_KEY = 'cmf-explorer-panel-state-v2'; // Updated to reset existing state

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
    localStorage.setItem(CMF_PANEL_STORAGE_KEY, JSON.stringify(newState));
  } catch (error) {
    console.error('Failed to save panel state:', error);
  }
};

export const loadPanelState = (): PanelState => {
  try {
    const stored = localStorage.getItem(CMF_PANEL_STORAGE_KEY);
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