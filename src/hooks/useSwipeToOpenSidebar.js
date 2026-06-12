import { useEffect, useRef } from 'react';

/**
 * Hook to detect left-to-right swipe gesture from anywhere on the screen
 * to open the sidebar. Only triggers when the sidebar is currently closed.
 * Does not interfere with normal vertical scrolling or horizontal scroll containers.
 *
 * @param {Function} onOpenSidebar - Callback to open/expand the sidebar
 * @param {Object}   options
 * @param {number}   options.threshold - Minimum px horizontal distance to trigger (default: 50)
 */
export default function useSwipeToOpenSidebar(onOpenSidebar, options = {}) {
  const { threshold = 50 } = options;
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const sidebarOpenRef = useRef(false);

  useEffect(() => {
    if (typeof onOpenSidebar !== 'function') return;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;

      // Check if sidebar is currently open by looking for the open class
      // on any .page-aside.slidebar element
      const sidebar = document.querySelector('.page-aside.slidebar');
      sidebarOpenRef.current = sidebar && sidebar.classList.contains('open');
    };

    const handleTouchEnd = (e) => {
      if (touchStartXRef.current === null) return;
      if (sidebarOpenRef.current) {
        touchStartXRef.current = null;
        touchStartYRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartXRef.current;
      const deltaY = touch.clientY - touchStartYRef.current;

      // Check right-swipe conditions:
      // 1. Swiped right far enough
      // 2. More horizontal than vertical movement (avoids accidental triggers from scrolling)
      // 3. Not inside a horizontally scrollable container
      const isRightSwipe =
        deltaX > threshold &&
        Math.abs(deltaY) < Math.abs(deltaX) * 1.5;

      if (isRightSwipe) {
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
  }, [onOpenSidebar, threshold]);
}

/* ------------------------------------------------------------------ */
/*  Helper: determine if the touch target sits inside a horizontally   */
/*  scrollable container (AG Grid, date strip, <table> with overflow)  */
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

      // Date strip / horizontal scroll containers commonly used in attendance
      // Class names that indicate horizontal scrolling containers
      if (
        el.matches('.date-strip') ||
        el.matches('.date-strip-container') ||
        el.matches('[class*="dateStrip"]') ||
        el.matches('[class*="date-scroll"]') ||
        el.matches('[class*="horizontal-scroll"]')
      ) {
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