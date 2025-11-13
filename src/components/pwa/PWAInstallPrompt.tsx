import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, X, Smartphone, Zap, WifiOff } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [visitCount, setVisitCount] = useState(0);

  useEffect(() => {
    // Track visit count - show prompt after 2nd visit
    const visits = parseInt(localStorage.getItem('pwa-visit-count') || '0');
    setVisitCount(visits + 1);
    localStorage.setItem('pwa-visit-count', String(visits + 1));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show after 2nd visit, not immediately
      if (visits >= 1) {
        // Delay showing prompt by 3 seconds after page load
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] Install accepted');
      localStorage.setItem('pwa-installed', 'true');
    } else {
      console.log('[PWA] Install dismissed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = (permanent = false) => {
    setShowPrompt(false);
    
    if (permanent) {
      localStorage.setItem('pwa-prompt-dismissed', 'true');
    } else {
      // Show again after 3 more visits
      const currentVisits = parseInt(localStorage.getItem('pwa-visit-count') || '0');
      localStorage.setItem('pwa-prompt-show-after', String(currentVisits + 3));
    }
  };

  // Don't show if permanently dismissed or installed
  const permanentlyDismissed = localStorage.getItem('pwa-prompt-dismissed') === 'true';
  const installed = localStorage.getItem('pwa-installed') === 'true';
  const showAfter = parseInt(localStorage.getItem('pwa-prompt-show-after') || '0');
  
  if (permanentlyDismissed || installed || (showAfter > 0 && visitCount < showAfter)) {
    return null;
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <Card className="p-6 shadow-2xl bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-3 rounded-xl bg-primary/20 ring-2 ring-primary/30">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-base text-foreground">
                Install TrueSpend App
              </h3>
              <button
                onClick={() => handleDismiss(true)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close permanently"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Get the best experience with our app
            </p>

            {/* Benefits */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-foreground">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-3 w-3 text-primary" />
                </div>
                <span>Faster loading & instant access</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <WifiOff className="h-3 w-3 text-primary" />
                </div>
                <span>Works offline without internet</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Download className="h-3 w-3 text-primary" />
                </div>
                <span>Add to home screen - no app store</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                onClick={handleInstall}
                className="flex-1 font-semibold shadow-lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Install Now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDismiss(false)}
                className="flex-shrink-0"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
