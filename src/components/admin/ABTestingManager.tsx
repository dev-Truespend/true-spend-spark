import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useABTesting } from "@/hooks/useABTesting";
import { Play, Pause, BarChart3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ABTestingManager() {
  const queryClient = useQueryClient();
  const { useActiveExperiments, useExperimentResults } = useABTesting();
  const { data: experiments = [] } = useActiveExperiments();
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);

  const [newExperiment, setNewExperiment] = useState({
    experiment_name: '',
    description: '',
    variants: 'control,variant_a',
    target_metric: 'conversion_rate',
    traffic_allocation: '{"control": 50, "variant_a": 50}',
    start_date: new Date().toISOString().split('T')[0],
  });

  const createExperiment = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('ab_experiments')
        .insert([{
          ...newExperiment,
          variants: newExperiment.variants.split(',').map(v => v.trim()),
          traffic_allocation: JSON.parse(newExperiment.traffic_allocation),
          status: 'draft',
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-experiments'] });
      toast({
        title: "Success",
        description: "Experiment created successfully",
      });
      setNewExperiment({
        experiment_name: '',
        description: '',
        variants: 'control,variant_a',
        target_metric: 'conversion_rate',
        traffic_allocation: '{"control": 50, "variant_a": 50}',
        start_date: new Date().toISOString().split('T')[0],
      });
    },
  });

  const updateExperimentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('ab_experiments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-experiments'] });
      toast({
        title: "Success",
        description: "Experiment status updated",
      });
    },
  });

  const { data: results } = useExperimentResults(selectedExperiment || '');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">A/B Testing Manager</h2>
          <p className="text-muted-foreground">
            Create and manage experiments to optimize user experience
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>Create Experiment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Experiment</DialogTitle>
              <DialogDescription>
                Set up a new A/B test to measure user behavior
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Experiment Name</Label>
                <Input
                  id="name"
                  value={newExperiment.experiment_name}
                  onChange={(e) => setNewExperiment({ ...newExperiment, experiment_name: e.target.value })}
                  placeholder="e.g., Homepage Button Color Test"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newExperiment.description}
                  onChange={(e) => setNewExperiment({ ...newExperiment, description: e.target.value })}
                  placeholder="Describe what you're testing..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="variants">Variants (comma-separated)</Label>
                <Input
                  id="variants"
                  value={newExperiment.variants}
                  onChange={(e) => setNewExperiment({ ...newExperiment, variants: e.target.value })}
                  placeholder="control,variant_a,variant_b"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="metric">Target Metric</Label>
                <Input
                  id="metric"
                  value={newExperiment.target_metric}
                  onChange={(e) => setNewExperiment({ ...newExperiment, target_metric: e.target.value })}
                  placeholder="e.g., click_through_rate"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="allocation">Traffic Allocation (JSON)</Label>
                <Input
                  id="allocation"
                  value={newExperiment.traffic_allocation}
                  onChange={(e) => setNewExperiment({ ...newExperiment, traffic_allocation: e.target.value })}
                  placeholder='{"control": 50, "variant_a": 50}'
                />
              </div>
              <Button onClick={() => createExperiment.mutate()} disabled={createExperiment.isPending}>
                Create Experiment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {experiments.map((experiment: any) => (
          <Card key={experiment.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{experiment.experiment_name}</CardTitle>
                  <CardDescription>{experiment.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={experiment.status === 'running' ? 'default' : 'secondary'}>
                    {experiment.status}
                  </Badge>
                  {experiment.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => updateExperimentStatus.mutate({ 
                        id: experiment.id, 
                        status: 'running' 
                      })}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  )}
                  {experiment.status === 'running' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateExperimentStatus.mutate({ 
                        id: experiment.id, 
                        status: 'completed' 
                      })}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedExperiment(experiment.id)}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Results
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Experiment Results</DialogTitle>
                        <DialogDescription>
                          {experiment.experiment_name} - {experiment.target_metric}
                        </DialogDescription>
                      </DialogHeader>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Variant</TableHead>
                            <TableHead>Sample Size</TableHead>
                            <TableHead>Average Value</TableHead>
                            <TableHead>Total Events</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results?.map((result: any) => (
                            <TableRow key={result.variant}>
                              <TableCell className="font-medium">{result.variant}</TableCell>
                              <TableCell>{result.count}</TableCell>
                              <TableCell>
                                {(result.total / result.count).toFixed(2)}
                              </TableCell>
                              <TableCell>{result.total}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Variants:</span>{' '}
                  {Array.isArray(experiment.variants) ? experiment.variants.join(', ') : 'N/A'}
                </div>
                <div>
                  <span className="text-muted-foreground">Target Metric:</span>{' '}
                  {experiment.target_metric}
                </div>
                <div>
                  <span className="text-muted-foreground">Start Date:</span>{' '}
                  {new Date(experiment.start_date).toLocaleDateString()}
                </div>
                <div>
                  <span className="text-muted-foreground">End Date:</span>{' '}
                  {experiment.end_date ? new Date(experiment.end_date).toLocaleDateString() : 'Ongoing'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
