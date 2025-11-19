import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Wallet } from 'lucide-react';
import { PrivacyModal } from './PrivacyModal';

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
        }
      });
    }
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

  const handleSignIn = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'AUTH_REQUEST' });
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
            Sign In with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-96 h-[500px] overflow-y-auto p-4 space-y-4">
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
            const spent = 0; // TODO: Calculate from transactions
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
