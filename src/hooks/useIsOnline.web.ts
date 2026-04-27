import { useEffect, useState } from 'react';

/**
 * Web: `navigator` + events — no `@react-native-community/netinfo` import (keeps web bundling working).
 */
export function useIsOnline() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return { isConnected: online, isInternetReachable: online ? (true as const) : (false as const) };
}
