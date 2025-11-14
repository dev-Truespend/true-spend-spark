import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Shield, Clock, AlertTriangle, Mail, Key, LogOut, Edit2, Check, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MFAStatusBadge } from "./MFAStatusBadge";
import { PasswordChangeDialog } from "./PasswordChangeDialog";
import { EmailChangeDialog } from "./EmailChangeDialog";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface SecurityLog {
  id: string;
  event_type: string;
  severity: string;
  created_at: string;
  details: any;
}

interface LoginAttempt {
  id: string;
  success: boolean;
  created_at: string;
  ip_address: string;
  metadata: any;
}

export function UserProfileDropdown() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  
  // Edit states
  const [editingFirstName, setEditingFirstName] = useState(false);
  const [editingLastName, setEditingLastName] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
    }
  }, [profile]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: mfaData } = await supabase
        .from('mfa_settings' as any)
        .select('totp_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setMfaEnabled((mfaData as any)?.totp_enabled || false);

      const { data: logs } = await supabase
        .from('security_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setSecurityLogs(logs || []);

      const { data: attempts } = await supabase
        .from('auth_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setLoginHistory(attempts || []);
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (field: 'first_name' | 'last_name', value: string) => {
    if (!user) return;

    setSaving(true);
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
        description: `Your ${field.replace('_', ' ')} has been updated.`,
      });

      if (field === 'first_name') setEditingFirstName(false);
      if (field === 'last_name') setEditingLastName(false);

      await fetchData();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Could not update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'destructive';
      case 'warn': return 'default';
      default: return 'secondary';
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!user || !profile) return null;

  const getInitials = () => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    
    if (profile.full_name) {
      const names = profile.full_name.trim().split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    
    if (profile.email) {
      return profile.email[0].toUpperCase();
    }
    
    return 'U';
  };

  const initials = getInitials();
  const displayName = profile.first_name && profile.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : profile.full_name || profile.email;

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
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
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{displayName}</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <Badge variant={profile.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                    {profile.status}
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
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <div className="flex gap-2">
                      <Input value={profile.email} disabled className="bg-muted" />
                      <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(true)}>
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">First Name</Label>
                    <div className="flex gap-2">
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={!editingFirstName || saving}
                        placeholder="Add your first name"
                      />
                      {editingFirstName ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleSaveField('first_name', firstName)} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setFirstName(profile.first_name || ""); setEditingFirstName(false); }} disabled={saving}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setEditingFirstName(true)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Last Name</Label>
                    <div className="flex gap-2">
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={!editingLastName || saving}
                        placeholder="Add your last name"
                      />
                      {editingLastName ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleSaveField('last_name', lastName)} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setLastName(profile.last_name || ""); setEditingLastName(false); }} disabled={saving}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setEditingLastName(true)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4" />
                    Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Two-Factor Authentication</span>
                    <MFAStatusBadge enabled={mfaEnabled} />
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setShowPasswordDialog(true)}>
                    <Key className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Login Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4" />
                    Recent Login Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : loginHistory.length > 0 ? (
                    <div className="space-y-2">
                      {loginHistory.map((attempt) => (
                        <div key={attempt.id} className="flex items-start gap-2 text-xs">
                          <div className={`mt-0.5 h-2 w-2 rounded-full ${attempt.success ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">
                              {attempt.success ? 'Successful login' : 'Failed login attempt'}
                            </p>
                            <p className="text-muted-foreground">
                              {formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  )}
                </CardContent>
              </Card>

              {/* Security Events */}
              {securityLogs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-4 w-4" />
                      Security Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {securityLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2 text-xs">
                          <Badge variant={getSeverityColor(log.severity) as any} className="mt-0.5">
                            {log.severity}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{getEventTypeLabel(log.event_type)}</p>
                            <p className="text-muted-foreground">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sign Out */}
              <Button variant="destructive" className="w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <PasswordChangeDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog} />
      <EmailChangeDialog open={showEmailDialog} onOpenChange={setShowEmailDialog} />
    </>
  );
}
