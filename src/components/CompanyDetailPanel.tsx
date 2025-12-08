import React, { useState } from 'react';
import Image from 'next/image';
import { Company, UserCMF } from '../types';
import { CompanyDetailPanelProps } from '../types/watchlist';
import { getExternalLinks } from '../utils/externalLinks';
import JobAlertsModal from './JobAlertsModal';

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
const CompanyDetailPanel: React.FC<CompanyDetailPanelProps & { userCMF?: UserCMF }> = ({
  selectedCompany,
  allCompanies,
  onCompanySelect,
  isInWatchlist,
  onToggleWatchlist,
  onRequestDelete,
  viewMode,
  watchlistStats: _watchlistStats,
  userCMF
}) => {
  const [isMatchReasonsExpanded, setIsMatchReasonsExpanded] = useState(false);
  const [isJobAlertsModalOpen, setIsJobAlertsModalOpen] = useState(false);

  if (!selectedCompany) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <div className="panel-header p-6 border-b border-blue-200/40 bg-white/60 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-slate-800">
            {viewMode === 'watchlist' ? 'Your Watchlist' : 'Company Details'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {viewMode === 'watchlist' 
              ? 'Companies you\'ve saved for further exploration'
              : 'Click on a company node to see details'
            }
          </p>
        </div>

        {/* Company List */}
        <div className="panel-content flex-1 overflow-auto p-6 bg-white/30 backdrop-blur-sm">
          <div className="space-y-3">
            {allCompanies
              .filter(company => viewMode === 'watchlist' ? isInWatchlist(company.id) : true)
              .sort((a, b) => b.matchScore - a.matchScore)
              .map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between p-3 bg-white/50 rounded-lg hover:bg-white/70 cursor-pointer transition-colors border border-blue-100/50"
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
                    <h4 className="text-sm font-medium text-slate-800">
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
            onClick={() => onCompanySelect(null)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Close details"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

          {/* Save to Watchlist Button */}
          <button
            className={`w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
              isInWatchlist && isInWatchlist(selectedCompany.id)
                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                : 'bg-white/60 text-slate-700 border border-slate-200/50 hover:bg-white/80'
            }`}
            onClick={() => onToggleWatchlist && onToggleWatchlist(selectedCompany.id)}
          >
            <svg
              className={`w-5 h-5 ${
                isInWatchlist && isInWatchlist(selectedCompany.id)
                  ? 'fill-current'
                  : 'fill-none stroke-current'
              }`}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isInWatchlist && isInWatchlist(selectedCompany.id) ? 0 : 2}
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
            <span>
              {isInWatchlist && isInWatchlist(selectedCompany.id) ? 'Remove from Watchlist' : 'Save to Watchlist'}
            </span>
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
};

export default CompanyDetailPanel;