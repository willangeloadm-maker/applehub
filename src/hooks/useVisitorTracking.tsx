import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('visitor_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('visitor_session_id', sessionId);
  }
  return sessionId;
};

export const useVisitorTracking = () => {
  const location = useLocation();
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    const trackVisit = async () => {
      // Avoid tracking the same page twice in a row
      if (lastTrackedPath.current === location.pathname) {
        return;
      }
      lastTrackedPath.current = location.pathname;

      try {
        const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        
        const sessionId = getSessionId();
        
        await supabase.functions.invoke('track-visitor', {
          body: {
            page_visited: location.pathname,
            referrer: document.referrer || null,
            session_id: sessionId,
            user_id: user?.id || null,
          },
        });
      } catch (error) {
        // Silently fail - tracking should not affect user experience
        console.log('Tracking error (non-critical):', error);
      }
    };

    // Small delay to avoid tracking during redirects
    const timeoutId = setTimeout(trackVisit, 500);
    return () => clearTimeout(timeoutId);
  }, [location.pathname]);
};
