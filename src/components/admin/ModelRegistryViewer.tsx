import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function ModelRegistryViewer() {
  const { data: models, isLoading } = useQuery({
    queryKey: ["model-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_model_registry")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleDownload = async (artifactUrl: string, modelId: string) => {
    try {
      const { data } = supabase.storage
        .from("ml-models")
        .getPublicUrl(artifactUrl);
      
      window.open(data.publicUrl, "_blank");
      toast.success("Opening model artifact");
    } catch (error) {
      toast.error("Failed to download model");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Registry</CardTitle>
        <CardDescription>
          Trained models ready for deployment
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!models || models.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No trained models yet. Complete a training job to see models here.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {models.map((model) => (
              <Card key={model.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{model.model_type}</CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">
                        {model.model_id}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">v{model.version}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Status</div>
                      <div className="font-medium">{model.status}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Created</div>
                      <div className="font-medium">
                        {formatDistanceToNow(new Date(model.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>

                  {model.metrics && typeof model.metrics === 'object' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        Training Metrics
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(model.metrics).slice(0, 4).map(([key, value]) => (
                          <div key={key} className="bg-muted rounded p-2">
                            <div className="text-muted-foreground">{key}</div>
                            <div className="font-medium">{String(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDownload(model.artifact_url, model.model_id)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Model
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
