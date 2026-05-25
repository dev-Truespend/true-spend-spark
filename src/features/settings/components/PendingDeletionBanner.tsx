import { Link } from "react-router-dom";
import { usePendingDeletion } from "@/shared/hooks/useAccountDeletion";
import { AlertTriangle } from "lucide-react";

/**
 * Sticky banner shown across the app when the user has a pending
 * account deletion in the 30-day grace window.
 *
 * Renders nothing if the user has no pending deletion (queries are
 * already gated by useAuth via useQuery enabled flag).
 */
export function PendingDeletionBanner() {
  const { data: pending } = usePendingDeletion();

  if (!pending) return null;

  const daysLeft = Math.max(
    1,
    Math.ceil(
      (new Date(pending.purge_after).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="bg-amber-500/95 text-amber-950 dark:bg-amber-600 dark:text-amber-50 border-b border-amber-700/30">
      <div className="container mx-auto px-4 py-2 flex items-center gap-3 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <p className="flex-1">
          Your account is scheduled for deletion in{" "}
          <strong>{daysLeft} day{daysLeft === 1 ? "" : "s"}</strong>.
        </p>
        <Link
          to="/settings"
          className="underline underline-offset-2 font-semibold hover:opacity-80"
        >
          Cancel deletion
        </Link>
      </div>
    </div>
  );
}
