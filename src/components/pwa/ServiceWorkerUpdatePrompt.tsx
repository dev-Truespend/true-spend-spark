import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function ServiceWorkerUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const handleUpdateAvailable = (event: Event) => {
      const customEvent = event as CustomEvent<ServiceWorkerRegistration>;
      console.log('[PWA] Update available, showing prompt');
      setRegistration(customEvent.detail);
      setShowPrompt(true);
      setCountdown(10);
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
    <div className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4">
      <Alert className="max-w-2xl w-full bg-primary text-primary-foreground border-primary shadow-lg">
        <RefreshCw className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">
          🎉 New version available!
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>
            A new version of TrueSpend is ready. Updating in {countdown} seconds...
          </span>
          <Button
            onClick={handleUpdate}
            variant="secondary"
            size="sm"
            className="shrink-0"
          >
            Update Now
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
