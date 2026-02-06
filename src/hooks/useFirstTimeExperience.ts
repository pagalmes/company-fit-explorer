import { useState, useEffect } from 'react';

/**
 * @deprecated This hook is deprecated. Onboarding state is now tracked in Supabase
 * via the `profile_status` column in the profiles table.
 *
 * Profile status values:
 * - 'pending': User needs to complete onboarding
 * - 'complete': User has completed onboarding with valid profile
 * - 'incomplete': Admin-seeded or partial profile
 *
 * See AppContainer.tsx for the new implementation that uses the /api/user/data
 * endpoint to fetch profile_status from Supabase.
 *
 * This hook is kept for backwards compatibility with E2E tests that use
 * the skip-intro URL parameter. It NO LONGER uses localStorage - onboarding
 * state is managed entirely in Supabase.
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

    // Default to first-time (onboarding will be shown)
    // Actual onboarding state is managed in Supabase via profile_status
    setIsFirstTime(true);
    setHasChecked(true);
  }, []);

  /**
   * @deprecated No-op function for backwards compatibility.
   * Onboarding completion is now handled by updating profile_status in Supabase.
   * See AppContainer.handleFirstTimeComplete() for the new implementation.
   */
  const markAsVisited = () => {
    console.warn('useFirstTimeExperience.markAsVisited() is deprecated. Use Supabase profile_status instead.');
    setIsFirstTime(false);
  };

  /**
   * @deprecated No-op function for backwards compatibility.
   * Onboarding reset is now handled via /api/user/reset-onboarding endpoint.
   * Use the reset-onboarding=true URL parameter or the admin reset button instead.
   */
  const resetFirstTime = () => {
    console.warn('useFirstTimeExperience.resetFirstTime() is deprecated. Use /api/user/reset-onboarding instead.');
    setIsFirstTime(true);
  };

  return {
    isFirstTime,
    hasChecked,
    markAsVisited,
    resetFirstTime
  };
};