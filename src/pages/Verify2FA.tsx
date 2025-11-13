import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function Verify2FA() {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [method, setMethod] = useState<'email' | 'sms'>('email');
  const [otpSent, setOtpSent] = useState(false);
  
  const { user, verify2FAOTP, send2FAOTP, verified2FA, setRequires2FA } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Redirect to dashboard after successful 2FA
  useEffect(() => {
    if (verified2FA && !roleLoading) {
      if (hasRole('admin')) {
        navigate("/launcher");
      } else {
        navigate("/dashboard");
      }
    }
  }, [verified2FA, hasRole, roleLoading, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!otpSent) return;
    const timer = setInterval(() => {
      setTimeRemaining((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent]);

  const handleSendOTP = async () => {
    setIsResending(true);
    const { error } = await send2FAOTP(method);
    setIsResending(false);
    
    if (error) {
      toast({
        title: "Failed to send code",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } else {
      setOtpSent(true);
      setTimeRemaining(300);
      toast({
        title: "Verification code sent",
        description: `Check your ${method === 'email' ? 'email' : 'phone'} for the 6-digit code`,
      });
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }
    
    setIsVerifying(true);
    const { error } = await verify2FAOTP(otp);
    setIsVerifying(false);
    
    if (error) {
      toast({
        title: "Invalid code",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Verified!",
      description: "Redirecting to dashboard...",
    });
  };

  const handleResendOTP = async () => {
    await handleSendOTP();
    setOtp("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
          <CardDescription>Verify your identity to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {!otpSent ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Choose how you'd like to receive your verification code
                </p>
              </div>
              
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as 'email' | 'sms')}>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email" className="flex-1 cursor-pointer">
                    <div className="font-medium">Email</div>
                    <div className="text-sm text-muted-foreground">
                      Send code to {user?.email}
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg opacity-50">
                  <RadioGroupItem value="sms" id="sms" disabled />
                  <Label htmlFor="sms" className="flex-1">
                    <div className="font-medium">SMS (Coming Soon)</div>
                    <div className="text-sm text-muted-foreground">
                      Send code to your phone
                    </div>
                  </Label>
                </div>
              </RadioGroup>
              
              <Button
                onClick={handleSendOTP}
                className="w-full"
                disabled={isResending}
              >
                {isResending ? "Sending..." : "Send Verification Code"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to your {method === 'email' ? 'email' : 'phone'}
                </p>
              </div>
              
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    disabled={isVerifying}
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Expires in {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, "0")}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={isResending || timeRemaining === 0}
                    onClick={handleResendOTP}
                    className="h-auto p-0"
                  >
                    Resend code
                  </Button>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isVerifying || otp.length !== 6}
                >
                  {isVerifying ? "Verifying..." : "Verify Code"}
                </Button>
              </form>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setRequires2FA(false);
                  navigate("/auth");
                }}
              >
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
