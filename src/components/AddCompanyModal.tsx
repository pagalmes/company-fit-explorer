import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { UserCMF, Company } from '../types';
import { getCompanySuggestions, getPopularCompanies, CompanySuggestion } from '../utils/companySuggestions';
import { getCompanyPreview, CompanyPreview, validateCompanyData } from '../utils/companyValidation';
import { getColorForScore, generateCareerUrl } from '../utils/companyPositioning';
import { llmService } from '../utils/llm/service';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCompany: (company: Company) => Promise<void>;
  onBatchUpdateCompanies?: (companies: Company[]) => Promise<void>; // New: for smart relocation
  onCheckForRemovedCompany?: (companyName: string) => Company | null;
  onRestoreRemovedCompany?: (company: Company) => void;
  userCMF: UserCMF;
  existingCompanies: Company[];
  onShowLLMSettings?: () => void;
}

type ModalStep = 'input' | 'confirm' | 'processing';

/**
 * AddCompanyModal Component
 * 
 * Multi-step modal for adding companies to the exploration:
 * 1. Input: User enters company name with autocomplete suggestions
 * 2. Confirm: Show company preview for user confirmation  
 * 3. Processing: Generate company data and add to graph
 */
const AddCompanyModal: React.FC<AddCompanyModalProps> = ({
  isOpen,
  onClose,
  onAddCompany,
  onBatchUpdateCompanies,
  onCheckForRemovedCompany,
  onRestoreRemovedCompany,
  userCMF,
  existingCompanies,
  onShowLLMSettings,
}) => {
  const [step, setStep] = useState<ModalStep>('input');
  const [companyName, setCompanyName] = useState('');
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [companyPreview, setCompanyPreview] = useState<CompanyPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Enhanced error messages for better user experience
  const errorMessages = {
    notFound: "We couldn't find that company. Try checking the spelling or using the full company name.",
    apiError: "Unable to connect to company database. Please try again.",
    llmError: "Failed to analyze company data. Please try again or contact support.",
    networkError: "Network connection issue. Please check your internet and try again."
  };

  const resetModal = () => {
    setStep('input');
    setCompanyName('');
    setSuggestions([]);
    setCompanyPreview(null);
    setError('');
    setIsLoading(false);
    setShowSuggestions(false);
  };

  const handleInputChange = async (value: string) => {
    setCompanyName(value);
    setError('');
    
    if (value.length > 1) {
      try {
        const companySuggestions = await getCompanySuggestions(value);
        setSuggestions(companySuggestions);
        setShowSuggestions(companySuggestions.length > 0);
      } catch (err) {
        // Silently fail for suggestions - not critical
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else if (value.length === 0) {
      // Show popular companies when input is empty
      const popularCompanies = getPopularCompanies(4);
      setSuggestions(popularCompanies);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: CompanySuggestion) => {
    setCompanyName(suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSearch = useCallback(async () => {
    if (!companyName.trim()) return;
    
    setIsLoading(true);
    setError('');
    setSuggestions([]);
    setShowSuggestions(false);
    
    try {
      const preview = await getCompanyPreview(companyName.trim());
      
      // Validate the preview data
      const validation = validateCompanyData(preview);
      
      if (!validation.isValid) {
        setError(errorMessages.notFound);
        return;
      }
      
      setCompanyPreview(preview);
      setStep('confirm');
    } catch (err) {
      const errorType = (err as Error).message.includes('network') ? 'networkError' : 'notFound';
      setError(errorMessages[errorType as keyof typeof errorMessages]);
    } finally {
      setIsLoading(false);
    }
  }, [companyName, errorMessages]);

  const handleConfirm = useCallback(async () => {
    if (!companyPreview) return;
    
    // Check if this company was previously removed and can be restored
    if (onCheckForRemovedCompany && onRestoreRemovedCompany) {
      const removedCompany = onCheckForRemovedCompany(companyPreview.name);
      if (removedCompany) {
        console.log('Found previously removed company, restoring:', removedCompany.name);
        onRestoreRemovedCompany(removedCompany);
        onClose();
        resetModal();
        return;
      }
    }
    
    setStep('processing');
    
    try {
      let companyData;
      
      // Try LLM analysis first if configured
      if (llmService.isConfigured()) {
        try {
          // Check if CMF is empty and adjust the request accordingly
          const isCMFEmpty = (!userCMF.experience || userCMF.experience.length === 0) &&
                             (!userCMF.mustHaves || userCMF.mustHaves.length === 0) &&
                             (!userCMF.wantToHave || userCMF.wantToHave.length === 0) &&
                             (!userCMF.targetRole || userCMF.targetRole.trim() === '') &&
                             (!userCMF.targetCompanies || userCMF.targetCompanies.trim() === '');
          
          const llmResponse = await llmService.analyzeCompany({
            companyName: companyPreview.name,
            userCMF: {
              targetRole: userCMF.targetRole || (isCMFEmpty ? 'Exploring career opportunities' : ''),
              mustHaves: userCMF.mustHaves || [],
              wantToHave: userCMF.wantToHave || [],
              experience: userCMF.experience || [],
              targetCompanies: userCMF.targetCompanies || (isCMFEmpty ? 'Open to exploring various companies and industries' : '')
            },
            isNewUser: isCMFEmpty
          });

          if (llmResponse.success && llmResponse.data) {
            // Use LLM-generated data
            companyData = llmResponse.data;
            console.log('Generated company data with LLM:', companyData);
          } else {
            console.warn('LLM analysis failed, falling back to enhanced mock data:', llmResponse.error);
            companyData = generateEnhancedMockData(companyPreview, userCMF);
          }
        } catch (llmError) {
          console.warn('LLM analysis error, falling back to enhanced mock data:', llmError);
          companyData = generateEnhancedMockData(companyPreview, userCMF);
        }
      } else {
        // No LLM configured, use enhanced mock data
        companyData = generateEnhancedMockData(companyPreview, userCMF);
      }

      // Create base company object with LLM or mock data
      const baseCompany: Company = {
        id: Date.now(), // Generate unique ID
        name: companyData.name,
        logo: companyPreview.logo || `https://ui-avatars.com/api/?name=${companyData.name}&background=random`,
        matchScore: companyData.matchScore,
        industry: companyData.industry,
        stage: companyData.stage,
        location: companyData.location,
        employees: companyData.employees,
        remote: companyData.remote,
        openRoles: companyData.openRoles,
        connections: [], // Will be set by positioning logic
        connectionTypes: companyData.connectionTypes || {},
        matchReasons: companyData.matchReasons,
        color: getColorForScore(companyData.matchScore),
        angle: 0, // Will be set by positioning logic
        distance: 0, // Will be set by positioning logic
        careerUrl: generateCareerUrl(companyData.name, companyPreview.domain)
      };

      // Import positioning utilities
      const { mapConnectionsToExistingCompanies } = await import('../utils/companyPositioning');
      const { findSmartPositioningSolution, isPositioningSolutionBeneficial } = await import('../utils/smartPositioning');
      
      // Map connections to existing companies (use LLM connections if available)
      const connectionsToMap = companyData.connections || [];
      const connectionTypesForMapping: Record<string, string> = {};
      
      connectionsToMap.forEach(conn => {
        const connectionTypes = companyData.connectionTypes as Record<string, string> | undefined;
        connectionTypesForMapping[conn] = (connectionTypes && connectionTypes[conn]) || 'Related Company';
      });
      
      const connectionMapping = mapConnectionsToExistingCompanies({
        ...baseCompany,
        connectionTypes: connectionTypesForMapping
      }, existingCompanies);
      
      // Create base company with connections
      const companyWithConnections: Company = {
        ...baseCompany,
        connections: connectionMapping.connections,
        connectionTypes: connectionMapping.connectionTypes
      };

      // Find smart positioning solution
      const positioningSolution = findSmartPositioningSolution(companyWithConnections, existingCompanies);
      
      console.log(`📍 Positioning solution: ${positioningSolution.reason}`);
      
      // Check if we should use batch update (when relocating multiple companies) or simple addition
      const shouldUseBatchUpdate = positioningSolution.relocatedCompanies.length > 1 && 
                                   isPositioningSolutionBeneficial(positioningSolution) &&
                                   onBatchUpdateCompanies;
      
      if (shouldUseBatchUpdate) {
        console.log(`🎯 Using smart positioning: ${positioningSolution.relocatedCompanies.length} companies positioned`);
        
        // Update all companies (new + relocated)
        const allUpdatedCompanies = [
          ...positioningSolution.stableCompanies,
          ...positioningSolution.relocatedCompanies
        ];
        
        await onBatchUpdateCompanies(allUpdatedCompanies);
      } else {
        console.log('📍 Using simple addition for new company only');
        await onAddCompany(positioningSolution.newCompany);
      }
      
      onClose();
      resetModal();
    } catch (err) {
      console.error('Error adding company:', err);
      setError(errorMessages.apiError);
      setStep('confirm');
    }
  }, [companyPreview, onCheckForRemovedCompany, onRestoreRemovedCompany, onClose, userCMF, existingCompanies, onBatchUpdateCompanies, onAddCompany, errorMessages]);

  // Reset modal state when closed and focus input when opened
  useEffect(() => {
    if (!isOpen) {
      resetModal();
    } else {
      // Focus input and show popular companies when opening
      setTimeout(() => {
        inputRef.current?.focus();
        if (!companyName.trim()) {
          const popularCompanies = getPopularCompanies(4);
          setSuggestions(popularCompanies);
          setShowSuggestions(true);
        }
      }, 100);
    }
  }, [isOpen, companyName]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && step === 'input' && companyName.trim()) {
        handleSearch();
      }
      if (e.key === 'Enter' && step === 'confirm') {
        handleConfirm();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, companyName, handleConfirm, handleSearch, onClose]);

  // Enhanced mock data generation when LLM is not available
  const generateEnhancedMockData = (preview: CompanyPreview, userCMF: UserCMF) => {
    // Check if CMF is empty (new user)
    const isCMFEmpty = (!userCMF.experience || userCMF.experience.length === 0) &&
                       (!userCMF.mustHaves || userCMF.mustHaves.length === 0) &&
                       (!userCMF.wantToHave || userCMF.wantToHave.length === 0) &&
                       (!userCMF.targetRole || userCMF.targetRole.trim() === '') &&
                       (!userCMF.targetCompanies || userCMF.targetCompanies.trim() === '');

    let matchScore;
    
    if (isCMFEmpty) {
      // For empty CMF, generate neutral but encouraging scores
      // Most companies should be 70-85 to encourage exploration
      matchScore = 70 + Math.floor(Math.random() * 16); // 70-85 range
    } else {
      // More sophisticated mock score based on user criteria
      const baseScore = 70;
      matchScore = baseScore;
      
      // Boost score if company industry aligns with user experience
      if (userCMF.experience && userCMF.experience.some(exp => preview.industry?.toLowerCase().includes(exp.toLowerCase()))) {
        matchScore += 10;
      }
      
      // Boost score if company industry matches target companies pattern
      if (userCMF.targetCompanies?.toLowerCase().includes(preview.industry?.toLowerCase() || '')) {
        matchScore += 5;
      }
      
      // Add some randomness but keep it reasonable
      matchScore += Math.floor(Math.random() * 15) - 5; // -5 to +10 variation
      matchScore = Math.min(95, Math.max(60, matchScore)); // Clamp between 60-95
    }

    return {
      name: preview.name,
      industry: preview.industry || 'Technology',
      stage: determineCompanyStage(preview),
      location: preview.location || 'San Francisco, CA',
      employees: preview.employees || '~500',
      remote: 'Remote-Friendly',
      openRoles: Math.floor(Math.random() * 15) + 5,
      matchScore,
      matchReasons: generateMatchReasons(preview, userCMF, isCMFEmpty),
      connections: [], // Will be populated by positioning logic
      connectionTypes: {},
      description: preview.description || `${preview.name} is a technology company focused on innovation.`
    };
  };

  // Helper function to determine company stage based on preview data
  const determineCompanyStage = (preview: CompanyPreview): string => {
    if (preview.confidence === 'high') {
      // For known companies, make educated guesses based on name/industry
      const name = preview.name.toLowerCase();
      if (name.includes('google') || name.includes('microsoft') || name.includes('apple') || 
          name.includes('amazon') || name.includes('meta') || name.includes('facebook')) {
        return 'Public';
      }
      if (name.includes('startup') || preview.industry === 'AI' || preview.industry === 'AI/ML') {
        return 'Early Stage';
      }
      return 'Late Stage';
    }
    
    // Default for unknown companies
    return 'Late Stage';
  };

  // Helper function to generate contextual match reasons
  const generateMatchReasons = (preview: CompanyPreview, userCMF: UserCMF, isCMFEmpty: boolean = false): string[] => {
    const reasons: string[] = [];
    
    if (isCMFEmpty) {
      // Generate exploration-focused reasons for new users
      const explorationReasons = [
        `${preview.name} is well-regarded in the ${preview.industry || 'tech'} industry`,
        'Great company to explore career opportunities',
        'Strong company reputation and growth potential',
        'Good starting point for your career exploration',
        'Company offers diverse learning opportunities',
        'Well-known for positive work culture',
        'Good opportunities for professional development'
      ];
      
      // Add industry-specific reason if available
      if (preview.industry) {
        reasons.push(`Excellent reputation in the ${preview.industry} sector`);
      }
      
      // Add 2-3 exploration reasons
      const shuffledExploration = explorationReasons.sort(() => 0.5 - Math.random());
      reasons.push(...shuffledExploration.slice(0, 3));
      
    } else {
      // Generate personalized reasons based on CMF data
      
      // Add role-specific reasons
      if (userCMF.targetRole && userCMF.targetRole.trim()) {
        reasons.push(`Strong alignment with your ${userCMF.targetRole} background`);
      }
      
      // Add industry-specific reasons
      if (preview.industry) {
        reasons.push(`Excellent fit in the ${preview.industry} industry`);
      }
      
      // Add must-have aligned reasons
      if (userCMF.mustHaves && userCMF.mustHaves.length > 0) {
        const randomMustHave = userCMF.mustHaves[Math.floor(Math.random() * userCMF.mustHaves.length)];
        reasons.push(`Company culture aligns with your requirement: ${randomMustHave}`);
      }
      
      // Add experience-based reasons
      if (userCMF.experience && userCMF.experience.length > 0) {
        const matchingExp = userCMF.experience.find(exp => 
          preview.industry?.toLowerCase().includes(exp.toLowerCase())
        );
        if (matchingExp) {
          reasons.push(`Your ${matchingExp} experience is highly valued here`);
        }
      }
      
      // Add some generic positive reasons if we need more
      if (reasons.length < 3) {
        const genericReasons = [
          'Technology stack matches your experience',
          'Company growth trajectory looks promising',
          'Strong team and engineering culture',
          'Innovative approach to solving problems',
          'Good work-life balance and benefits'
        ];
        
        const needed = 4 - reasons.length;
        const shuffledGeneric = genericReasons.sort(() => 0.5 - Math.random());
        reasons.push(...shuffledGeneric.slice(0, needed));
      }
    }
    
    return reasons.slice(0, 4); // Limit to 4 reasons
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-lg shadow-xl max-w-md w-full p-6 border border-blue-200/40 backdrop-blur-sm">
          {step === 'input' && (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-800 mb-2">
                  Add Company
                </h2>
                <p className="text-sm text-slate-600">
                  Enter the name of a company you'd like to add to your exploration.
                </p>
              </div>

              {/* LLM Enhancement Prompt */}
              {!llmService.isConfigured() && onShowLLMSettings && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-amber-800">
                        <strong>Enhanced Analysis Available:</strong> Configure an AI provider for detailed 
                        company insights, accurate match scoring, and industry connections.
                      </p>
                      <button 
                        onClick={onShowLLMSettings}
                        className="text-sm text-amber-700 underline hover:no-underline mt-1 font-medium"
                      >
                        Setup AI Provider →
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="relative">
                  <label htmlFor="company-name" className="block text-sm font-medium text-slate-700 mb-2">
                    Company Name
                  </label>
                  <input
                    ref={inputRef}
                    id="company-name"
                    type="text"
                    value={companyName}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow clicks
                      setTimeout(() => setShowSuggestions(false), 150);
                    }}
                    placeholder="e.g., Airbnb, Figma, Linear"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white/90 backdrop-blur-sm"
                    autoComplete="off"
                  />
                  
                  {/* Autocomplete suggestions */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-white/95 backdrop-blur-md border border-blue-200/50 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
                      {!companyName.trim() && (
                        <div className="px-3 py-2 text-xs text-slate-500 border-b border-blue-100/50">
                          Popular companies:
                        </div>
                      )}
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50/80 hover:backdrop-blur-sm flex items-center space-x-3 transition-colors"
                        >
                          <div className="relative w-8 h-8 rounded flex-shrink-0 overflow-hidden">
                            <Image 
                              src={suggestion.logo} 
                              alt={`${suggestion.name} logo`}
                              fill
                              sizes="32px"
                              className="object-cover"
                              onError={() => {
                                // Fallback handled by next/image automatically
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-800 truncate">{suggestion.name}</div>
                            {suggestion.industry && (
                              <div className="text-xs text-slate-500 truncate">{suggestion.industry}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {error && (
                  <div className="text-sm text-red-600 flex items-start space-x-2">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100/80 hover:bg-slate-200/80 backdrop-blur-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSearch}
                  disabled={!companyName.trim() || isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
                >
                  {isLoading && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>{isLoading ? 'Searching...' : 'Search Company'}</span>
                </button>
              </div>
            </>
          )}

          {step === 'confirm' && companyPreview && (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-800 mb-2">
                  Confirm Company
                </h2>
                <p className="text-sm text-slate-600">
                  Is this the company you want to add?
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 border border-blue-200/50 rounded-lg bg-white/60 backdrop-blur-sm">
                  <div className="flex items-start space-x-4">
                    <div className="relative w-12 h-12 rounded flex-shrink-0 overflow-hidden">
                      <Image 
                        src={companyPreview.logo} 
                        alt={`${companyPreview.name} logo`}
                        fill
                        sizes="48px"
                        className="object-cover"
                        onError={() => {
                          // Fallback handled by next/image automatically
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-slate-800">{companyPreview.name}</h3>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          companyPreview.confidence === 'high' 
                            ? 'bg-green-100 text-green-800' 
                            : companyPreview.confidence === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-slate-600'
                        }`}>
                          {companyPreview.confidence === 'high' ? 'Verified' : 
                           companyPreview.confidence === 'medium' ? 'Likely match' : 'Basic info'}
                        </div>
                      </div>
                      
                      {companyPreview.domain && (
                        <p className="text-sm text-slate-600 truncate">{companyPreview.domain}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                        {companyPreview.industry && (
                          <span>{companyPreview.industry}</span>
                        )}
                        {companyPreview.employees && (
                          <span>{companyPreview.employees} employees</span>
                        )}
                        {companyPreview.location && (
                          <span>{companyPreview.location}</span>
                        )}
                      </div>
                      
                      {companyPreview.description && (
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                          {companyPreview.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {error && (
                  <div className="text-sm text-red-600 flex items-start space-x-2">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setStep('input')}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100/80 hover:bg-slate-200/80 backdrop-blur-sm rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Add to Exploration
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-800 mb-2">
                  Adding Company
                </h2>
                <p className="text-sm text-slate-600">
                  Gathering company information and computing CMF match...
                </p>
              </div>
              
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="relative mb-4">
                    <svg className="w-8 h-8 animate-spin text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-600">
                    Analyzing {companyPreview?.name} against your CMF criteria...
                  </p>
                  <div className="mt-2 text-xs text-slate-400">
                    This may take 10-15 seconds
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddCompanyModal;