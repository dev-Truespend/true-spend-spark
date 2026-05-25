import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Shield, AlertTriangle, Lock, Activity, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/features/auth/hooks/useUserRole";
import { useToast } from "@/shared/hooks/use-toast";

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
  attempt_type: string;
  success: boolean;
  ip_address: string;
  metadata: any;
  created_at: string;
}

interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'rls' | 'auth' | 'api' | 'data' | 'csp';
  title: string;
  description: string;
  remediation: string;
  auto_fix_available: boolean;
}

interface SecurityAuditResult {
  score: number;
  findings: SecurityFinding[];
  recommendations: string[];
  last_scan: string;
  category_scores: {
    rls: number;
    auth: number;
    api: number;
    data: number;
    csp: number;
  };
}

export default function SecurityDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [authAttempts, setAuthAttempts] = useState<AuthAttempt[]>([]);
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

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

  const runSecurityAudit = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-audit', {
        body: { action: 'scan' }
      });

      if (error) throw error;

      setAuditResult(data);
      toast({
        title: "Security audit complete",
        description: `Security score: ${data.score}/100`,
      });
    } catch (error) {
      console.error('Security audit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Audit failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreStatus = (score: number) => {
    if (score >= 85) return { icon: CheckCircle2, text: "Excellent", color: "text-green-600" };
    if (score >= 70) return { icon: AlertTriangle, text: "Good", color: "text-yellow-600" };
    return { icon: XCircle, text: "Needs Attention", color: "text-red-600" };
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
          <p className="text-muted-foreground">Comprehensive security audit and monitoring</p>
        </div>
        <Button onClick={runSecurityAudit} disabled={scanning}>
          <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'Run Security Audit'}
        </Button>
      </div>

      {/* Security Score Card */}
      {auditResult && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Security Score</span>
              <div className="flex items-center gap-2">
                {(() => {
                  const status = getScoreStatus(auditResult.score);
                  const Icon = status.icon;
                  return (
                    <>
                      <Icon className={`h-5 w-5 ${status.color}`} />
                      <span className={`text-3xl font-bold ${getScoreColor(auditResult.score)}`}>
                        {auditResult.score}/100
                      </span>
                    </>
                  );
                })()}
              </div>
            </CardTitle>
            <CardDescription>
              Last scan: {new Date(auditResult.last_scan).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category Scores */}
            <div className="space-y-3">
              <h3 className="font-semibold">Category Breakdown</h3>
              {Object.entries(auditResult.category_scores).map(([category, score]) => (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{category} Security</span>
                    <span className={getScoreColor(score)}>{score}%</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {auditResult.recommendations.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Recommendations</h3>
                {auditResult.recommendations.map((rec, idx) => (
                  <Alert key={idx}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{rec}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Findings */}
      {auditResult && auditResult.findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Security Findings</CardTitle>
            <CardDescription>
              {auditResult.findings.length} issues detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditResult.findings.map((finding) => (
                <Card key={finding.id} className={
                  finding.severity === 'critical' ? 'border-red-500' :
                  finding.severity === 'high' ? 'border-orange-500' :
                  finding.severity === 'medium' ? 'border-yellow-500' : ''
                }>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{finding.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            finding.severity === 'critical' ? 'destructive' :
                            finding.severity === 'high' ? 'destructive' :
                            'secondary'
                          }>
                            {finding.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {finding.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{finding.description}</p>
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm font-medium mb-1">Remediation:</p>
                      <p className="text-sm">{finding.remediation}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                const identifier = curr.metadata?.email || curr.metadata?.identifier || curr.ip_address;
                const count = authAttempts.filter(a => {
                  const aIdentifier = a.metadata?.email || a.metadata?.identifier || a.ip_address;
                  return aIdentifier === identifier;
                }).length;
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
                          <TableCell className="font-medium">
                            {attempt.metadata?.email || attempt.metadata?.identifier || 'N/A'}
                          </TableCell>
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
