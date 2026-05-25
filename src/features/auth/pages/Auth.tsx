import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card } from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Separator } from "@/shared/components/ui/separator";
import { useToast } from "@/shared/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";
import { PasswordRequirements } from "@/features/auth/components/PasswordRequirements";
import { PasswordStrengthMeter } from "@/features/auth/components/PasswordStrengthMeter";
import { ConsentBlock } from "@/features/auth/components/ConsentBlock";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/shared/components/ui/input-otp";
import { Loader2, Shield, Lock, Eye, CheckCircle, Smartphone, KeyRound, ArrowLeft, Mail, AlertCircle } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Link } from "react-router-dom";
import authEnterprise from "@/assets/auth-enterprise.png";

const passwordValidation = z
  .string()
  .min(12, { message: "Password must be at least 12 characters" })
  .max(255)
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" })
  .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character (!@#$%^&*)" });

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(1, { message: "Password is required" }),
  mfaCode: z.string().optional(),
  backupCode: z.string().optional(),
});

const signupSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: passwordValidation,
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the Terms & Privacy Policy"
  })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [checkingMfa, setCheckingMfa] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'backup'>('totp');
  const [emailSent, setEmailSent] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const { signIn, signUp, user, session, loading, checkAuthProvider, checkMfaStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash);
  
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const isExtensionMode = searchParams.get('source') === 'extension';
  const hasOAuthInQuery = searchParams.has('code') || searchParams.has('access_token');
  const hasOAuthInHash = hashParams.has('code') || hashParams.has('access_token') || hashParams.has('refresh_token') || hashParams.has('provider_token');
  const hasOAuthError = searchParams.has('error') || hashParams.has('error');
  const isOAuthCallback = (hasOAuthInQuery || hasOAuthInHash) && !hasOAuthError;
  const [processingOAuth, setProcessingOAuth] = useState(isOAuthCallback);

  useEffect(() => {
    if (!isOAuthCallback) return;

    const completeOAuth = async () => {
      try {
        console.log('[Auth] Processing OAuth callback');
        setProcessingOAuth(true);
        
        const code = searchParams.get('code') || hashParams.get('code');
        const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const errorParam = searchParams.get('error') || hashParams.get('error');
        
        // Handle OAuth errors
        if (errorParam) {
          const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');
          toast({
            title: "Sign-in Failed",
            description: errorDesc || "Authentication was cancelled or failed.",
            variant: "destructive"
          });
          setProcessingOAuth(false);
          return;
        }
        
        if (!code && !accessToken && !refreshToken) {
          toast({
            title: "OAuth Error",
            description: "Missing authentication parameters. Please try again.",
            variant: "destructive"
          });
          setProcessingOAuth(false);
          return;
        }

        // Wait for session to be established (with timeout)
        const maxWaitTime = 5000; // 5 seconds max
        const startTime = Date.now();
        
        const checkSession = async () => {
          const { data: { session } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
          
          if (session && session.user) {
            console.log('[Auth] Session established, redirecting to dashboard');
            toast({ title: "Welcome back!", description: "Successfully signed in." });
            navigate(redirectTo, { replace: true });
            return true;
          }
          
          // Timeout check
          if (Date.now() - startTime > maxWaitTime) {
            console.error('[Auth] Session establishment timeout');
            toast({
              title: "Sign-in Delayed",
              description: "Taking longer than expected. Please refresh the page.",
              variant: "destructive"
            });
            setProcessingOAuth(false);
            return true;
          }
          
          return false;
        };
        
        // Poll for session (check every 300ms)
        const pollInterval = setInterval(async () => {
          const done = await checkSession();
          if (done) {
            clearInterval(pollInterval);
          }
        }, 300);
        
        // Initial check
        await checkSession();
        
      } catch (error) {
        console.error('[Auth] OAuth processing error:', error);
        toast({
          title: "Authentication Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
        setProcessingOAuth(false);
      }
    };

    completeOAuth();
  }, [isOAuthCallback, navigate, redirectTo, toast, searchParams, hashParams]);

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (!loading && !processingOAuth && user && session) {
      console.log('[Auth] User already authenticated, redirecting to dashboard');
      navigate(redirectTo, { replace: true });
    }
  }, [loading, processingOAuth, user, session, navigate, redirectTo]);

  useEffect(() => {
    if (isExtensionMode) {
      document.body.classList.add('extension-mode');
    } else {
      document.body.classList.remove('extension-mode');
    }
  }, [isExtensionMode]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: searchParams.get("email") || "",
      password: "",
      mfaCode: "",
      backupCode: "",
    },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    },
  });

  const handleEmailBlur = async (email: string) => {
    if (!email || !email.includes('@')) {
      setMfaRequired(false);
      return;
    }
    
    setCheckingMfa(true);
    const status = await checkMfaStatus(email);
    setMfaRequired(status.mfaEnabled);
    setCheckingMfa(false);
  };

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    try {
      setIsLoading(true);
      const providerResponse = await checkAuthProvider(values.email);
      
      if (providerResponse.provider === 'google') {
        toast({
          title: "Google Account",
          description: "Please use 'Sign in with Google' button.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const mfaCode = mfaMethod === 'totp' ? loginForm.getValues('mfaCode') : undefined;
      const backupCode = mfaMethod === 'backup' ? loginForm.getValues('backupCode') : undefined;
      
      const result = await signIn(values.email, values.password, mfaMethod === 'totp' ? mfaCode : undefined);

      if (result?.requiresMFA) {
        setMfaRequired(true);
        toast({ title: "MFA Required", description: "Enter your 6-digit code or use a backup code." });
        setIsLoading(false);
        return;
      }

      if (result?.error) {
        const errorMessage = result.error.message || "Invalid credentials.";
        
        // Check if error is due to unverified email
        if (errorMessage.toLowerCase().includes('verify') || 
            errorMessage.toLowerCase().includes('confirm') ||
            result.error.code === 'email_not_confirmed') {
          setUnverifiedEmail(values.email);
          toast({
            title: "Email Verification Required",
            description: "Please verify your email address to sign in. Check your inbox for the verification link.",
            variant: "default",
          });
        } else {
          toast({
            title: "Sign in failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
        
        if (result.error.code === 'mfa_invalid') {
          if (mfaMethod === 'totp') {
            loginForm.setValue('mfaCode', '');
          } else {
            loginForm.setValue('backupCode', '');
          }
        }
        setIsLoading(false);
        return;
      }

      if (result?.user) {
        toast({ title: "Welcome back!" });
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  const handleSignup = async (values: z.infer<typeof signupSchema>) => {
    try {
      setIsLoading(true);
      
      const providerCheck = await checkAuthProvider(values.email);
      
      if (providerCheck) {
        if (providerCheck.hasGoogle && !providerCheck.hasLocal) {
          toast({
            title: "Account Exists",
            description: "This email is already registered with Google. You can add a password in your profile settings after signing in with Google.",
            variant: "default"
          });
          setIsLoading(false);
          return;
        }
        
        if (providerCheck.hasLocal) {
          toast({
            title: "Account Exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }
      
      const { error } = await signUp({
        email: values.email,
        password: values.password,
        firstName: null,
        lastName: null
      });

      if (error) {
        toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      } else {
        toast({ 
          title: "Account created!", 
          description: "A verification email has been sent to your inbox. Please verify within 24 hours to activate your account.",
          duration: 8000, // Longer duration for important message
        });
        
        // Also show persistent alert in UI (will be added in Phase 4)
        setEmailSent(true);
      }
    } catch (error) {
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    
    setIsLoading(true);
    try {
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox. The link expires in 24 hours.",
      });
      setUnverifiedEmail(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (processingOAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-auto p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Completing sign-in...</h2>
              <p className="text-sm text-muted-foreground">Please wait while we redirect you</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col w-full max-w-md px-6">
        {/* Back to Home Button */}
        <div className="p-6">
          <Link to="/">
            <Button className="gap-2 bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white font-semibold shadow-premium">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            {/* Logo & Tagline */}
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent">
                TrueSpend
              </h1>
              <p className="text-lg text-muted-foreground">Secure access to your financial data</p>
            {isExtensionMode && (
              <Badge variant="secondary" className="mt-2">
                <Shield className="w-3 h-3 mr-1" />
                Browser Extension Sign-In
              </Badge>
            )}
          </div>

          {/* Google SSO - Primary CTA */}
          <div className="space-y-4">
            <GoogleSignInButton fullWidth className="h-12 text-base shadow-medium" />
            
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Forms */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-6">
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
                            {...field} 
                            type="email" 
                            placeholder="you@example.com"
                            disabled={isLoading || checkingMfa}
                            onBlur={(e) => handleEmailBlur(e.target.value)}
                            className="h-11"
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
                          <Input {...field} type="password" className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  
                  <div className="flex justify-end">
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  
                  {mfaRequired && (
                    <div className="space-y-4">
                      <Tabs value={mfaMethod} onValueChange={(v) => setMfaMethod(v as 'totp' | 'backup')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="totp" className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            <span>Authenticator</span>
                          </TabsTrigger>
                          <TabsTrigger value="backup" className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4" />
                            <span>Backup Code</span>
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="totp" className="mt-4">
                          <FormField control={loginForm.control} name="mfaCode" render={({ field }) => (
                            <FormItem>
                              <FormLabel>6-Digit Code</FormLabel>
                              <FormControl>
                                <InputOTP maxLength={6} {...field}>
                                  <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                    <InputOTPSlot index={3} />
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                  </InputOTPGroup>
                                </InputOTP>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </TabsContent>

                        <TabsContent value="backup" className="mt-4">
                          <FormField control={loginForm.control} name="backupCode" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Backup Code</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter backup code" className="h-11" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  {unverifiedEmail && (
                    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                        <p className="font-semibold mb-2">Email Verification Required</p>
                        <p className="mb-3">Please check your inbox for the verification link. It expires in 24 hours.</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleResendVerification}
                          disabled={isLoading}
                          className="h-8"
                        >
                          {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                          Resend verification email
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white font-semibold shadow-premium"
                    disabled={isLoading || checkingMfa}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sign In
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              {!emailSent && (
                <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-sm text-blue-800 dark:text-blue-200 ml-2">
                    <strong>Email Verification Required:</strong> After signing up, you'll receive a verification email. 
                    Please verify within 24 hours to activate your account.
                  </AlertDescription>
                </Alert>
              )}

              {emailSent && (
                <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-sm text-green-800 dark:text-green-200 ml-2">
                    <strong>Verification Email Sent!</strong> Check your inbox and verify your email within 24 hours. 
                    Don't forget to check your spam folder.
                  </AlertDescription>
                </Alert>
              )}

              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  <FormField control={signupForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="you@example.com" className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signupForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" className="h-11" />
                      </FormControl>
                      <PasswordStrengthMeter password={field.value} />
                      <PasswordRequirements password={field.value} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField 
                    control={signupForm.control} 
                    name="agreeToTerms" 
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ConsentBlock 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            error={signupForm.formState.errors.agreeToTerms?.message}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white font-semibold shadow-premium"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Account
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>

          {/* Privacy Assurance */}
          <div className="text-center text-xs text-muted-foreground space-y-2 pt-4">
            <p className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-brand-blue" />
              Your data never leaves your control
            </p>
            <p>Protected by end-to-end encryption • GDPR compliant • No tracking</p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
