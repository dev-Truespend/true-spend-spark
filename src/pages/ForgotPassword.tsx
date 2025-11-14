import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Mail, Chrome, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const schema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isGoogleOAuth, setIsGoogleOAuth] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { requestPasswordReset } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
    },
  });

  // Countdown timer for email expiry
  useEffect(() => {
    if (!emailSent) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [emailSent]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown === 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setIsGoogleOAuth(false);
    
    const { error, message } = await requestPasswordReset(values.email);
    
    if (error) {
      // Check if this is a Google OAuth account
      if (error.message?.includes('google_oauth_account') || error.message?.includes('Google sign-in')) {
        setIsGoogleOAuth(true);
        setIsLoading(false);
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setEmailSent(true);
    setIsLoading(false);
    setTimeRemaining(30 * 60); // Reset timer
    setCanResend(false);
    
    toast({
      title: "Check your email",
      description: message || "If an account exists, we've sent a password reset link.",
    });
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setResendCooldown(60); // 1 minute cooldown
    await handleSubmit(form.getValues());
  };

  const handleOpenEmail = () => {
    window.location.href = `mailto:${form.getValues("email")}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md space-y-4">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              {emailSent 
                ? "Check your email for reset instructions"
                : "Enter your email to receive a password reset link"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isGoogleOAuth ? (
              <div className="space-y-4">
                <Alert className="border-primary/20 bg-primary/5">
                  <Chrome className="h-5 w-5 text-primary" />
                  <AlertDescription className="ml-2">
                    <strong className="block mb-2">This account uses Google sign-in</strong>
                    <p className="text-sm text-muted-foreground mb-3">
                      Password reset isn't available for Google accounts. Please use the "Sign in with Google" button to access your account.
                    </p>
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={() => navigate('/auth')} 
                  className="w-full gap-2"
                >
                  <Chrome className="h-4 w-4" />
                  Go to Sign In
                </Button>
                <Link to="/" className="block">
                  <Button variant="outline" className="w-full">
                    Back to Home
                  </Button>
                </Link>
              </div>
            ) : emailSent ? (
              <div className="space-y-4">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    We've sent a password reset link to <strong>{form.getValues("email")}</strong>. 
                    Please check your inbox and follow the instructions.
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Link expires in: <strong className="text-foreground">{formatTime(timeRemaining)}</strong></span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleOpenEmail}
                    className="flex-1"
                  >
                    Open Email App
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="flex-1"
                  >
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Email'}
                  </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder
                </div>
                
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full">
                    Back to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
