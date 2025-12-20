import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the device is mobile
 *
 * Best practice approach (2025):
 * - Combines touch capability with viewport width
 * - Avoids unreliable user-agent detection
 * - Properly handles mobile devices in both portrait and landscape orientations
 *
 * Detection logic:
 * - Mobile (portrait): width < 768px
 * - Mobile (landscape): touch device with width < 1024px
 * - Tablet/Desktop: width >= 1024px OR no touch support
 *
 * @returns boolean - true if mobile device, false otherwise
 */
export function useIsMobile(): boolean {
  // Initialize with proper value to avoid flash of wrong UI
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const width = window.innerWidth;
    return width < 768 || (hasTouch && width < 1024);
  });

  // Track window width separately to force re-renders on orientation changes
  const [, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    const checkMobile = () => {
      // Check if device has touch capability (more reliable than user agent)
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // Mobile breakpoints following 2025 best practices:
      // - Portrait mobile: < 768px (Tailwind md breakpoint)
      // - Landscape mobile: touch device < 1024px (prevents treating phones as tablets)
      const width = window.innerWidth;
      const isMobileWidth = width < 768;
      const isLandscapeMobile = hasTouch && width < 1024;

      // Consider it mobile if portrait OR landscape mobile
      const newIsMobile = isMobileWidth || isLandscapeMobile;

      // Update width state to force re-renders even if isMobile doesn't change
      setWindowWidth(width);

      setIsMobile(prev => {
        if (prev !== newIsMobile) {
          return newIsMobile;
        }
        return prev;
      });
    };

    // Check on mount
    checkMobile();

    // Handle resize
    const handleResize = () => {
      checkMobile();
    };

    // Handle orientation changes with delay to ensure dimensions are updated
    const handleOrientationChange = () => {
      // iOS Safari needs a delay for dimensions to update after orientation change
      setTimeout(() => {
        checkMobile();
      }, 150);
    };

    // Listen to both resize and orientationchange for better mobile support
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return isMobile;
}
