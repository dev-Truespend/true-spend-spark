import { useState, useEffect, useCallback } from 'react';

export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

interface NetworkInfo {
  quality: NetworkQuality;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  isOnline: boolean;
}

export function useNetworkQuality() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    quality: 'good',
    isOnline: navigator.onLine,
  });

  const [lastCheckTime, setLastCheckTime] = useState(Date.now());
  const [pingTime, setPingTime] = useState<number | null>(null);

  const measurePing = useCallback(async () => {
    try {
      const start = performance.now();
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-store',
      });
      const end = performance.now();
      
      if (response.ok) {
        const ping = end - start;
        setPingTime(ping);
        return ping;
      }
    } catch (error) {
      console.error('[NetworkQuality] Ping failed:', error);
    }
    return null;
  }, []);

  const determineQuality = useCallback((info: any, ping: number | null): NetworkQuality => {
    if (!navigator.onLine) return 'offline';

    // Use Network Information API if available
    if (info?.effectiveType) {
      switch (info.effectiveType) {
        case '4g':
          return 'excellent';
        case '3g':
          return 'good';
        case '2g':
          return 'fair';
        case 'slow-2g':
          return 'poor';
      }
    }

    // Use ping time as fallback
    if (ping !== null) {
      if (ping < 100) return 'excellent';
      if (ping < 300) return 'good';
      if (ping < 1000) return 'fair';
      return 'poor';
    }

    // Default
    return 'good';
  }, []);

  const updateNetworkInfo = useCallback(async () => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    const ping = await measurePing();
    
    const info: NetworkInfo = {
      quality: 'good',
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
    };

    info.quality = determineQuality(connection, ping);

    setNetworkInfo(info);
    setLastCheckTime(Date.now());
  }, [measurePing, determineQuality]);

  useEffect(() => {
    // Initial check
    updateNetworkInfo();

    // Online/offline listeners
    const handleOnline = () => {
      updateNetworkInfo();
    };

    const handleOffline = () => {
      setNetworkInfo(prev => ({
        ...prev,
        quality: 'offline',
        isOnline: false,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API listener
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    const handleConnectionChange = () => {
      updateNetworkInfo();
    };

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Periodic check (every 30 seconds)
    const interval = setInterval(() => {
      if (navigator.onLine) {
        updateNetworkInfo();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
      clearInterval(interval);
    };
  }, [updateNetworkInfo]);

  const forceCheck = useCallback(() => {
    updateNetworkInfo();
  }, [updateNetworkInfo]);

  return {
    ...networkInfo,
    pingTime,
    lastCheckTime,
    forceCheck,
  };
}
