// @ts-nocheck -- TODO: fix strictNullChecks errors
/**
 * Phase 10: Observability & Polish - Structured Logging Hook
 * Provides app-wide structured logging with levels, metadata, and async collection
 */

import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogOptions {
  component: string;
  metadata?: Record<string, any>;
  requestId?: string;
  traceId?: string;
  stackTrace?: string;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  component: string;
  metadata: Record<string, any>;
  user_id?: string;
  request_id?: string;
  trace_id?: string;
  stack_trace?: string;
  user_agent: string;
  timestamp: string;
}

/**
 * Hook for structured application logging
 * Logs to console in dev and sends to backend log collector
 */
export const useLogger = () => {
  const log = useCallback(async (
    level: LogLevel,
    message: string,
    options: LogOptions
  ) => {
    try {
      // Get user from current session without creating circular dependency
      const { data: { session } } = await supabase.auth.getSession();
      
      const logEntry: LogEntry = {
        level,
        message,
        component: options.component,
        metadata: options.metadata || {},
        user_id: session?.user?.id,
        request_id: options.requestId || crypto.randomUUID(),
        trace_id: options.traceId,
        stack_trace: options.stackTrace,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };

      // Log to console in development
      if (import.meta.env.DEV) {
        const consoleMethod = level === 'debug' ? 'log' : level;
        console[consoleMethod](
          `[${level.toUpperCase()}] [${options.component}] ${message}`,
          options.metadata
        );
      }

      // Send to backend log collector (non-blocking, fire-and-forget)
      // Errors in logging should not break the app
      supabase.functions
        .invoke('log-collector', {
          body: logEntry,
        })
        .catch((error) => {
          // Only log to console if logging itself fails
          if (import.meta.env.DEV) {
            console.error('[useLogger] Failed to send log to collector:', error);
          }
        });
    } catch (error) {
      // Silent failure - logging should never break the app
      if (import.meta.env.DEV) {
        console.error('[useLogger] Logging error:', error);
      }
    }
  }, []);

  return {
    debug: useCallback((message: string, options: LogOptions) => 
      log('debug', message, options), [log]),
    
    info: useCallback((message: string, options: LogOptions) => 
      log('info', message, options), [log]),
    
    warn: useCallback((message: string, options: LogOptions) => 
      log('warn', message, options), [log]),
    
    error: useCallback((message: string, options: LogOptions) => 
      log('error', message, options), [log]),
    
    critical: useCallback((message: string, options: LogOptions) => 
      log('critical', message, options), [log]),
  };
};

/**
 * Utility function to create a logger instance for a specific component
 * Use this for convenience when a component needs to log multiple times
 */
export const createComponentLogger = (component: string) => {
  return {
    debug: (message: string, metadata?: Record<string, any>) => {
      // This will be used with useLogger hook in components
      return { level: 'debug' as LogLevel, message, component, metadata };
    },
    info: (message: string, metadata?: Record<string, any>) => {
      return { level: 'info' as LogLevel, message, component, metadata };
    },
    warn: (message: string, metadata?: Record<string, any>) => {
      return { level: 'warn' as LogLevel, message, component, metadata };
    },
    error: (message: string, metadata?: Record<string, any>, stackTrace?: string) => {
      return { level: 'error' as LogLevel, message, component, metadata, stackTrace };
    },
    critical: (message: string, metadata?: Record<string, any>, stackTrace?: string) => {
      return { level: 'critical' as LogLevel, message, component, metadata, stackTrace };
    },
  };
};
