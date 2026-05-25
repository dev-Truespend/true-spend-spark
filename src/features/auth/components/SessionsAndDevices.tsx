import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Smartphone, Monitor, Tablet, MapPin, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { format } from "date-fns";

interface Session {
  id: string;
  ip_address: string;
  created_at: string;
  success: boolean;
  metadata: any;
}

export function SessionsAndDevices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('auth_attempts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('success', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load session history"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (userAgent: string = '') => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const getDeviceInfo = (metadata: Session['metadata']) => {
    if (!metadata.user_agent) return 'Unknown Device';
    
    const parts = [];
    if (metadata.browser) parts.push(metadata.browser);
    if (metadata.os) parts.push(metadata.os);
    if (metadata.device_type) parts.push(metadata.device_type);
    
    return parts.length > 0 ? parts.join(' • ') : 'Unknown Device';
  };

  const isCurrentSession = (session: Session) => {
    // Consider session as current if it's within last 5 minutes
    const sessionTime = new Date(session.created_at).getTime();
    const now = Date.now();
    return now - sessionTime < 5 * 60 * 1000;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessions & Devices</CardTitle>
          <CardDescription>Loading session history...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions & Devices</CardTitle>
        <CardDescription>
          View your recent login activity and manage active sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent sessions found</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="mt-1 text-muted-foreground">
                {getDeviceIcon(session.metadata?.user_agent)}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-foreground">
                    {getDeviceInfo(session.metadata)}
                  </div>
                  {isCurrentSession(session) && (
                    <Badge variant="default" className="text-xs">
                      Current Session
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{session.ip_address}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(session.created_at), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                </div>
                
                {session.metadata?.user_agent && (
                  <div className="text-xs text-muted-foreground truncate max-w-md">
                    {session.metadata.user_agent}
                  </div>
                )}
              </div>
              
              {!isCurrentSession(session) && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  className="text-muted-foreground"
                >
                  Revoke
                </Button>
              )}
            </div>
          ))
        )}
        
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Session revocation coming soon. If you notice suspicious activity, please change your password immediately.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
