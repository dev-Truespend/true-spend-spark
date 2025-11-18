/**
 * Phase 10: Alerts Dashboard Page
 */

import { AlertRulesManager } from '@/components/observability/AlertRulesManager';
import { AlertHistory } from '@/components/observability/AlertHistory';

export default function Alerts() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alert Management</h1>
        <p className="text-muted-foreground">
          Configure alert rules and view notification history
        </p>
      </div>

      <AlertRulesManager />
      <AlertHistory />
    </div>
  );
}
