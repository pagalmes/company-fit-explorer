import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';
import { Company, UserCMF } from '../types';
import { CompanyDetailPanelProps } from '../types/watchlist';
import { getExternalLinks } from '../utils/externalLinks';
import JobAlertsModal from './JobAlertsModal';

export interface CompanyDetailPanelHandle {
  focusSearch: () => void;
}

/**
 * CompanyDetailPanel Component
 * 
 * Main UI component for displaying company information and handling user interactions.
 * Supports both list view (when no company selected) and detailed view (when company selected).
 * 
 * @tested 16 comprehensive tests covering:
 * ✅ Company data rendering and display
 * ✅ User interactions (clicks, navigation, buttons)
 * ✅ "View Jobs" career URL functionality  
 * ✅ Related company connections and navigation
 * ✅ Accessibility and keyboard navigation
 * ✅ Error handling (logo fallbacks, missing data)
 * ✅ State management (selected vs unselected)
 * ✅ Real data integration with 15-company dataset
 * 
 * @testFile src/components/__tests__/CompanyDetailPanel.test.tsx
 * @coverage 100% of component logic and user interactions
 * @regressionProtection Prevents broken company selection, career URLs, and data display
 */
const CompanyDetailPanel = forwardRef<CompanyDetailPanelHandle, CompanyDetailPanelProps & { userCMF?: UserCMF }>(({
  selectedCompany,
  allCompanies,
  onCompanySelect,
  isInWatchlist,
  onToggleWatchlist,
  onRequestDelete,
  viewMode,
  watchlistStats: _watchlistStats,
  userCMF,
  isMobile = false,
  onBack
}, ref) => {
  const [isMatchReasonsExpanded, setIsMatchReasonsExpanded] = useState(false);
  const [isJobAlertsModalOpen, setIsJobAlertsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyIndex, setSelectedCompanyIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      searchInputRef.current?.focus();
    },
  }));

  // Reset selection when search term changes
  React.useEffect(() => {
    setSelectedCompanyIndex(-1);
  }, [searchTerm]);

  // Clear search when company is deselected
  React.useEffect(() => {
    if (!selectedCompany) {
      setSearchTerm('');
      setSelectedCompanyIndex(-1);
    }
  }, [selectedCompany]);

  // Handle Escape key to deselect company and clear search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCompany) {
        onCompanySelect(null);
        setSearchTerm('');
        setSelectedCompanyIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCompany, onCompanySelect]);

  if (!selectedCompany) {
    // Filter companies by search term and view mode
    const filteredCompanies = allCompanies
      .filter(company => {
        // View mode filter (watchlist/explore)
        if (viewMode === 'watchlist' && !isInWatchlist(company.id)) return false;
        if (viewMode === 'explore' && isInWatchlist(company.id)) return false;

        // Search filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return (
            company.name.toLowerCase().includes(term) ||
            company.industry.toLowerCase().includes(term) ||
            company.location.toLowerCase().includes(term)
          );
        }
        return true;
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    const totalCompanies = allCompanies.filter(company =>
      viewMode === 'watchlist' ? isInWatchlist(company.id) : !isInWatchlist(company.id)
    ).length;

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Mobile Header Bar - Compact header with back button */}
        {isMobile && onBack && (
          <div className="flex items-center px-4 py-3 border-b border-blue-200/40 bg-white/80 backdrop-blur-sm">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
              aria-label="Back"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Title */}
            <h2 className="text-base font-semibold text-slate-800 flex-1 truncate">
              {(selectedCompany as Company | null)?.name || (viewMode === 'watchlist' ? 'Your Watchlist' : 'Company List')}
            </h2>

            {/* Watchlist Heart (only for detail view with selected company) */}
            {selectedCompany && (
              <button
                onClick={() => onToggleWatchlist((selectedCompany as Company).id)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-2"
                aria-label={isInWatchlist((selectedCompany as Company).id) ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                <svg
                  className={`w-5 h-5 ${isInWatchlist((selectedCompany as Company).id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                  fill={isInWatchlist((selectedCompany as Company).id) ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Desktop Header - Full header with title and description */}
        {!isMobile && (
          <div className="panel-header p-6 pb-4 border-b border-blue-200/40 bg-white/60 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-slate-800">
              {viewMode === 'watchlist' ? 'Your Watchlist' : 'Company Details'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {viewMode === 'watchlist'
                ? 'Companies saved for further exploration'
                : 'Click on a company node to see details'
              }
            </p>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                switch (e.key) {
                  case 'Escape':
                    e.preventDefault();
                    if (searchTerm) {
                      setSearchTerm('');
                      setSelectedCompanyIndex(-1);
                    }
                    // Blur the search input to remove focus
                    searchInputRef.current?.blur();
                    break;
                  case 'ArrowDown':
                    if (filteredCompanies.length === 0) return;
                    e.preventDefault();
                    setSelectedCompanyIndex(prev =>
                      prev < filteredCompanies.length - 1 ? prev + 1 : prev
                    );
                    break;
                  case 'ArrowUp':
                    if (filteredCompanies.length === 0) return;
                    e.preventDefault();
                    setSelectedCompanyIndex(prev => prev > 0 ? prev - 1 : -1);
                    break;
                  case 'Enter':
                    if (filteredCompanies.length === 0) return;
                    e.preventDefault();
                    if (selectedCompanyIndex >= 0 && selectedCompanyIndex < filteredCompanies.length) {
                      onCompanySelect(filteredCompanies[selectedCompanyIndex]);
                    }
                    break;
                }
              }}
              className="w-full px-4 py-2 pl-10 pr-10 rounded-lg border border-blue-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm placeholder-slate-400"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Results count */}
          {searchTerm && (
            <p className="text-xs text-slate-500 mt-2">
              Showing {filteredCompanies.length} of {totalCompanies} companies
            </p>
          )}
        </div>
        )}

        {/* Mobile Search Bar - Outside header for more space */}
        {isMobile && !selectedCompany && (
          <div className="px-4 py-3 border-b border-blue-200/40 bg-white/60">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  switch (e.key) {
                    case 'Escape':
                      e.preventDefault();
                      if (searchTerm) {
                        setSearchTerm('');
                        setSelectedCompanyIndex(-1);
                      }
                      searchInputRef.current?.blur();
                      break;
                    case 'ArrowDown':
                      if (filteredCompanies.length === 0) return;
                      e.preventDefault();
                      setSelectedCompanyIndex(prev =>
                        prev < filteredCompanies.length - 1 ? prev + 1 : prev
                      );
                      break;
                    case 'ArrowUp':
                      if (filteredCompanies.length === 0) return;
                      e.preventDefault();
                      setSelectedCompanyIndex(prev => prev > 0 ? prev - 1 : -1);
                      break;
                    case 'Enter':
                      if (filteredCompanies.length === 0) return;
                      e.preventDefault();
                      if (selectedCompanyIndex >= 0 && selectedCompanyIndex < filteredCompanies.length) {
                        onCompanySelect(filteredCompanies[selectedCompanyIndex]);
                      }
                      break;
                  }
                }}
                className="w-full px-4 py-2 pl-10 pr-10 rounded-lg border border-blue-200 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm placeholder-slate-400"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCompanyIndex(-1);
                  }}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Company List */}
        <div className="panel-content flex-1 overflow-auto p-6 bg-white/30 backdrop-blur-sm">
          {filteredCompanies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-slate-600 font-medium">No companies found</p>
              <p className="text-sm text-slate-500 mt-1">
                {searchTerm ? `No matches for "${searchTerm}"` : 'No companies available'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCompanies.map((company, index) => (
              <div
                key={company.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border-l-4 ${
                  index === selectedCompanyIndex
                    ? 'bg-blue-100 border-blue-500'
                    : 'bg-white/50 hover:bg-white/70 border-transparent'
                } border-r border-t border-b border-blue-100/50`}
                onClick={() => onCompanySelect(company)}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div
                      className="w-8 h-8 rounded bg-white/80 border border-blue-200/50"
                      style={{
                        backgroundImage: `url(${company.logo})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                      aria-label={`${company.name} logo`}
                    />
                    {isInWatchlist && isInWatchlist(company.id) && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center shadow-sm border border-white">
                        <svg className="w-1.5 h-1.5 text-white fill-current" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className={`text-sm text-slate-800 ${
                      index === selectedCompanyIndex ? 'font-semibold' : 'font-medium'
                    }`}>
                      {company.name}
                    </h4>
                    <p className="text-xs text-slate-500">{company.industry}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-xs font-medium px-2 py-1 rounded-full text-white"
                    style={{ backgroundColor: company.color }}
                  >
                    {company.matchScore}%
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const getConnectedCompanies = () => {
    return selectedCompany.connections
      .map(connectionId => allCompanies.find(c => c.id === connectionId))
      .filter(Boolean) as Company[];
  };

  const connectedCompanies = getConnectedCompanies();

  // Get external links (existing or generated on-the-fly)
  const externalLinks = getExternalLinks(selectedCompany);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="panel-header p-6 border-b border-blue-200/40 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="company-logo w-12 h-12 rounded bg-white/80 border border-blue-200/60 shadow-sm"
              style={{
                backgroundImage: `url(${selectedCompany.logo})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
              aria-label={`${selectedCompany.name} logo`}
            />
            <div>
              <h2 className="company-title text-xl font-bold text-slate-800">
                {selectedCompany.name}
              </h2>
              <p className="text-sm text-slate-600">{selectedCompany.industry}</p>
            </div>
          </div>
          <button
            onClick={() => onToggleWatchlist(selectedCompany.id)}
            className={`transition-all ${
              isInWatchlist(selectedCompany.id)
                ? 'text-red-500 hover:text-red-600'
                : 'text-slate-300 hover:text-slate-500'
            }`}
            title={isInWatchlist(selectedCompany.id) ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={isInWatchlist(selectedCompany.id) ? 2.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        {/* Match Score */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Candidate Market Fit Score
            </span>
            <span
              className="text-lg font-bold px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: selectedCompany.color }}
            >
              {selectedCompany.matchScore}%
            </span>
          </div>
          <div className="w-full bg-slate-200/60 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${selectedCompany.matchScore}%`,
                backgroundColor: selectedCompany.color
              }}
            ></div>
          </div>
        </div>
      </div>


      {/* Content */}
      <div className="panel-content flex-1 overflow-auto p-6 space-y-6 bg-white/30 backdrop-blur-sm">
        {/* Company Info */}
        <div className="pb-6 border-b border-slate-200/50">
          <h3 className="section-title text-lg font-semibold text-slate-800 mb-3">
            Company Info
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Stage:</span>
              <p className="font-medium text-slate-700">{selectedCompany.stage}</p>
            </div>
            <div>
              <span className="text-slate-500">Employees:</span>
              <p className="font-medium text-slate-700">{selectedCompany.employees}</p>
            </div>
            <div>
              <span className="text-slate-500">Location:</span>
              <p className="font-medium text-slate-700">{selectedCompany.location}</p>
            </div>
            <div>
              <span className="text-slate-500">Remote:</span>
              <p className="font-medium text-slate-700">{selectedCompany.remote}</p>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Open Roles:</span>
              <p className="font-medium text-slate-700">{selectedCompany.openRoles} positions</p>
            </div>
          </div>
        </div>

        {/* Match Reasons */}
        <div className="pb-6 border-b border-slate-200/50">
          <h3 className="section-title text-lg font-semibold text-slate-800 mb-3">
            Why This Match?
          </h3>
          <div className="relative">
            <ul className="space-y-2">
              {(selectedCompany.matchReasons || [])
                .slice(0, isMatchReasonsExpanded ? undefined : 3)
                .map((reason, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-slate-700">{reason}</span>
                  </li>
                ))}
            </ul>

            {/* Gradient fade overlay - only show when collapsed and there are more items */}
            {!isMatchReasonsExpanded && (selectedCompany.matchReasons || []).length > 3 && (
              <div
                className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
                style={{
                  background: 'linear-gradient(to bottom, transparent 0%, rgba(248, 250, 252, 0.7) 50%, rgba(248, 250, 252, 0.98) 100%)'
                }}
              />
            )}
          </div>

          {/* Show more/less button */}
          {(selectedCompany.matchReasons || []).length > 3 && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setIsMatchReasonsExpanded(!isMatchReasonsExpanded)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                aria-expanded={isMatchReasonsExpanded}
              >
                {isMatchReasonsExpanded ? 'Show less' : 'Show more'}
              </button>
            </div>
          )}
        </div>

        {/* Research This Company */}
        {externalLinks && Object.keys(externalLinks).length > 0 && (
          <div className="pb-6 border-b border-slate-200/50">
            <div className="flex items-center space-x-2 mb-3">
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <h3 className="section-title text-lg font-semibold text-slate-800">
                Research This Company
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {externalLinks.website && (
                <a
                  href={externalLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-3 py-2 bg-white/70 hover:bg-white border border-blue-200/60 hover:border-blue-400 rounded-lg transition-all text-sm text-slate-700 hover:text-blue-700 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span>Website</span>
                </a>
              )}

              {externalLinks.linkedin && (
                <a
                  href={externalLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-3 py-2 bg-white/70 hover:bg-white border border-slate-200 hover:border-[#0A66C2] rounded-lg transition-all text-sm text-slate-700 hover:text-[#0A66C2] font-medium"
                >
                  <Image src="/icons/linkedin.svg" alt="LinkedIn" width={16} height={16} className="flex-shrink-0" style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(93%) saturate(2793%) hue-rotate(196deg) brightness(95%) contrast(101%)' }} />
                  <span>LinkedIn</span>
                </a>
              )}

              {externalLinks.glassdoor && (
                <a
                  href={externalLinks.glassdoor}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-3 py-2 bg-white/70 hover:bg-white border border-slate-200 hover:border-[#0CAA41] rounded-lg transition-all text-sm text-slate-700 hover:text-[#0CAA41] font-medium"
                >
                  <Image src="/icons/glassdoor.svg" alt="Glassdoor" width={16} height={16} className="flex-shrink-0" style={{ filter: 'brightness(0) saturate(100%) invert(50%) sepia(96%) saturate(1707%) hue-rotate(102deg) brightness(95%) contrast(101%)' }} />
                  <span>Glassdoor</span>
                </a>
              )}

              {externalLinks.crunchbase && (
                <a
                  href={externalLinks.crunchbase}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-3 py-2 bg-white/70 hover:bg-white border border-slate-200 hover:border-[#0288D1] rounded-lg transition-all text-sm text-slate-700 hover:text-[#0288D1] font-medium"
                >
                  <Image src="/icons/crunchbase.svg" alt="Crunchbase" width={16} height={16} className="flex-shrink-0" style={{ filter: 'brightness(0) saturate(100%) invert(42%) sepia(84%) saturate(1261%) hue-rotate(171deg) brightness(94%) contrast(94%)' }} />
                  <span>Crunchbase</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Connected Companies */}
        {connectedCompanies.length > 0 && (
          <div>
            <h3 className="section-title text-lg font-semibold text-slate-800 mb-3">
              Related Companies ({connectedCompanies.length})
            </h3>
            <div className="space-y-2">
              {connectedCompanies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-3 bg-white/50 rounded-lg hover:bg-white/70 cursor-pointer transition-colors border border-blue-100/50"
                  onClick={() => onCompanySelect(company)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div
                        className="w-6 h-6 rounded bg-white/80 border border-blue-200/50"
                        style={{
                          backgroundImage: `url(${company.logo})`,
                          backgroundSize: 'contain',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat'
                        }}
                        aria-label={`${company.name} logo`}
                      />
                      {isInWatchlist && isInWatchlist(company.id) && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full flex items-center justify-center shadow-sm border border-white">
                          <svg className="w-1 h-1 text-white fill-current" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-800">
                        {company.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {selectedCompany.connectionTypes[company.id]}
                      </p>
                    </div>
                  </div>
                  <div
                    className="text-xs font-medium px-2 py-1 rounded-full text-white"
                    style={{ backgroundColor: company.color }}
                  >
                    {company.matchScore}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 border-t border-slate-200/50">
          <button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm"
            onClick={() => window.open(selectedCompany.careerUrl, '_blank')}
          >
            View Jobs at {selectedCompany.name}
          </button>

          {/* Setup Job Alerts Button */}
          <button
            onClick={() => setIsJobAlertsModalOpen(true)}
            className="w-full bg-white/60 text-slate-700 border border-slate-200/50 py-2 px-4 rounded-lg hover:bg-white/80 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Setup Job Alerts</span>
          </button>

          {/* My Connections Button */}
          <button
            onClick={() => {
              const companyName = encodeURIComponent(selectedCompany.name);
              window.open(`https://www.linkedin.com/search/results/people/?keywords=${companyName}`, '_blank', 'noopener,noreferrer');
            }}
            className="w-full bg-white/60 text-slate-700 border border-slate-200/50 py-2 px-4 rounded-lg hover:bg-white/80 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>My Connections</span>
          </button>

          {/* Remove Company Button */}
          <button
            onClick={() => onRequestDelete(selectedCompany)}
            className="w-full bg-white/60 text-slate-700 border border-slate-200/50 py-2 px-4 rounded-lg hover:bg-white/80 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Remove Company</span>
          </button>

          {/* Logo.dev Attribution - Required for Community Plan */}
          <div className="pt-4 border-t border-slate-200/50">
            <a
              href="https://logo.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
              title="Logo API"
            >
              Company logos by Logo.dev
            </a>
          </div>
        </div>
      </div>

      {/* Job Alerts Modal */}
      {selectedCompany && (
        <JobAlertsModal
          isOpen={isJobAlertsModalOpen}
          onClose={() => setIsJobAlertsModalOpen(false)}
          company={selectedCompany}
          targetRole={userCMF?.targetRole || 'engineer'}
        />
      )}
    </div>
  );
});

CompanyDetailPanel.displayName = 'CompanyDetailPanel';

export default CompanyDetailPanel;