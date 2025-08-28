import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ViewMode, Company } from '../types';
import { ExplorationStateManager } from '../services/ExplorationStateManager';
import { activeUserProfile } from '../data/companies';
import CompanyGraph from './CompanyGraph';
import CompanyDetailPanel from './CompanyDetailPanel';
import AddCompanyModal from './AddCompanyModal';
import LLMSettingsModal from './LLMSettingsModal';
import { RemoveCompanyModal } from './RemoveCompanyModal';
import { llmService } from '../utils/llm/service';
import { loadPanelState, savePanelState } from '../utils/panelStorage';
import CollapsibleCMFPanel from './CollapsibleCMFPanel';
// Using inline SVG icons instead of lucide-react
const SearchIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const GearIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);


/**
 * CMFGraphExplorer - Enhanced with persistent exploration state
 * 
 * Uses ExplorationStateManager for centralized state management.
 * All exploration data (added companies, watchlist, removed companies) 
 * is loaded from companies.ts and persisted across sessions.
 */
const CMFGraphExplorer: React.FC = () => {
  // Initialize state manager from companies.ts
  const [stateManager] = useState(() => new ExplorationStateManager(activeUserProfile, 'teeKProfile'));
  
  // UI state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [hoveredCompany, setHoveredCompany] = useState<Company | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('explore');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showLLMSettings, setShowLLMSettings] = useState(false);
  const [llmConfigured, setLLMConfigured] = useState(llmService.isConfigured());
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [companyToRemove, setCompanyToRemove] = useState<Company | null>(null);
  
  // Panel state - default to collapsed for cleaner UI
  const [isCMFPanelCollapsed, setIsCMFPanelCollapsed] = useState<boolean>(true);
  
  // Force re-render trigger for state changes
  const [stateVersion, setStateVersion] = useState(0);
  const forceUpdate = useCallback(() => setStateVersion(v => v + 1), []);
  
  // Separate state for watchlist-only updates (sidebar stats, etc.)
  const [watchlistUpdateTrigger, setWatchlistUpdateTrigger] = useState(0);
  const triggerWatchlistUpdate = useCallback(() => setWatchlistUpdateTrigger(v => v + 1), []);

  // Initialize state from companies.ts on mount
  useEffect(() => {
    setIsLoading(true);
    
    // Restore last selected company
    const lastSelected = stateManager.getSelectedCompany();
    setSelectedCompany(lastSelected);
    
    // Restore view mode
    const lastViewMode = stateManager.getViewMode();
    setViewMode(lastViewMode);
    
    // Load panel state
    const panelState = loadPanelState();
    setIsCMFPanelCollapsed(panelState.cmfCollapsed);
    
    setIsLoading(false);
    
    // Development logging commented out to reduce console noise
    // console.log('🚀 Loaded exploration state from companies.ts:', {
    //   userId: activeUserProfile.id,
    //   userName: activeUserProfile.name,
    //   stats: stateManager.getExplorationStats(),
    //   watchlistStats: stateManager.getWatchlistStats(),
    //   lastSelected: lastSelected?.name,
    //   viewMode: lastViewMode
    // });
  }, [stateManager]);

  // Get companies for display based on view mode - include stateVersion to trigger updates
  const displayedCompanies = useMemo(() => {
    return stateManager.getDisplayedCompanies();
  }, [stateManager, viewMode, stateVersion]);

  const allCompanies = useMemo(() => {
    return stateManager.getAllCompanies();
  }, [stateManager, stateVersion]);

  const watchlistStats = useMemo(() => {
    return stateManager.getWatchlistStats();
  }, [stateManager, watchlistUpdateTrigger]);

  // ===== COMPANY SELECTION =====

  const handleCompanySelect = useCallback((company: Company | null) => {
    setSelectedCompany(company);
    // Only update state manager for selection without triggering re-render
    if (company) {
      stateManager.setSelectedCompany(company.id);
    } else {
      stateManager.setSelectedCompany(null);
    }
  }, [stateManager]);

  const handleCompanyHover = useCallback((company: Company | null) => {
    setHoveredCompany(company);
  }, []);

  const handleCompanySelectFromPanel = useCallback((company: Company | null) => {
    handleCompanySelect(company);
  }, [handleCompanySelect]);

  // ===== WATCHLIST MANAGEMENT =====

  const handleToggleWatchlist = useCallback((companyId: number) => {
    stateManager.toggleWatchlist(companyId);
    // Trigger minimal update for sidebar stats without affecting graph rendering
    triggerWatchlistUpdate();
  }, [stateManager, triggerWatchlistUpdate]);

  const isInWatchlist = useCallback((companyId: number): boolean => {
    return stateManager.isInWatchlist(companyId);
  }, [stateManager]);

  // ===== COMPANY MANAGEMENT =====

  const handleAddCompany = useCallback(async (newCompany: Company) => {
    try {
      const addedCompany = stateManager.addCompany(newCompany);
      forceUpdate(); // Force re-render to show new company
      
      // Auto-select the new company after brief delay
      setTimeout(() => {
        handleCompanySelect(addedCompany);
      }, 1000);
      
      console.log('Company added successfully:', addedCompany.name);
    } catch (error) {
      console.error('Failed to add company:', error);
      throw error; // Re-throw to let modal handle the error
    }
  }, [stateManager, forceUpdate, handleCompanySelect]);

  const handleBatchUpdateCompanies = useCallback(async (updatedCompanies: Company[]) => {
    try {
      console.log('🎯 Performing batch company update with smart repositioning');
      
      // Update all companies in the state manager
      updatedCompanies.forEach(company => {
        if (stateManager.getAllCompanies().find(c => c.id === company.id)) {
          // Update existing company
          stateManager.updateCompany(company);
        } else {
          // Add new company
          stateManager.addCompany(company);
        }
      });
      
      forceUpdate(); // Force re-render to show repositioned companies
      
      // Auto-select the newest company (highest ID, likely the one just added)
      const newestCompany = updatedCompanies.reduce((newest, company) => 
        company.id > newest.id ? company : newest
      );
      
      // Auto-select the new company after animations complete
      setTimeout(() => {
        handleCompanySelect(newestCompany);
      }, 1500); // Slightly longer delay to allow animations to finish
      
      console.log(`📊 Batch update completed: ${updatedCompanies.length} companies repositioned`);
    } catch (error) {
      console.error('Failed to batch update companies:', error);
      throw error; // Re-throw to let modal handle the error
    }
  }, [stateManager, forceUpdate, handleCompanySelect]);

  const removeCompany = useCallback((companyId: number) => {
    stateManager.removeCompany(companyId);
    
    // Clear selection if removed company was selected
    if (selectedCompany?.id === companyId) {
      handleCompanySelect(null);
    }
    
    // Close confirmation modal
    setShowRemoveConfirmation(false);
    setCompanyToRemove(null);
    forceUpdate(); // Force re-render to update UI
  }, [stateManager, selectedCompany, handleCompanySelect, forceUpdate]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRemoveRequest = useCallback((company: Company) => {
    setCompanyToRemove(company);
    setShowRemoveConfirmation(true);
  }, []);

  const handleRemoveConfirm = useCallback(() => {
    if (companyToRemove) {
      removeCompany(companyToRemove.id);
    }
  }, [companyToRemove, removeCompany]);

  const handleRemoveCancel = useCallback(() => {
    setShowRemoveConfirmation(false);
    setCompanyToRemove(null);
  }, []);

  // Check for removed company (for restore functionality)
  const checkForRemovedCompany = useCallback((companyName: string): Company | null => {
    const allCompaniesIncludingRemoved = [
      ...activeUserProfile.baseCompanies,
      ...stateManager.getCurrentState().addedCompanies
    ];
    
    const removedCompany = allCompaniesIncludingRemoved.find(c => 
      c.name.toLowerCase() === companyName.toLowerCase() && 
      stateManager.isCompanyRemoved(c.id)
    );
    return removedCompany || null;
  }, [stateManager]);

  const restoreRemovedCompany = useCallback((company: Company) => {
    stateManager.restoreCompany(company.id);
    forceUpdate(); // Force re-render to show restored company
    
    // Auto-select the restored company
    setTimeout(() => {
      handleCompanySelect(company);
    }, 1000);
    
    console.log('Company restored successfully:', company.name);
  }, [stateManager, forceUpdate, handleCompanySelect]);

  // ===== VIEW MODE MANAGEMENT =====

  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    setViewMode(newMode);
    stateManager.setViewMode(newMode);
    
    // Clear selection when switching to watchlist if selected company is not watchlisted
    if (selectedCompany && newMode === 'watchlist' && !isInWatchlist(selectedCompany.id)) {
      handleCompanySelect(null);
    }
    
    forceUpdate(); // Force re-render for new view
  }, [stateManager, selectedCompany, isInWatchlist, handleCompanySelect, forceUpdate]);

  // ===== PANEL MANAGEMENT =====

  const toggleCMFPanel = useCallback(() => {
    const newState = !isCMFPanelCollapsed;
    setIsCMFPanelCollapsed(newState);
    savePanelState({ cmfCollapsed: newState });
  }, [isCMFPanelCollapsed]);

  // ===== LLM SETTINGS =====

  const handleLLMSettingsUpdated = useCallback(() => {
    setLLMConfigured(llmService.isConfigured());
  }, []);

  // ===== RENDER =====

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading exploration state...</div>
      </div>
    );
  }

  const userCMF = stateManager.getUserCMF();

  return (
    <div className="flex h-screen bg-transparent">
      {/* Main Graph Area */}
      <div className="flex-1 relative">
        {/* Development indicator disabled to avoid conflict with CMF panel */}


        {/* View Mode Toggle */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex">
            <button
              onClick={() => handleViewModeChange('explore')}
              className={`w-56 px-4 py-3 font-medium transition-colors flex items-center justify-center space-x-2 whitespace-nowrap ${
                viewMode === 'explore'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <SearchIcon />
              <span>Explore Companies ({allCompanies.length})</span>
            </button>
            <button
              onClick={() => handleViewModeChange('watchlist')}
              className={`w-56 px-4 py-3 font-medium transition-colors flex items-center justify-center space-x-2 whitespace-nowrap ${
                viewMode === 'watchlist'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <HeartIcon />
              <span>Your Watchlist ({watchlistStats.totalCompanies})</span>
            </button>
          </div>
        </div>

        {/* CMF Panel */}
        <CollapsibleCMFPanel
          userCMF={userCMF}
          isCollapsed={isCMFPanelCollapsed}
          onToggle={toggleCMFPanel}
        />

        {/* Graph Component */}
        <CompanyGraph
          cmf={userCMF}
          companies={displayedCompanies}
          selectedCompany={selectedCompany}
          hoveredCompany={hoveredCompany}
          onCompanySelect={handleCompanySelect}
          onCompanyHover={handleCompanyHover}
          onCMFToggle={toggleCMFPanel}
          watchlistCompanyIds={new Set(stateManager.getCurrentState().watchlistCompanyIds)}
          viewMode={viewMode}
        />

        {/* Add Company Button */}
        <div className="absolute bottom-6 right-6 z-10">
          <button
            onClick={() => setShowAddCompanyModal(true)}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white 
              rounded-full shadow-lg hover:shadow-xl 
              transition-all duration-200 ease-in-out
              flex items-center justify-center
              hover:scale-105 active:scale-95
              focus:outline-none focus:ring-4 focus:ring-blue-600 focus:ring-opacity-50"
            title="Add Company"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* LLM Settings */}
        <div className="absolute bottom-6 left-6 z-10 flex items-center space-x-2">
          <button
            onClick={() => setShowLLMSettings(true)}
            className={`w-12 h-12 rounded-full transition-colors flex items-center justify-center shadow-lg ${
              llmConfigured
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
            title={llmConfigured ? 'LLM Settings' : 'Configure LLM'}
          >
            <GearIcon />
          </button>
          {/* LLM Status indicator */}
          {llmConfigured && (
            <div className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-full flex items-center shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span className="font-medium">{llmService.getSettings().provider.toUpperCase()} AI</span>
            </div>
          )}
        </div>

        {/* Empty state for watchlist */}
        {viewMode === 'watchlist' && displayedCompanies.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
              <div className="w-16 h-16 mx-auto text-gray-300 mb-4">
                <HeartIcon />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No Companies in Watchlist
              </h3>
              <p className="text-gray-600 mb-4">
                Start building your watchlist by saving companies you're interested in.
              </p>
              <button
                onClick={() => handleViewModeChange('explore')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Explore Companies
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Side Panel */}
      <div className="w-96 bg-white border-l border-gray-200 overflow-hidden">
        <CompanyDetailPanel
          selectedCompany={selectedCompany}
          allCompanies={allCompanies}
          onCompanySelect={handleCompanySelectFromPanel}
          isInWatchlist={isInWatchlist}
          onToggleWatchlist={handleToggleWatchlist}
          onRequestDelete={handleRemoveRequest}
          viewMode={viewMode}
          watchlistStats={watchlistStats}
        />
      </div>

      {/* Modals */}
      {showAddCompanyModal && (
        <AddCompanyModal
          isOpen={showAddCompanyModal}
          onClose={() => setShowAddCompanyModal(false)}
          onAddCompany={handleAddCompany}
          onBatchUpdateCompanies={handleBatchUpdateCompanies}
          existingCompanies={allCompanies}
          onCheckForRemovedCompany={checkForRemovedCompany}
          onRestoreRemovedCompany={restoreRemovedCompany}
          userCMF={userCMF}
        />
      )}

      {showLLMSettings && (
        <LLMSettingsModal
          isOpen={showLLMSettings}
          onClose={() => setShowLLMSettings(false)}
          onSettingsUpdated={handleLLMSettingsUpdated}
        />
      )}

      {showRemoveConfirmation && companyToRemove && (
        <RemoveCompanyModal
          isOpen={showRemoveConfirmation}
          company={companyToRemove}
          onConfirm={handleRemoveConfirm}
          onCancel={handleRemoveCancel}
        />
      )}
    </div>
  );
};

export default CMFGraphExplorer;