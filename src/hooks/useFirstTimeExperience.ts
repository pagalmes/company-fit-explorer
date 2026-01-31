import { useState, useEffect } from 'react';

/**
 * @deprecated This hook is deprecated. Onboarding state is now tracked in Supabase
 * via the `profile_status` column in the profiles table.
 *
 * - 'pending': User needs to complete onboarding
 * - 'complete': User has completed onboarding with valid profile
 * - 'incomplete': Admin-seeded or partial profile
 *
 * See AppContainer.tsx for the new implementation that uses the /api/user/data
 * endpoint to fetch profile_status.
 *
 * This hook is kept for backwards compatibility with E2E tests that use
 * the skip-intro URL parameter.
 */
export const useFirstTimeExperience = () => {
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Check for test bypass parameter
    const urlParams = new URLSearchParams(window.location.search);
    const skipIntro = urlParams.get('skip-intro');
    
    // Check for test environment indicators
    const isTestEnv = process.env.NODE_ENV === 'test' || 
                      window.location.hostname === 'localhost' && skipIntro === 'true' ||
                      document.title.includes('Test') ||
                      window.navigator.userAgent.includes('Playwright');
    
    if (isTestEnv || skipIntro === 'true') {
      setIsFirstTime(false);
      setHasChecked(true);
      return;
    }

    // Check if user has visited before (with legacy key migration)
    let hasVisited = localStorage.getItem('cosmos-visited');
    if (!hasVisited) {
      const legacyVisited = localStorage.getItem('cmf-explorer-visited');
      if (legacyVisited) {
        localStorage.setItem('cosmos-visited', legacyVisited);
        localStorage.removeItem('cmf-explorer-visited');
        hasVisited = legacyVisited;
      }
    }
    setIsFirstTime(!hasVisited);
    setHasChecked(true);
  }, []);

  const markAsVisited = () => {
    localStorage.setItem('cosmos-visited', 'true');
    setIsFirstTime(false);
  };

  const resetFirstTime = () => {
    localStorage.removeItem('cosmos-visited');
    setIsFirstTime(true);
  };

  return {
    isFirstTime,
    hasChecked,
    markAsVisited,
    resetFirstTime
  };
};