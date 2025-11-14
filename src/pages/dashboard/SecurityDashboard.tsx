import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, AlertTriangle, Lock, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

interface SecurityLog {
  id: string;
  user_id: string;
  event_type: string;
  severity: 'info' | 'warn' | 'error';
  ip_address: string;
  user_agent: string;
  created_at: string;
  details: any;
}

interface AuthAttempt {
  id: string;
  user_id: string;
  identifier: string;
  success: boolean;
  ip_address: string;
  created_at: string;
}

export default function SecurityDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [authAttempts, setAuthAttempts] = useState<AuthAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user || !isAdmin) {
        navigate('/dashboard');
      }
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchSecurityData();
    }
  }, [isAdmin]);

  const fetchSecurityData = async () => {
    setLoading(true);
    
    // Fetch security logs
    const { data: logs } = await supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logs) setSecurityLogs(logs as SecurityLog[]);

    // Fetch failed auth attempts
    const { data: attempts } = await supabase
      .from('auth_attempts')
      .select('*')
      .eq('success', false)
      .order('created_at', { ascending: false })
      .limit(100);

    if (attempts) setAuthAttempts(attempts as AuthAttempt[]);

    setLoading(false);
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      info: "default",
      warn: "secondary",
      error: "destructive"
    };
    return <Badge variant={variants[severity] || "default"}>{severity}</Badge>;
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('login') || eventType.includes('auth')) return <Lock className="h-4 w-4" />;
    if (eventType.includes('password')) return <Shield className="h-4 w-4" />;
    if (eventType.includes('failed')) return <AlertTriangle className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  if (authLoading || roleLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">Monitor security events and authentication attempts</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityLogs.filter(log => 
                new Date(log.created_at) > new Date(Date.now() - 86400000)
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Attempts (24h)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {authAttempts.filter(attempt => 
                new Date(attempt.created_at) > new Date(Date.now() - 86400000)
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Password Changes (7d)</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityLogs.filter(log => 
                log.event_type === 'password_changed' &&
                new Date(log.created_at) > new Date(Date.now() - 604800000)
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Locks (7d)</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {authAttempts.filter(attempt => {
                const created = new Date(attempt.created_at);
                return created > new Date(Date.now() - 604800000);
              }).reduce((acc, curr) => {
                const identifier = curr.identifier;
                const count = authAttempts.filter(a => a.identifier === identifier).length;
                return count >= 5 ? acc + 1 : acc;
              }, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Security Logs</TabsTrigger>
          <TabsTrigger value="attempts">Failed Attempts</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Last 100 security-related events</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading security logs...</p>
              ) : securityLogs.length === 0 ? (
                <Alert>
                  <AlertDescription>No security events recorded yet.</AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {securityLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="flex items-center gap-2">
                            {getEventIcon(log.event_type)}
                            <span className="font-medium">{log.event_type.replace(/_/g, ' ')}</span>
                          </TableCell>
                          <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                          <TableCell className="font-mono text-sm">{log.ip_address || 'N/A'}</TableCell>
                          <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {JSON.stringify(log.details)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attempts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Failed Login Attempts</CardTitle>
              <CardDescription>Last 100 failed authentication attempts</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading failed attempts...</p>
              ) : authAttempts.length === 0 ? (
                <Alert>
                  <AlertDescription>No failed login attempts recorded.</AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email/Identifier</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {authAttempts.map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-medium">{attempt.identifier}</TableCell>
                          <TableCell className="font-mono text-sm">{attempt.ip_address}</TableCell>
                          <TableCell>{new Date(attempt.created_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">Failed</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
