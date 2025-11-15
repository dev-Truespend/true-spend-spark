import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Clock } from "lucide-react";

interface MFAStatusBadgeProps {
  enabled: boolean;
  pending?: boolean;
}

export function MFAStatusBadge({ enabled, pending = false }: MFAStatusBadgeProps) {
  // Three-state system:
  // 1. Pending = setup in progress (secret exists but not verified)
  // 2. Enabled = fully enabled (verified)
  // 3. Disabled = never configured or disabled
  
  if (pending) {
    return (
      <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
        <Clock className="mr-1 h-3 w-3" />
        2FA Setup In Progress
      </Badge>
    );
  }
  
  if (enabled) {
    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
        <ShieldCheck className="mr-1 h-3 w-3" />
        2FA Enabled
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <ShieldAlert className="mr-1 h-3 w-3" />
      2FA Disabled
    </Badge>
  );
}
