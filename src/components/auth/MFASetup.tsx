import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { BackupCodesDisplay } from "./BackupCodesDisplay";
import { MFAStatusBadge } from "./MFAStatusBadge";
import { Shield, QrCode, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import QRCodeLib from "qrcode";

export function MFASetup() {
  const { user } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    checkMFAStatus();
  }, [user]);

  const checkMFAStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mfa_settings')
        .select('totp_enabled')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking MFA status:', error);
      }
      
      setMfaEnabled(data?.totp_enabled || false);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSecret = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-generate-secret');

      if (error) throw error;

      setSecret(data.secret);
      
      // Generate QR code
      const qrDataUrl = await QRCodeLib.toDataURL(data.qrCodeUrl);
      setQrCodeUrl(qrDataUrl);
      
      setSetupMode(true);
      toast.success("Scan the QR code with your authenticator app");
    } catch (error: any) {
      console.error('Error generating MFA secret:', error);
      toast.error(error.message || "Failed to generate MFA secret");
    } finally {
      setLoading(false);
    }
  };

  const enableMFA = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-enable', {
        body: { code: verificationCode }
      });

      if (error) throw error;

      setBackupCodes(data.backupCodes);
      setShowBackupCodes(true);
      setMfaEnabled(true);
      setSetupMode(false);
      toast.success("Two-factor authentication enabled successfully!");
    } catch (error: any) {
      console.error('Error enabling MFA:', error);
      toast.error(error.message || "Failed to enable MFA. Please check your code.");
    } finally {
      setLoading(false);
    }
  };

  const disableMFA = async () => {
    if (!password) {
      toast.error("Please enter your password to confirm");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('mfa-disable', {
        body: { password }
      });

      if (error) throw error;

      setMfaEnabled(false);
      setPassword("");
      toast.success("Two-factor authentication disabled");
    } catch (error: any) {
      console.error('Error disabling MFA:', error);
      toast.error(error.message || "Failed to disable MFA");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !setupMode) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (showBackupCodes) {
    return <BackupCodesDisplay codes={backupCodes} onClose={() => setShowBackupCodes(false)} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </div>
          <MFAStatusBadge enabled={mfaEnabled} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!mfaEnabled && !setupMode && (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is not enabled. Enable it to protect your account.
              </AlertDescription>
            </Alert>
            <Button onClick={generateSecret} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enable Two-Factor Authentication
            </Button>
          </>
        )}

        {setupMode && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Step 1: Scan QR Code</Label>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scan this with Google Authenticator, Authy, or any TOTP app
              </p>
            </div>

            <div className="space-y-2">
              <Label>Manual Entry Key (Alternative)</Label>
              <Input value={secret} readOnly className="font-mono text-sm" />
            </div>

            <div className="space-y-2">
              <Label>Step 2: Enter Verification Code</Label>
              <div className="flex justify-center">
                <InputOTP
                  value={verificationCode}
                  onChange={setVerificationCode}
                  maxLength={6}
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
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setSetupMode(false);
                  setVerificationCode("");
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={enableMFA}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Enable
              </Button>
            </div>
          </div>
        )}

        {mfaEnabled && (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is active. Your account is protected.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="password">Enter Password to Disable MFA</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <Button
              onClick={disableMFA}
              disabled={loading || !password}
              variant="destructive"
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable Two-Factor Authentication
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
