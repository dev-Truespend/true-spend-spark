import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw } from "lucide-react";

export const ForceRefreshBanner = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(5);

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

    // Listen for service worker update messages
    const handleSWUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[Version Check] SW update detected:', customEvent.detail);
      setUpdateAvailable(true);
    };

    window.addEventListener('appUpdateAvailable', handleSWUpdate);

    // Check immediately on mount
    checkForUpdates();

    // Check every 10 seconds (more aggressive)
    const interval = setInterval(checkForUpdates, 10000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('appUpdateAvailable', handleSWUpdate);
    };
  }, []);

  // Auto-refresh countdown
  useEffect(() => {
    if (!updateAvailable) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRefresh();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [updateAvailable]);

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
              A new version is available. Updating in {countdown}s...
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
                  Update Now
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};
