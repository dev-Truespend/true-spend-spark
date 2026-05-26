import { useEffect, useState } from 'react';
import { getCapacitorPlatform, isCapacitorNative } from '@/shared/lib/platform/capacitor';

export type PlatformType = 'web' | 'mobile' | 'extension' | 'ios' | 'android';

export interface PlatformInfo {
  type: PlatformType;
  isNative: boolean;
  isWeb: boolean;
  isExtension: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isTouchDevice: boolean;
}

/**
 * Platform Detection Hook
 * Detects the current platform and provides boolean flags for conditional rendering
 * 
 * @returns PlatformInfo object with platform details
 * 
 * @example
 * ```tsx
 * const { isNative, isExtension, isMobile } = usePlatform();
 * 
 * return (
 *   <>
 *     {isWeb && <DesktopSidebar />}
 *     {isMobile && <MobileBottomNav />}
 *     {isExtension && <CompactNav />}
 *   </>
 * );
 * ```
 */
export function usePlatform(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() => {
    return detectPlatform();
  });

  useEffect(() => {
    // Re-detect on mount to ensure accuracy
    const info = detectPlatform();
    setPlatformInfo(info);

    // Listen for window resize to detect mobile viewport changes
    const handleResize = () => {
      setPlatformInfo(detectPlatform());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return platformInfo;
}

function detectPlatform(): PlatformInfo {
  // Check if running in browser extension
  const isExtension = typeof window !== 'undefined' &&
                     typeof (window as any).chrome !== 'undefined' && 
                     (window as any).chrome.runtime && 
                     (window as any).chrome.runtime.id !== undefined;

  // Check if running as native app via Capacitor
  const isNative = isCapacitorNative();
  const nativePlatform = getCapacitorPlatform(); // 'ios' | 'android' | 'web'

  // Check if mobile viewport (width < 768px)
  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;

  // Check if touch device
  const isTouchDevice = typeof window !== 'undefined' && 
                       ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Determine primary platform type
  let type: PlatformType = 'web';
  if (isExtension) {
    type = 'extension';
  } else if (isNative) {
    type = nativePlatform === 'ios' ? 'ios' : nativePlatform === 'android' ? 'android' : 'mobile';
  } else if (isMobileViewport || isTouchDevice) {
    type = 'mobile';
  }

  return {
    type,
    isNative,
    isWeb: !isNative && !isExtension,
    isExtension,
    isMobile: isMobileViewport || (isNative && nativePlatform !== 'web'),
    isIOS: nativePlatform === 'ios',
    isAndroid: nativePlatform === 'android',
    isTouchDevice,
  };
}

/**
 * Get platform-specific CSS classes
 * @param platformInfo - Platform information from usePlatform hook
 * @returns String of CSS classes
 */
export function getPlatformClasses(platformInfo: PlatformInfo): string {
  const classes: string[] = [];

  if (platformInfo.isNative) classes.push('platform-native');
  if (platformInfo.isWeb) classes.push('platform-web');
  if (platformInfo.isExtension) classes.push('platform-extension');
  if (platformInfo.isMobile) classes.push('platform-mobile');
  if (platformInfo.isIOS) classes.push('platform-ios');
  if (platformInfo.isAndroid) classes.push('platform-android');
  if (platformInfo.isTouchDevice) classes.push('touch-device');

  return classes.join(' ');
}
