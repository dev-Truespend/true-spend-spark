import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(255),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user, session, requiresEmailOTP, sendEmailOTP, verifyEmailOTP, setRequiresEmailOTP, setRequires2FA } = useAuth();
  const { roles, hasRole, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // OTP state
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const sentRef = useRef(false);

  const loginForm = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle OAuth callback errors
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    
    if (error) {
      toast({
        title: "Authentication Error",
        description: errorDescription || "Failed to authenticate with Google",
        variant: "destructive",
      });
      
      // Clean up URL
      window.history.replaceState({}, '', '/auth');
    }
  }, [toast]);

  // Trigger OTP sending after Google OAuth
  useEffect(() => {
    if (user && session?.user.app_metadata?.provider === 'google' && !requiresEmailOTP && !sentRef.current) {
      sentRef.current = true;
      setRequiresEmailOTP(true);
      sendEmailOTP().then(({ error }) => {
        if (error) {
          toast({
            title: "Failed to send OTP",
            description: error.message || "Could not send verification code",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Verification code sent",
            description: "Check your email for the 6-digit code",
          });
        }
      });
    }
  }, [user, session, requiresEmailOTP, sendEmailOTP, setRequiresEmailOTP, toast]);

  // Countdown timer for OTP
  useEffect(() => {
    if (!requiresEmailOTP) return;
    const timer = setInterval(() => {
      setTimeRemaining((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [requiresEmailOTP]);

  // Redirect if already logged in based on role (only if OTP not required)
  useEffect(() => {
    if (user && !requiresEmailOTP && !roleLoading) {
      if (hasRole('admin')) {
        navigate("/launcher");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, requiresEmailOTP, hasRole, roleLoading, navigate]);

  const handleLogin = async (values: AuthFormValues) => {
    setIsLoading(true);
    const { error } = await signIn(values.email, values.password);
    
    if (error) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
      setIsLoading(false);
    } else {
      // Redirect to 2FA verification
      setRequires2FA(true);
      navigate("/auth/verify-2fa");
    }
  };

  const handleSignup = async (values: AuthFormValues) => {
    setIsLoading(true);
    const { error } = await signUp(values.email, values.password);
    
    if (error) {
      if (error.message?.includes("already registered")) {
        toast({
          title: "Account exists",
          description: "This email is already registered. Please log in instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signup failed",
          description: error.message || "Could not create account",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    } else {
      toast({
        title: "Account created!",
        description: "You can now log in with your credentials.",
      });
      // Wait for roles to load, then redirect
      // The useEffect will handle the redirect based on role
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
    const { error } = await verifyEmailOTP(otp);
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
    setIsResending(true);
    const { error } = await sendEmailOTP();
    setIsResending(false);
    
    if (error) {
      toast({
        title: "Failed to resend",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } else {
      toast({
        title: "New code sent",
        description: "Check your email again",
      });
      setTimeRemaining(300);
      setOtp("");
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">TrueSpend v3.0</CardTitle>
          <CardDescription>Project Management Dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          {requiresEmailOTP ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Enter Verification Code</h3>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to your email
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
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <GoogleSignInButton fullWidth />
                
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="your@email.com"
                                disabled={isLoading}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password"
                                placeholder="••••••••"
                                disabled={isLoading}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Logging in..." : "Log In"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                      <FormField
                        control={signupForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="your@email.com"
                                disabled={isLoading}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password"
                                placeholder="••••••••"
                                disabled={isLoading}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Sign Up"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
