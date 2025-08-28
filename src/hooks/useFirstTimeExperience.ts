import { useState, useEffect } from 'react';

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

    // Check if user has visited before
    const hasVisited = localStorage.getItem('cmf-explorer-visited');
    setIsFirstTime(!hasVisited);
    setHasChecked(true);
  }, []);

  const markAsVisited = () => {
    localStorage.setItem('cmf-explorer-visited', 'true');
    setIsFirstTime(false);
  };

  const resetFirstTime = () => {
    localStorage.removeItem('cmf-explorer-visited');
    setIsFirstTime(true);
  };

  return {
    isFirstTime,
    hasChecked,
    markAsVisited,
    resetFirstTime
  };
};