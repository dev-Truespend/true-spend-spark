/**
 * User-friendly error messages for different error types
 * Keep messages concise, helpful, and non-technical
 */

export type ErrorType =
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'AUTH_ERROR'
  | 'SYNC_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'CONFLICT_DETECTED'
  | 'UNKNOWN';

interface ErrorMessage {
  title: string;
  description: string;
}

export const ERROR_MESSAGES: Record<ErrorType, ErrorMessage> = {
  NETWORK_ERROR: {
    title: 'Connection Lost',
    description: "We couldn't reach TrueSpend. Check your connection and try again.",
  },
  
  SERVER_ERROR: {
    title: 'Service Unavailable',
    description: 'Our servers are temporarily unavailable. Please try again in a few moments.',
  },
  
  AUTH_ERROR: {
    title: 'Session Expired',
    description: 'Your session has expired. Please sign in again to continue.',
  },
  
  SYNC_FAILED: {
    title: 'Save Failed',
    description: 'Your latest change was not saved. Please try again.',
  },
  
  QUOTA_EXCEEDED: {
    title: 'Storage Full',
    description: 'Your device storage is full. Please free up space or export old data.',
  },
  
  CONFLICT_DETECTED: {
    title: 'Data Conflict',
    description: 'This item was changed on another device. Please review and merge changes.',
  },
  
  UNKNOWN: {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again or contact support if this persists.',
  },
};

/**
 * Get user-friendly error message based on error type
 */
export function getErrorMessage(errorType: ErrorType): ErrorMessage {
  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES.UNKNOWN;
}

/**
 * Common error scenarios with specific messages
 */
export const SPECIFIC_ERRORS = {
  CAMERA_PERMISSION_DENIED: {
    title: 'Camera Access Denied',
    description: 'Please allow camera access in your browser settings to scan receipts.',
  },
  
  LOCATION_PERMISSION_DENIED: {
    title: 'Location Access Denied',
    description: 'Please allow location access to use location-based budgets and insights.',
  },
  
  OCR_FAILED: {
    title: 'Receipt Scan Failed',
    description: 'Could not read the receipt. Please try again with better lighting or enter manually.',
  },
  
  BUDGET_LIMIT_EXCEEDED: {
    title: 'Budget Exceeded',
    description: 'This transaction exceeds your budget limit. Review your spending.',
  },
  
  INVALID_TRANSACTION: {
    title: 'Invalid Transaction',
    description: 'Please check the transaction details and try again.',
  },
  
  GEOFENCE_LIMIT_REACHED: {
    title: 'Geofence Limit Reached',
    description: 'You\'ve reached the maximum number of geofences. Please remove one to add another.',
  },
  
  EXPORT_FAILED: {
    title: 'Export Failed',
    description: 'Could not export your data. Please try again or contact support.',
  },
  
  IMPORT_FAILED: {
    title: 'Import Failed',
    description: 'Could not import the data file. Please check the file format and try again.',
  },
} as const;
