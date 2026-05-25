import { toast } from 'sonner';
import { ERROR_MESSAGES, ErrorType } from './errorMessages';

/**
 * Centralized error handler for the application
 * Provides consistent error handling and user-friendly messages
 */
export class ErrorHandler {
  /**
   * Handle an error and show appropriate user message
   */
  static handle(error: unknown, context?: string): void {
    console.error(`[ErrorHandler] ${context || 'Error'}:`, error);

    const errorType = this.classifyError(error);
    const userMessage = ERROR_MESSAGES[errorType];

    // Show toast notification
    toast.error(userMessage.title, {
      description: userMessage.description,
      duration: 5000,
    });

    // Log to error tracking service in production
    if (import.meta.env.PROD) {
      this.logToService(error, context, errorType);
    }
  }

  /**
   * Handle an error silently (log only, no user notification)
   */
  static handleSilent(error: unknown, context?: string): void {
    console.error(`[ErrorHandler] Silent: ${context || 'Error'}:`, error);

    if (import.meta.env.PROD) {
      this.logToService(error, context, 'UNKNOWN');
    }
  }

  /**
   * Classify error type for appropriate messaging
   */
  private static classifyError(error: unknown): ErrorType {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // IndexedDB errors should be classified as SYNC_FAILED, not NETWORK_ERROR
      if (
        message.includes('idbdatabase') ||
        message.includes('indexeddb') ||
        (message.includes('transaction') && message.includes('closing')) ||
        error.name === 'InvalidStateError'
      ) {
        return 'SYNC_FAILED';
      }

      // Network errors (more specific to avoid false positives)
      if (
        !navigator.onLine || // Actual offline state
        message.includes('fetch failed') ||
        message.includes('network request failed') ||
        message.includes('failed to fetch') ||
        message.includes('offline')
      ) {
        return 'NETWORK_ERROR';
      }

      // Server errors
      if (
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504') ||
        message.includes('server error')
      ) {
        return 'SERVER_ERROR';
      }

      // Auth errors
      if (
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('auth') ||
        message.includes('401') ||
        message.includes('403')
      ) {
        return 'AUTH_ERROR';
      }

      // Quota errors
      if (
        message.includes('quota') ||
        message.includes('storage') ||
        message.includes('space')
      ) {
        return 'QUOTA_EXCEEDED';
      }

      // Sync errors
      if (
        message.includes('sync') ||
        message.includes('conflict')
      ) {
        return 'SYNC_FAILED';
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Log error to external service (placeholder for future implementation)
   */
  private static logToService(
    error: unknown,
    context?: string,
    errorType?: ErrorType
  ): void {
    // TODO: Implement error tracking service integration
    // Examples: Sentry, LogRocket, Bugsnag, etc.
    
    const errorData = {
      timestamp: new Date().toISOString(),
      context,
      errorType,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.log('[ErrorHandler] Would send to tracking service:', errorData);
  }

  /**
   * Check if error is network-related
   */
  static isNetworkError(error: unknown): boolean {
    return this.classifyError(error) === 'NETWORK_ERROR';
  }

  /**
   * Check if error is server-related
   */
  static isServerError(error: unknown): boolean {
    return this.classifyError(error) === 'SERVER_ERROR';
  }

  /**
   * Extract user-friendly message from error
   */
  static getUserMessage(error: unknown): string {
    const errorType = this.classifyError(error);
    return ERROR_MESSAGES[errorType].description;
  }
}

/**
 * Async error wrapper - catches errors and handles them appropriately
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string,
  silent = false
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (silent) {
      ErrorHandler.handleSilent(error, context);
    } else {
      ErrorHandler.handle(error, context);
    }
    return null;
  }
}

/**
 * Sync error wrapper - catches errors and handles them appropriately
 */
export function withSyncErrorHandling<T>(
  fn: () => T,
  context?: string,
  silent = false
): T | null {
  try {
    return fn();
  } catch (error) {
    if (silent) {
      ErrorHandler.handleSilent(error, context);
    } else {
      ErrorHandler.handle(error, context);
    }
    return null;
  }
}
