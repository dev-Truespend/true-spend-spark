/**
 * Content Security Policy (CSP) Configuration
 * Phase 2: Security & Ingress - Layer 4 (Modern Safety)
 */

export const CSP_DIRECTIVES = {
  // Default source for everything not explicitly covered
  defaultSrc: ["'self'"],
  
  // Scripts - allow self, inline (with nonce), and CDN
  scriptSrc: [
    "'self'",
    "'unsafe-inline'", // Required for Vite HMR in development
    "'unsafe-eval'", // Required for Vite in development
    "https://cdn.jsdelivr.net",
  ],
  
  // Styles - allow self and inline styles
  styleSrc: ["'self'", "'unsafe-inline'"],
  
  // Images - allow self, data URIs, HTTPS, and blob
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  
  // Fonts - allow self and data URIs
  fontSrc: ["'self'", "data:"],
  
  // Connections - allow self and Supabase
  connectSrc: [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
  ],
  
  // Frame ancestors - prevent clickjacking
  frameAncestors: ["'none'"],
  
  // Base URI - restrict base tag URLs
  baseUri: ["'self'"],
  
  // Form actions - restrict form submissions
  formAction: ["'self'"],
  
  // Upgrade insecure requests
  upgradeInsecureRequests: true,
};

/**
 * Generate CSP header string from directives
 */
export function generateCSPHeader(): string {
  const directives: string[] = [];

  // Convert camelCase to kebab-case and format directives
  for (const [key, value] of Object.entries(CSP_DIRECTIVES)) {
    const directiveName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    
    if (typeof value === 'boolean' && value) {
      directives.push(directiveName);
    } else if (Array.isArray(value)) {
      directives.push(`${directiveName} ${value.join(' ')}`);
    }
  }

  return directives.join('; ');
}

/**
 * CSP violation report interface
 */
export interface CSPViolation {
  documentUri: string;
  violatedDirective: string;
  blockedUri?: string;
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
  userAgent?: string;
}

/**
 * Report CSP violation to backend
 */
export async function reportCSPViolation(violation: CSPViolation): Promise<void> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/csp-reporter`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'csp-report': {
            'document-uri': violation.documentUri,
            'violated-directive': violation.violatedDirective,
            'blocked-uri': violation.blockedUri,
            'source-file': violation.sourceFile,
            'line-number': violation.lineNumber,
            'column-number': violation.columnNumber,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Failed to report CSP violation:', await response.text());
    }
  } catch (error) {
    console.error('Error reporting CSP violation:', error);
  }
}

/**
 * Set up CSP violation event listener
 */
export function setupCSPViolationReporting(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener('securitypolicyviolation', (e) => {
    const violation: CSPViolation = {
      documentUri: e.documentURI,
      violatedDirective: e.violatedDirective,
      blockedUri: e.blockedURI,
      sourceFile: e.sourceFile,
      lineNumber: e.lineNumber,
      columnNumber: e.columnNumber,
      userAgent: navigator.userAgent,
    };

    console.warn('CSP Violation:', violation);
    reportCSPViolation(violation);
  });
}
