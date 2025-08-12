import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { CMFGraphExplorerProps, ViewMode, Company } from '../types';
import { useCompanySelection } from '../hooks/useCompanySelection';
import { useWatchlist } from '../hooks/useWatchlist';
import CompanyGraph from './CompanyGraph';
import CompanyDetailPanel from './CompanyDetailPanel';
import AddCompanyModal from './AddCompanyModal';
import LLMSettingsModal from './LLMSettingsModal';
import { RemoveCompanyModal } from './RemoveCompanyModal';
import { loadCustomCompanies, addCustomCompany, setupCrossTabSync } from '../utils/companyStateManager';
import { llmService } from '../utils/llm/service';
import { loadRemovedCompaniesFromStorage, saveRemovedCompaniesToStorage } from '../utils/removedCompaniesStorage';
import { loadPanelState, savePanelState } from '../utils/panelStorage';
import CollapsibleCMFPanel from './CollapsibleCMFPanel';

const CMFGraphExplorer: React.FC<CMFGraphExplorerProps> = ({ userCMF, companies: initialCompanies }) => {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('explore');
  
  // Add Company modal state
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  
  // LLM Settings modal state
  const [showLLMSettings, setShowLLMSettings] = useState(false);
  const [llmConfigured, setLLMConfigured] = useState(llmService.isConfigured());
  
  // Companies state with persistence (includes initial + custom companies)
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [customCompanies, setCustomCompanies] = useState<Company[]>([]);
  const [_isLoadingCustomCompanies, setIsLoadingCustomCompanies] = useState(true);
  
  // Removed companies state
  const [removedCompanyIds, setRemovedCompanyIds] = useState<Set<number>>(new Set());
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [companyToRemove, setCompanyToRemove] = useState<Company | null>(null);
  
  // CMF Panel collapse state
  const [isCMFPanelCollapsed, setIsCMFPanelCollapsed] = useState<boolean>(false);
  
  // Company selection state
  const {
    selectedCompany,
    hoveredCompany,
    handleCompanySelect,
    handleCompanyHover,
    handleCompanySelectFromPanel,
  } = useCompanySelection();

  // Watchlist state and actions
  const {
    companyIds: watchlistCompanyIds,
    isLoading: watchlistLoading,
    error: watchlistError,
    toggleWatchlist,
    isInWatchlist,
    stats: watchlistStats,
    watchlistCompanies,
  } = useWatchlist({ 
    companies,
    onError: (error) => {
      // Handle watchlist errors gracefully
      console.warn('Watchlist error:', error.message);
    }
  });

  // Filter available companies (excluding removed ones)
  const availableCompanies = useMemo(() => {
    return companies.filter(company => !removedCompanyIds.has(company.id));
  }, [companies, removedCompanyIds]);

  // Filter companies based on view mode
  const displayedCompanies = useMemo(() => {
    if (viewMode === 'watchlist') {
      return watchlistCompanies.filter(company => !removedCompanyIds.has(company.id));
    }
    return availableCompanies;
  }, [availableCompanies, watchlistCompanies, viewMode, removedCompanyIds]);

  // Handle adding new company with persistence
  const handleAddCompany = useCallback(async (newCompany: Company) => {
    try {
      // Add to persistent storage
      const result = await addCustomCompany(newCompany, customCompanies);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add company');
      }
      
      // Update local state
      setCustomCompanies(result.companies);
      setCompanies(prev => {
        // Check if company already exists to avoid duplicates
        const exists = prev.some(c => c.id === newCompany.id || c.name.toLowerCase() === newCompany.name.toLowerCase());
        if (exists) {
          return prev;
        }
        return [...prev, newCompany];
      });
      
      // Auto-select the new company after brief delay
      setTimeout(() => {
        handleCompanySelect(newCompany);
      }, 1000);
      
      console.log('Company added and saved successfully:', newCompany.name);
    } catch (error) {
      console.error('Failed to add company:', error);
      throw error; // Re-throw to let modal handle the error
    }
  }, [customCompanies, handleCompanySelect]);

  // Handle LLM settings updates
  const handleLLMSettingsUpdated = useCallback(() => {
    setLLMConfigured(llmService.isConfigured());
  }, []);

  // Check if a company can be restored from removed companies
  const checkForRemovedCompany = useCallback((companyName: string): Company | null => {
    const removedCompany = companies.find(c => 
      c.name.toLowerCase() === companyName.toLowerCase() && 
      removedCompanyIds.has(c.id)
    );
    return removedCompany || null;
  }, [companies, removedCompanyIds]);

  // Restore a company from the removed list
  const restoreRemovedCompany = useCallback((company: Company) => {
    setRemovedCompanyIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(company.id);
      saveRemovedCompaniesToStorage(newSet);
      return newSet;
    });
    
    // Auto-select the restored company
    setTimeout(() => {
      handleCompanySelect(company);
    }, 1000);
    
    console.log('Company restored successfully:', company.name);
  }, [handleCompanySelect]);

  // Remove company functionality
  const removeCompany = useCallback((companyId: number) => {
    setRemovedCompanyIds(prev => {
      const newSet = new Set(prev);
      newSet.add(companyId);
      saveRemovedCompaniesToStorage(newSet);
      return newSet;
    });
    
    // Auto-remove from watchlist if present
    if (isInWatchlist(companyId)) {
      toggleWatchlist(companyId);
    }
    
    // Close company detail panel if the removed company was selected
    if (selectedCompany?.id === companyId) {
      handleCompanySelect(null);
    }
    
    // Close confirmation modal
    setShowRemoveConfirmation(false);
    setCompanyToRemove(null);
  }, [selectedCompany, handleCompanySelect, isInWatchlist, toggleWatchlist]);

  // Handle remove request from detail panel
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

  // Clean up duplicates function
  const cleanupDuplicates = useCallback(() => {
    setCompanies(prev => {
      const uniqueCompanies = prev.reduce((acc, company) => {
        const exists = acc.some(c => c.id === company.id || c.name.toLowerCase() === company.name.toLowerCase());
        if (!exists) {
          acc.push(company);
        }
        return acc;
      }, [] as Company[]);
      
      if (uniqueCompanies.length !== prev.length) {
        console.log(`Cleaned up ${prev.length - uniqueCompanies.length} duplicate companies`);
      }
      
      return uniqueCompanies;
    });
  }, []);

  // Run cleanup on mount
  useEffect(() => {
    cleanupDuplicates();
  }, [cleanupDuplicates]);

  // Load removed companies on mount
  useEffect(() => {
    const savedRemovedCompanies = loadRemovedCompaniesFromStorage();
    setRemovedCompanyIds(savedRemovedCompanies);
  }, []);

  // Load CMF panel collapse state on mount
  useEffect(() => {
    const panelState = loadPanelState();
    setIsCMFPanelCollapsed(panelState.cmfCollapsed);
  }, []);

  // Toggle CMF panel collapse state
  const toggleCMFPanel = useCallback(() => {
    const newState = !isCMFPanelCollapsed;
    setIsCMFPanelCollapsed(newState);
    savePanelState({ cmfCollapsed: newState });
  }, [isCMFPanelCollapsed]);

  // Handle view mode toggle
  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    // Clear selection when switching views to avoid confusion
    if (selectedCompany && newMode === 'watchlist' && !isInWatchlist(selectedCompany.id)) {
      handleCompanySelect(null);
    }
  };

  // Load custom companies on mount
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const { companies: savedCompanies, error } = loadCustomCompanies();
        
        if (error) {
          console.warn('Error loading custom companies:', error);
        }
        
        setCustomCompanies(savedCompanies);
        
        // Merge with initial companies, avoiding duplicates by ID
        const existingIds = new Set(initialCompanies.map(c => c.id));
        const newCustomCompanies = savedCompanies.filter(c => !existingIds.has(c.id));
        
        if (newCustomCompanies.length > 0) {
          setCompanies(prev => {
            // Add deduplication logic
            const existingIds = new Set(prev.map(c => c.id));
            const existingNames = new Set(prev.map(c => c.name.toLowerCase()));
            const uniqueNewCompanies = newCustomCompanies.filter(c => 
              !existingIds.has(c.id) && !existingNames.has(c.name.toLowerCase())
            );
            return [...prev, ...uniqueNewCompanies];
          });
        }
      } catch (error) {
        console.error('Failed to load custom companies:', error);
      } finally {
        setIsLoadingCustomCompanies(false);
      }
    };
    
    loadCompanies();
  }, [initialCompanies]);

  // Setup cross-tab synchronization
  useEffect(() => {
    const cleanup = setupCrossTabSync((syncedCompanies) => {
      setCustomCompanies(syncedCompanies);
      
      // Update main companies list with deduplication
      const allCompanies = [...initialCompanies, ...syncedCompanies];
      const uniqueCompanies = allCompanies.reduce((acc, company) => {
        const exists = acc.some(c => c.id === company.id || c.name.toLowerCase() === company.name.toLowerCase());
        if (!exists) {
          acc.push(company);
        }
        return acc;
      }, [] as Company[]);
      setCompanies(uniqueCompanies);
    });
    
    return cleanup;
  }, [initialCompanies]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Graph Area */}
      <div className="flex-1 relative">
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
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Explore Companies ({availableCompanies.length})</span>
            </button>
            <button
              onClick={() => handleViewModeChange('watchlist')}
              className={`w-56 px-4 py-3 font-medium transition-colors flex items-center justify-center space-x-2 whitespace-nowrap ${
                viewMode === 'watchlist'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span>Your Watchlist ({watchlistCompanyIds.size})</span>
            </button>
          </div>
        </div>

        {/* Settings & LLM Status */}
        <div className="absolute top-4 right-4 z-10 flex items-center space-x-3">
          {/* LLM Status Indicator */}
          {llmConfigured && (
            <div className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-full flex items-center shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span className="font-medium">{llmService.getSettings().provider.toUpperCase()} AI</span>
            </div>
          )}
          
          {/* Settings Button */}
          <button
            onClick={() => setShowLLMSettings(true)}
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 group"
            title="AI Settings"
          >
            <svg 
              className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        <CompanyGraph
          cmf={userCMF}
          companies={displayedCompanies}
          selectedCompany={selectedCompany}
          hoveredCompany={hoveredCompany}
          onCompanySelect={handleCompanySelect}
          onCompanyHover={handleCompanyHover}
          watchlistCompanyIds={watchlistCompanyIds}
          viewMode={viewMode}
        />
        
        {/* Collapsible CMF Panel */}
        <CollapsibleCMFPanel
          userCMF={userCMF}
          isCollapsed={isCMFPanelCollapsed}
          onToggle={toggleCMFPanel}
        />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Match Quality</h3>
          <div className="space-y-1 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>90%+ Excellent Match</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span>80-89% Good Match</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
              <span>70-79% Moderate Match</span>
            </div>
            <div className="flex items-center pt-2 border-t border-gray-200">
              <span className="text-red-500 font-bold mr-2">♥</span>
              <span>In Watchlist</span>
            </div>
          </div>
        </div>

        {/* Watchlist Empty State */}
        {viewMode === 'watchlist' && displayedCompanies.length === 0 && !watchlistLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No Companies in Watchlist
              </h3>
              <p className="text-gray-600 mb-4">
                Start building your watchlist by saving companies you're interested in.
              </p>
              <button
                onClick={() => handleViewModeChange('explore')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Explore Companies
              </button>
            </div>
          </div>
        )}

        {/* Watchlist Loading State */}
        {viewMode === 'watchlist' && watchlistLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your watchlist...</p>
            </div>
          </div>
        )}

        {/* Watchlist Error State */}
        {watchlistError && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg shadow">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{watchlistError}</span>
            </div>
          </div>
        )}

        {/* Add Company Button */}
        <div className="absolute bottom-6 right-6 z-10">
          <button
            onClick={() => setShowAddCompanyModal(true)}
            className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white 
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
      </div>

      {/* Side Panel */}
      <div className="w-96 bg-white border-l border-gray-200 overflow-hidden">
        <CompanyDetailPanel
          selectedCompany={selectedCompany}
          allCompanies={displayedCompanies}
          isInWatchlist={isInWatchlist}
          onToggleWatchlist={toggleWatchlist}
          onCompanySelect={handleCompanySelectFromPanel}
          onRequestDelete={handleRemoveRequest}
          viewMode={viewMode}
          watchlistStats={watchlistStats}
        />
      </div>

      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={showAddCompanyModal}
        onClose={() => setShowAddCompanyModal(false)}
        onAddCompany={handleAddCompany}
        onCheckForRemovedCompany={checkForRemovedCompany}
        onRestoreRemovedCompany={restoreRemovedCompany}
        userCMF={userCMF}
        existingCompanies={companies}
        onShowLLMSettings={() => setShowLLMSettings(true)}
      />

      {/* LLM Settings Modal */}
      <LLMSettingsModal
        isOpen={showLLMSettings}
        onClose={() => setShowLLMSettings(false)}
        onSettingsUpdated={handleLLMSettingsUpdated}
      />

      {/* Remove Company Modal */}
      <RemoveCompanyModal
        isOpen={showRemoveConfirmation}
        company={companyToRemove}
        onConfirm={handleRemoveConfirm}
        onCancel={handleRemoveCancel}
      />
    </div>
  );
};

export default CMFGraphExplorer;