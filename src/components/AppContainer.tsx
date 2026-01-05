import React, { useState, useEffect } from 'react';
import DreamyFirstContact from './DreamyFirstContact';
import CMFGraphExplorerNew from './CMFGraphExplorerNew';
import { useFirstTimeExperience } from '../hooks/useFirstTimeExperience';
import { createUserProfileFromFiles } from '../utils/fileProcessing';
import { UserCMF, UserExplorationState } from '../types';
import { activeUserProfile } from '../data/companies';
import { createProfileForUser } from '../utils/userProfileCreation';
import { migrateCompanyLogos } from '../utils/logoMigration';
import { mergeUserPreferences } from '../utils/userPreferencesMerger';
import { loadInterviewCMFFromStorage, INTERVIEW_CMF_STORAGE_KEY } from '../utils/interviewToCMF';

const AppContainer: React.FC = () => {
  const { isFirstTime, hasChecked, markAsVisited } = useFirstTimeExperience();
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserExplorationState | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [_isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasCompletedDataCheck, setHasCompletedDataCheck] = useState(false);
  const [isViewingAsUser, setIsViewingAsUser] = useState(false);
  const [viewedUserInfo, setViewedUserInfo] = useState<{ email: string; full_name: string } | null>(null);

  // Check authentication FIRST, before any other logic
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      if (!hasChecked) {
        return;
      }

      try {
        // Check for viewAsUserId in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const viewAsUserId = urlParams.get('viewAsUserId');

        // Build API URL with viewAsUserId param if present
        let apiUrl = '/api/user/data';
        if (viewAsUserId) {
          apiUrl += `?viewAsUserId=${viewAsUserId}`;
        }

        // Always check authentication first, regardless of first-time status
        const response = await fetch(apiUrl);
        const userData = await response.json();

        // Track if we're viewing as another user
        if (userData.isViewingAsUser) {
          setIsViewingAsUser(true);
          setViewedUserInfo(userData.viewedUserInfo || null);
        }

        // Check if user is authenticated using the authenticated field
        const userIsAuthenticated = userData.authenticated !== false;
        setIsAuthenticated(userIsAuthenticated);

        if (!userIsAuthenticated) {
          // User is not authenticated, redirect to login
          console.log('🚨 SECURITY: User not authenticated, redirecting to login');
          setAuthLoading(false);
          window.location.href = '/login';
          return;
        }

        // User is authenticated - now handle data loading
        console.log('🔍 AppContainer userData analysis:', {
          hasData: userData.hasData,
          hasCompanyData: !!userData.companyData,
          companyDataKeys: userData.companyData ? Object.keys(userData.companyData) : null,
          userId: userData.userId
        });

        if (userData.hasData && userData.companyData) {
          // Existing user with data - mark as visited to skip onboarding
          console.log('✅ User has data, marking as visited to skip first-time experience');
          markAsVisited();
          
          const dbUserProfile = userData.companyData.user_profile;
          const dbCompanies = userData.companyData.companies;

          // Migrate logo URLs from Clearbit to Logo.dev
          // Use baseCompanies if it has data, otherwise fall back to companies array
          const baseCompanies = (dbUserProfile?.baseCompanies && dbUserProfile.baseCompanies.length > 0)
            ? dbUserProfile.baseCompanies
            : (dbCompanies || []);
          const addedCompanies = dbUserProfile?.addedCompanies || [];

          // Merge preferences from both sources using centralized utility
          const mergedPreferences = mergeUserPreferences(dbUserProfile, userData.preferences);

          const customProfile: UserExplorationState = {
            ...activeUserProfile, // Use as base structure
            id: userData.companyData.user_id,
            name: dbUserProfile?.name || 'User',
            cmf: dbUserProfile?.cmf || dbUserProfile,
            // Handle UserExplorationState format from admin import - with logo migration
            baseCompanies: migrateCompanyLogos(baseCompanies),
            addedCompanies: migrateCompanyLogos(addedCompanies),
            // Use merged preferences from centralized utility
            watchlistCompanyIds: mergedPreferences.watchlistCompanyIds,
            removedCompanyIds: mergedPreferences.removedCompanyIds,
            viewMode: mergedPreferences.viewMode
          };

          setUserProfile(customProfile);
        } else {
          // Authenticated but no data - check for interview CMF first
          const urlParams = new URLSearchParams(window.location.search);
          const fromInterview = urlParams.get('from') === 'interview';
          const interviewCMF = loadInterviewCMFFromStorage();
          
          if (fromInterview && interviewCMF) {
            // Coming from interview with CMF data - use it!
            console.log('✅ Loading profile from interview CMF data');
            markAsVisited();
            
            // Update the ID to use the real user ID
            const profileWithRealId: UserExplorationState = {
              ...interviewCMF,
              id: userData.userId,
            };
            
            setUserProfile(profileWithRealId);
            
            // Clear the interview CMF from storage after using it
            localStorage.removeItem(INTERVIEW_CMF_STORAGE_KEY);
          } else {
            // No interview data - show first-time experience
            console.log('❌ User has no data, will show first-time experience');
            
            // Use the real user ID from the API response
            const realUserId = userData.userId;
            
            // Clear localStorage only if NOT using local fallback
            if (process.env.NEXT_PUBLIC_USE_LOCAL_FALLBACK !== 'true') {
              localStorage.removeItem('cmf-exploration-state');
              localStorage.removeItem('cmf-explorer-watchlist');
              localStorage.removeItem('cmf-explorer-custom-companies');
              localStorage.removeItem('cmf-explorer-removed-companies');
              localStorage.removeItem('cmf-watchlist-state');
              localStorage.removeItem('cmf-removed-companies');
            }
            
            const newProfile = await createProfileForUser({
              userId: realUserId, // Use real Supabase user ID
              userName: 'New User'
            }, true);
            
            setUserProfile(newProfile);
          }
        }

        // Mark that we've completed the data check
        setHasCompletedDataCheck(true);
      } catch (error) {
        console.error('Error during auth check and data loading:', error);
        
        // On error, redirect to login for safety
        window.location.href = '/login';
      } finally {
        setDataLoading(false);
        setAuthLoading(false);
      }
    };

    // Always check authentication, regardless of first-time status
    checkAuthAndLoadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChecked]);

  const handleFirstTimeComplete = async (resumeFile: File, cmfFile: File) => {
    setIsLoading(true);
    
    try {
      // Process the uploaded files to create user profile
      const newUserCMF: UserCMF = await createUserProfileFromFiles(resumeFile, cmfFile, activeUserProfile.id);
      
      // Create new user exploration state with the processed profile
      const newUserProfile: UserExplorationState = {
        ...activeUserProfile,
        cmf: newUserCMF,
        name: newUserCMF.name
      };
      
      // Mark as visited
      markAsVisited();
      
      // Simulate processing time for dramatic effect
      setTimeout(() => {
        setUserProfile(newUserProfile);
        setIsLoading(false);
        setIsTransitioning(true);
        
        // After a brief transition, remove transition state
        setTimeout(() => {
          setIsTransitioning(false);
        }, 1000);
      }, 3000);
      
    } catch (error) {
      console.error('Error processing files:', error);
      
      // Fallback to default profile if processing fails
      setTimeout(() => {
        setUserProfile(activeUserProfile);
        markAsVisited();
        setIsLoading(false);
        setIsTransitioning(true);
        
        setTimeout(() => {
          setIsTransitioning(false);
        }, 1000);
      }, 2000);
    }
  };

  // Loading state during universe generation
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        {/* Floating cosmic particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <div className="w-1 h-1 bg-blue-300 rounded-full" />
            </div>
          ))}
        </div>
        
        <div className="text-center px-4">
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full mx-auto animate-pulse shadow-2xl" />
            <div className="absolute inset-0 scale-150 opacity-20">
              <div className="w-32 h-32 bg-gradient-to-r from-orange-400 to-purple-500 rounded-full animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-6">
            🌟 Generating Your Universe 🌟
          </h1>
          <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            Analyzing your profile and mapping perfect company matches...
          </p>
          
          <div className="flex justify-center space-x-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show dreamy first contact for first-time users - but only after we've completed data check
  if (isFirstTime && hasChecked && !authLoading && !dataLoading && hasCompletedDataCheck) {
    return <DreamyFirstContact onComplete={handleFirstTimeComplete} />;
  }

  // Transition state - smooth fade from dark to light
  if (isTransitioning) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-0 animate-pulse" 
             style={{ animationDuration: '2s', animationFillMode: 'forwards' }} />
        
        <div className="text-center px-4 relative z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full mx-auto animate-pulse shadow-2xl mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4 animate-fade-out">
            🚀 Launching Your Career Universe
          </h1>
          <p className="text-lg text-blue-200 animate-fade-out">
            Preparing your personalized company exploration...
          </p>
        </div>
      </div>
    );
  }

  // Floating stars component for cosmic background
  const FloatingStars = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-pulse opacity-30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        >
          <div className="w-1 h-1 bg-blue-300 rounded-full" />
        </div>
      ))}
    </div>
  );

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full mx-auto animate-pulse shadow-2xl mb-4" />
          <p className="text-slate-600 text-lg">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show the main graph explorer for returning users or after completion
  if (userProfile && hasChecked && !authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden transition-all duration-1000">
        <FloatingStars />

        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* View As User Banner */}
        {isViewingAsUser && viewedUserInfo && (
          <div className="absolute top-0 left-0 right-0 bg-purple-600 text-white px-4 py-3 z-50 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                </svg>
                <span className="font-semibold">
                  🔍 Viewing as: {viewedUserInfo.full_name || viewedUserInfo.email}
                </span>
                <span className="text-purple-200 text-sm">
                  ({viewedUserInfo.email})
                </span>
              </div>
              <button
                onClick={() => window.close()}
                className="bg-purple-700 hover:bg-purple-800 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        )}

        <div className="relative" style={{ marginTop: isViewingAsUser ? '52px' : '0' }}>
          <CMFGraphExplorerNew userProfile={userProfile} />
        </div>
      </div>
    );
  }

  // Show loading while fetching user data (only after auth is verified)
  if (dataLoading && hasChecked && !isFirstTime && !authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-300 to-purple-400 rounded-full mx-auto animate-pulse shadow-2xl mb-4" />
          <p className="text-white text-lg">Loading your personalized data...</p>
        </div>
      </div>
    );
  }

  // Loading state while checking first-time status (avoid blue background if auth is still loading)
  
  return (
    <div className={`min-h-screen flex items-center justify-center ${
      authLoading 
        ? 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50' 
        : 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900'
    }`}>
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-300 to-purple-400 rounded-full mx-auto animate-pulse shadow-2xl mb-4" />
        <p className={`text-lg ${authLoading ? 'text-slate-600' : 'text-white'}`}>
          {authLoading ? 'Verifying authentication...' : 'Initializing...'}
        </p>
      </div>
    </div>
  );
};

export default AppContainer;