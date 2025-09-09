import React, { useState, useEffect } from 'react';
import DreamyFirstContact from './DreamyFirstContact';
import CMFGraphExplorerNew from './CMFGraphExplorerNew';
import { useFirstTimeExperience } from '../hooks/useFirstTimeExperience';
import { createUserProfileFromFiles } from '../utils/fileProcessing';
import { UserCMF, UserExplorationState } from '../types';
import { activeUserProfile } from '../data/companies';
import { createProfileForUser } from '../utils/userProfileCreation';

const AppContainer: React.FC = () => {
  const { isFirstTime, hasChecked, markAsVisited } = useFirstTimeExperience();
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserExplorationState | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [_isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication FIRST, before any other logic
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      if (!hasChecked) {
        return;
      }

      try {
        // Always check authentication first, regardless of first-time status
        const response = await fetch('/api/user/data');
        const userData = await response.json();

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

        if (userData.hasData && userData.companyData) {
          // Existing user with data
          const dbUserProfile = userData.companyData.user_profile;
          const dbCompanies = userData.companyData.companies;

          const customProfile: UserExplorationState = {
            ...activeUserProfile, // Use as base structure
            id: userData.companyData.user_id,
            name: dbUserProfile?.name || 'User',
            cmf: dbUserProfile?.cmf || dbUserProfile,
            // Handle UserExplorationState format from admin import
            baseCompanies: dbUserProfile?.baseCompanies || dbCompanies || [],
            addedCompanies: dbUserProfile?.addedCompanies || [],
            // Override with user_profile preferences first, then fallback to separate preferences
            watchlistCompanyIds: dbUserProfile?.watchlistCompanyIds || userData.preferences?.watchlist_company_ids || [],
            removedCompanyIds: dbUserProfile?.removedCompanyIds || userData.preferences?.removed_company_ids || [],
            viewMode: dbUserProfile?.viewMode || userData.preferences?.view_mode || 'explore'
          };

          setUserProfile(customProfile);
        } else {
          // Authenticated but no data - new user (will show first-time experience)
          
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

  // Show dreamy first contact for first-time users
  if (isFirstTime && hasChecked) {
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

        <div className="relative">
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