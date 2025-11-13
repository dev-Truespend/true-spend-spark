import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

export default function ResendTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSendTest = async () => {
    setIsLoading(true);
    setResult(null);

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
        toast({
          title: "Test email sent!",
          description: `Code (masked): ${data.code} | Sent at: ${new Date(data.sentAt).toLocaleTimeString()}`,
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

          {result && (
            <div className="mt-4 p-4 rounded-lg border bg-muted">
              {result.success ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Email sent successfully!</span>
                  </div>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p><strong>To:</strong> {result.to}</p>
                    <p><strong>Code (masked):</strong> {result.code}</p>
                    <p><strong>Sent at:</strong> {new Date(result.sentAt).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    ✅ Check your inbox at raj.yagateela@gmail.com (including spam folder)
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold text-destructive">❌ Error</p>
                  <p className="text-sm text-muted-foreground">{result.error}</p>
                  {result.details && (
                    <pre className="text-xs bg-background p-2 rounded overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}
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
