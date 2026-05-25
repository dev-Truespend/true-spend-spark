import { cn } from '@/shared/lib/utils';

interface SkeletonLoaderProps {
  variant?: 'card' | 'list' | 'chart' | 'text' | 'avatar' | 'badge';
  count?: number;
  className?: string;
}

export function SkeletonLoader({ variant = 'card', count = 1, className }: SkeletonLoaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonVariant key={i} variant={variant} />
      ))}
    </div>
  );
}

function SkeletonVariant({ variant }: { variant: SkeletonLoaderProps['variant'] }) {
  switch (variant) {
    case 'card':
      return (
        <div className="rounded-lg border bg-card p-6 space-y-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-5/6" />
          </div>
        </div>
      );

    case 'list':
      return (
        <div className="flex items-center gap-4 p-4 animate-pulse">
          <div className="h-10 w-10 rounded bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
          <div className="h-6 w-16 bg-muted rounded" />
        </div>
      );

    case 'chart':
      return (
        <div className="rounded-lg border bg-card p-6 animate-pulse">
          <div className="space-y-3 mb-6">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
          <div className="space-y-3">
            {[100, 80, 60, 90, 70].map((height, i) => (
              <div key={i} className="flex items-end gap-2">
                <div 
                  className="bg-muted rounded-t flex-1" 
                  style={{ height: `${height}px` }}
                />
              </div>
            ))}
          </div>
        </div>
      );

    case 'text':
      return (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
          <div className="h-4 bg-muted rounded w-4/6" />
        </div>
      );

    case 'avatar':
      return (
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
      );

    case 'badge':
      return (
        <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
      );

    default:
      return null;
  }
}
