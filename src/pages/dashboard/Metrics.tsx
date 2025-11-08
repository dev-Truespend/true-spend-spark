import { TelemetryDashboard } from '@/components/geofencing/TelemetryDashboard';

export default function Metrics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performance Metrics</h1>
        <p className="text-muted-foreground mt-2">
          Real-time telemetry and performance monitoring for geofencing operations
        </p>
      </div>
      <TelemetryDashboard />
    </div>
  );
}
