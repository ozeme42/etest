import { useState, useEffect } from 'react';

export function useMediaQuery(query) {
  const checkMatches = () => {
    if (typeof window === 'undefined') return false;
    try {
      if (window.matchMedia) {
        return window.matchMedia(query).matches;
      }
    } catch {}
    // Fallback if matchMedia is unsupported
    return window.innerWidth <= 1024;
  };

  const [matches, setMatches] = useState(checkMatches);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateMatches = () => setMatches(checkMatches());
    updateMatches();

    let mediaQueryList = null;
    let listener = null;

    try {
      if (window.matchMedia) {
        mediaQueryList = window.matchMedia(query);
        listener = (event) => setMatches(event.matches);

        if (mediaQueryList.addEventListener) {
          mediaQueryList.addEventListener('change', listener);
        } else if (mediaQueryList.addListener) {
          mediaQueryList.addListener(listener);
        }
      }
    } catch {}

    window.addEventListener('resize', updateMatches);

    return () => {
      try {
        if (mediaQueryList && listener) {
          if (mediaQueryList.removeEventListener) {
            mediaQueryList.removeEventListener('change', listener);
          } else if (mediaQueryList.removeListener) {
            mediaQueryList.removeListener(listener);
          }
        }
      } catch {}
      window.removeEventListener('resize', updateMatches);
    };
  }, [query]);

  return matches;
}
