import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { BackupCodesDisplay } from "./BackupCodesDisplay";
import { MFAStatusBadge } from "./MFAStatusBadge";
import { Shield, QrCode, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import QRCodeLib from "qrcode";

export function MFASetup() {
  const { user, profile } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaPending, setMfaPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [password, setPassword] = useState("");
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check ALL providers for the user
    const providers = profile?.auth_providers || [];
    const hasGoogle = providers.includes('google');
    const hasLocal = providers.includes('email');
    
    setIsGoogleUser(hasGoogle && !hasLocal); // Only Google, no local auth
    
    if (hasLocal) {
      // Has email/password auth - check MFA status
      checkMFAStatus();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const checkMFAStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('mfa_settings' as any)
        .select('totp_enabled, totp_secret, pending_mfa_secret')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking MFA status:', error);
      }
      
      // STRICT three-state detection:
      // 1. totp_enabled = true → ENABLED
      // 2. pending_mfa_secret exists → PENDING (setup in progress)
      // 3. Neither → DISABLED (never configured or cancelled)
      
      const enabled = (data as any)?.totp_enabled === true; // STRICT
      const hasPendingSecret = !!(data as any)?.pending_mfa_secret;
      
      console.log('[MFA] checkMFAStatus - Raw DB data:', {
        totp_enabled: (data as any)?.totp_enabled,
        has_totp_secret: !!(data as any)?.totp_secret,
        has_pending_secret: hasPendingSecret,
        computed_enabled: enabled,
        computed_pending: !enabled && hasPendingSecret,
      });
      
      setMfaEnabled(enabled);
      setMfaPending(!enabled && hasPendingSecret); // Pending only if secret but not enabled
      
      // Clear stale QR state if DB shows neither enabled nor pending
      if (!enabled && !hasPendingSecret) {
        setQrCodeUrl('');
        setSecret('');
        setVerificationCode('');
        console.log('[MFA] Cleared stale QR state (DB shows not pending)');
      }
      
      console.log('[MFA] Final UI state:', { enabled, pending: !enabled && hasPendingSecret, hasQR: !!qrCodeUrl });
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSecret = async () => {
    console.log('[MFA] Starting MFA setup...');
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-generate-secret');

      if (error) {
        const statusCode = (error as any)?.status || (error as any)?.statusCode;
        console.error('[MFA] Error generating secret:', { error, statusCode });
        throw new Error(statusCode === 500 ? 'Security service unavailable. Please try again.' : (error as any)?.message || 'Failed to generate MFA secret');
      }

      console.log('[MFA] Secret generated successfully');
      setSecret(data.secret);
      const qrDataUrl = await QRCodeLib.toDataURL(data.qrCodeUrl);
      setQrCodeUrl(qrDataUrl);
      
      // QR screen shows immediately - no intermediate screen
      toast.success('Scan the QR code with your authenticator app');
    } catch (error: any) {
      console.error('[MFA] Error in generateSecret:', error);
      setError(error.message || 'Failed to generate MFA secret');
      toast.error(error.message || 'Failed to generate MFA secret');
    } finally {
      setLoading(false);
    }
  };

  const enableMFA = async () => {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    console.log('[MFA] Attempting to verify code and enable MFA...');
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-enable', {
        body: { code: verificationCode }
      });

      if (error) {
        const statusCode = (error as any)?.status || (error as any)?.statusCode;
        const errorCode = (error as any)?.code || data?.code;
        const errorMessage = data?.error || error.message;
        
        console.error('[MFA] Verification failed:', { error, statusCode, errorCode, errorMessage });
        
        if (errorCode === 'MFA_VERIFY_LOCKED') {
          throw new Error('Too many incorrect codes. Please try again in 24 hours.');
        } else if (errorCode === 'MFA_VERIFY_INVALID') {
          throw new Error('The verification code is incorrect or expired.');
        } else if (statusCode === 404) {
          throw new Error('MFA service temporarily unavailable. Please try again.');
        } else if (statusCode === 401) {
          throw new Error('Authentication failed. Please sign in again.');
        } else {
          throw new Error(errorMessage || 'Failed to enable MFA. Please try again.');
        }
      }

      console.log('[MFA] Verification SUCCESS - MFA enabled in database by backend');
      
      // Show backup codes to user (they MUST save these)
      setBackupCodes(data.backupCodes);
      setShowBackupCodes(true);
      
      // Clear QR setup state
      setQrCodeUrl("");
      setSecret("");
      setVerificationCode("");
      
      // CRITICAL: Database is the ONLY source of truth
      // Do NOT set mfaEnabled(true) here - let DB state control it
      // Only checkMFAStatus() can update mfaEnabled based on totp_enabled from DB
      console.log('[MFA] Refetching status from DB after successful enable...');
      await checkMFAStatus();
      
      toast.success("Two-factor authentication enabled successfully!");
    } catch (error: any) {
      console.error('[MFA] Error enabling MFA:', error);
      setError(error.message || "Failed to enable MFA. Please check your code.");
      toast.error(error.message || "Failed to enable MFA. Please check your code.");
    } finally {
      setLoading(false);
    }
  };

  const disableMFA = async () => {
    if (!password) {
      setError("Please enter your password to confirm");
      return;
    }

    console.log('[MFA] Attempting to disable MFA...');
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.functions.invoke('mfa-disable', {
        body: { password }
      });

      if (error) throw error;

      console.log('[MFA] Disable successful, clearing local state');
      
      // Clear local state immediately
      setPassword("");
      
      // CRITICAL: Refetch DB state to update UI
      // Do NOT set mfaEnabled(false) manually - let DB control it
      console.log('[MFA] Refetching status from DB after disable...');
      await checkMFAStatus();
      
      toast.success("Two-factor authentication disabled");
    } catch (error: any) {
      console.error('[MFA] Error disabling MFA:', error);
      setError(error.message || "Failed to disable MFA");
      toast.error(error.message || "Failed to disable MFA");
    } finally {
      setLoading(false);
    }
  };

  // Handler for canceling MFA setup
  const handleCancelSetup = async () => {
    console.log('[MFA] Cancelling MFA setup...');
    setLoading(true);
    try {
      // Call backend to clean up pending secret
      await supabase.functions.invoke('mfa-cancel-setup');
      
      console.log('[MFA] Cancel successful, clearing frontend state');
      
      // Clear frontend state
      setQrCodeUrl("");
      setSecret("");
      setVerificationCode("");
      setError(null);
      
      // Refetch DB status to ensure UI matches DB
      console.log('[MFA] Refetching status after cancel...');
      await checkMFAStatus();
      
      toast.success('MFA setup cancelled');
    } catch (error) {
      console.error('[MFA] Error cancelling setup:', error);
      toast.error('Failed to cancel setup');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !qrCodeUrl) {
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

  // Show Google 2FA instructions ONLY for Google-only users (no email/password auth)
  if (isGoogleUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Secure your account with Google's 2-Step Verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You're signed in with Google. For the best security, enable 2-Step Verification on your Google Account.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">How to enable Google 2-Step Verification:</h4>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Go to your Google Account security settings</li>
                <li>Navigate to Security → 2-Step Verification</li>
                <li>Follow Google's setup wizard to enable 2FA</li>
                <li>Choose your preferred method (phone, authenticator app, or security key)</li>
                <li>Save your backup codes in a safe place</li>
              </ol>
            </div>

            <Alert variant="default" className="bg-muted">
              <AlertDescription className="text-sm">
                Once enabled, you'll be prompted for 2-Step Verification every time you sign in to Google, protecting this app and all your Google services.
              </AlertDescription>
            </Alert>

            <Button 
              className="w-full" 
              onClick={() => window.open('https://myaccount.google.com/signinoptions/two-step-verification', '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Enable Google 2-Step Verification
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show app-level TOTP setup for password-based users
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
          <MFAStatusBadge enabled={mfaEnabled} pending={mfaPending} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!mfaEnabled && !qrCodeUrl && !mfaPending && (
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

        {mfaPending && !qrCodeUrl && (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You started setting up 2FA but didn't complete it. Click below to continue.
              </AlertDescription>
            </Alert>
            <Button onClick={generateSecret} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue 2FA Setup
            </Button>
          </>
        )}

        {qrCodeUrl && (
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
                onClick={handleCancelSetup}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Cancel Setup
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
