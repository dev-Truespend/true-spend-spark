import { useEffect } from 'react';
import { toast } from 'sonner';
import { Tag, MapPin, DollarSign, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DealNotificationProps {
  merchantName: string;
  dealType: string;
  dealDescription: string;
  potentialSavings?: number;
  merchantId: string;
  geofenceName?: string;
  onViewDetails?: (merchantId: string) => void;
  autoShow?: boolean;
}

export function DealNotification({
  merchantName,
  dealType,
  dealDescription,
  potentialSavings,
  merchantId,
  geofenceName,
  onViewDetails,
  autoShow = true
}: DealNotificationProps) {
  
  useEffect(() => {
    if (autoShow) {
      showNotification();
    }
  }, [autoShow]);

  const showNotification = () => {
    toast.custom((t) => (
      <div className="w-full max-w-md bg-background border rounded-lg shadow-lg p-4 animate-in slide-in-from-top">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Tag className="h-5 w-5 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-sm mb-1">
                  Deal Alert! 🎉
                </h4>
                <p className="text-sm text-muted-foreground">
                  {merchantName}
                </p>
              </div>
            </div>

            {/* Geofence Location */}
            {geofenceName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{geofenceName}</span>
              </div>
            )}

            {/* Deal Details */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/20 text-primary">
                  {dealType.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-sm">{dealDescription}</p>
              
              {potentialSavings && potentialSavings > 0 && (
                <div className="flex items-center gap-1 text-green-600 font-semibold">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Save ${potentialSavings.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => {
                  toast.dismiss(t);
                  onViewDetails?.(merchantId);
                }}
                className="flex-1"
              >
                View Details
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toast.dismiss(t)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    ), {
      duration: 8000,
      position: 'top-center'
    });
  };

  return null;
}

// Utility function to trigger deal notifications
export function showDealNotification(props: DealNotificationProps) {
  return <DealNotification {...props} autoShow={true} />;
}

// Hook to automatically show deal notifications on geofence entry
export function useDealNotifications(geofenceId: string | null, userId: string | null) {
  useEffect(() => {
    if (!geofenceId || !userId) return;

    // This would be called from a geofence event handler
    // Example implementation shown in hook structure
    console.log('[DealNotification] Listening for deals at geofence:', geofenceId);

    // In production, this would subscribe to merchant_recommendations
    // and trigger notifications when user enters a geofence with active deals
    
  }, [geofenceId, userId]);
}
