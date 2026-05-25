// @ts-nocheck -- TODO: fix strictNullChecks errors
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import { PlayCircle, PauseCircle, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { Progress } from "@/shared/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export function MLABTestManager() {
  const queryClient = useQueryClient();
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTest, setNewTest] = useState({
    test_name: "",
    model_a_id: "",
    model_b_id: "",
    traffic_split: 50,
  });

  // Fetch A/B tests
  const { data: tests, isLoading } = useQuery({
    queryKey: ["ml-ab-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_ab_tests")
        .select("*")
        .order("started_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  // Update test status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ testId, status }: { testId: string; status: string }) => {
      const { error } = await supabase
        .from("ml_ab_tests")
        .update({ 
          status,
          ended_at: status === 'completed' || status === 'cancelled' ? new Date().toISOString() : null,
        })
        .eq("id", testId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-ab-tests"] });
      toast.success("Test status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update test: ${error.message}`);
    },
  });

  // Create new A/B test
  const createTestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ml_ab_tests")
        .insert({
          ...newTest,
          traffic_split: newTest.traffic_split / 100,
          status: "draft",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-ab-tests"] });
      setShowCreateDialog(false);
      setNewTest({ test_name: "", model_a_id: "", model_b_id: "", traffic_split: 50 });
      toast.success("A/B test created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create test: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ReactNode }> = {
      draft: { variant: "outline", icon: <PauseCircle className="w-3 h-3" /> },
      running: { variant: "default", icon: <PlayCircle className="w-3 h-3" /> },
      paused: { variant: "secondary", icon: <PauseCircle className="w-3 h-3" /> },
      completed: { variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
      cancelled: { variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
    };

    const config = variants[status] || variants.draft;

    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading A/B tests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">A/B Testing</h2>
          <p className="text-muted-foreground">Compare model performance with traffic splitting</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          Create A/B Test
        </Button>
      </div>

      {/* Active Tests */}
      <div className="grid gap-4 md:grid-cols-2">
        {tests?.filter(t => t.status === 'running').map((test) => (
          <Card key={test.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{test.test_name}</CardTitle>
                  <CardDescription>
                    Started {new Date(test.started_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                {getStatusBadge(test.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Model A: {test.model_a_id}</span>
                  <span>{Math.round((1 - test.traffic_split) * 100)}%</span>
                </div>
                <Progress value={(1 - test.traffic_split) * 100} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Model B: {test.model_b_id}</span>
                  <span>{Math.round(test.traffic_split * 100)}%</span>
                </div>
                <Progress value={test.traffic_split * 100} />
              </div>
              
              {test.winner && (
                <div className="p-3 bg-primary/10 rounded-lg flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Winner: {test.winner}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatusMutation.mutate({ testId: test.id, status: 'paused' })}
                >
                  <PauseCircle className="w-4 h-4 mr-1" />
                  Pause
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatusMutation.mutate({ testId: test.id, status: 'completed' })}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Historical Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Test History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tests?.filter(t => t.status !== 'running').map((test) => (
              <div key={test.id} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{test.test_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {test.model_a_id} vs {test.model_b_id}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {test.winner && (
                    <Badge variant="default" className="gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {test.winner}
                    </Badge>
                  )}
                  {getStatusBadge(test.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create A/B Test</DialogTitle>
            <DialogDescription>
              Compare two models with traffic splitting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Test Name</Label>
              <Input
                value={newTest.test_name}
                onChange={(e) => setNewTest({ ...newTest, test_name: e.target.value })}
                placeholder="DQN v2.0 vs v2.1"
              />
            </div>
            <div>
              <Label>Model A ID</Label>
              <Input
                value={newTest.model_a_id}
                onChange={(e) => setNewTest({ ...newTest, model_a_id: e.target.value })}
                placeholder="production"
              />
            </div>
            <div>
              <Label>Model B ID</Label>
              <Input
                value={newTest.model_b_id}
                onChange={(e) => setNewTest({ ...newTest, model_b_id: e.target.value })}
                placeholder="model-id-123"
              />
            </div>
            <div>
              <Label>Traffic Split for Model B (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={newTest.traffic_split}
                onChange={(e) => setNewTest({ ...newTest, traffic_split: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => createTestMutation.mutate()}>
              Create Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}