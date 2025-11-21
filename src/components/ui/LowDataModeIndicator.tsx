import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi } from 'lucide-react';
import { useAdaptiveContent } from '@/hooks/useAdaptiveContent';

export function LowDataModeIndicator() {
  const { showLowDataMode, quality } = useAdaptiveContent();

  if (!showLowDataMode) return null;

  return (
    <Alert className="border-yellow-500/50 bg-yellow-500/10">
      <Wifi className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-sm">
        <span className="font-medium">Low Data Mode Active</span>
        {' - '}
        Reducing image quality and deferring non-essential content due to {quality} connection
      </AlertDescription>
    </Alert>
  );
}
