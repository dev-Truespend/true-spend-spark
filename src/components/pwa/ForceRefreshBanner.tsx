import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw } from "lucide-react";

export const ForceRefreshBanner = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch('/meta.json', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const storedBuildId = localStorage.getItem('buildId');
        
        if (!storedBuildId) {
          // First visit - store current build ID
          localStorage.setItem('buildId', data.buildId);
        } else if (storedBuildId !== data.buildId) {
          // Build ID changed - update available
          setUpdateAvailable(true);
        }
      } catch (error) {
        console.error('[Version Check] Failed to check for updates:', error);
      }
    };

    // Check immediately on mount
    checkForUpdates();

    // Then check every 20 seconds
    const interval = setInterval(checkForUpdates, 20000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Update stored build ID before refresh
    fetch('/meta.json', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        localStorage.setItem('buildId', data.buildId);
      })
      .catch(() => {})
      .finally(() => {
        // Force a hard reload
        window.location.reload();
      });
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto max-w-4xl">
        <Alert className="border-primary bg-primary/10">
          <RefreshCw className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">
              A new version is available. Please refresh to get the latest updates.
            </span>
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="sm"
              className="shrink-0"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Now
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};
