import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function ResendTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [enteredCode, setEnteredCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const { toast } = useToast();

  const handleSendTest = async () => {
    setIsLoading(true);
    setResult(null);
    setSessionId(null);
    setEnteredCode("");
    setVerificationResult(null);
    setTimeRemaining(null);

    try {
      console.log("[ResendTest] Calling resend-test-email function...");
      
      const { data, error } = await supabase.functions.invoke("resend-test-email", {
        body: {},
      });

      if (error) {
        console.error("[ResendTest] Error:", error);
        toast({
          variant: "destructive",
          title: "Failed to send test email",
          description: error.message || "Unknown error occurred",
        });
        setResult({ error: error.message });
      } else {
        console.log("[ResendTest] Success:", data);
        setSessionId(data.sessionId);
        setTimeRemaining(data.expiresIn);
        toast({
          title: "Test email sent!",
          description: `Check your inbox at ${data.to}. Code expires in 10 minutes.`,
        });
        setResult(data);
      }
    } catch (err: any) {
      console.error("[ResendTest] Exception:", err);
      toast({
        variant: "destructive",
        title: "Exception occurred",
        description: err.message,
      });
      setResult({ error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!sessionId || enteredCode.length !== 6) return;

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      console.log("[ResendTest] Verifying code...");
      
      const { data, error } = await supabase.functions.invoke("verify-test-code", {
        body: { sessionId, code: enteredCode },
      });

      if (error) {
        console.error("[ResendTest] Verification error:", error);
        toast({
          variant: "destructive",
          title: "Verification failed",
          description: error.message || "Unknown error occurred",
        });
        setVerificationResult({ error: error.message });
      } else {
        console.log("[ResendTest] Verification result:", data);
        setVerificationResult(data);
        
        if (data.verified) {
          toast({
            title: "✅ Code verified!",
            description: "Email verification test completed successfully!",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Invalid code",
            description: data.message || "The code you entered is incorrect.",
          });
        }
      }
    } catch (err: any) {
      console.error("[ResendTest] Verification exception:", err);
      toast({
        variant: "destructive",
        title: "Exception occurred",
        description: err.message,
      });
      setVerificationResult({ error: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  // Countdown timer effect
  React.useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Resend Email Test
          </CardTitle>
          <CardDescription>
            Temporary diagnostics tool to verify email delivery from truespend.org
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleSendTest}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Test Email to raj.yagateela@gmail.com
              </>
            )}
          </Button>

          {/* Email sent - show verification UI */}
          {result?.success && sessionId && (
            <div className="mt-4 space-y-4">
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2 text-green-600 mb-3">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Email sent to {result.to}</span>
                </div>
                
                {timeRemaining !== null && timeRemaining > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Clock className="h-4 w-4" />
                    <span>
                      Code expires in {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Enter 6-digit code from email:
                    </label>
                    <Input
                      type="text"
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={enteredCode}
                      onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="text-center text-2xl tracking-widest font-mono"
                      disabled={isVerifying || verificationResult?.verified}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                      {enteredCode.length}/6 digits
                    </p>
                  </div>

                  <Button
                    onClick={handleVerifyCode}
                    disabled={enteredCode.length !== 6 || isVerifying || verificationResult?.verified}
                    className="w-full"
                    size="lg"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Verify Code
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Verification result */}
              {verificationResult && (
                <div className={`p-4 rounded-lg border ${
                  verificationResult.verified 
                    ? "bg-green-50 border-green-200" 
                    : verificationResult.expired
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-red-50 border-red-200"
                }`}>
                  {verificationResult.verified ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-semibold">Code verified successfully! 🎉</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Email delivery path is working correctly!
                      </p>
                    </div>
                  ) : verificationResult.expired ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-semibold">Code expired</span>
                      </div>
                      <p className="text-sm text-yellow-700">{verificationResult.message}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-semibold">Verification failed</span>
                      </div>
                      <p className="text-sm text-red-700">{verificationResult.message}</p>
                      {verificationResult.attemptsRemaining !== undefined && (
                        <p className="text-xs text-red-600">
                          {verificationResult.attemptsRemaining} attempt{verificationResult.attemptsRemaining !== 1 ? 's' : ''} remaining
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error result */}
          {result && !result.success && (
            <div className="mt-4 p-4 rounded-lg border bg-muted">
              <div className="space-y-2">
                <p className="font-semibold text-destructive">❌ Error</p>
                <p className="text-sm text-muted-foreground">{result.error}</p>
                {result.details && (
                  <pre className="text-xs bg-background p-2 rounded overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            ⚠️ This page will be removed after verification is complete.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
