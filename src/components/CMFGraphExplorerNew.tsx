import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ViewMode, Company, UserExplorationState } from '../types';
import { ExplorationStateManager } from '../services/ExplorationStateManager';
import { useIsMobile } from '../hooks/useIsMobile';
import { activeUserProfile } from '../data/companies';
import CompanyGraph from './CompanyGraph';
import CompanyDetailPanel, { CompanyDetailPanelHandle } from './CompanyDetailPanel';
import AddCompanyModal from './AddCompanyModal';
import SettingsViewModal from './SettingsViewModal';
import { RemoveCompanyModal } from './RemoveCompanyModal';
import EmptyWatchlistModal from './EmptyWatchlistModal';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import { SpeedDialFAB } from './SpeedDialFAB';
import { BatchImportPlaceholderModal } from './BatchImportPlaceholderModal';
import { PasteCompanyListModal } from './PasteCompanyListModal';
import { llmService } from '../utils/llm/service';
import { loadPanelState, savePanelState } from '../utils/panelStorage';
import CollapsibleCMFPanel from './CollapsibleCMFPanel';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
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


interface CMFGraphExplorerProps {
  userProfile?: UserExplorationState | null;
}

/**
 * CMFGraphExplorer - Enhanced with persistent exploration state
 * 
 * Uses ExplorationStateManager for centralized state management.
 * All exploration data (added companies, watchlist, removed companies) 
 * is loaded from provided userProfile or defaults to companies.ts.
 */
