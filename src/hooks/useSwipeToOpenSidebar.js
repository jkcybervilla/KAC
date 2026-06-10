import { useEffect, useRef } from 'react';
import { isTwaMode } from '../utils/pwa';

/**
 * Hook to detect right swipe gesture from the left edge to open the sidebar.
 * Only activates in TWA mode (Android app / standalone display mode).
 * Does not interfere with horizontal scrolling in tables or AG Grid components.
 *
 * @param {Function} onOpenSidebar - Callback to open/expand the sidebar
 * @param {Object}   options
 * @param {number}   options.threshold     - Minimum px horizontal distance to trigger (default: 50)
 * @param {number}   options.edgeThreshold - Max px from left edge to start detection (default: 30)
 */
export default function useSwipeToOpenSidebar(onOpenSidebar, options = {}) {
  const { threshold = 50, edgeThreshold = 30 } = options;
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  useEffect(() => {
    // Only enable in TWA / Android mode
    if (!isTwaMode() || typeof onOpenSidebar !== 'function') return;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
    };

    const handleTouchEnd = (e) => {
      if (touchStartXRef.current === null) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartXRef.current;
      const deltaY = touch.clientY - touchStartYRef.current;

      // Check right-swipe conditions:
      // 1. Starts near the left edge of the screen
      // 2. Swiped right far enough
      // 3. More horizontal than vertical movement (avoids accidental triggers from scrolling)
      const isRightSwipeFromEdge =
        touchStartXRef.current <= edgeThreshold &&
        deltaX > threshold &&
        Math.abs(deltaY) < Math.abs(deltaX) * 1.5;

      if (isRightSwipeFromEdge) {
        // Prevent triggering when touch started inside a horizontally scrollable
        // container (AG Grid tables, regular tables, etc.)
        const target = e.target;
        if (!isHorizontalScrollContainer(target)) {
          onOpenSidebar();
        }
      }

      touchStartXRef.current = null;
      touchStartYRef.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onOpenSidebar, threshold, edgeThreshold]);
}

/* ------------------------------------------------------------------ */
/*  Helper: determine if the touch target sits inside a horizontally   */
/*  scrollable container (AG Grid, <table> with overflow, etc.)       */
/* ------------------------------------------------------------------ */
function isHorizontalScrollContainer(element) {
  // Known AG Grid / table selectors that use horizontal scrolling
  const scrollContainerSelectors = [
    '.ag-root-wrapper',
    '.ag-body-viewport',
    '.ag-center-cols-clipper',
    '.ag-center-cols-viewport',
    '.ag-body-horizontal-scroll',
  ];

  let el = element;
  while (el && el !== document.body) {
    if (el.matches) {
      // Check against known scrollable AG Grid class names
      for (const selector of scrollContainerSelectors) {
        if (el.matches(selector)) return true;
      }

      // Native tables wrapped in a scrollable container
      if (el.matches('table')) {
        const parentStyle = getComputedStyle(el.parentElement);
        if (
          parentStyle.overflowX === 'auto' ||
          parentStyle.overflowX === 'scroll'
        )
          return true;
      }
    }

    // Generic check: any parent with horizontal overflow that is scrollable
    if (el !== element) {
      const style = getComputedStyle(el);
      const overflowX = style.overflowX;
      if (
        (overflowX === 'auto' || overflowX === 'scroll') &&
        el.scrollWidth > el.clientWidth
      ) {
        return true;
      }
    }

    el = el.parentElement;
  }

  return false;
}