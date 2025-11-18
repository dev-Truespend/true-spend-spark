/**
 * Phase 10: Alert History Component
 * View alert delivery history and acknowledgments
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface AlertHistoryItem {
  id: string;
  incident_id: string;
  channel: string;
  recipient: string;
  status: string;
  sent_at: string;
  acknowledged_at: string | null;
  error_message: string | null;
  metadata: any;
}

export function AlertHistory() {
  const { data: alertHistory, isLoading } = useQuery({
    queryKey: ['alert-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_history')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AlertHistoryItem[];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'acknowledged':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
      sent: 'default',
      failed: 'destructive',
      acknowledged: 'secondary',
      escalated: 'outline'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading alert history...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alert History
        </CardTitle>
        <CardDescription>
          Recent alert deliveries and acknowledgments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sent</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Acknowledged</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alertHistory?.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell className="text-sm">
                  {format(new Date(alert.sent_at), 'MMM d, HH:mm:ss')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{alert.channel}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {alert.recipient}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(alert.status)}
                    {getStatusBadge(alert.status)}
                  </div>
                </TableCell>
                <TableCell>
                  {alert.metadata?.severity && (
                    <Badge
                      variant={
                        alert.metadata.severity === 'critical' ? 'destructive' : 'secondary'
                      }
                    >
                      {alert.metadata.severity}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {alert.acknowledged_at
                    ? format(new Date(alert.acknowledged_at), 'MMM d, HH:mm')
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {alertHistory?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No alert history found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
