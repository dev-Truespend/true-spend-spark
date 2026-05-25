/**
 * Module-level logger for use outside React components (lib/, services/, etc.).
 * For components, prefer the useLogger() hook which also sends logs to the backend collector.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error('bffClient', 'Request failed', error);
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, context: string, message: string, extra?: unknown) {
  const prefix = `[${context}]`;
  switch (level) {
    case 'debug':
      if (import.meta.env.DEV) console.debug(prefix, message, extra ?? '');
      break;
    case 'info':
      if (import.meta.env.DEV) console.info(prefix, message, extra ?? '');
      break;
    case 'warn':
      // warn always visible — useful in production for non-fatal issues
      console.warn(prefix, message, extra ?? '');
      break;
    case 'error':
      // error always visible
      console.error(prefix, message, extra ?? '');
      break;
  }
}

export const logger = {
  debug: (context: string, message: string, extra?: unknown) => emit('debug', context, message, extra),
  info:  (context: string, message: string, extra?: unknown) => emit('info',  context, message, extra),
  warn:  (context: string, message: string, extra?: unknown) => emit('warn',  context, message, extra),
  error: (context: string, message: string, extra?: unknown) => emit('error', context, message, extra),
};
