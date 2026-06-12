import { useEffect, useRef, useCallback } from 'react';

/**
 * Back navigation state: tracks modals open across child components.
 * Each child registers a { modalRef, onCloseModal } pair.
 */
const modalRegistry = [];

/**
 * Register a modal that the back button should close.
 * @param {React.RefObject<boolean>} modalOpenRef - ref tracking if modal is open
 * @param {Function} closeFn - function to call to close the modal
 */
export function registerModal(modalOpenRef, closeFn) {
  const entry = { modalOpenRef, closeFn };
  modalRegistry.push(entry);
  return () => {
    const idx = modalRegistry.indexOf(entry);
    if (idx !== -1) modalRegistry.splice(idx, 1);
  };
}

/**
 * Close the topmost open modal. Returns true if a modal was closed.
 */
function closeTopModal() {
  // Iterate in reverse order (last opened = top)
  for (let i = modalRegistry.length - 1; i >= 0; i--) {
    const entry = modalRegistry[i];
    if (entry.modalOpenRef.current) {
      entry.closeFn();
      return true;
    }
  }
  return false;
}

/**
 * useBackNavigation — Android hardware back button handler for TWA apps.
 *
 * Back button priority (from popstate event):
 * 1. Close the topmost modal/form (if any are open)
 * 2. Navigate to 'home' if on a sub-page
 * 3. Show "Press back again to exit" toast, exit on second press (home only)
 *
 * @param {Object} params
 * @param {string} params.currentMenu  - current menu state (e.g. 'home', 'workers', etc.)
 * @param {Function} params.setMenu    - setter to change menu
 * @param {boolean} params.isHome      - true when currentMenu === 'home'
 * @param {Function} params.showExitToast - function to show "press back again" toast
 * @param {number} params.exitTimeoutMs - time window for double-press to exit (default 2000)
 */
export default function useBackNavigation({
  currentMenu,
  setMenu,
  isHome,
  showExitToast,
  exitTimeoutMs = 2000,
}) {
  const lastBackTimeRef = useRef(0);
  const isHomeRef = useRef(isHome);
  const currentMenuRef = useRef(currentMenu);

  // Keep refs in sync
  useEffect(() => {
    isHomeRef.current = isHome;
    currentMenuRef.current = currentMenu;
  }, [isHome, currentMenu]);

  // Push history state when navigating to a sub-page (non-home)
  useEffect(() => {
    if (!isHome) {
      // Push a history entry so Android back (popstate) fires
      window.history.pushState({ menu: currentMenu }, '');
    }
  }, [currentMenu, isHome]);

  const handlePopState = useCallback((e) => {
    // 1. Check if any modal is open → close it
    if (closeTopModal()) {
      // Re-push the state we just consumed, so the next back press
      // triggers this handler again (for the menu/home logic)
      window.history.pushState({ menu: currentMenuRef.current }, '');
      return;
    }

    // 2. If on a sub-page → go to home
    if (!isHomeRef.current) {
      setMenu('home');
      // Push a state so we're back to "sub-page" state conceptually,
      // but actually at home now. Next back will trigger exit logic.
      window.history.pushState({ menu: 'home' }, '');
      return;
    }

    // 3. On home → show exit toast, double-press to exit
    const now = Date.now();
    if (now - lastBackTimeRef.current < exitTimeoutMs) {
      // Second press within timeout → exit the TWA
      window.history.back();
      return;
    }

    lastBackTimeRef.current = now;
    showExitToast();

    // Re-push state so popstate fires again on next back press
    window.history.pushState({ menu: 'home' }, '');
  }, [setMenu, showExitToast, exitTimeoutMs]);

  useEffect(() => {
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlePopState]);
}