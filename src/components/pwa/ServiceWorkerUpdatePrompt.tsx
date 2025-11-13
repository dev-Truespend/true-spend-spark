import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function ServiceWorkerUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [countdown, setCountdown] = useState(5); // Reduced to 5 seconds

  useEffect(() => {
    const handleUpdateAvailable = (event: Event) => {
      const customEvent = event as CustomEvent<ServiceWorkerRegistration>;
      console.log('[PWA] 🎉 Update available, showing prompt');
      setRegistration(customEvent.detail);
      setShowPrompt(true);
      setCountdown(5);
    };

    window.addEventListener('swUpdateAvailable', handleUpdateAvailable);
    return () => window.removeEventListener('swUpdateAvailable', handleUpdateAvailable);
  }, []);

  useEffect(() => {
    if (!showPrompt) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleUpdate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showPrompt]);

  const handleUpdate = () => {
    if (registration?.waiting) {
      console.log('[PWA] Activating new service worker');
      registration.waiting.postMessage('SKIP_WAITING');
      
      // Reload after a short delay to ensure SW is activated
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <Alert className="max-w-lg w-full bg-primary text-primary-foreground border-primary shadow-2xl animate-pulse">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <AlertTitle className="text-lg font-semibold">
          🎉 New Version Available!
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4 mt-2">
          <span className="font-medium">
            Updating in {countdown}s...
          </span>
          <Button
            onClick={handleUpdate}
            variant="secondary"
            size="sm"
            className="shrink-0 font-semibold"
          >
            Update Now
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
