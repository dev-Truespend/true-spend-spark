import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Mail } from "lucide-react";

export default function VerifyEmailOTP() {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const { user, verifyEmailOTP, sendEmailOTP, requiresEmailOTP } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !requiresEmailOTP) {
      navigate("/auth");
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [user, requiresEmailOTP, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setIsVerifying(true);

    const { error } = await verifyEmailOTP(code);

    if (error) {
      toast.error(error.message || "Invalid code. Please try again.");
      setIsVerifying(false);
      return;
    }

    toast.success("Verification successful! Redirecting...");
    setTimeout(() => {
      navigate("/");
    }, 1000);
  };

  const handleResend = async () => {
    setIsResending(true);
    const { error, data } = await sendEmailOTP();

    if (error) {
      if (error.message?.includes('wait')) {
        toast.error(error.message);
      } else {
        toast.error("Failed to resend code. Please try again.");
      }
      setIsResending(false);
      return;
    }

    toast.success("New code sent to your email!");
    setTimeRemaining(300); // Reset timer
    setCode("");
    setIsResending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2 mt-2">
            <Mail className="w-4 h-4" />
            We sent a 6-digit code to {user?.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono"
                autoFocus
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Code expires in {formatTime(timeRemaining)}</span>
                {timeRemaining === 0 && (
                  <span className="text-destructive font-medium">Expired</span>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isVerifying || code.length !== 6 || timeRemaining === 0}
            >
              {isVerifying ? "Verifying..." : "Verify Code"}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={handleResend}
                disabled={isResending}
                className="text-sm"
              >
                {isResending ? "Sending..." : "Resend Code"}
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              Didn't receive the code? Check your spam folder or click resend.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
