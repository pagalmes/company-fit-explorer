import React, { useRef, useEffect } from 'react';
import { UserCMF } from '../types';

interface CollapsibleCMFPanelProps {
  userCMF: UserCMF;
  isCollapsed: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}

const CollapsibleCMFPanel: React.FC<CollapsibleCMFPanelProps> = ({
  userCMF,
  isCollapsed,
  onToggle,
  isLoading = false
}) => {
  const iconRef = useRef<any>(null);

  // Focus management for accessibility
  useEffect(() => {
    if (!isCollapsed && iconRef.current) {
      iconRef.current.focus();
    }
  }, [isCollapsed]);

  // Enhanced keyboard support
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
    // Add escape key to collapse if expanded
    if (event.key === 'Escape' && !isCollapsed) {
      onToggle();
    }
  };

  
  return (
    <>
      {/* Fixed Position Icon - Always Visible */}
      <button
        ref={iconRef}
        className="absolute top-4 left-6 z-20 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? "Expand CMF details panel" : "Collapse CMF details panel"}
        title={`${userCMF.name} - Click to ${isCollapsed ? 'view' : 'hide'} CMF criteria`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>

      {/* Expandable Panel - Appears Below Icon */}
      <div 
        className={`absolute top-16 left-6 z-50 w-80 max-w-[calc(100vw-2rem)] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-lg shadow-xl border border-blue-200/40 backdrop-blur-sm transition-all duration-300 ease-in-out ${
          isCollapsed ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`}
        style={{
          transformOrigin: 'top left'
        }}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-200/30 bg-white/60 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                {userCMF.name}
              </h3>
              <p className="text-xs text-slate-600">
                Your Candidate Market Fit
              </p>
            </div>
          </div>
          <button 
            onClick={onToggle}
            className="p-1 hover:bg-white/60 rounded transition-all duration-200"
            aria-label="Close panel"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Panel Content */}
        <div className="p-3 md:p-4 space-y-3 md:space-y-4 max-h-[60vh] md:max-h-[70vh] overflow-y-auto bg-white/30 backdrop-blur-sm">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-4">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-200/60 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200/60 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200/60 rounded w-full"></div>
                  <div className="h-3 bg-slate-200/60 rounded w-5/6"></div>
                  <div className="h-3 bg-slate-200/60 rounded w-4/5"></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Target Role */}
              <div>
                <h4 className="font-medium text-slate-700 text-sm mb-2">Target Role</h4>
                <p className="text-sm text-slate-600">{userCMF.targetRole}</p>
              </div>

              {/* Target Companies */}
              {userCMF.targetCompanies && (
                <div>
                  <h4 className="font-medium text-slate-700 text-sm mb-2">Target Companies</h4>
                  <p className="text-sm text-slate-600">{userCMF.targetCompanies}</p>
                </div>
              )}

              {/* Must Haves */}
              <div>
                <h4 className="font-medium text-slate-700 text-sm mb-2">Must Haves</h4>
                <div className="space-y-1">
                  {userCMF.mustHaves.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full flex-shrink-0"></div>
                      <span className="text-sm text-slate-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Want to Have */}
              {userCMF.wantToHave && userCMF.wantToHave.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-700 text-sm mb-2">Want to Have</h4>
                  <div className="space-y-1">
                    {userCMF.wantToHave.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm text-slate-600">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {userCMF.experience && userCMF.experience.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-700 text-sm mb-2">Experience</h4>
                  <div className="flex flex-wrap gap-1">
                    {userCMF.experience.map((exp, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-white/60 text-slate-700 text-xs rounded-full border border-slate-200/50"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CollapsibleCMFPanel;