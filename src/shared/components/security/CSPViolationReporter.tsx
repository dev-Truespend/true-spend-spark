import { useEffect } from 'react';
import { setupCSPViolationReporting } from '@/shared/lib/security/csp';

/**
 * CSP Violation Reporter Component
 * Phase 2: Security & Ingress - Layer 4 (Modern Safety)
 * 
 * This component sets up client-side CSP violation reporting
 * to help monitor and debug Content Security Policy issues.
 */
export function CSPViolationReporter() {
  useEffect(() => {
    setupCSPViolationReporting();
  }, []);

  // This component doesn't render anything
  return null;
}
