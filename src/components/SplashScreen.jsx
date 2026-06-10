import React, { useEffect, useRef } from 'react';

/**
 * SplashScreen — shows the KAC OFFICIAL branding with logo animation
 * for 2 seconds on cold start when running in TWA mode.
 *
 * Animations:
 *  - Logo scales up from 0.8 → 1.0 and fades in over 0.6s
 *  - After 2s, the entire splash fades out over 0.5s
 *
 * Props:
 *  - onComplete: callback invoked after the full 2s display + fade out
 */
export default function SplashScreen({ onComplete }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // Start the fade-out after 2 seconds
    const fadeTimer = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.style.opacity = '0';
      }
    }, 2000);

    // After 2s + 0.5s fade transition, call onComplete
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        transition: 'opacity 0.5s ease-out',
        opacity: 1,
      }}
    >
      <img
        src="/icons/icon-512x512.png"
        alt="KAC OFFICIAL"
        style={{
          width: 128,
          height: 128,
          borderRadius: 24,
          animation: 'kac-splash-logo 0.6s ease-out forwards',
        }}
        onError={(e) => {
          // If the logo fails to load, hide the broken image
          e.target.style.display = 'none';
        }}
      />
      <h1
        style={{
          margin: '24px 0 0',
          color: '#ffffff',
          fontSize: 24,
          fontWeight: 600,
          fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          letterSpacing: 0.5,
          animation: 'kac-splash-logo 0.6s ease-out forwards',
        }}
      >
        KAC OFFICIAL
      </h1>

      {/* Inject keyframes once */}
      <style>{`
        @keyframes kac-splash-logo {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1.0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}