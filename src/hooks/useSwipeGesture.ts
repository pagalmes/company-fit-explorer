import { useEffect, useRef } from 'react';

interface SwipeGestureOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  threshold?: number; // Minimum distance in pixels to trigger swipe
  velocityThreshold?: number; // Minimum velocity to trigger swipe
}

/**
 * Custom hook to handle swipe gestures on mobile devices
 * @param options Configuration for swipe behavior
 * @returns Ref to attach to the element that should respond to swipes
 */
export function useSwipeGesture<T extends HTMLElement = HTMLDivElement>(
  options: SwipeGestureOptions
) {
  const {
    onSwipeRight,
    onSwipeLeft,
    threshold = 50, // At least 50px swipe
    velocityThreshold = 0.3, // Minimum velocity (pixels per ms)
  } = options;

  const elementRef = useRef<T>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchStartTime.current = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();

      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;
      const deltaTime = touchEndTime - touchStartTime.current;

      // Calculate velocity (pixels per millisecond)
      const velocity = Math.abs(deltaX) / deltaTime;

      // Only trigger swipe if horizontal movement is greater than vertical
      // This prevents interfering with scrolling
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Check if swipe meets threshold or velocity requirements
        if (Math.abs(deltaX) >= threshold || velocity >= velocityThreshold) {
          if (deltaX > 0 && onSwipeRight) {
            // Swipe right
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            // Swipe left
            onSwipeLeft();
          }
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeRight, onSwipeLeft, threshold, velocityThreshold]);

  return elementRef;
}
