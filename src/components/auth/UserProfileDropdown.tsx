import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Shield, Mail, Key, LogOut, Edit2, Check, X, ExternalLink, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MFAStatusBadge } from "./MFAStatusBadge";
import { PasswordChangeDialog } from "./PasswordChangeDialog";
import { EmailChangeDialog } from "./EmailChangeDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertTriangle } from "lucide-react";
import QRCodeLib from "qrcode";

export function UserProfileDropdown() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaDisablePassword, setMfaDisablePassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [mfaSetupInProgress, setMfaSetupInProgress] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Edit states - null means not editing, string means editing with that value
  const [editingFirstName, setEditingFirstName] = useState<string | null>(null);
  const [editingLastName, setEditingLastName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch profile with all auth providers
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
      }

      if (profileData) {
        // Get all auth providers for this user
        const { data: identities } = await supabase
          .from('auth_identities')
          .select('provider')
          .eq('user_id', user.id);
        
        const providers = identities?.map(i => i.provider) || [];
        
        setProfile({
          ...profileData,
          auth_providers: providers // Add all providers
        });
      } else if (user) {
        // Fallback to auth user data if profile doesn't exist yet
        setProfile({
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || user.user_metadata?.given_name || null,
          last_name: user.user_metadata?.last_name || user.user_metadata?.family_name || null,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          auth_provider: user.app_metadata?.provider || 'email',
          status: 'active'
        });

        // Retry after 1 second in case profile is being created by trigger
        setTimeout(() => fetchData(), 1000);
      }

      // Fetch MFA status - if row exists, MFA is enabled
      const { data: mfaData } = await supabase
        .from('mfa_settings' as any)
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      setMfaEnabled(!!mfaData);
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    }
  };

  const handleSaveField = async (field: 'first_name' | 'last_name', value: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          [field]: value.trim() || null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: `Your ${field.replace('_', ' ')} has been updated successfully.`,
      });

      // Reset editing state and refresh data
      if (field === 'first_name') setEditingFirstName(null);
      if (field === 'last_name') setEditingLastName(null);
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Could not update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!mfaDisablePassword) {
      toast({
        title: "Password Required",
        description: "Please enter your password to disable MFA.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('mfa-disable', {
        body: { password: mfaDisablePassword }
      });

      if (error) throw error;

      setMfaEnabled(false);
      setMfaDisablePassword("");
      toast({
        title: "MFA Disabled",
        description: "Two-factor authentication has been disabled.",
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Failed to Disable MFA",
        description: error.message || "Could not disable MFA. Please check your password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartMfaSetup = async () => {
    setLoading(true);
    setMfaError(null);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-generate-secret');

      if (error) {
        const statusCode = (error as any)?.status || 500;
        console.error('Error generating MFA secret:', { error, statusCode });
        throw new Error(
          statusCode === 500 
            ? 'Security service unavailable. Please try again.' 
            : 'Failed to generate MFA secret'
        );
      }

      setMfaSecret(data.secret);
      const qrDataUrl = await QRCodeLib.toDataURL(data.qrCodeUrl);
      setQrCodeUrl(qrDataUrl);
      setMfaSetupInProgress(true);
      
      toast({ title: "Success", description: "Scan the QR code with your authenticator app" });
    } catch (error: any) {
      console.error('Error starting MFA setup:', error);
      setMfaError(error.message || 'Failed to start MFA setup');
      toast({ title: "Error", description: error.message || 'Failed to start MFA setup', variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      setMfaError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    setMfaError(null);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-enable', {
        body: { code: verificationCode }
      });

      if (error) {
        const errorCode = (error as any)?.code || data?.code;
        const errorMessage = data?.error || error.message;
        
        if (errorCode === 'MFA_VERIFY_LOCKED') {
          throw new Error('Too many incorrect codes. Please try again in 24 hours.');
        } else if (errorCode === 'MFA_VERIFY_INVALID') {
          throw new Error('The verification code is incorrect or expired.');
        } else {
          throw new Error(errorMessage || 'Failed to enable MFA. Please try again.');
        }
      }

      toast({ 
        title: "Success!", 
        description: "Two-factor authentication enabled successfully" 
      });
      
      // Reset state
      setMfaSetupInProgress(false);
      setQrCodeUrl("");
      setMfaSecret("");
      setVerificationCode("");
      
      // Refresh data to show new MFA status
      await fetchData();
      
      // Log backup codes for user to save
      if (data.backupCodes) {
        console.log('🔐 SAVE THESE BACKUP CODES:', data.backupCodes);
        toast({
          title: "Backup Codes Generated",
          description: "Check the console for your backup codes. Save them in a secure location.",
          duration: 10000
        });
      }
      
    } catch (error: any) {
      console.error('Error enabling MFA:', error);
      setMfaError(error.message || "Failed to enable MFA. Please check your code.");
      toast({ 
        title: "Error", 
        description: error.message || "Invalid verification code", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMfaSetup = async () => {
    setQrCodeUrl("");
    setMfaSecret("");
    setVerificationCode("");
    setMfaError(null);
    setMfaSetupInProgress(false);
    
    // Refetch to ensure DB reflects reality
    await fetchData();
  };

  if (!user || !profile) {
    return null;
  }

  const getInitials = () => {
    const first = profile.first_name?.[0] || '';
    const last = profile.last_name?.[0] || '';
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  };

  const getDisplayName = () => {
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return 'User';
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Profile & Settings</SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
            <div className="space-y-6 py-4">
              {/* Profile Header */}
              <div className="flex flex-col items-center space-y-3">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl bg-primary/10">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{getDisplayName()}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <Badge variant="secondary" className="mt-2">
                    {profile.auth_provider === 'google' ? 'Google Account' : 'Email Account'}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <div className="flex gap-2">
                      <Input value={user.email || ''} disabled className="flex-1" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEmailDialog(true)}
                        disabled={profile.auth_provider === 'google'}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                    {profile.auth_provider === 'google' && (
                      <p className="text-xs text-muted-foreground">Email managed by Google</p>
                    )}
                  </div>

                  {/* First Name */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">First Name</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editingFirstName !== null ? editingFirstName : (profile.first_name || '')}
                        onChange={(e) => setEditingFirstName(e.target.value)}
                        disabled={editingFirstName === null}
                        placeholder="Enter first name"
                        className="flex-1"
                      />
                      {editingFirstName === null ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingFirstName(profile.first_name || '')}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveField('first_name', editingFirstName)}
                            disabled={loading}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingFirstName(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Last Name */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Last Name</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editingLastName !== null ? editingLastName : (profile.last_name || '')}
                        onChange={(e) => setEditingLastName(e.target.value)}
                        disabled={editingLastName === null}
                        placeholder="Enter last name"
                        className="flex-1"
                      />
                      {editingLastName === null ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingLastName(profile.last_name || '')}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveField('last_name', editingLastName)}
                            disabled={loading}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingLastName(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Change Password */}
                  {profile.auth_provider === 'email' && (
                    <div className="space-y-2 pt-2 border-t">
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => setShowPasswordDialog(true)}
                      >
                        <Key className="mr-2 h-4 w-4" />
                        Change Password
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Two-Factor Authentication */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4" />
                    Two-Factor Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    // Check if user has multiple providers
                    const providers = profile.auth_providers || [];
                    const hasGoogle = providers.includes('google');
                    const hasLocal = providers.includes('email');
                    const isGoogleOnly = hasGoogle && !hasLocal;
                    
                    if (isGoogleOnly) {
                      // Google-only user: show Google 2FA instructions
                      return (
                        <>
                          <Alert>
                            <Shield className="h-4 w-4" />
                            <AlertDescription>
                              You sign in with Google. To protect your account with MFA, please enable 2-Step Verification in your Google Account security settings.
                            </AlertDescription>
                          </Alert>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => window.open('https://myaccount.google.com/signinoptions/two-step-verification', '_blank')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Enable Google 2-Step Verification
                          </Button>
                        </>
                      );
                    }
                    
                    // User has local provider (with or without Google)
                    return (
                      <>
                        {hasGoogle && (
                          <Alert className="mb-4">
                            <Shield className="h-4 w-4" />
                            <AlertDescription>
                              You have both Google and email/password sign-in. The 2FA below applies to email/password login only. 
                              Manage Google 2-Step Verification separately in your Google Account settings.
                            </AlertDescription>
                          </Alert>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Status</span>
                          <MFAStatusBadge enabled={mfaEnabled} />
                        </div>
                        
                        {!mfaEnabled ? (
                          <>
                            {!mfaSetupInProgress ? (
                              <Button 
                                type="button"
                                variant="default" 
                                className="w-full"
                                onClick={handleStartMfaSetup}
                                disabled={loading}
                              >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                Enable Two-Factor Authentication
                              </Button>
                            ) : (
                              <div className="space-y-4 pt-2">
                                {/* QR Code Display */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Step 1: Scan QR Code</Label>
                                  <div className="flex justify-center p-4 bg-background rounded-lg border">
                                    {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />}
                                  </div>
                                  <p className="text-xs text-muted-foreground text-center">
                                    Scan with Google Authenticator, Authy, or any TOTP app
                                  </p>
                                </div>

                                {/* Manual Key */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Manual Entry Key</Label>
                                  <Input value={mfaSecret} readOnly className="font-mono text-sm" />
                                  <p className="text-xs text-muted-foreground">
                                    Enter this key manually if you can't scan the QR code
                                  </p>
                                </div>

                                {/* Verification Input */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Step 2: Enter Verification Code</Label>
                                  <div className="flex justify-center">
                                    <InputOTP value={verificationCode} onChange={setVerificationCode} maxLength={6}>
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
                                  <p className="text-xs text-muted-foreground text-center">
                                    Enter the 6-digit code from your authenticator app
                                  </p>
                                </div>

                                {/* Error Display */}
                                {mfaError && (
                                  <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>{mfaError}</AlertDescription>
                                  </Alert>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={handleCancelMfaSetup}
                                    disabled={loading}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    className="flex-1"
                                    onClick={handleVerifyAndEnable}
                                    disabled={loading || verificationCode.length !== 6}
                                  >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Verify & Enable
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="space-y-3 pt-2 border-t">
                            <Label htmlFor="mfa-disable-password" className="text-sm text-muted-foreground">
                              Enter password to disable MFA
                            </Label>
                            <Input
                              id="mfa-disable-password"
                              type="password"
                              value={mfaDisablePassword}
                              onChange={(e) => setMfaDisablePassword(e.target.value)}
                              placeholder="Enter your password"
                            />
                            <Button
                              variant="destructive"
                              className="w-full"
                              onClick={handleDisableMFA}
                              disabled={!mfaDisablePassword || loading}
                            >
                              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Disable Two-Factor Authentication
                            </Button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Sign Out Button */}
              <Button variant="destructive" className="w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <PasswordChangeDialog 
        open={showPasswordDialog} 
        onOpenChange={setShowPasswordDialog}
      />
      
      <EmailChangeDialog 
        open={showEmailDialog} 
        onOpenChange={setShowEmailDialog}
      />
    </>
  );
}
