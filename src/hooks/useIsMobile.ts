import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the viewport is mobile-sized
 * Uses Tailwind's 'md' breakpoint (768px) as the threshold
 *
 * @returns boolean - true if viewport width <= 768px (mobile), false otherwise (desktop/tablet)
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind's md breakpoint
    };

    // Check on mount
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
