import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/hooks/use-toast";
import { PasswordRequirements } from "./PasswordRequirements";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { Loader2 } from "lucide-react";

interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordChangeDialog({ open, onOpenChange }: PasswordChangeDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (password: string): boolean => {
    return (
      password.length >= 12 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword(newPassword)) {
      toast({
        title: "Invalid Password",
        description: "Password does not meet requirements.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Verify current password using dedicated backend function
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke(
        'verify-current-password',
        {
          body: { password: currentPassword },
        }
      );

      if (verifyError || !verifyResult?.valid) {
        toast({
          title: "Invalid Current Password",
          description: verifyResult?.error || "The current password you entered is incorrect.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Send security alert email
      await supabase.functions.invoke('send-security-alert', {
        body: {
          email: user?.email,
          alertType: 'password_changed',
          details: {
            timestamp: new Date().toISOString(),
            action: 'Password was successfully changed',
          },
        },
      });

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully. All other sessions have been logged out.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);

      // Force re-authentication after password change
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      toast({
        title: "Password Change Failed",
        description: error.message || "Could not update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Update your account password. Make sure it meets all requirements.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            {newPassword && (
              <>
                <PasswordStrengthMeter password={newPassword} />
                <PasswordRequirements password={newPassword} />
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
