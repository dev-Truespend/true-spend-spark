// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Activity, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Service {
  id: string;
  service_name: string;
  service_type: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  last_health_check: string;
  health_check_interval_seconds: number;
  endpoint: string | null;
  version: string | null;
  metadata: any;
}

interface HealthHistory {
  id: string;
  service_id: string;
  status: string;
  response_time_ms: number;
  checked_at: string;
  error_message: string | null;
}

export function ServiceRegistryDashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [healthHistory, setHealthHistory] = useState<Record<string, HealthHistory[]>>({});
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
    fetchHealthHistory();

    const channel = supabase
      .channel('service-registry-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_registry',
        },
        () => {
          fetchServices();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_health_history',
        },
        () => {
          fetchHealthHistory();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('service_registry')
        .select('*')
        .order('service_name');

      if (error) throw error;
      setServices((data || []) as Service[]);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch services',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('service_health_history')
        .select('*')
        .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('checked_at', { ascending: true });

      if (error) throw error;

      const grouped = (data || []).reduce((acc, item) => {
        if (!acc[item.service_id]) {
          acc[item.service_id] = [];
        }
        acc[item.service_id].push(item);
        return acc;
      }, {} as Record<string, HealthHistory[]>);

      setHealthHistory(grouped);
    } catch (error) {
      console.error('Error fetching health history:', error);
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('service-health-check');

      if (error) throw error;

      toast({
        title: 'Health Check Complete',
        description: `${data.healthy} healthy, ${data.degraded} degraded, ${data.unhealthy} unhealthy`,
      });
    } catch (error) {
      console.error('Error running health check:', error);
      toast({
        title: 'Error',
        description: 'Failed to run health check',
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'default',
      degraded: 'secondary',
      unhealthy: 'destructive',
      unknown: 'outline',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading services...</div>;
  }

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Service Registry</h2>
          <p className="text-muted-foreground">Monitor service health and availability</p>
        </div>
        <Button onClick={runHealthCheck} disabled={checking}>
          <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
          Run Health Check
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{healthyCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Degraded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{degradedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unhealthy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{unhealthyCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {services.map((service) => {
          const history = healthHistory[service.id] || [];
          const chartData = history.slice(-20).map(h => ({
            time: new Date(h.checked_at).toLocaleTimeString(),
            responseTime: h.response_time_ms,
          }));

          return (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <CardTitle className="text-lg">{service.service_name}</CardTitle>
                      <CardDescription className="flex gap-2 mt-1">
                        <Badge variant="outline">{service.service_type}</Badge>
                        {getStatusBadge(service.status)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {service.last_health_check && (
                      <div>
                        Last check: {new Date(service.last_health_check).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              {chartData.length > 0 && (
                <CardContent>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="responseTime"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}