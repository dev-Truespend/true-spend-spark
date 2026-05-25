// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Play, Plus, Trash2, Code, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Workflow {
  id: string;
  workflow_name: string;
  description: string;
  version: number;
  definition: any;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function WorkflowManager() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    definition: '{\n  "steps": []\n}',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkflows();

    const channel = supabase
      .channel('workflows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflows',
        },
        () => {
          fetchWorkflows();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch workflows',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async () => {
    try {
      let definition;
      try {
        definition = JSON.parse(newWorkflow.definition);
      } catch {
        throw new Error('Invalid JSON in workflow definition');
      }

      const { error } = await supabase
        .from('workflows')
        .insert({
          workflow_name: newWorkflow.name,
          description: newWorkflow.description,
          definition,
        });

      if (error) throw error;

      setNewWorkflow({ name: '', description: '', definition: '{\n  "steps": []\n}' });
      toast({
        title: 'Success',
        description: 'Workflow created',
      });
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create workflow',
        variant: 'destructive',
      });
    }
  };

  const toggleWorkflow = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('workflows')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Workflow ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error toggling workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to update workflow',
        variant: 'destructive',
      });
    }
  };

  const executeWorkflow = async (workflow: Workflow) => {
    setExecuting(workflow.id);
    try {
      const { data, error } = await supabase.functions.invoke('workflow-executor', {
        body: {
          workflowId: workflow.id,
          triggerType: 'manual',
          context: {},
        },
      });

      if (error) throw error;

      toast({
        title: 'Workflow Executed',
        description: `Completed in ${data.duration_ms}ms`,
      });
    } catch (error) {
      console.error('Error executing workflow:', error);
      toast({
        title: 'Execution Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setExecuting(null);
    }
  };

  const deleteWorkflow = async (id: string) => {
    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Workflow deleted',
      });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete workflow',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading workflows...</div>;
  }

  return (
    <div className="space-y-6">
      <Dialog>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>Define a new workflow with steps and conditions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Workflow Name</Label>
              <Input
                placeholder="my-workflow"
                value={newWorkflow.name}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                placeholder="Describe what this workflow does"
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Definition (JSON)</Label>
              <Textarea
                placeholder="Workflow definition"
                value={newWorkflow.definition}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, definition: e.target.value })}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={createWorkflow} disabled={!newWorkflow.name || !newWorkflow.definition}>
              Create Workflow
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{workflow.workflow_name}</CardTitle>
                  <CardDescription>{workflow.description}</CardDescription>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={workflow.enabled ? 'default' : 'secondary'}>
                      {workflow.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Badge variant="outline">v{workflow.version}</Badge>
                    <Badge variant="outline">
                      {workflow.definition.steps?.length || 0} steps
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => executeWorkflow(workflow)}
                    disabled={!workflow.enabled || executing === workflow.id}
                  >
                    <Play className={`h-4 w-4 mr-2 ${executing === workflow.id ? 'animate-spin' : ''}`} />
                    Run
                  </Button>
                  <Switch
                    checked={workflow.enabled}
                    onCheckedChange={(checked) => toggleWorkflow(workflow.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteWorkflow(workflow.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Code className="h-4 w-4" />
                  <span>Steps:</span>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(workflow.definition, null, 2)}
                  </pre>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                  <span>Created: {new Date(workflow.created_at).toLocaleString()}</span>
                  <span>Updated: {new Date(workflow.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workflows.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            No workflows yet. Create one to get started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}