const CMFGraphExplorer: React.FC<CMFGraphExplorerProps> = ({ userProfile }) => {
  // Mobile detection
  const isMobile = useIsMobile();

  // Initialize state manager from provided profile or default
  const [stateManager, setStateManager] = useState(() => new ExplorationStateManager(userProfile || activeUserProfile, 'teeKProfile'));

  // Update state manager when userProfile changes
  useEffect(() => {
    if (userProfile) {
      console.log('🔄 Updating state manager with new user profile:', userProfile);
      setStateManager(new ExplorationStateManager(userProfile, 'teeKProfile'));
    }
  }, [userProfile]);

  // UI state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [hoveredCompany, setHoveredCompany] = useState<Company | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('explore');
  const [mobileView, setMobileView] = useState<'cosmos' | 'list' | 'detail'>('cosmos');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [showLLMSettings, setShowLLMSettings] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [llmConfigured, setLLMConfigured] = useState(llmService.isConfigured());
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [companyToRemove, setCompanyToRemove] = useState<Company | null>(null);
  
  // Panel state - default to collapsed for cleaner UI
  const [isCMFPanelCollapsed, setIsCMFPanelCollapsed] = useState<boolean>(true);

  // Force re-render trigger for state changes
  const [stateVersion, setStateVersion] = useState(0);
  const forceUpdate = useCallback(() => setStateVersion(v => v + 1), []);

  // Separate version counter for companies data (add/remove companies, not selection)
  const [companiesVersion, setCompaniesVersion] = useState(0);
  const forceCompaniesUpdate = useCallback(() => {
    setCompaniesVersion(v => v + 1);
    setStateVersion(v => v + 1); // Also trigger general state update
  }, []);

  // Track pending company selection after state update
  const [pendingSelectionId, setPendingSelectionId] = useState<number | null>(null);

  // Separate state for watchlist-only updates (sidebar stats, etc.)
  const [, setWatchlistUpdateTrigger] = useState(0);
  const triggerWatchlistUpdate = useCallback(() => setWatchlistUpdateTrigger(v => v + 1), []);

  // Track companies that are fading out (added to watchlist in Explore mode)
  const [fadingCompanyIds, setFadingCompanyIds] = useState<Set<number>>(new Set());

  // Refs for keyboard shortcuts
  const companyDetailPanelRef = useRef<CompanyDetailPanelHandle>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'a',
        description: 'Add company',
        action: () => setShowAddCompanyModal(true),
        condition: () => !showAddCompanyModal && !showLLMSettings && !showRemoveConfirmation && !showKeyboardShortcuts,
      },
      {
        key: '/',
        description: 'Focus search',
        action: () => companyDetailPanelRef.current?.focusSearch(),
        condition: () => !showAddCompanyModal && !showLLMSettings && !showRemoveConfirmation && !showKeyboardShortcuts,
      },
      {
        key: 'e',
        description: 'Switch to Explore tab',
        action: () => handleViewModeChange('explore'),
        condition: () => !showAddCompanyModal && !showLLMSettings && !showRemoveConfirmation && !showKeyboardShortcuts,
      },
      {
        key: 'w',
        description: 'Switch to Watchlist tab',
        action: () => handleViewModeChange('watchlist'),
        condition: () => !showAddCompanyModal && !showLLMSettings && !showRemoveConfirmation && !showKeyboardShortcuts,
      },
      {
        key: '?',
        description: 'Show keyboard shortcuts',
        action: () => setShowKeyboardShortcuts(true),
        condition: () => !showAddCompanyModal && !showLLMSettings && !showRemoveConfirmation && !showKeyboardShortcuts,
        modifiers: { shift: true }, // '?' requires shift key
      },
    ],
  });

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

  const allCompanies = useMemo(() => {
    return stateManager.getAllCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateManager, companiesVersion]); // Only recalculate when companies data changes (add/remove)

  // Get companies for display based on view mode - only recalculate when companies or view changes
  // Also include fading companies so they can animate out smoothly
  const displayedCompanies = useMemo(() => {
    const baseCompanies = stateManager.getDisplayedCompanies();

    // Add back fading companies in both modes so they can animate out
    // - In Explore mode: fading companies are being added to watchlist
    // - In Watchlist mode: fading companies are being removed from watchlist
    if (fadingCompanyIds.size > 0) {
      const fadingCompanies = allCompanies.filter(c => fadingCompanyIds.has(c.id));
      return [...baseCompanies, ...fadingCompanies];
    }

    return baseCompanies;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateManager, companiesVersion, viewMode, fadingCompanyIds, allCompanies]); // Only when companies/view changes

  const watchlistStats = useMemo(() => {
    return stateManager.getWatchlistStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateManager, stateVersion]); // Force recalculation on state changes

  // Count of companies in Explore mode (not in watchlist)
  const exploreCompaniesCount = useMemo(() => {
    return allCompanies.filter(c => !stateManager.isInWatchlist(c.id)).length;
  }, [allCompanies, stateManager, stateVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== COMPANY SELECTION =====

  const handleCompanySelect = useCallback((company: Company | null) => {
    setSelectedCompany(company);
    // Only update state manager for selection without triggering re-render
    if (company) {
      stateManager.setSelectedCompany(company.id);
      // On mobile, switch to detail view when selecting a company
      if (isMobile) {
        setMobileView('detail');
      }
    } else {
      stateManager.setSelectedCompany(null);
      // On mobile, go back to cosmos view when deselecting
      if (isMobile && mobileView === 'detail') {
        setMobileView('cosmos');
      }
    }
  }, [stateManager, isMobile, mobileView]);

  const handleCompanyHover = useCallback((company: Company | null) => {
    setHoveredCompany(company);
  }, []);

  const handleCompanySelectFromPanel = useCallback((company: Company | null) => {
    handleCompanySelect(company);
  }, [handleCompanySelect]);

  // Handle pending company selection after state updates
  useEffect(() => {
    if (pendingSelectionId !== null) {
      // Wait a frame to ensure React has finished rendering with the updated companies list
      requestAnimationFrame(() => {
        const companyFromState = stateManager.getAllCompanies().find(c => c.id === pendingSelectionId);
        if (companyFromState) {
          console.log('✅ Selecting newly added company:', companyFromState.name);
          handleCompanySelect(companyFromState);
        } else {
          console.warn('⚠️ Could not find company with ID:', pendingSelectionId);
        }
        setPendingSelectionId(null);
      });
    }
  }, [pendingSelectionId, stateManager, handleCompanySelect, stateVersion]);

  // ===== WATCHLIST MANAGEMENT =====

  // Helper to check if a position has no collisions with existing companies
  const isPositionValid = useCallback((angle: number, distance: number, existingCompanies: Company[]): boolean => {
    const minAngleSeparation = 10; // 10 degrees
    const minDistanceSeparation = 50; // 50 pixels

    return !existingCompanies.some(existing => {
      if (!existing.angle || !existing.distance) return false;

      const angleDiff = Math.min(
        Math.abs(angle - existing.angle),
        360 - Math.abs(angle - existing.angle)
      );

      const distanceDiff = Math.abs(distance - existing.distance);

      // Check for both angle and distance conflicts
      return (angleDiff < minAngleSeparation && distanceDiff < minDistanceSeparation);
    });
  }, []);

  // Helper to recalculate position for a company when moving to a different view
  const recalculatePositionForView = useCallback((company: Company, targetView: 'explore' | 'watchlist'): Company => {
    const { findSmartPositioningSolution } = require('../utils/smartPositioning');
    const { calculateDistanceFromScore } = require('../utils/companyPositioning');

    // Get companies in the target view
    const viewFilteredCompanies = targetView === 'watchlist'
      ? allCompanies.filter(c => c.id !== company.id && stateManager.isInWatchlist(c.id))
      : allCompanies.filter(c => c.id !== company.id && !stateManager.isInWatchlist(c.id));

    console.log(`🔍 Filtering companies for ${targetView}:`);
    console.log(`   Total companies: ${allCompanies.length}`);
    console.log(`   Filtered companies: ${viewFilteredCompanies.length}`);
    console.log(`   Companies in view: ${viewFilteredCompanies.map(c => c.name).join(', ')}`);
    const adyenCompany = viewFilteredCompanies.find(c => c.name.toLowerCase() === 'adyen');
    console.log(`   Looking for adyen: ${adyenCompany ? `FOUND at angle=${adyenCompany.angle}°, distance=${adyenCompany.distance}px` : 'NOT FOUND'}`);

    // Try to preserve current position if it's valid in the target view
    const currentAngle = company.angle;
    const currentDistance = company.distance;
    const targetDistance = calculateDistanceFromScore(company.matchScore);

    // Check if we can keep the same position:
    // 1. Company has a current position
    // 2. Current distance matches target distance (within tolerance)
    // 3. No collision with existing companies in target view
    if (currentAngle !== undefined && currentDistance !== undefined) {
      const distanceDeviation = Math.abs(currentDistance - targetDistance);

      if (distanceDeviation < 20 && isPositionValid(currentAngle, currentDistance, viewFilteredCompanies)) {
        console.log(`✅ Preserving position for ${company.name} in ${targetView}: ${currentAngle}°, ${currentDistance}px (no conflicts)`);

        const updatedCompany = {
          ...company,
          ...(targetView === 'explore'
            ? { explorePosition: { angle: currentAngle, distance: currentDistance } }
            : { watchlistPosition: { angle: currentAngle, distance: currentDistance } }
          )
        };

        return updatedCompany;
      }
    }

    // Position not valid or doesn't exist - calculate new position
    console.log(`🔄 Recalculating position for ${company.name} in ${targetView} (current position invalid or doesn't exist)`);

    const positioningSolution = findSmartPositioningSolution(company, viewFilteredCompanies, targetView);
    const { angle, distance } = positioningSolution.newCompany;

    // Store in view-specific position
    const updatedCompany = {
      ...company,
      ...(targetView === 'explore'
        ? { explorePosition: { angle: angle!, distance: distance! } }
        : { watchlistPosition: { angle: angle!, distance: distance! } }
      )
    };

    console.log(`📍 New position for ${company.name} in ${targetView}: ${angle}°, ${distance}px`);
    return updatedCompany;
  }, [allCompanies, stateManager, isPositionValid]);

  // Centralized fade-out helper for smooth transitions
  const startFadeOut = useCallback((companyId: number) => {
    // Add to fading set
    setFadingCompanyIds(prev => new Set(prev).add(companyId));

    // After 4 seconds, remove from fading set (but keep selected)
    setTimeout(() => {
      setFadingCompanyIds(prev => {
        const next = new Set(prev);
        next.delete(companyId);
        return next;
      });

      // Force update to remove from graph (company stays selected in detail panel)
      forceCompaniesUpdate();
    }, 4000); // 4 second fade-out
  }, [forceCompaniesUpdate]);

  const handleToggleWatchlist = useCallback((companyId: number) => {
    const wasInWatchlist = stateManager.isInWatchlist(companyId);
    const company = allCompanies.find(c => c.id === companyId);

    if (!company) return;

    // Toggle watchlist status FIRST so that recalculation sees the correct state
    stateManager.toggleWatchlist(companyId);

    // Recalculate position for the target view (now with updated watchlist state)
    const targetView = wasInWatchlist ? 'explore' : 'watchlist';
    const companyWithNewPosition = recalculatePositionForView(company, targetView);

    // Update company in state manager with new position
    stateManager.updateCompany(companyWithNewPosition);

    // Show toast notification
    if (!wasInWatchlist && company) {
      // Added to watchlist
      const { toast } = require('sonner');
      toast.success(`${company.name} moved to Watchlist`, {
        description: 'Switch to Watchlist tab to see all saved companies',
        duration: 3000,
      });

      // If it was fading (being removed), cancel the fade and show immediately
      if (fadingCompanyIds.has(companyId)) {
        setFadingCompanyIds(prev => {
          const next = new Set(prev);
          next.delete(companyId);
          return next;
        });
        // Force update to show company back in Watchlist immediately
        forceUpdate();
      } else if (viewMode === 'explore') {
        // Start fade-out animation in Explore mode
        startFadeOut(companyId);
      } else {
        // In Watchlist mode, just force update to show it
        forceUpdate();
      }
    } else if (company) {
      // Removed from watchlist - fade out from Watchlist, reappear in Explore
      const { toast } = require('sonner');
      toast(`${company.name} removed from Watchlist`, {
        description: 'Company is back in Explore tab',
        duration: 3000,
      });

      // If it was already fading (e.g., added then removed quickly), stop the fade and reset
      if (fadingCompanyIds.has(companyId)) {
        setFadingCompanyIds(prev => {
          const next = new Set(prev);
          next.delete(companyId);
          return next;
        });
        // Force update to show company back immediately
        forceUpdate();
      } else if (viewMode === 'watchlist') {
        // Start fade-out animation in Watchlist mode (company will reappear in Explore)
        startFadeOut(companyId);
      } else {
        // In Explore mode, just force update to show it
        forceUpdate();
      }
    }

    // Trigger minimal update for sidebar stats without affecting graph rendering
    triggerWatchlistUpdate();
  }, [stateManager, triggerWatchlistUpdate, forceUpdate, viewMode, allCompanies, fadingCompanyIds, startFadeOut, recalculatePositionForView]);

  const isInWatchlist = useCallback((companyId: number): boolean => {
    return stateManager.isInWatchlist(companyId);
  }, [stateManager]);

  // ===== COMPANY MANAGEMENT =====

  const handleAddCompany = useCallback(async (newCompany: Company) => {
    try {
      const addedCompany = stateManager.addCompany(newCompany);
      console.log('Company added successfully:', addedCompany.name, 'with ID:', addedCompany.id);

      // Auto-add to watchlist if in watchlist view mode
      if (viewMode === 'watchlist') {
        stateManager.toggleWatchlist(addedCompany.id);
        console.log('Auto-added to watchlist:', addedCompany.name);
      }

      // Set pending selection ID and trigger re-render
      // The useEffect will handle selecting the company after React finishes rendering
      setPendingSelectionId(addedCompany.id);
      forceCompaniesUpdate(); // Force re-render to show new company
    } catch (error) {
      console.error('Failed to add company:', error);
      throw error; // Re-throw to let modal handle the error
    }
  }, [stateManager, forceCompaniesUpdate, viewMode]);

  const handleBatchAddCompanies = useCallback(async (companiesData: Array<{ name: string; logo: string; careerUrl?: string; domain?: string }>) => {
    try {
      console.log(`🚀 Starting batch import of ${companiesData.length} companies`);

      const { toast } = await import('sonner');
      const userCMF = stateManager.getUserCMF();

      let successCount = 0;
      let failureCount = 0;

      // Import each company with full LLM analysis
      for (const companyData of companiesData) {
        try {
          console.log(`📊 Analyzing ${companyData.name}...`);

          let fullCompanyData;

          if (llmService.isConfigured()) {
            const llmResponse = await llmService.analyzeCompany({
              companyName: companyData.name,
              userCMF: {
                targetRole: userCMF.targetRole || 'Exploring career opportunities',
                mustHaves: userCMF.mustHaves || [],
                wantToHave: userCMF.wantToHave || [],
                experience: userCMF.experience || [],
                targetCompanies: userCMF.targetCompanies || 'Open to exploring various companies and industries'
              },
              isNewUser: !userCMF.targetRole && userCMF.mustHaves.length === 0
            });

            if (llmResponse.success && llmResponse.data) {
              fullCompanyData = llmResponse.data;
            } else {
              console.warn(`LLM analysis failed for ${companyData.name}, skipping`);
              failureCount++;
              continue; // Skip this company
            }
          } else {
            console.warn(`LLM not configured, skipping ${companyData.name}`);
            failureCount++;
            continue; // Skip this company
          }

          // Get current companies for positioning (view-specific)
          const currentCompanies = stateManager.getAllCompanies();
          const viewFilteredCompanies = viewMode === 'watchlist'
            ? currentCompanies.filter(c => stateManager.isInWatchlist(c.id))
            : currentCompanies.filter(c => !stateManager.isInWatchlist(c.id));

          // Map connection names to IDs
          const { mapConnectionsToExistingCompanies, resolveCareerUrl } = require('../utils/companyPositioning');
          const connectionTypesForMapping = fullCompanyData.connectionTypes || {};
          const baseCompanyForMapping = {
            id: Date.now() + successCount,
            name: fullCompanyData.name,
            connectionTypes: connectionTypesForMapping
          };
          const connectionMapping = mapConnectionsToExistingCompanies(baseCompanyForMapping as Company, currentCompanies);

          // Resolve career URL using centralized priority logic
          const careerUrl = resolveCareerUrl(
            companyData.careerUrl,      // From extraction API (filtered)
            fullCompanyData.careerUrl,  // From analysis API (LLM confident)
            fullCompanyData.name,       // Company name for fallback
            companyData.domain          // Domain for fallback
          );

          // Create full Company object
          const newCompany: Company = {
            id: Date.now() + successCount,
            name: fullCompanyData.name,
            logo: companyData.logo,
            careerUrl,
            matchScore: fullCompanyData.matchScore,
            industry: fullCompanyData.industry,
            stage: fullCompanyData.stage,
            location: fullCompanyData.location,
            employees: fullCompanyData.employees,
            remote: fullCompanyData.remote,
            openRoles: fullCompanyData.openRoles,
            connections: connectionMapping.connections,
            connectionTypes: connectionMapping.connectionTypes,
            matchReasons: fullCompanyData.matchReasons,
            color: `hsl(${(successCount * 360) / companiesData.length}, 70%, 60%)`,
            // Include LLM-inferred website URL from batch import
            externalLinks: companyData.domain ? {
              website: companyData.domain.startsWith('http') ? companyData.domain : `https://${companyData.domain}`
            } : undefined
          };

          // Calculate smart position for this company
          const { findSmartPositioningSolution } = require('../utils/smartPositioning');
          const positioningSolution = findSmartPositioningSolution(newCompany, viewFilteredCompanies, viewMode);

          // Apply position to company
          const positionedCompany = {
            ...positioningSolution.newCompany,
            ...(viewMode === 'explore'
              ? { explorePosition: { angle: positioningSolution.newCompany.angle!, distance: positioningSolution.newCompany.distance! } }
              : { watchlistPosition: { angle: positioningSolution.newCompany.angle!, distance: positioningSolution.newCompany.distance! } }
            )
          };

          // Add company to state
          const addedCompany = stateManager.addCompany(positionedCompany);

          // Auto-add to watchlist if in watchlist view mode
          if (viewMode === 'watchlist') {
            stateManager.toggleWatchlist(addedCompany.id);
          }

          successCount++;
          console.log(`✅ Added ${companyData.name} (${successCount}/${companiesData.length})`);

          // Force re-render to show this company
          forceCompaniesUpdate();

        } catch (error) {
          console.error(`❌ Failed to import ${companyData.name}:`, error);
          failureCount++;
        }
      }

      // Dismiss loading toast and show result
      toast.dismiss('batch-import');

      if (failureCount === 0) {
        toast.success(`Successfully imported ${successCount} ${successCount === 1 ? 'company' : 'companies'}`);
      } else {
        toast.warning(`Imported ${successCount} companies`, {
          description: `${failureCount} ${failureCount === 1 ? 'company' : 'companies'} failed to import`
        });
      }

    } catch (error) {
      console.error('Batch import error:', error);
      const { toast } = await import('sonner');
      toast.dismiss('batch-import');
      toast.error('Failed to import companies', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
    }
  }, [stateManager, forceCompaniesUpdate, viewMode]);

  const handleBatchUpdateCompanies = useCallback(async (updatedCompanies: Company[]) => {
    try {
      console.log('🎯 Performing batch company update with smart repositioning');

      // Find the newly added company BEFORE updating (the one not in existing companies)
      const existingIds = new Set(stateManager.getAllCompanies().map(c => c.id));
      const newCompany = updatedCompanies.find(c => !existingIds.has(c.id));

      // Update all companies in the state manager
      updatedCompanies.forEach(company => {
        if (existingIds.has(company.id)) {
          // Update existing company
          stateManager.updateCompany(company);
        } else {
          // Add new company
          stateManager.addCompany(company);
        }
      });

      // Auto-add new company to watchlist if in watchlist view mode
      if (newCompany && viewMode === 'watchlist') {
        stateManager.toggleWatchlist(newCompany.id);
        console.log('Auto-added to watchlist:', newCompany.name);
      }

      console.log(`📊 Batch update completed: ${updatedCompanies.length} companies repositioned`);

      // Set pending selection for the new company and trigger re-render
      // The useEffect will handle selecting the company after React finishes rendering
      if (newCompany) {
        setPendingSelectionId(newCompany.id);
      }
      forceCompaniesUpdate(); // Force re-render to show repositioned companies
    } catch (error) {
      console.error('Failed to batch update companies:', error);
      throw error; // Re-throw to let modal handle the error
    }
  }, [stateManager, forceCompaniesUpdate, viewMode]);

  const removeCompany = useCallback((companyId: number) => {
    stateManager.removeCompany(companyId);
    
    // Clear selection if removed company was selected
    if (selectedCompany?.id === companyId) {
      handleCompanySelect(null);
    }
    
    // Close confirmation modal
    setShowRemoveConfirmation(false);
    setCompanyToRemove(null);
    forceCompaniesUpdate(); // Force re-render to update UI
  }, [stateManager, selectedCompany, handleCompanySelect, forceCompaniesUpdate]);

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
    forceCompaniesUpdate(); // Force re-render to show restored company
    
    // Auto-select the restored company
    setTimeout(() => {
      handleCompanySelect(company);
    }, 1000);
    
    console.log('Company restored successfully:', company.name);
  }, [stateManager, forceCompaniesUpdate, handleCompanySelect]);

  // ===== VIEW MODE MANAGEMENT =====

  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    setViewMode(newMode);
    stateManager.setViewMode(newMode);

    // Always clear selection when switching views
    if (selectedCompany) {
      handleCompanySelect(null);
    }

    forceUpdate(); // Force re-render for new view
  }, [stateManager, selectedCompany, handleCompanySelect, forceUpdate]);

  // ===== PANEL MANAGEMENT =====

  const toggleCMFPanel = useCallback(() => {
    const newState = !isCMFPanelCollapsed;
    setIsCMFPanelCollapsed(newState);
    savePanelState({ cmfCollapsed: newState });
  }, [isCMFPanelCollapsed]);

  // ===== LLM SETTINGS =====

  // Update LLM configured status on mount and periodically
  useEffect(() => {
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
      {/* Main Graph Area - on mobile: only show when in cosmos view */}
      {(!isMobile || mobileView === 'cosmos') && (
        <div className="flex-1 relative">
        {/* Mobile: Company List Toggle Button - bottom left, matching FAB style */}
        {isMobile && (
          <button
            onClick={() => setMobileView(mobileView === 'list' ? 'cosmos' : 'list')}
            className="absolute bottom-6 left-6 z-10 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white
              rounded-full shadow-lg hover:shadow-xl
              transition-all duration-200 ease-in-out
              flex items-center justify-center
              hover:scale-105 active:scale-95
              focus:outline-none focus:ring-4 focus:ring-blue-600 focus:ring-opacity-50"
            aria-label={mobileView === 'list' ? 'Show cosmos view' : 'Show company list'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* View Mode Toggle - Floating mini-tabs on mobile, full tabs on desktop */}
        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-lg shadow-lg overflow-hidden ${
          isMobile ? 'scale-90' : ''
        }`}>
          <div className="flex">
            <button
              onClick={() => handleViewModeChange('explore')}
              className={`${isMobile ? 'px-3 py-2 text-xs' : 'w-56 px-4 py-3 text-base'} font-medium transition-colors flex items-center justify-center space-x-1 whitespace-nowrap ${
                viewMode === 'explore'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <SearchIcon />
              <span>{isMobile ? `Explore (${exploreCompaniesCount})` : `Explore Companies (${exploreCompaniesCount})`}</span>
            </button>
            <button
              onClick={() => handleViewModeChange('watchlist')}
              className={`${isMobile ? 'px-3 py-2 text-xs' : 'w-56 px-4 py-3 text-base'} font-medium transition-colors flex items-center justify-center space-x-1 whitespace-nowrap ${
                viewMode === 'watchlist'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <HeartIcon />
              <span>{isMobile ? `Saved (${watchlistStats.totalCompanies})` : `Your Watchlist (${watchlistStats.totalCompanies})`}</span>
            </button>
          </div>
        </div>

        {/* CMF Panel - hidden on mobile */}
        {!isMobile && (
          <CollapsibleCMFPanel
            userCMF={userCMF}
            isCollapsed={isCMFPanelCollapsed}
            onToggle={toggleCMFPanel}
          />
        )}

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
          hideCenter={viewMode === 'watchlist' && stateManager.getCurrentState().watchlistCompanyIds.length === 0}
          fadingCompanyIds={fadingCompanyIds}
        />

        {/* Speed Dial FAB */}
        <div className="absolute bottom-6 right-6">
          <SpeedDialFAB
            onAddCompany={() => setShowAddCompanyModal(true)}
            onPasteList={() => setShowPasteModal(true)}
            onScreenshotImport={() => setShowScreenshotModal(true)}
          />
        </div>

        {/* LLM Settings - hidden on mobile */}
        {!isMobile && (
          <div className="absolute bottom-6 left-6 z-10 flex items-center space-x-2">
            <button
              onClick={() => setShowLLMSettings(true)}
              className={`w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95 focus:outline-none ${
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
        )}
        </div>
      )}

      {/* Side Panel - Desktop: always visible, Mobile: only when in list or detail view */}
      {(!isMobile || mobileView === 'list' || mobileView === 'detail') && (
        <div className={`
          ${isMobile && (mobileView === 'list' || mobileView === 'detail')
            ? 'fixed inset-0 z-50 animate-slide-in-right'
            : 'w-96'}
          bg-white border-l border-gray-200 overflow-hidden
        `}>
          {/* Mobile: Back button for list and detail views */}
          {isMobile && (mobileView === 'list' || mobileView === 'detail') && (
            <button
              onClick={() => {
                setMobileView('cosmos');
                if (mobileView === 'detail') {
                  setSelectedCompany(null);
                }
              }}
              className="absolute top-4 left-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg"
              aria-label="Back to cosmos view"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <CompanyDetailPanel
            ref={companyDetailPanelRef}
            selectedCompany={mobileView === 'list' ? null : selectedCompany}
            allCompanies={allCompanies}
            onCompanySelect={handleCompanySelectFromPanel}
            isInWatchlist={isInWatchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onRequestDelete={handleRemoveRequest}
            viewMode={viewMode}
            watchlistStats={watchlistStats}
            userCMF={stateManager.getUserCMF()}
          />
        </div>
      )}

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
          onCompanySelect={handleCompanySelect}
          onToggleWatchlist={handleToggleWatchlist}
          isInWatchlist={isInWatchlist}
          userCMF={userCMF}
          viewMode={viewMode}
        />
      )}

      {showLLMSettings && (
        <SettingsViewModal
          isOpen={showLLMSettings}
          onClose={() => setShowLLMSettings(false)}
          onShowKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
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

      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Paste Company List Modal */}
      <PasteCompanyListModal
        isOpen={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        onImportCompanies={handleBatchAddCompanies}
        existingCompanies={stateManager.getAllCompanies()}
        viewMode={viewMode}
        onShowLLMSettings={() => setShowLLMSettings(true)}
      />

      {/* Screenshot Import Placeholder Modal */}
      <BatchImportPlaceholderModal
        isOpen={showScreenshotModal}
        onClose={() => setShowScreenshotModal(false)}
        type="screenshot"
      />

      <EmptyWatchlistModal
        isOpen={viewMode === 'watchlist' && stateManager.getCurrentState().watchlistCompanyIds.length === 0}
        onGoToExplore={() => handleViewModeChange('explore')}
      />
    </div>
  );
};

export default CMFGraphExplorer;