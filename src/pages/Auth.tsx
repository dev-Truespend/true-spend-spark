import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { MFAVerifyModal } from "@/components/auth/MFAVerifyModal";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { RefreshCw, AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";

const passwordValidation = z
  .string()
  .min(12, { message: "Password must be at least 12 characters" })
  .max(255)
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" })
  .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character (!@#$%^&*)" })
  .refine((password) => {
    // Reject common weak passwords
    const weakPasswords = ['password123', 'qwerty123456', '123456789012', 'abcdefgh1234'];
    return !weakPasswords.includes(password.toLowerCase());
  }, { message: "This password is too common. Please choose a stronger password." });

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(1, { message: "Password is required" }),
});

const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
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

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaCredentials, setMfaCredentials] = useState<{ email: string; password: string } | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaInlineProcessing, setMfaInlineProcessing] = useState(false);
  const { signIn, signUp, user, loading, checkAuthProvider, verifyMFACode, verifyBackupCode, mfaPending } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get redirectTo from URL params
  const redirectTo = new URLSearchParams(location.search).get('redirectTo') || '/dashboard';

  // Auto-redirect if user is already logged in (but not during MFA processing)
  useEffect(() => {
    if (!loading && user && !showMFAModal && !mfaInlineProcessing && !mfaPending) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, showMFAModal, mfaInlineProcessing, mfaPending, redirectTo]);

  // Pre-fill email from password reset redirect
  useEffect(() => {
    const state = location.state as { email?: string; fromReset?: boolean } | null;
    if (state?.email) {
      loginForm.setValue('email', state.email);
      
      // Show success message if coming from password reset
      if (state.fromReset) {
        toast({
          title: "Password updated successfully!",
          description: "Please log in with your new password.",
        });
        // Clear the state to prevent message on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    },
  });

  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true);
    setMfaError(null);
    
    try {
      // Step 1: Check auth provider and account status
      const providerData = await checkAuthProvider(values.email);
      
      // Store MFA requirement state
      setMfaRequired(providerData?.mfaEnabled || false);
      
      if (!providerData) {
        toast({
          title: "Error",
          description: "Unable to verify account. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Handle Google OAuth account
      if (providerData.provider === 'google') {
        toast({
          title: "Google Account Detected",
          description: (
            <div className="space-y-2">
              <p>This email is registered with Google sign-in.</p>
              <p className="font-semibold">Please use the "Sign in with Google" button below.</p>
            </div>
          ),
          variant: "default",
          duration: 6000,
        });
        setIsLoading(false);
        return;
      }
      
      // Handle pending verification
      if (providerData.accountStatus === 'pending_verification') {
        toast({
          title: "Email Verification Required",
          description: "Please verify your email before logging in. Check your inbox for the verification link.",
          variant: "default",
          duration: 6000,
        });
        setIsLoading(false);
        return;
      }
      
      // Handle deleted account
      if (providerData.accountStatus === 'deleted') {
        toast({
          title: "Account Not Found",
          description: "This account no longer exists. Please sign up again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Step 2: Proceed with normal email/password login
      const { error, requiresMFA, userId } = await signIn(values.email, values.password);
      
      // Handle MFA requirement
      if (requiresMFA && userId) {
        setMfaUserId(userId);
        setMfaCredentials({ email: values.email, password: values.password });
        
        // If user already entered MFA code inline, verify it now
        if (mfaCode && mfaCode.length === 6) {
          setMfaInlineProcessing(true);
          try {
            const { error: mfaError } = await verifyMFACode(userId, mfaCode);
            
            if (mfaError) {
              const errorMessage = mfaError.message || 'Incorrect code. Please try again.';
              if (errorMessage.includes('Too many')) {
                setMfaError('Too many verification attempts. Please try again in 15 minutes.');
                toast({
                  title: "Rate Limit Exceeded",
                  description: "Too many verification attempts. Please try again in 15 minutes.",
                  variant: "destructive",
                });
              } else {
                setMfaError(errorMessage);
              }
              setIsLoading(false);
              setMfaInlineProcessing(false);
              return;
            }
            
            // Success - navigate to redirectTo
            toast({
              title: "Success",
              description: "Login successful!",
            });
            navigate(redirectTo);
            return;
          } catch (err) {
            setMfaError('Verification failed. Please try again.');
            setIsLoading(false);
            setMfaInlineProcessing(false);
            return;
          }
        }
        
        // No inline code entered - show modal
        setShowMFAModal(true);
        setIsLoading(false);
        return;
      }
      
      if (error) {
        // Use error code to determine the type of error
        if (error.code === 'account_locked') {
          toast({
            title: "Account Locked",
            description: error.message,
            variant: "destructive",
          });
        } else if (error.code === 'account_not_verified') {
          toast({
            title: "Email Not Verified",
            description: error.message,
            variant: "destructive",
          });
        } else if (error.code === 'verification_expired') {
          toast({
            title: "Verification Expired",
            description: error.message,
            variant: "destructive",
          });
        } else if (error.code === 'account_not_found') {
          toast({
            title: "Account Not Found",
            description: error.message,
            variant: "destructive",
          });
        } else {
          // Generic error for all other cases (including invalid credentials)
          toast({
            title: "Sign In Failed",
            description: error.message || "We couldn't sign you in with those details. Check your email and password and try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (values: SignupFormValues) => {
    setIsLoading(true);
    
    try {
      // Step 1: Check if email already exists and which provider
      const providerData = await checkAuthProvider(values.email);
      
      if (!providerData) {
        toast({
          title: "Error",
          description: "Unable to verify email availability. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Handle existing Google OAuth account
      if (providerData.provider === 'google') {
        toast({
          title: "Account Already Exists",
          description: (
            <div className="space-y-2">
              <p>This email is already registered with Google sign-in.</p>
              <p className="font-semibold">Please use the "Sign in with Google" button to access your account.</p>
            </div>
          ),
          variant: "default",
          duration: 7000,
        });
        setIsLoading(false);
        return;
      }
      
      // Handle existing email/password account
      if (providerData.provider === 'email') {
        const statusMessage = providerData.accountStatus === 'pending_verification'
          ? 'This email is already registered but not verified. Please check your email for the verification link.'
          : 'This email is already registered.';
        
        toast({
          title: "Account Already Exists",
          description: (
            <div className="space-y-2">
              <p>{statusMessage}</p>
              <button
                onClick={() => document.querySelector<HTMLButtonElement>('[value="login"]')?.click()}
                className="underline font-semibold hover:text-primary"
              >
                Log in instead?
              </button>
            </div>
          ),
          variant: "destructive",
          duration: 7000,
        });
        setIsLoading(false);
        return;
      }
      
      // Step 2: Proceed with normal signup
      const { error } = await signUp({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
      });
      
      if (error) {
        if (error.message?.includes("already registered") || error.message?.includes("already been registered")) {
          toast({
            title: "Account exists",
            description: (
              <span>
                This email is already registered.{" "}
                <button
                  onClick={() => document.querySelector<HTMLButtonElement>('[value="login"]')?.click()}
                  className="underline font-semibold"
                >
                  Log in instead?
                </button>
              </span>
            ),
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
        return;
      }

      toast({
        title: "Welcome to TrueSpend!",
        description: "Your account has been created. Check your email to verify.",
        duration: 7000,
      });

      // MANDATORY: Auto-login and redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Signup Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFAVerify = async (code: string, isBackupCode: boolean) => {
    if (!mfaUserId || !mfaCredentials) return;
    
    setIsLoading(true);
    setMfaError(null);
    
    try {
      const { error } = isBackupCode 
        ? await verifyBackupCode(mfaUserId, code)
        : await verifyMFACode(mfaUserId, code);
      
      if (error) {
        const errorMessage = error.message || 'Verification failed';
        if (errorMessage.includes('Too many')) {
          setMfaError('Too many verification attempts. Please try again in 15 minutes.');
          toast({
            title: "Rate Limit Exceeded",
            description: "Too many verification attempts. Please try again in 15 minutes.",
            variant: "destructive",
          });
        } else {
          setMfaError(errorMessage);
        }
      } else {
        setShowMFAModal(false);
        setMfaCredentials(null); // Clear stored credentials
        setMfaCode(""); // Clear inline code
        toast({
          title: "Success",
          description: "Login successful!",
        });
        navigate(redirectTo);
      }
    } catch (error) {
      setMfaError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFACancel = () => {
    setShowMFAModal(false);
    setMfaUserId(null);
    setMfaError(null);
    setMfaCredentials(null); // Clear stored credentials on cancel
    setMfaCode(""); // Clear inline code
    setMfaInlineProcessing(false);
  };

  const handleForceRefresh = async () => {
    try {
      toast({
        title: "Clearing cache...",
        description: "This will refresh the page",
      });
      
      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      console.log('[Force Refresh] Cleared all caches and service workers');
      
      // Reload after a brief delay
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('[Force Refresh] Failed:', error);
      toast({
        title: "Failed to clear cache",
        description: "Please try manually clearing your browser cache",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <MFAVerifyModal
        open={showMFAModal}
        onVerify={handleMFAVerify}
        onCancel={handleMFACancel}
        loading={isLoading}
        error={mfaError}
      />
      <div className="w-full max-w-md space-y-4">
        {/* Back to Home Button */}
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <span className="text-2xl">💳</span>
            </div>
            <CardTitle className="text-2xl">TrueSpend</CardTitle>
            <CardDescription>Smart spending, verified rewards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Google Sign In */}
            <GoogleSignInButton fullWidth />
            
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or continue with email
              </span>
            </div>

            {/* Login/Signup Tabs */}
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-4 mt-4">
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
                              placeholder="you@example.com" 
                              {...field}
                              onBlur={async (e) => {
                                field.onBlur();
                                // Check if MFA is required for this email
                                const email = e.target.value.trim();
                                if (email && email.includes('@')) {
                                  try {
                                    const providerData = await checkAuthProvider(email);
                                    setMfaRequired(providerData?.mfaEnabled || false);
                                    if (providerData?.mfaEnabled) {
                                      setMfaCode(""); // Reset code when checking new email
                                    }
                                  } catch (err) {
                                    // Silently fail - will check again on login
                                  }
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground mt-1">
                            Signed up with Google? Use the "Sign in with Google" button above.
                          </p>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Password</FormLabel>
                            <Link 
                              to="/forgot-password" 
                              className="text-xs text-muted-foreground hover:text-primary"
                            >
                              Forgot password?
                            </Link>
                          </div>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Inline MFA Code Input - shown when MFA is required */}
                    {mfaRequired && (
                      <div className="space-y-2">
                        <FormLabel>2FA Code</FormLabel>
                        <InputOTP 
                          maxLength={6} 
                          value={mfaCode}
                          onChange={(value) => setMfaCode(value)}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                        <p className="text-xs text-muted-foreground">
                          Enter the 6-digit code from your authenticator app
                        </p>
                        {mfaError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{mfaError}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Login"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup" className="space-y-4 mt-4">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signupForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground mt-1">
                            Already have a Google account? Use the sign-in button above.
                          </p>
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
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {signupForm.watch("password") && (
                      <>
                        <PasswordStrengthMeter password={signupForm.watch("password")} />
                        <PasswordRequirements password={signupForm.watch("password")} />
                      </>
                    )}
                    
                    <FormField
                      control={signupForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="agreeToTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal">
                              I agree to the{" "}
                              <Link to="/terms" className="text-primary hover:underline">
                                Terms
                              </Link>{" "}
                              and{" "}
                              <Link to="/privacy" className="text-primary hover:underline">
                                Privacy Policy
                              </Link>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
            
            {/* Force Refresh Button */}
            <Alert className="border-muted">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm">Not seeing updates?</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleForceRefresh}
                  className="gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Force Refresh
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        
        {/* Build Version Stamp for Diagnostics */}
        <div className="mt-4 text-center text-xs text-muted-foreground/50">
          v{import.meta.env.MODE}-{new Date().toISOString().split('T')[0].replace(/-/g, '')}
        </div>
      </div>
    </div>
  );
}
