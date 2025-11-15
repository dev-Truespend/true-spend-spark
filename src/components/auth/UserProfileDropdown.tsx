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
import { MFASetup } from "./MFASetup";

export function UserProfileDropdown() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaDisablePassword, setMfaDisablePassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);

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
                  {profile.auth_provider === 'google' ? (
                    <>
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          You're signed in with Google. Manage 2-Step Verification in your Google Account settings.
                        </AlertDescription>
                      </Alert>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open('https://myaccount.google.com/signinoptions/two-step-verification', '_blank')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Manage Google 2FA
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status</span>
                        <MFAStatusBadge enabled={mfaEnabled} />
                      </div>
                      
                      {!mfaEnabled ? (
                        showMfaSetup ? (
                          <div className="space-y-4">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setShowMfaSetup(false);
                                fetchData();
                              }}
                              className="mb-2"
                            >
                              ← Back
                            </Button>
                            <MFASetup />
                          </div>
                        ) : (
                          <Button 
                            variant="default" 
                            className="w-full"
                            onClick={() => setShowMfaSetup(true)}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Enable Two-Factor Authentication
                          </Button>
                        )
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
                  )}
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
