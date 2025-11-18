/**
 * Phase 10: Observability & Polish - Log Viewer Component
 * Admin dashboard component for viewing and filtering system logs
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Search, Download } from "lucide-react";
import { toast } from "sonner";

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface SystemLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  metadata: Record<string, any>;
  user_id: string | null;
  request_id: string | null;
  trace_id: string | null;
  stack_trace: string | null;
}

const levelColors: Record<LogLevel, string> = {
  debug: "bg-muted text-muted-foreground",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  warn: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  critical: "bg-red-600 text-white dark:bg-red-700",
};

export function LogViewer() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [componentFilter, setComponentFilter] = useState<string>("all");
  const [components, setComponents] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);

      if (levelFilter !== 'all') {
        query = query.eq('level', levelFilter);
      }

      if (componentFilter !== 'all') {
        query = query.eq('component', componentFilter);
      }

      if (searchQuery) {
        query = query.ilike('message', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs((data || []) as SystemLog[]);

      // Extract unique components
      const uniqueComponents = Array.from(
        new Set((data || []).map(log => log.component))
      ).sort();
      setComponents(uniqueComponents);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Set up realtime subscription for new logs
    const channel = supabase
      .channel('system_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_logs',
        },
        (payload) => {
          setLogs((prev) => [payload.new as SystemLog, ...prev].slice(0, 500));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [levelFilter, componentFilter, searchQuery]);

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Level', 'Component', 'Message', 'User ID', 'Request ID'],
      ...logs.map(log => [
        log.timestamp,
        log.level,
        log.component,
        log.message,
        log.user_id || '',
        log.request_id || '',
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported to CSV');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>
                Real-time application logs with filtering and search
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportLogs}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as LogLevel | "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={componentFilter} onValueChange={setComponentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by component" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Components</SelectItem>
                {components.map((component) => (
                  <SelectItem key={component} value={component}>
                    {component}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logs List */}
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No logs found</div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start gap-3">
                      <Badge className={levelColors[log.level]}>
                        {log.level.toUpperCase()}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {log.component}
                          </Badge>
                        </div>
                        <p className="text-sm font-mono truncate">{log.message}</p>
                        {log.stack_trace && (
                          <p className="text-xs text-red-600 mt-1">Stack trace available</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Log Details</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 font-mono text-sm">
              <div>
                <strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toLocaleString()}
              </div>
              <div>
                <strong>Level:</strong>{" "}
                <Badge className={levelColors[selectedLog.level]}>
                  {selectedLog.level.toUpperCase()}
                </Badge>
              </div>
              <div>
                <strong>Component:</strong> {selectedLog.component}
              </div>
              <div>
                <strong>Message:</strong> {selectedLog.message}
              </div>
              {selectedLog.user_id && (
                <div>
                  <strong>User ID:</strong> {selectedLog.user_id}
                </div>
              )}
              {selectedLog.request_id && (
                <div>
                  <strong>Request ID:</strong> {selectedLog.request_id}
                </div>
              )}
              {selectedLog.trace_id && (
                <div>
                  <strong>Trace ID:</strong> {selectedLog.trace_id}
                </div>
              )}
              {Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <strong>Metadata:</strong>
                  <pre className="mt-2 p-3 bg-muted rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.stack_trace && (
                <div>
                  <strong>Stack Trace:</strong>
                  <pre className="mt-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg overflow-x-auto text-xs">
                    {selectedLog.stack_trace}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
