import React, { useRef, useEffect, useState } from 'react';
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
  const [contentHeight, setContentHeight] = useState<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Measure content height for smooth animations
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [userCMF]);

  // Focus management for accessibility
  useEffect(() => {
    if (!isCollapsed && panelRef.current) {
      panelRef.current.focus();
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
    <div 
      ref={panelRef}
      className={`absolute top-4 left-6 z-20 transition-all duration-300 ease-in-out ${
        isCollapsed 
          ? 'w-12 h-12' 
          : 'w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200'
      }`}
    >
      {isCollapsed ? (
        /* Collapsed State - Just Icon */
        <button
          className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onClick={onToggle}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-expanded={false}
          aria-label="Expand CMF details panel"
          title={`${userCMF.name} - Click to view CMF criteria`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      ) : (
        /* Expanded State - Full Panel */
        <>
          {/* Header - When Expanded */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-all duration-200 rounded-t-lg group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset min-h-[44px] touch-manipulation"
            onClick={onToggle}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-expanded={true}
            aria-label="Collapse CMF details panel"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {userCMF.name}
                </h3>
                <p className="text-xs text-gray-500 transition-colors duration-200">
                  Your Candidate Market Fit
                </p>
              </div>
            </div>
            <button className="p-1 hover:bg-gray-100 rounded transition-all duration-200 group-hover:scale-110">
              <svg className="w-4 h-4 text-gray-600 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Collapsible Content */}
      <div 
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ 
          maxHeight: isCollapsed ? '0px' : `min(${contentHeight}px, 70vh)` 
        }}
      >
        <div ref={contentRef} className="border-t border-gray-100">
          {isLoading ? (
            // Loading skeleton
            <div className="p-4 space-y-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                </div>
              </div>
            </div>
          ) : (
            // Regular content with scroll support
            <div className="p-3 md:p-4 space-y-3 md:space-y-4 max-w-xs max-h-[60vh] md:max-h-[70vh] overflow-y-auto">
              {/* Target Role */}
              <div>
                <h4 className="font-medium text-gray-700 text-sm mb-2">Target Role</h4>
                <p className="text-sm text-gray-600">{userCMF.targetRole}</p>
              </div>

              {/* Target Companies */}
              {userCMF.targetCompanies && (
                <div>
                  <h4 className="font-medium text-gray-700 text-sm mb-2">Target Companies</h4>
                  <p className="text-sm text-gray-600">{userCMF.targetCompanies}</p>
                </div>
              )}

              {/* Must Haves */}
              <div>
                <h4 className="font-medium text-gray-700 text-sm mb-2">Must Haves</h4>
                <div className="space-y-1">
                  {userCMF.mustHaves.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></div>
                      <span className="text-sm text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Want to Have */}
              {userCMF.wantToHave && userCMF.wantToHave.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 text-sm mb-2">Want to Have</h4>
                  <div className="space-y-1">
                    {userCMF.wantToHave.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm text-gray-600">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {userCMF.experience && userCMF.experience.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 text-sm mb-2">Experience</h4>
                  <div className="flex flex-wrap gap-1">
                    {userCMF.experience.map((exp, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleCMFPanel;