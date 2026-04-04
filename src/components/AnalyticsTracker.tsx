import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

const AnalyticsTracker: React.FC = () => {
  const location = useLocation();

  // Track SPA Route Changes as Page Views
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ReactGA.send({ 
        hitType: "pageview", 
        page: location.pathname + location.search 
      });
      console.debug(`[Analytics] Tracked Pageview: ${location.pathname}${location.search}`);
    }
  }, [location]);

  // Global Interaction Tracking (Track All The Things)
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Find the closest interactive element (button, link, etc.)
      const interactiveElement = target.closest('button, a, [role="button"], input[type="submit"], input[type="button"]');
      
      if (interactiveElement) {
        const text = interactiveElement.textContent?.trim().substring(0, 50) || 
                     interactiveElement.getAttribute('aria-label') || 
                     interactiveElement.getAttribute('title') || 
                     interactiveElement.getAttribute('name') ||
                     'unknown_interaction';

        const id = interactiveElement.id || 'no_id';
        const type = interactiveElement.tagName.toLowerCase();

        ReactGA.event({
          category: 'User Interaction',
          action: 'click',
          label: `${type}: ${text} (${id})`,
          value: 1
        });

        console.debug(`[Analytics] Tracked Interaction: ${type} - "${text}"`);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return null; // This component doesn't render anything
};

export default AnalyticsTracker;
