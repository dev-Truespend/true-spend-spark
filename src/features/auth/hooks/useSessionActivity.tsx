import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE_LOGOUT = 1 * 60 * 1000; // 1 minute warning

export function useSessionActivity() {
  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60); // seconds
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset activity timer
  const resetActivity = useCallback(() => {
    if (!user) return;

    lastActivityRef.current = Date.now();
    setShowWarning(false);
    
    // Clear existing timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Set warning timer (9 minutes)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingTime(60);

      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE_LOGOUT);

    // Set logout timer (10 minutes)
    logoutTimerRef.current = setTimeout(async () => {
      await signOut();
    }, INACTIVITY_TIMEOUT);
  }, [user, signOut]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, resetActivity);
    });

    // Initial setup
    resetActivity();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetActivity);
      });
      
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [user, resetActivity]);

  const continueSession = useCallback(() => {
    resetActivity();
  }, [resetActivity]);

  return {
    showWarning,
    remainingTime,
    continueSession,
  };
}
