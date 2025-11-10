import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle } from 'lucide-react';
import { getRateLimitState, UseRateLimitState } from '@/lib/api/rateLimiter';

/**
 * Rate Limit Status Component
 * Phase 2: Security & Ingress - Layer 3 (API Gateway)
 * 
 * Displays current rate limit status to users
 */
export function RateLimitStatus() {
  const [rateLimitState, setRateLimitState] = useState<UseRateLimitState>(
    getRateLimitState()
  );

  useEffect(() => {
    const checkRateLimit = () => {
      setRateLimitState(getRateLimitState());
    };

    // Check every second
    const interval = setInterval(checkRateLimit, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!rateLimitState.isRateLimited || !rateLimitState.rateLimitInfo) {
    return null;
  }

  const { rateLimitInfo } = rateLimitState;
  const usagePercent = ((rateLimitInfo.limit - rateLimitInfo.remaining) / rateLimitInfo.limit) * 100;
  const resetTime = new Date(rateLimitInfo.reset);
  const timeUntilReset = Math.max(0, Math.ceil((resetTime.getTime() - Date.now()) / 1000));

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Rate Limit Active</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          You've used {rateLimitInfo.limit - rateLimitInfo.remaining} of {rateLimitInfo.limit} requests.
        </p>
        <Progress value={usagePercent} className="w-full" />
        <p className="text-sm">
          Resets in {timeUntilReset} seconds
        </p>
      </AlertDescription>
    </Alert>
  );
}
