/**
 * Phase 10: Observability - SLO Dashboard Component
 * Displays Service Level Objectives and compliance tracking
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckCircle, TrendingUp, Target, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface SLI {
  name: string;
  type: string;
  current_value: number;
  target_value: number;
  measurement_window: string;
}

interface SLOCompliance {
  slo_name: string;
  compliance_percentage: number;
  breached: boolean;
}

interface SLO {
  id: string;
  slo_name: string;
  description: string;
  indicator_type: string;
  target_percentage: number;
  warning_threshold: number;
  measurement_window: string;
  priority: string;
  active: boolean;
}

interface ComplianceHistory {
  timestamp: string;
  compliance_percentage: number;
  actual_value: number;
  breached: boolean;
}

export function SLODashboard() {
  const [slis, setSLIs] = useState<SLI[]>([]);
  const [compliance, setCompliance] = useState<SLOCompliance[]>([]);
  const [slos, setSLOs] = useState<SLO[]>([]);
  const [selectedSLO, setSelectedSLO] = useState<string | null>(null);
  const [history, setHistory] = useState<ComplianceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState('1h');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Refresh every minute

    // Set up real-time subscription
    const channel = supabase
      .channel('slo_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'slo_compliance_history' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [timeWindow]);

  useEffect(() => {
    if (selectedSLO) {
      loadHistory(selectedSLO);
    }
  }, [selectedSLO]);

  const loadData = async () => {
    try {
      // Load SLIs
      const { data: sliData, error: sliError } = await supabase.functions.invoke('slo-manager', {
        body: { action: 'calculate_slis', time_window: timeWindow },
      });

      if (sliError) throw sliError;
      setSLIs(sliData.slis || []);

      // Load SLO compliance
      const { data: complianceData, error: complianceError } = await supabase.functions.invoke('slo-manager', {
        body: { action: 'check_slos', time_window: timeWindow },
      });

      if (complianceError) throw complianceError;
      setCompliance(complianceData.compliance || []);

      // Load configured SLOs
      const { data: sloData, error: sloError } = await supabase.functions.invoke('slo-manager', {
        body: { action: 'get_all_slos' },
      });

      if (sloError) throw sloError;
      setSLOs(sloData.slos || []);

      if (sloData.slos && sloData.slos.length > 0 && !selectedSLO) {
        setSelectedSLO(sloData.slos[0].slo_name);
      }
    } catch (error) {
      console.error('Error loading SLO data:', error);
      toast.error('Failed to load SLO data');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (sloName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('slo-manager', {
        body: { action: 'get_slo_history', slo_name: sloName, days: 7 },
      });

      if (error) throw error;
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error loading SLO history:', error);
    }
  };

  const getComplianceStatus = (compliance: number) => {
    if (compliance >= 99.9) return { color: 'default', icon: CheckCircle, text: 'Excellent' };
    if (compliance >= 99) return { color: 'default', icon: CheckCircle, text: 'Good' };
    if (compliance >= 95) return { color: 'secondary', icon: AlertTriangle, text: 'Warning' };
    return { color: 'destructive', icon: AlertTriangle, text: 'Breached' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const overallCompliance = compliance.length > 0
    ? compliance.reduce((sum, c) => sum + c.compliance_percentage, 0) / compliance.length
    : 100;

  const breachedSLOs = compliance.filter(c => c.breached).length;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallCompliance.toFixed(2)}%</div>
            <Progress value={overallCompliance} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active SLOs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{slos.length}</div>
            <p className="text-xs text-muted-foreground">Monitoring {slis.length} indicators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Breached SLOs</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${breachedSLOs > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${breachedSLOs > 0 ? 'text-destructive' : ''}`}>
              {breachedSLOs}
            </div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Window</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeWindow}</div>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="mt-2 text-xs border rounded px-2 py-1"
            >
              <option value="15m">15 minutes</option>
              <option value="1h">1 hour</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
            </select>
          </CardContent>
        </Card>
      </div>

      {/* SLO Details */}
      <Card>
        <CardHeader>
          <CardTitle>Service Level Objectives</CardTitle>
          <CardDescription>Real-time SLO compliance monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedSLO || undefined} onValueChange={setSelectedSLO}>
            <TabsList className="grid w-full grid-cols-4">
              {slos.map(slo => (
                <TabsTrigger key={slo.id} value={slo.slo_name}>
                  {slo.slo_name}
                </TabsTrigger>
              ))}
            </TabsList>

            {slos.map(slo => {
              const sloCompliance = compliance.find(c => c.slo_name === slo.slo_name);
              const status = sloCompliance ? getComplianceStatus(sloCompliance.compliance_percentage) : null;
              const StatusIcon = status?.icon;

              return (
                <TabsContent key={slo.id} value={slo.slo_name} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{slo.slo_name}</h3>
                      <p className="text-sm text-muted-foreground">{slo.description}</p>
                    </div>
                    {status && StatusIcon && (
                      <Badge variant={status.color as any}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.text}
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Current Compliance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {sloCompliance?.compliance_percentage.toFixed(2) || 'N/A'}%
                        </div>
                        <Progress 
                          value={sloCompliance?.compliance_percentage || 0} 
                          className="mt-2" 
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Target</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{slo.target_percentage}%</div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Warning at {slo.warning_threshold}%
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Priority</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline" className="text-lg">
                          {slo.priority}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                          Window: {slo.measurement_window}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Historical Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>7-Day Compliance History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString()}
                          />
                          <YAxis domain={[90, 100]} />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleString()}
                            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Compliance']}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="compliance_percentage" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            name="Compliance %"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
