import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import mixpanel from 'mixpanel-browser';

const AnalyticsTracker: React.FC = () => {
  const location = useLocation();

  // Determine Portal Context
  const getPortal = () => {
    const path = location.pathname;
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/business')) return 'business';
    return 'user';
  };

  // Track SPA Route Changes as Page Views
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const portal = getPortal();
      console.log(`[Analytics] Initializing Page View tracking for portal: ${portal}`);
      
      // Mixpanel Page View Tracking
      mixpanel.track('Page View', {
        page_url: window.location.href,
        page_path: location.pathname,
        page_title: document.title,
        portal: portal,
      });

      ReactGA.send({ 
        hitType: "pageview", 
        page: location.pathname + location.search 
      });
      console.log(`[Analytics] Tracked Pageview (${portal}): ${location.pathname}${location.search}`);
    }
  }, [location]);

  // Global Interaction Tracking (Track All The Things)
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const portal = getPortal();
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

        // Mixpanel Interaction Tracking
        mixpanel.track('User Interaction', {
          action: 'click',
          element_type: type,
          element_text: text,
          element_id: id,
          portal: portal,
          page_url: window.location.href
        });

        ReactGA.event({
          category: 'User Interaction',
          action: 'click',
          label: `${type}: ${text} (${id})`,
          value: 1
        });

        console.log(`[Analytics] Tracked Interaction (${portal}): ${type} - "${text}"`);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return null; // This component doesn't render anything
};

export default AnalyticsTracker;
