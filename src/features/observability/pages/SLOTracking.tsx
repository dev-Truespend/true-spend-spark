/**
 * Phase 10: Observability - SLO Tracking Page
 */

import { SLODashboard } from '@/features/observability/components/SLODashboard';

export default function SLOTracking() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SLO Tracking</h1>
        <p className="text-muted-foreground">
          Monitor Service Level Objectives and compliance in real-time
        </p>
      </div>

      <SLODashboard />
    </div>
  );
}
