import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert } from "lucide-react";

interface MFAStatusBadgeProps {
  enabled: boolean;
}

export function MFAStatusBadge({ enabled }: MFAStatusBadgeProps) {
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
