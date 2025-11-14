import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auto-redirect if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

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
    const { error } = await signIn(values.email, values.password);
    
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
  };

  const handleSignup = async (values: SignupFormValues) => {
    setIsLoading(true);
    
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
    });

    // MANDATORY: Auto-login and redirect to dashboard
    navigate('/dashboard');
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
                            <Input placeholder="you@example.com" {...field} />
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
