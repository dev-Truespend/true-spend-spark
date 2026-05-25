import { Wifi, WifiOff, Signal, SignalLow, SignalMedium } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { useNetworkQuality } from '@/shared/hooks/useNetworkQuality';
import { cn } from '@/shared/lib/utils';

export function NetworkQualityIndicator() {
  const { quality, isOnline, effectiveType, pingTime } = useNetworkQuality();

  const getIcon = () => {
    if (!isOnline) return <WifiOff className="h-3 w-3" />;
    
    switch (quality) {
      case 'excellent':
        return <Signal className="h-3 w-3" />;
      case 'good':
        return <SignalMedium className="h-3 w-3" />;
      case 'fair':
      case 'poor':
        return <SignalLow className="h-3 w-3" />;
      default:
        return <Wifi className="h-3 w-3" />;
    }
  };

  const getVariant = () => {
    if (!isOnline) return 'destructive';
    
    switch (quality) {
      case 'excellent':
        return 'default';
      case 'good':
        return 'secondary';
      case 'fair':
        return 'outline';
      case 'poor':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getLabel = () => {
    if (!isOnline) return 'Offline';
    
    if (effectiveType) {
      return effectiveType.toUpperCase();
    }
    
    if (pingTime !== null) {
      return `${Math.round(pingTime)}ms`;
    }
    
    return quality.charAt(0).toUpperCase() + quality.slice(1);
  };

  return (
    <Badge 
      variant={getVariant() as any} 
      className={cn(
        "flex items-center gap-1 text-xs",
        !isOnline && "animate-pulse"
      )}
    >
      {getIcon()}
      <span>{getLabel()}</span>
    </Badge>
  );
}
