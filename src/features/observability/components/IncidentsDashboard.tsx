/**
 * Phase 10: Observability - Incidents Dashboard Component
 * Displays and manages system incidents with real-time monitoring
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  affected_services: string[];
  started_at: string;
  resolved_at: string | null;
  auto_detected: boolean;
  metadata: any;
}

interface Statistics {
  total: number;
  open: number;
  resolved: number;
  by_severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  auto_detected: number;
  avg_resolution_time: number;
}

export function IncidentsDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('open');

  useEffect(() => {
    loadIncidents();
    loadStatistics();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('incidents_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'incidents' },
        () => {
          loadIncidents();
          loadStatistics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadIncidents = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('incident-manager', {
        body: { action: 'list', limit: 100 },
      });

      if (error) throw error;
      setIncidents(data.incidents || []);
    } catch (error) {
      console.error('Error loading incidents:', error);
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('incident-manager', {
        body: { action: 'statistics', timeRange: '24h' },
      });

      if (error) throw error;
      setStatistics(data.statistics);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const resolveIncident = async (incidentId: string) => {
    try {
      const { error } = await supabase.functions.invoke('incident-manager', {
        body: { action: 'resolve', incident_id: incidentId },
      });

      if (error) throw error;
      
      // Acknowledge any related alerts
      await supabase
        .from('alert_history')
        .update({ 
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('incident_id', incidentId)
        .eq('status', 'sent');
      
      toast.success('Incident resolved successfully');
      loadIncidents();
      loadStatistics();
    } catch (error) {
      console.error('Error resolving incident:', error);
      toast.error('Failed to resolve incident');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive';
      case 'investigating':
        return 'default';
      case 'resolved':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return incident.status === 'open';
    if (activeTab === 'resolved') return incident.status === 'resolved';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            <Bell className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{statistics?.open || 0}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.avg_resolution_time || 0}m</div>
            <p className="text-xs text-muted-foreground">Average time to resolve</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Detected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.auto_detected || 0}</div>
            <p className="text-xs text-muted-foreground">Automatically detected issues</p>
          </CardContent>
        </Card>
      </div>

      {/* Incidents List */}
      <Card>
        <CardHeader>
          <CardTitle>System Incidents</CardTitle>
          <CardDescription>Monitor and manage system incidents</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-4">
              {filteredIncidents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No incidents found</p>
                </div>
              ) : (
                filteredIncidents.map(incident => (
                  <Card key={incident.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{incident.title}</CardTitle>
                            <Badge variant={getSeverityColor(incident.severity)}>
                              {incident.severity}
                            </Badge>
                            <Badge variant={getStatusColor(incident.status)}>
                              {incident.status}
                            </Badge>
                            {incident.auto_detected && (
                              <Badge variant="outline">Auto-detected</Badge>
                            )}
                          </div>
                          <CardDescription>{incident.description}</CardDescription>
                        </div>
                        {incident.status === 'open' && (
                          <Button
                            size="sm"
                            onClick={() => resolveIncident(incident.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Started:</span>
                          <span>{new Date(incident.started_at).toLocaleString()}</span>
                        </div>
                        {incident.resolved_at && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Resolved:</span>
                            <span>{new Date(incident.resolved_at).toLocaleString()}</span>
                          </div>
                        )}
                        {incident.affected_services.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-muted-foreground">Affected Services:</span>
                            {incident.affected_services.map(service => (
                              <Badge key={service} variant="outline">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
