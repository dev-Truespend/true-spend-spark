/**
 * Phase 10: Observability - Incidents Page
 */

import { IncidentsDashboard } from '@/components/observability/IncidentsDashboard';

export default function Incidents() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Incident Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage system incidents with real-time detection and alerting
        </p>
      </div>

      <IncidentsDashboard />
    </div>
  );
}
