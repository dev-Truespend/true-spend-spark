import { useMemo } from 'react';
import { useNetworkQuality, NetworkQuality } from './useNetworkQuality';

/**
 * Hook for adaptive content loading based on network quality
 * Reduces data usage and improves UX on slow connections
 */
export function useAdaptiveContent() {
  const { quality, effectiveType, downlink, saveData } = useNetworkQuality();

  // Should reduce image/content quality
  const shouldReduceQuality = useMemo(() => {
    return (
      quality === 'poor' ||
      quality === 'fair' ||
      effectiveType === '2g' ||
      effectiveType === 'slow-2g' ||
      (downlink !== undefined && downlink < 1) ||
      saveData
    );
  }, [quality, effectiveType, downlink, saveData]);

  // Should defer non-critical features (charts, animations, etc.)
  const shouldDeferNonCritical = useMemo(() => {
    return (
      quality === 'poor' ||
      effectiveType === '2g' ||
      effectiveType === 'slow-2g' ||
      saveData
    );
  }, [quality, effectiveType, saveData]);

  // Determine image quality level
  const imageQuality = useMemo<'high' | 'medium' | 'low'>(() => {
    if (shouldReduceQuality) return 'low';
    if (quality === 'fair' || effectiveType === '3g') return 'medium';
    return 'high';
  }, [quality, effectiveType, shouldReduceQuality]);

  // Should show low data mode indicator
  const showLowDataMode = shouldReduceQuality;

  // Get image quality percentage for compression
  const imageQualityPercent = useMemo(() => {
    switch (imageQuality) {
      case 'high':
        return 95;
      case 'medium':
        return 75;
      case 'low':
        return 50;
    }
  }, [imageQuality]);

  // Should prefetch data (only on fast connections)
  const shouldPrefetch = useMemo(() => {
    return quality === 'excellent' && !saveData;
  }, [quality, saveData]);

  // Should use animations
  const shouldAnimate = useMemo(() => {
    return !shouldDeferNonCritical;
  }, [shouldDeferNonCritical]);

  return {
    // Quality indicators
    quality,
    effectiveType,
    downlink,
    
    // Adaptive behaviors
    shouldReduceQuality,
    shouldDeferNonCritical,
    shouldPrefetch,
    shouldAnimate,
    showLowDataMode,
    
    // Image quality
    imageQuality,
    imageQualityPercent,
    
    // Data saver mode
    saveData,
  };
}
