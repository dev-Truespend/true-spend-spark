import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Wallet, WifiOff } from 'lucide-react';
import { PrivacyModal } from './PrivacyModal';
import { logger } from '../shared/logger';

interface Budget {
  id: string;
  category: string;
  limit_amount: number;
  period: string;
  start_date: string;
}

export function Popup() {
  const [session, setSession] = useState<any>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check for stored session and privacy acceptance
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['session', 'privacyAccepted'], (result) => {
        if (!result.privacyAccepted) {
          setShowPrivacy(true);
        }
        if (result.session) {
          setSession(result.session);
          supabase.auth.setSession(result.session);
          logger.auth('Session restored from storage');
        }
      });
    }

    // Listen for auth success messages from popup window
    const handleAuthMessage = (event: MessageEvent) => {
      // Validate origin for security
      const allowedOrigins = [
        window.location.origin,
        'https://uolpwcngftpmgkopltwz.supabase.co'
      ];
      
      if (!allowedOrigins.includes(event.origin)) {
        logger.warn('Rejected auth message from invalid origin', { origin: event.origin });
        return;
      }

      if (event.data.type === 'TRUESPEND_AUTH_SUCCESS' && event.data.session) {
        logger.auth('Received auth success from popup');
        const session = event.data.session;
        
        // Store session in chrome storage
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ session }, () => {
            setSession(session);
            supabase.auth.setSession(session);
            logger.auth('Session stored successfully');
          });
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);

    // Online/offline detection
    const handleOnline = () => {
      setIsOnline(true);
      logger.info('Extension back online');
    };
    const handleOffline = () => {
      setIsOnline(false);
      logger.warn('Extension offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('message', handleAuthMessage);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data } = await supabase
        .from('budgets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      return data as Budget[];
    },
    enabled: !!session,
  });

  // Fetch per-category spending for the current calendar month so each
  // budget card shows real progress rather than a hard-coded zero.
  const { data: spendingMap } = useQuery<Record<string, number>>({
    queryKey: ['popup-spending-this-month'],
    enabled:  !!session && (budgets?.length ?? 0) > 0,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const now   = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const categories = (budgets ?? []).map((b) => b.category);
      if (!categories.length) return {};

      const { data, error } = await supabase
        .from('transactions')
        .select('category, amount')
        .in('category', categories)
        .gte('timestamp', start)
        .lte('timestamp', end);

      if (error) throw error;

      // Sum amounts per category
      return (data ?? []).reduce<Record<string, number>>((acc, tx) => {
        acc[tx.category] = (acc[tx.category] ?? 0) + Number(tx.amount);
        return acc;
      }, {});
    },
  });

  const handleSignIn = () => {
    try {
      // In a chrome-extension origin, `window.location.origin` is
      // `chrome-extension://<id>` — which doesn't serve the auth page.
      // Resolve the real web app URL from the build-time env var, with
      // a sensible production fallback.
      const webAppUrl =
        (import.meta.env.VITE_APP_URL as string | undefined) ??
        'https://truespend.org';

      // chrome.tabs.create is the supported way to open a tab from an
      // extension popup — window.open is unreliable across browsers and
      // popup blockers (the popup is itself a popup).
      const authUrl = `${webAppUrl}/auth?source=extension`;

      if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        chrome.tabs.create({ url: authUrl });
        logger.auth('Auth tab opened via chrome.tabs');
        return;
      }

      // Fallback for non-extension environments (dev preview, tests)
      const popup = window.open(authUrl, '_blank', 'noopener,noreferrer');
      if (!popup) {
        logger.warn('Popup blocked or failed to open');
        alert('Please allow popups for TrueSpend to sign in');
      } else {
        logger.auth('Auth popup opened successfully');
      }
    } catch (error) {
      logger.error('Failed to open auth popup', error);
    }
  };

  if (!session) {
    return (
      <div className="w-96 h-[500px] p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Wallet className="w-12 h-12 mx-auto text-primary" />
          <h2 className="text-xl font-semibold">Welcome to TrueSpend</h2>
          <p className="text-sm text-muted-foreground">
            Sign in to track your budgets while you shop
          </p>
          <Button onClick={handleSignIn} className="w-full">
            Sign In to TrueSpend
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-96 h-[500px] overflow-y-auto p-4 space-y-4">
        {!isOnline && (
          <Card className="bg-muted border-muted-foreground/20">
            <CardContent className="pt-4 flex items-center gap-2 text-sm">
              <WifiOff className="w-4 h-4" />
              <span>You're offline. Showing cached data.</span>
            </CardContent>
          </Card>
        )}

        <CardHeader className="px-0">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Your Budgets
          </CardTitle>
        </CardHeader>

        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : budgets && budgets.length > 0 ? (
          budgets.map((budget) => {
            const spent      = spendingMap?.[budget.category] ?? 0;
            const percentage = (spent / budget.limit_amount) * 100;
            
            return (
              <Card key={budget.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{budget.category}</span>
                    <span className="text-sm text-muted-foreground">
                      ${spent.toFixed(2)} / ${budget.limit_amount.toFixed(2)}
                    </span>
                  </div>
                  <Progress value={percentage} />
                  {percentage >= 90 && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      <span>{percentage.toFixed(0)}% spent!</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No budgets found</p>
            <p className="text-sm mt-2">Create budgets in the main app</p>
          </div>
        )}
      </div>

      <PrivacyModal open={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </>
  );
}
