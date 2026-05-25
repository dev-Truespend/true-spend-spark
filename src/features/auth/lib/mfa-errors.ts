// MFA Error Code Mappings for User-Friendly Messages

export interface MFAError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
}

export const MFA_ERROR_CODES = {
  INVALID_VERIFICATION_CODE: {
    code: 'INVALID_VERIFICATION_CODE',
    message: 'The code you entered is incorrect or expired',
    userMessage: 'Please check the code in your authenticator app and try again',
    retryable: true,
  },
  ENCRYPTION_FAILED: {
    code: 'ENCRYPTION_FAILED',
    message: 'Failed to encrypt TOTP secret',
    userMessage: 'A security error occurred. Please try again',
    retryable: true,
  },
  MFA_NOT_SETUP: {
    code: 'MFA_NOT_SETUP',
    message: 'MFA not set up',
    userMessage: 'Please generate a secret first before enabling MFA',
    retryable: false,
  },
  INVALID_PASSWORD: {
    code: 'INVALID_PASSWORD',
    message: 'Invalid password',
    userMessage: 'The password you entered is incorrect',
    retryable: true,
  },
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many attempts',
    userMessage: 'Too many failed attempts. Please try again later',
    retryable: false,
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network error',
    userMessage: 'Unable to connect. Please check your internet connection',
    retryable: true,
  },
  BACKUP_CODE_INVALID: {
    code: 'BACKUP_CODE_INVALID',
    message: 'Invalid backup code',
    userMessage: 'This backup code is invalid or has already been used',
    retryable: true,
  },
  BACKUP_CODE_USED: {
    code: 'BACKUP_CODE_USED',
    message: 'Backup code already used',
    userMessage: 'This backup code has already been used. Each code can only be used once',
    retryable: true,
  },
} as const;

export function getMFAErrorMessage(error: any): MFAError {
  // Check if error has a structured error code
  if (error?.error?.code && MFA_ERROR_CODES[error.error.code as keyof typeof MFA_ERROR_CODES]) {
    return MFA_ERROR_CODES[error.error.code as keyof typeof MFA_ERROR_CODES];
  }

  // Check message for known patterns
  const message = error?.message || error?.error?.message || error?.error || '';
  
  if (message.includes('Invalid verification code') || message.includes('incorrect')) {
    return MFA_ERROR_CODES.INVALID_VERIFICATION_CODE;
  }
  
  if (message.includes('Invalid password')) {
    return MFA_ERROR_CODES.INVALID_PASSWORD;
  }
  
  if (message.includes('rate limit') || message.includes('Too many')) {
    return MFA_ERROR_CODES.RATE_LIMIT_EXCEEDED;
  }
  
  if (message.includes('not set up') || message.includes('MFA not enabled')) {
    return MFA_ERROR_CODES.MFA_NOT_SETUP;
  }

  if (message.includes('backup code') && message.includes('invalid')) {
    return MFA_ERROR_CODES.BACKUP_CODE_INVALID;
  }

  if (message.includes('already been used')) {
    return MFA_ERROR_CODES.BACKUP_CODE_USED;
  }

  // Network errors
  if (error?.name === 'TypeError' || message.includes('Failed to fetch')) {
    return MFA_ERROR_CODES.NETWORK_ERROR;
  }

  // Default generic error
  return {
    code: 'UNKNOWN_ERROR',
    message: message || 'An unexpected error occurred',
    userMessage: 'Something went wrong. Please try again',
    retryable: true,
  };
}
