import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, RefreshCw, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function MLTrainingAlerts() {
  const { data: failedJobs, isLoading, refetch } = useQuery({
    queryKey: ["failed-training-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_training_jobs")
        .select("*")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleRetry = async (jobId: string) => {
    toast.info("Retry functionality coming soon - resubmit training job manually");
  };

  const handleAcknowledge = async (jobId: string) => {
    toast.success("Alert acknowledged");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Training Failure Alerts</CardTitle>
            <CardDescription>
              Monitor and resolve failed training jobs
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!failedJobs || failedJobs.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground">No failed training jobs</p>
          </div>
        ) : (
          <div className="space-y-4">
            {failedJobs.map((job) => (
              <div
                key={job.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{job.model_type}</span>
                        <Badge variant="destructive">Failed</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Failed {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>

                {job.error_message && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                    <p className="text-sm font-mono text-destructive">
                      {job.error_message}
                    </p>
                  </div>
                )}

                {job.modal_job_id && (
                  <div className="bg-muted rounded p-3">
                    <p className="text-xs text-muted-foreground mb-2">Modal Job ID</p>
                    <code className="text-xs font-mono">{job.modal_job_id}</code>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetry(job.id)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAcknowledge(job.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Acknowledge
                  </Button>
                  {job.modal_job_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`https://modal.com/apps/harshugajjela-eng/main/app-call/${job.modal_job_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Logs
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
