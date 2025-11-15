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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

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
  const { signIn, signUp, user, loading, checkAuthProvider } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(location.search);
  
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    if (error) {
      toast({
        title: "Sign-in Error",
        description: error === 'access_denied' ? "Sign-in was cancelled." : "Authentication failed.",
        variant: "destructive",
      });
    }
  }, [location.search, toast]);

  useEffect(() => {
    if (!loading && user && !mfaRequired && !isLoading) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo, mfaRequired, isLoading]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: searchParams.get("email") || "",
      password: "",
      mfaCode: "",
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

      const mfaCode = loginForm.getValues('mfaCode');
      const result = await signIn(values.email, values.password, mfaCode);

      if (result?.requiresMFA) {
        setMfaRequired(true);
        toast({ title: "MFA Required", description: "Enter your 6-digit code." });
        setIsLoading(false);
        return;
      }

      if (result?.error) {
        toast({
          title: "Sign in failed",
          description: result.error.message || "Invalid credentials.",
          variant: "destructive",
        });
        if (result.error.code === 'mfa_invalid') loginForm.setValue('mfaCode', '');
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
      const { error } = await signUp({
        email: values.email,
        password: values.password,
        firstName: "",
        lastName: ""
      });

      if (error) {
        toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account created!", description: "Check your email to verify." });
      }
    } catch (error) {
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">TrueSpend</CardTitle>
          <CardDescription className="text-center">Sign in or create account</CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleSignInButton />
          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              Or continue with
            </span>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField control={loginForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input {...field} type="email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input {...field} type="password" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {mfaRequired && (
                    <FormField control={loginForm.control} name="mfaCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authentication Code</FormLabel>
                        <FormControl>
                          <InputOTP {...field} maxLength={6}>
                            <InputOTPGroup className="w-full justify-center">
                              {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                            </InputOTPGroup>
                          </InputOTP>
                        </FormControl>
                        <FormDescription className="text-xs text-center">Enter code from authenticator</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading || (mfaRequired && loginForm.watch('mfaCode')?.length !== 6)}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mfaRequired ? 'Verify & Sign In' : 'Sign In'}
                  </Button>
                  <div className="text-center">
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  <FormField control={signupForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input {...field} type="email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signupForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input {...field} type="password" /></FormControl>
                      <PasswordStrengthMeter password={field.value} />
                      <PasswordRequirements password={field.value} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl><Input {...field} type="password" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signupForm.control} name="agreeToTerms" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="text-sm font-normal">I agree to Terms & Privacy</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
