/**
 * SyncStatusBadge Component
 * 
 * Shows sync status for individual items (transactions, budgets, etc.)
 * States: synced ✓ | pending (n) | syncing... | error !
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  retryCount?: number;
  errorMessage?: string;
  lastSyncTime?: Date | string;
  onRetry?: () => void;
  className?: string;
}

export function SyncStatusBadge({
  status,
  retryCount = 0,
  errorMessage,
  lastSyncTime,
  onRetry,
  className,
}: SyncStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: CheckCircle2,
          label: 'Synced',
          variant: 'default' as const,
          className: 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20',
        };
      case 'pending':
        return {
          icon: Clock,
          label: retryCount > 0 ? `Pending (${retryCount})` : 'Pending',
          variant: 'secondary' as const,
          className: '',
        };
      case 'syncing':
        return {
          icon: Loader2,
          label: 'Syncing...',
          variant: 'secondary' as const,
          className: '',
          animate: true,
        };
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Error',
          variant: 'destructive' as const,
          className: '',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getTooltipContent = () => {
    switch (status) {
      case 'synced':
        if (lastSyncTime) {
          const date = new Date(lastSyncTime);
          return `Last synced: ${date.toLocaleTimeString()}`;
        }
        return 'Successfully synced to cloud';
      
      case 'pending':
        return retryCount > 0
          ? `Waiting to sync (${retryCount} items in queue)`
          : 'Waiting to sync to cloud';
      
      case 'syncing':
        return 'Currently syncing to cloud...';
      
      case 'error':
        return errorMessage || 'Failed to sync. Click to retry.';
    }
  };

  const handleClick = () => {
    if (status === 'error' && onRetry) {
      onRetry();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            data-testid={`sync-badge-${status}`}
            variant={config.variant}
            className={cn(
              'gap-1.5 px-2 py-0.5 text-xs cursor-default transition-all',
              config.className,
              status === 'error' && onRetry && 'cursor-pointer hover:opacity-80',
              className
            )}
            onClick={handleClick}
          >
            <Icon
              className={cn(
                'h-3 w-3',
                config.animate && 'animate-spin'
              )}
            />
            <span>{config.label}</span>
            {status === 'error' && onRetry && (
              <RefreshCw className="h-3 w-3 ml-0.5" />
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{getTooltipContent()}</p>
          {status === 'error' && onRetry && (
            <p className="text-xs text-muted-foreground mt-1">Click to retry</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
