/**
 * OfflineIndicator Component
 * 
 * Displays network connection status with visual feedback.
 * Auto-hides when online for >5 seconds to reduce UI clutter.
 */

import { useEffect, useState } from 'react';
import { useNetworkQuality } from '@/hooks/useNetworkQuality';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, Activity, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { quality, effectiveType, downlink, rtt, pingTime, isOnline } = useNetworkQuality();
  const [isVisible, setIsVisible] = useState(true);
  const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-hide when online for >5 seconds
  useEffect(() => {
    if (quality === 'excellent' || quality === 'good') {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      setHideTimer(timer);
    } else {
      setIsVisible(true);
      if (hideTimer) {
        clearTimeout(hideTimer);
        setHideTimer(null);
      }
    }

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [quality]);

  // Don't render if hidden
  if (!isVisible) return null;

  const getStatusConfig = () => {
    switch (quality) {
      case 'offline':
        return {
          icon: WifiOff,
          label: 'Offline',
          variant: 'destructive' as const,
          className: 'animate-pulse',
        };
      case 'poor':
        return {
          icon: AlertCircle,
          label: 'Poor Connection',
          variant: 'destructive' as const,
          className: '',
        };
      case 'fair':
        return {
          icon: Activity,
          label: 'Slow Connection',
          variant: 'secondary' as const,
          className: '',
        };
      case 'good':
        return {
          icon: Wifi,
          label: 'Good Connection',
          variant: 'secondary' as const,
          className: '',
        };
      case 'excellent':
        return {
          icon: Wifi,
          label: 'Excellent Connection',
          variant: 'default' as const,
          className: '',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getTooltipContent = () => {
    const details = [];
    
    if (!isOnline) {
      details.push('You are currently offline');
      details.push('Changes will be saved locally and synced when online');
    } else {
      if (effectiveType) {
        details.push(`Network: ${effectiveType.toUpperCase()}`);
      }
      if (downlink) {
        details.push(`Speed: ${downlink} Mbps`);
      }
      if (rtt) {
        details.push(`Latency: ${rtt}ms`);
      }
      if (pingTime) {
        details.push(`Ping: ${pingTime.toFixed(0)}ms`);
      }
    }

    return details.join(' • ');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            data-testid="offline-indicator"
            className={cn(
              'fixed top-4 right-4 z-50 transition-all duration-300',
              'hover:scale-105 cursor-pointer'
            )}
            onClick={() => setIsVisible(false)}
          >
            <Badge
              variant={config.variant}
              className={cn('gap-2 px-3 py-1.5 shadow-lg', config.className)}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{config.label}</span>
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">{getTooltipContent()}</p>
          <p className="text-xs text-muted-foreground mt-1">Click to dismiss</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
