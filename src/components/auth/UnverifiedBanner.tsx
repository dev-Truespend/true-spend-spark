import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function UnverifiedBanner() {
  const { profile, sendVerificationEmail } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  // Update time remaining every minute
  useEffect(() => {
    if (!profile?.verification_expires_at) return;

    const updateTime = () => {
      const expiry = new Date(profile.verification_expires_at!);
      const now = new Date();
      const diff = expiry.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('expired');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeRemaining(`${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`);
      } else {
        setTimeRemaining(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [profile?.verification_expires_at]);

  // Don't show if user is verified or doesn't exist
  if (!profile || profile.status === 'active') {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    const { error } = await sendVerificationEmail();
    setIsResending(false);

    if (error) {
      toast({
        title: "Failed to resend",
        description: error.message || "Could not send verification email",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Verification email sent!",
      description: `Check ${profile.email} for the verification link.`,
    });
  };

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>⚠️ Please Verify Your Email</span>
        {timeRemaining && timeRemaining !== 'expired' && (
          <span className="text-sm font-normal">
            {timeRemaining} remaining
          </span>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          We sent a verification link to <strong>{profile.email}</strong>. 
          Your account will be deleted if not verified within 24 hours.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={isResending}
            className="gap-2"
          >
            {isResending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Mail className="w-3 h-3" />
            )}
            Resend Verification Email
          </Button>
        </div>
        
        {timeRemaining === 'expired' && (
          <p className="text-sm text-red-600 font-semibold">
            ⏰ Your verification link has expired. Click "Resend" to get a new link.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
