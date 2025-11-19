/**
 * Structured logging service for extension
 * Provides consistent logging with optional telemetry integration
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  extensionVersion?: string;
}

class Logger {
  private debugMode: boolean = false;
  private extensionVersion: string = '1.0.0';

  constructor() {
    // Load debug mode from storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('settings', (result) => {
        this.debugMode = result.settings?.debugMode || false;
      });
    }

    // Get extension version from manifest
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const manifest = chrome.runtime.getManifest();
      this.extensionVersion = manifest.version;
    }
  }

  setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('settings', (result) => {
        chrome.storage.local.set({
          settings: { ...result.settings, debugMode: enabled },
        });
      });
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      extensionVersion: this.extensionVersion,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === 'debug') {
      return this.debugMode;
    }
    return true;
  }

  private log(level: LogLevel, message: string, context?: string, data?: any) {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context, data);
    const prefix = `[TrueSpend ${level.toUpperCase()}]`;
    const logMessage = context 
      ? `${prefix} [${context}] ${message}` 
      : `${prefix} ${message}`;

    // Console logging with appropriate method
    switch (level) {
      case 'debug':
        console.debug(logMessage, data || '');
        break;
      case 'info':
        console.info(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
    }

    // Send errors to telemetry
    if (level === 'error' && typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.storage.local.get('settings', (result) => {
        if (result.settings?.telemetryEnabled) {
          chrome.runtime.sendMessage({
            type: 'TELEMETRY_EVENT',
            data: {
              event: 'extension_log',
              properties: entry,
            },
          });
        }
      });
    }
  }

  debug(message: string, context?: string, data?: any) {
    this.log('debug', message, context, data);
  }

  info(message: string, context?: string, data?: any) {
    this.log('info', message, context, data);
  }

  warn(message: string, context?: string, data?: any) {
    this.log('warn', message, context, data);
  }

  error(message: string, context?: string, data?: any) {
    this.log('error', message, context, data);
  }

  // Specialized logging methods
  apiRequest(endpoint: string, method: string, data?: any) {
    this.debug(`API ${method} ${endpoint}`, 'API', data);
  }

  apiResponse(endpoint: string, status: number, data?: any) {
    if (status >= 400) {
      this.error(`API ${endpoint} failed with ${status}`, 'API', data);
    } else {
      this.debug(`API ${endpoint} succeeded with ${status}`, 'API', data);
    }
  }

  storage(operation: string, key: string, data?: any) {
    this.debug(`Storage ${operation}: ${key}`, 'Storage', data);
  }

  auth(event: string, data?: any) {
    this.info(`Auth: ${event}`, 'Auth', data);
  }

  merchantDetection(merchantName: string, data?: any) {
    this.info(`Detected merchant: ${merchantName}`, 'MerchantDetection', data);
  }

  notification(type: string, data?: any) {
    this.info(`Notification: ${type}`, 'Notifications', data);
  }
}

export const logger = new Logger();
