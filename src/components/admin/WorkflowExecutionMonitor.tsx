import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play, 
  RefreshCw,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Execution {
  id: string;
  workflow_name: string;
  workflow_version: number;
  status: string;
  trigger_type: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
}

interface StepExecution {
  id: string;
  execution_id: string;
  step_name: string;
  step_type: string;
  step_index: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  input_data: any;
  output_data: any;
}

export function WorkflowExecutionMonitor() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [steps, setSteps] = useState<Record<string, StepExecution[]>>({});
  const [expandedExecutions, setExpandedExecutions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExecutions();

    const executionsChannel = supabase
      .channel('executions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_executions',
        },
        () => {
          fetchExecutions();
        }
      )
      .subscribe();

    const stepsChannel = supabase
      .channel('steps-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_step_executions',
        },
        (payload) => {
          const step = payload.new as StepExecution;
          fetchStepsForExecution(step.execution_id);
        }
      )
      .subscribe();

    return () => {
      executionsChannel.unsubscribe();
      stepsChannel.unsubscribe();
    };
  }, []);

  const fetchExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error fetching executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStepsForExecution = async (executionId: string) => {
    try {
      const { data, error } = await supabase
        .from('workflow_step_executions')
        .select('*')
        .eq('execution_id', executionId)
        .order('step_index');

      if (error) throw error;
      setSteps(prev => ({ ...prev, [executionId]: data || [] }));
    } catch (error) {
      console.error('Error fetching steps:', error);
    }
  };

  const toggleExecution = (executionId: string) => {
    const newExpanded = new Set(expandedExecutions);
    if (newExpanded.has(executionId)) {
      newExpanded.delete(executionId);
    } else {
      newExpanded.add(executionId);
      if (!steps[executionId]) {
        fetchStepsForExecution(executionId);
      }
    }
    setExpandedExecutions(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Play className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'outline',
      retrying: 'secondary',
      cancelled: 'outline',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const calculateProgress = (execution: Execution): number => {
    const executionSteps = steps[execution.id];
    if (!executionSteps || executionSteps.length === 0) return 0;

    const completed = executionSteps.filter(s => s.status === 'completed').length;
    return (completed / executionSteps.length) * 100;
  };

  if (loading) {
    return <div className="text-center py-8">Loading executions...</div>;
  }

  const runningCount = executions.filter(e => e.status === 'running').length;
  const completedCount = executions.filter(e => e.status === 'completed').length;
  const failedCount = executions.filter(e => e.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{runningCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{completedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{failedCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {executions.map((execution) => {
          const isExpanded = expandedExecutions.has(execution.id);
          const executionSteps = steps[execution.id] || [];
          const progress = calculateProgress(execution);

          return (
            <Card key={execution.id}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleExecution(execution.id)}>
                <CardHeader className="cursor-pointer" onClick={() => toggleExecution(execution.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      {getStatusIcon(execution.status)}
                      <div>
                        <CardTitle className="text-lg">{execution.workflow_name}</CardTitle>
                        <CardDescription className="flex gap-2 mt-1">
                          {getStatusBadge(execution.status)}
                          <Badge variant="outline">v{execution.workflow_version}</Badge>
                          <Badge variant="outline">{execution.trigger_type}</Badge>
                          {execution.retry_count > 0 && (
                            <Badge variant="secondary">Retry {execution.retry_count}</Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {execution.started_at && (
                        <div>Started: {new Date(execution.started_at).toLocaleString()}</div>
                      )}
                      {execution.duration_ms && (
                        <div>Duration: {execution.duration_ms}ms</div>
                      )}
                    </div>
                  </div>
                  {execution.status === 'running' && executionSteps.length > 0 && (
                    <div className="mt-3">
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {executionSteps.filter(s => s.status === 'completed').length} of {executionSteps.length} steps completed
                      </p>
                    </div>
                  )}
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    {execution.error_message && (
                      <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm">
                        {execution.error_message}
                      </div>
                    )}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Execution Steps:</h4>
                      {executionSteps.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No steps recorded yet</p>
                      ) : (
                        <div className="space-y-2">
                          {executionSteps.map((step, index) => (
                            <div
                              key={step.id}
                              className="flex items-center gap-3 p-3 bg-muted rounded-md"
                            >
                              <div className="flex-shrink-0">
                                {getStatusIcon(step.status)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-muted-foreground">
                                    #{index + 1}
                                  </span>
                                  <span className="font-medium">{step.step_name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {step.step_type}
                                  </Badge>
                                  {getStatusBadge(step.status)}
                                </div>
                                {step.duration_ms && (
                                  <span className="text-xs text-muted-foreground">
                                    {step.duration_ms}ms
                                  </span>
                                )}
                                {step.error_message && (
                                  <div className="text-xs text-destructive mt-1">
                                    {step.error_message}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {executions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            No workflow executions yet. Execute a workflow to see it here.
          </CardContent>
        </Card>
      )}
    </div>
  );
}