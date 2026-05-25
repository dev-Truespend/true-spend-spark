import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  useDeleteAccount,
  useCancelAccountDeletion,
  usePendingDeletion,
} from "@/shared/hooks/useAccountDeletion";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, ShieldOff, Undo2 } from "lucide-react";

/**
 * Account deletion + recovery UI for the Settings page.
 *
 * Two modes:
 *  - No pending deletion → red "Delete account" card with confirmation dialog
 *  - Pending deletion    → yellow "Account scheduled for deletion" card with
 *                          a "Cancel deletion" button
 */
export function DangerZone() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { data: pending, isLoading } = usePendingDeletion();
  const deleteMutation = useDeleteAccount();
  const cancelMutation = useCancelAccountDeletion();

  const [open, setOpen]               = useState(false);
  const [password, setPassword]       = useState("");
  const [confirmText, setConfirmText] = useState("");

  const isPasswordUser =
    profile?.auth_provider === "email" ||
    (profile?.auth_providers ?? []).includes("email") ||
    !profile?.auth_provider;

  // ── Format dates for display ────────────────────────────────────────
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day:   "numeric",
      year:  "numeric",
    });

  // ── Cancel-deletion path ────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (pending) {
    return (
      <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <CardTitle className="text-amber-900 dark:text-amber-100">
                Account scheduled for deletion
              </CardTitle>
              <CardDescription className="text-amber-800 dark:text-amber-200">
                Your account and all data will be permanently deleted on{" "}
                <strong>{fmt(pending.purge_after)}</strong>. Until then, you can
                still recover your account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="gap-2 border-amber-500"
            disabled={cancelMutation.isPending}
            onClick={() => {
              cancelMutation.mutate(undefined, {
                onSuccess: (data) => {
                  toast({
                    title: "Deletion canceled",
                    description: data.message,
                  });
                },
                onError: (err) => {
                  toast({
                    title: "Couldn't cancel deletion",
                    description: err instanceof Error ? err.message : "Please try again.",
                    variant: "destructive",
                  });
                },
              });
            }}
          >
            {cancelMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Undo2 className="h-4 w-4" />
            )}
            Cancel deletion &amp; restore account
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Delete-account path ─────────────────────────────────────────────
  const canSubmit =
    confirmText.trim().toUpperCase() === "DELETE" &&
    (!isPasswordUser || password.length > 0) &&
    !deleteMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    deleteMutation.mutate(
      {
        password:    isPasswordUser ? password : undefined,
        confirmText: confirmText.trim(),
      },
      {
        onSuccess: (data) => {
          toast({
            title: "Account scheduled for deletion",
            description: `Your account will be permanently deleted on ${fmt(data.purge_after)}.`,
          });
          setOpen(false);
          // The realtime listener in useAuth will sign us out automatically
          // once profile.status flips to 'deleted'.
        },
        onError: (err) => {
          toast({
            title: "Couldn't delete account",
            description: err instanceof Error ? err.message : "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <div className="flex items-start gap-3">
          <ShieldOff className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Permanently delete your account, transactions, budgets, and all
              associated data. You'll have 30 days to change your mind.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <ShieldOff className="h-4 w-4" />
              Delete my account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete account?
              </DialogTitle>
              <DialogDescription>
                This will permanently delete <strong>{user?.email}</strong>,
                your transactions, budgets, linked cards, and connected
                banks. You'll have <strong>30 days</strong> to cancel before
                deletion is final.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isPasswordUser && (
                <div className="space-y-2">
                  <Label htmlFor="del-password">Confirm your password</Label>
                  <Input
                    id="del-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="del-confirm">
                  Type <code className="px-1 rounded bg-muted text-foreground">DELETE</code> to confirm
                </Label>
                <Input
                  id="del-confirm"
                  type="text"
                  autoCapitalize="characters"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={!canSubmit}
                >
                  {deleteMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Delete account
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
