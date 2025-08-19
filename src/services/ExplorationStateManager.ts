import { Company, UserExplorationState, WatchlistStats } from '../types';
import { writeStateToDisk, checkDevServerAvailable, logFileWriteInstructions } from '../utils/devFileWriter';

/**
 * ExplorationStateManager
 * 
 * Manages all user exploration state including:
 * - Company additions and removals
 * - Watchlist management
 * - View mode and selection state
 * - State persistence and restoration
 * 
 * Serves as the single source of truth for user exploration data,
 * loading initial state from companies.ts and persisting changes.
 */
export class ExplorationStateManager {
  private currentState: UserExplorationState;
  private devServerAvailable = false;
  private profileName: string;
  
  constructor(initialState: UserExplorationState, profileName = 'teeKProfile') {
    this.currentState = this.cloneState(initialState);
    this.profileName = profileName;
    this.checkDevServer();
    this.logStateInfo();
  }

  /**
   * Check if development file server is available
   */
  private async checkDevServer(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      this.devServerAvailable = await checkDevServerAvailable();
      if (this.devServerAvailable) {
        console.log('🔧 Development file server detected - automatic companies.ts updates enabled');
      } else {
        console.log('ℹ️ Development file server not available - run `node dev-server.js` to enable automatic file updates');
        logFileWriteInstructions(this.currentState);
      }
    }
  }

  // ===== COMPANY MANAGEMENT =====

  /**
   * Get all available companies (base + added - removed)
   */
  getAllCompanies(): Company[] {
    const allCompanies = [
      ...this.currentState.baseCompanies,
      ...this.currentState.addedCompanies
    ];
    
    return allCompanies.filter(company => 
      !this.currentState.removedCompanyIds.includes(company.id)
    );
  }

  /**
   * Get companies for current view mode
   */
  getDisplayedCompanies(): Company[] {
    const allCompanies = this.getAllCompanies();
    
    if (this.currentState.viewMode === 'watchlist') {
      return allCompanies.filter(company =>
        this.currentState.watchlistCompanyIds.includes(company.id)
      );
    }
    
    return allCompanies;
  }

  /**
   * Add a new company to the exploration
   */
  addCompany(company: Company): Company {
    // Ensure unique ID
    const maxId = Math.max(
      ...this.currentState.baseCompanies.map(c => c.id),
      ...this.currentState.addedCompanies.map(c => c.id),
      1000 // Minimum for added companies
    );
    
    const newCompany = { ...company, id: maxId + 1 };
    this.currentState.addedCompanies.push(newCompany);
    this.persistState();
    
    console.log(`Added company: ${newCompany.name} (ID: ${newCompany.id})`);
    return newCompany;
  }

  /**
   * Remove a company from exploration
   */
  removeCompany(companyId: number): void {
    // Add to removed list if not already there
    if (!this.currentState.removedCompanyIds.includes(companyId)) {
      this.currentState.removedCompanyIds.push(companyId);
    }
    
    // Remove from watchlist if present
    const watchlistIndex = this.currentState.watchlistCompanyIds.indexOf(companyId);
    if (watchlistIndex !== -1) {
      this.currentState.watchlistCompanyIds.splice(watchlistIndex, 1);
    }
    
    // Clear selection if removed company was selected
    if (this.currentState.lastSelectedCompanyId === companyId) {
      this.currentState.lastSelectedCompanyId = undefined;
    }
    
    this.persistState();
    
    const company = this.findCompanyById(companyId);
    console.log(`Removed company: ${company?.name || 'Unknown'} (ID: ${companyId})`);
  }

  /**
   * Check if a company has been removed
   */
  isCompanyRemoved(companyId: number): boolean {
    return this.currentState.removedCompanyIds.includes(companyId);
  }

  /**
   * Restore a removed company
   */
  restoreCompany(companyId: number): void {
    const index = this.currentState.removedCompanyIds.indexOf(companyId);
    if (index !== -1) {
      this.currentState.removedCompanyIds.splice(index, 1);
      this.persistState();
      
      const company = this.findCompanyById(companyId);
      console.log(`Restored company: ${company?.name || 'Unknown'} (ID: ${companyId})`);
    }
  }

  // ===== WATCHLIST MANAGEMENT =====

  /**
   * Check if a company is in the watchlist
   */
  isInWatchlist(companyId: number): boolean {
    return this.currentState.watchlistCompanyIds.includes(companyId);
  }

  /**
   * Toggle a company in/out of the watchlist
   */
  toggleWatchlist(companyId: number): boolean {
    const index = this.currentState.watchlistCompanyIds.indexOf(companyId);
    let isAdded: boolean;
    
    if (index === -1) {
      this.currentState.watchlistCompanyIds.push(companyId);
      isAdded = true;
    } else {
      this.currentState.watchlistCompanyIds.splice(index, 1);
      isAdded = false;
    }
    
    this.persistState();
    
    const company = this.findCompanyById(companyId);
    console.log(`${isAdded ? 'Added to' : 'Removed from'} watchlist: ${company?.name || 'Unknown'}`);
    
    return isAdded;
  }

  /**
   * Get watchlist companies
   */
  getWatchlistCompanies(): Company[] {
    return this.getAllCompanies().filter(company =>
      this.currentState.watchlistCompanyIds.includes(company.id)
    );
  }

  /**
   * Get watchlist statistics
   */
  getWatchlistStats(): WatchlistStats {
    const watchlistCompanies = this.getWatchlistCompanies();
    const excellentMatches = watchlistCompanies.filter(c => c.matchScore >= 90).length;
    const totalOpenRoles = watchlistCompanies.reduce((sum, c) => sum + c.openRoles, 0);
    
    return {
      totalCompanies: watchlistCompanies.length,
      excellentMatches,
      totalOpenRoles,
      lastActivity: watchlistCompanies.length > 0 ? new Date() : null
    };
  }

  // ===== UI STATE MANAGEMENT =====

  /**
   * Set the selected company
   */
  setSelectedCompany(companyId: number | null): void {
    this.currentState.lastSelectedCompanyId = companyId || undefined;
    // Only save selection to localStorage, not to disk to avoid HMR cycles
    localStorage.setItem('cmf-exploration-state', JSON.stringify(this.currentState));
    
    if (companyId) {
      const company = this.findCompanyById(companyId);
      console.log(`Selected company: ${company?.name || 'Unknown'} (ID: ${companyId})`);
    } else {
      console.log('Cleared company selection');
    }
  }

  /**
   * Get the currently selected company
   */
  getSelectedCompany(): Company | null {
    if (!this.currentState.lastSelectedCompanyId) return null;
    
    return this.getAllCompanies().find(
      c => c.id === this.currentState.lastSelectedCompanyId
    ) || null;
  }

  /**
   * Set the view mode (explore or watchlist)
   */
  setViewMode(mode: 'explore' | 'watchlist'): void {
    this.currentState.viewMode = mode;
    this.persistState();
    console.log(`View mode changed to: ${mode}`);
  }

  /**
   * Get the current view mode
   */
  getViewMode(): 'explore' | 'watchlist' {
    return this.currentState.viewMode;
  }

  // ===== STATE ACCESS =====

  /**
   * Get the user's CMF data
   */
  getUserCMF() {
    return this.currentState.cmf;
  }

  /**
   * Get complete current state (for development/debugging)
   */
  getCurrentState(): UserExplorationState {
    return this.cloneState(this.currentState);
  }

  /**
   * Get exploration statistics
   */
  getExplorationStats() {
    const allCompanies = this.getAllCompanies();
    const baseCompanies = this.currentState.baseCompanies;
    const addedCompanies = this.currentState.addedCompanies;
    const removedCount = this.currentState.removedCompanyIds.length;
    const watchlistCount = this.currentState.watchlistCompanyIds.length;

    return {
      total: allCompanies.length,
      base: baseCompanies.length,
      added: addedCompanies.length,
      removed: removedCount,
      watchlisted: watchlistCount,
      viewed: this.currentState.viewMode
    };
  }

  // ===== UTILITIES =====

  /**
   * Find a company by ID across all company sources
   */
  private findCompanyById(id: number): Company | undefined {
    return [...this.currentState.baseCompanies, ...this.currentState.addedCompanies]
      .find(company => company.id === id);
  }

  /**
   * Log current state information for development
   */
  private logStateInfo(): void {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔍 Exploration State Loaded: ${this.currentState.name}`);
      console.log('User ID:', this.currentState.id);
      console.log('View Mode:', this.currentState.viewMode);
      console.log('Statistics:', this.getExplorationStats());
      console.log('Watchlist:', this.getWatchlistStats());
      console.log('Selected Company:', this.getSelectedCompany()?.name || 'None');
      console.groupEnd();
    }
  }

  /**
   * Persist state changes to localStorage and optionally to disk
   */
  private async persistState(): Promise<void> {
    try {
      // Save to localStorage as backup
      localStorage.setItem('cmf-exploration-state', JSON.stringify(this.currentState));
      
      // Development: Try to write to companies.ts file
      if (process.env.NODE_ENV === 'development') {
        if (this.devServerAvailable) {
          try {
            const result = await writeStateToDisk(this.profileName, this.currentState);
            if (result.success) {
              console.log('💾 Automatically saved to companies.ts');
            } else {
              console.warn('Failed to write to companies.ts:', result.message);
              this.fallbackToConsoleLog();
            }
          } catch (error) {
            console.warn('File write failed, falling back to console logging:', error);
            this.devServerAvailable = false; // Disable for subsequent calls
            this.fallbackToConsoleLog();
          }
        } else {
          this.fallbackToConsoleLog();
        }
      }
    } catch (error) {
      console.error('Failed to persist exploration state:', error);
    }
  }

  /**
   * Fallback to console logging when file writing isn't available
   */
  private fallbackToConsoleLog(): void {
    console.group('📝 Exploration State Updated');
    console.log('Copy this back to companies.ts:');
    console.log(JSON.stringify({
      addedCompanies: this.currentState.addedCompanies,
      removedCompanyIds: this.currentState.removedCompanyIds, 
      watchlistCompanyIds: this.currentState.watchlistCompanyIds,
      lastSelectedCompanyId: this.currentState.lastSelectedCompanyId,
      viewMode: this.currentState.viewMode
    }, null, 2));
    console.groupEnd();
  }

  /**
   * Manually trigger a file write (for development)
   */
  async writeToFile(): Promise<boolean> {
    if (process.env.NODE_ENV !== 'development') {
      // Only log warnings in non-test environments to avoid cluttering test output
      if (!process.env.VITEST) {
        console.warn('File writing only available in development mode');
      }
      return false;
    }

    try {
      const result = await writeStateToDisk(this.profileName, this.currentState);
      if (result.success) {
        console.log('✅ Successfully wrote current state to companies.ts');
        return true;
      } else {
        console.error('❌ Failed to write to companies.ts:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error writing to file:', error);
      return false;
    }
  }

  /**
   * Deep clone state object
   */
  private cloneState(state: UserExplorationState): UserExplorationState {
    return JSON.parse(JSON.stringify(state));
  }
}