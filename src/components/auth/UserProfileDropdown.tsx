import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Shield, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MFAStatusBadge } from "./MFAStatusBadge";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [open, setOpen] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch MFA status
      const { data: mfaData } = await supabase
        .from('mfa_settings' as any)
        .select('totp_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setMfaEnabled((mfaData as any)?.totp_enabled || false);

      // Fetch recent security logs
      const { data: logs } = await supabase
        .from('security_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setSecurityLogs(logs || []);

      // Fetch recent login attempts
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
    
    // Fallback to full_name
    if (profile.full_name) {
      const names = profile.full_name.trim().split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    
    // Fallback to email
    if (profile.email) {
      return profile.email[0].toUpperCase();
    }
    
    return 'U';
  };

  const initials = getInitials();

  return (
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
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Profile</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          <div className="space-y-6 py-4">
            {/* Account Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4" />
                Account Details
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{profile.first_name} {profile.last_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Status</p>
                  <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>
                    {profile.status}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* MFA Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Shield className="h-4 w-4" />
                Security
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Two-Factor Authentication</span>
                <MFAStatusBadge enabled={mfaEnabled} />
              </div>
              <Button 
                variant="outline" 
                className="w-full justify-between" 
                onClick={() => {
                  setOpen(false);
                  window.location.href = '/settings';
                }}
              >
                Manage Security Settings
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Separator />

            {/* Recent Login History */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4" />
                Recent Login Activity
              </div>
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
            </div>

            <Separator />

            {/* Security Events */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Security Events
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : securityLogs.length > 0 ? (
                <div className="space-y-2">
                  {securityLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-xs">
                      <Badge variant={getSeverityColor(log.severity) as any} className="mt-0.5 text-xs">
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
              ) : (
                <p className="text-sm text-muted-foreground">No security events</p>
              )}
            </div>

            <Separator />

            <Button variant="outline" className="w-full" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
