import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { installAutoLogger, setLogContext, sourceForPath, logNavigation } from '../lib/autolog';

/**
 * Mounted once inside <BrowserRouter>. Installs the global interaction
 * listeners and records every navigation. Surface/route context is derived
 * here from the router; per-session context (roomCode, student, task) is
 * supplied by each surface via useLogContext.
 */
export default function AutoLogger() {
  const location = useLocation();
  const prevPath = useRef<string | null>(null);

  useEffect(() => installAutoLogger(), []);

  useEffect(() => {
    setLogContext({ source: sourceForPath(location.pathname), route: location.pathname });
    // Log the landing view and every subsequent navigation exactly once.
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      logNavigation(location.pathname);
    }
  }, [location.pathname]);

  return null;
}
