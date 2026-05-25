// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Database, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const AuditLogViewer = () => {
  const [filters, setFilters] = useState({
    table: 'all',
    operation: 'all',
  });

  const { data: logs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('data_access_audit')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (filters.table !== 'all') {
        query = query.eq('table_name', filters.table);
      }
      if (filters.operation !== 'all') {
        query = query.eq('operation', filters.operation);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'DELETE':
        return 'destructive';
      case 'UPDATE':
        return 'default';
      case 'INSERT':
        return 'secondary';
      case 'SELECT':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold">Audit Logs</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-4 flex-1">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Table</label>
            <Select 
              value={filters.table} 
              onValueChange={(v) => setFilters({...filters, table: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                <SelectItem value="profiles">Profiles</SelectItem>
                <SelectItem value="transactions">Transactions</SelectItem>
                <SelectItem value="mfa_settings">MFA Settings</SelectItem>
                <SelectItem value="budgets">Budgets</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Operation</label>
            <Select 
              value={filters.operation} 
              onValueChange={(v) => setFilters({...filters, operation: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Operations</SelectItem>
                <SelectItem value="SELECT">SELECT</SelectItem>
                <SelectItem value="INSERT">INSERT</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Logs</div>
          <div className="text-2xl font-bold">{logs?.length || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Inserts</div>
          <div className="text-2xl font-bold text-secondary">
            {logs?.filter(l => l.operation === 'INSERT').length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Updates</div>
          <div className="text-2xl font-bold text-primary">
            {logs?.filter(l => l.operation === 'UPDATE').length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Deletes</div>
          <div className="text-2xl font-bold text-destructive">
            {logs?.filter(l => l.operation === 'DELETE').length || 0}
          </div>
        </Card>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Row ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.timestamp), 'PPpp')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.table_name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getOperationColor(log.operation)}>
                        {log.operation}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.user_id?.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.row_id ? `${log.row_id.slice(0, 8)}...` : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No audit logs found. Activity will appear here once users start interacting with the system.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      {logs && logs.length >= 100 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Showing most recent 100 logs. Use filters to narrow results.
        </div>
      )}
    </Card>
  );
};
