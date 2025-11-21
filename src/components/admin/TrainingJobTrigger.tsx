import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Rocket, Info } from "lucide-react";
import { toast } from "sonner";

const MODEL_TYPES = [
  {
    value: "dqn_cache_policy",
    label: "DQN Cache Policy",
    description: "Deep Q-Network for intelligent cache eviction",
  },
  {
    value: "lstm_anomaly_detector",
    label: "LSTM Anomaly Detector",
    description: "Long Short-Term Memory for transaction anomalies",
  },
  {
    value: "distilbert_classifier",
    label: "DistilBERT Classifier",
    description: "Transformer-based transaction categorization",
  },
  {
    value: "als_recommender",
    label: "ALS Recommender",
    description: "Alternating Least Squares for merchant recommendations",
  },
];

const DEFAULT_CONFIGS = {
  dqn_cache_policy: {
    learning_rate: 0.001,
    batch_size: 32,
    epochs: 100,
    gamma: 0.99,
  },
  lstm_anomaly_detector: {
    learning_rate: 0.001,
    batch_size: 64,
    epochs: 50,
    sequence_length: 30,
  },
  distilbert_classifier: {
    learning_rate: 2e-5,
    batch_size: 16,
    epochs: 10,
    max_length: 128,
  },
  als_recommender: {
    factors: 50,
    regularization: 0.01,
    iterations: 15,
  },
};

export function TrainingJobTrigger() {
  const [modelType, setModelType] = useState<string>("");
  const [trainingDataId, setTrainingDataId] = useState<string>("");
  const [config, setConfig] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ["training-data-files"],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("ml-training-data")
        .list();
      
      if (error) throw error;
      return data;
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async () => {
      if (!modelType || !trainingDataId) {
        throw new Error("Please select model type and training data");
      }

      let parsedConfig;
      try {
        parsedConfig = config ? JSON.parse(config) : DEFAULT_CONFIGS[modelType as keyof typeof DEFAULT_CONFIGS];
      } catch (e) {
        throw new Error("Invalid JSON configuration");
      }

      const { data, error } = await supabase.functions.invoke("modal-training-trigger", {
        body: {
          model_type: modelType,
          training_data_id: trainingDataId,
          config: parsedConfig,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Training job started! Job ID: ${data.job_id}`);
      queryClient.invalidateQueries({ queryKey: ["training-jobs"] });
      
      // Reset form
      setModelType("");
      setTrainingDataId("");
      setConfig("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to start training: ${error.message}`);
    },
  });

  const handleModelTypeChange = (value: string) => {
    setModelType(value);
    // Auto-populate default config
    const defaultConfig = DEFAULT_CONFIGS[value as keyof typeof DEFAULT_CONFIGS];
    setConfig(JSON.stringify(defaultConfig, null, 2));
  };

  const selectedModel = MODEL_TYPES.find((m) => m.value === modelType);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start Training Job</CardTitle>
        <CardDescription>
          Configure and trigger a new ML training job on Modal.com
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="model-type">Model Type</Label>
          <Select value={modelType} onValueChange={handleModelTypeChange}>
            <SelectTrigger id="model-type">
              <SelectValue placeholder="Select a model type" />
            </SelectTrigger>
            <SelectContent>
              {MODEL_TYPES.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedModel && (
            <p className="text-sm text-muted-foreground">{selectedModel.description}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="training-data">Training Data File</Label>
          <Select value={trainingDataId} onValueChange={setTrainingDataId} disabled={filesLoading}>
            <SelectTrigger id="training-data">
              <SelectValue placeholder="Select training data file" />
            </SelectTrigger>
            <SelectContent>
              {files?.map((file) => (
                <SelectItem key={file.id} value={file.name}>
                  {file.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!files || files.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No training data files found. Upload files in the "Training Data" tab.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="config">Training Configuration (JSON)</Label>
          <Textarea
            id="config"
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            placeholder='{"learning_rate": 0.001, "batch_size": 32, ...}'
            rows={8}
            className="font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            Configure hyperparameters for training. Default values are populated automatically.
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Estimated Costs:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• GPU Training: $0.60/hour (H100)</li>
                <li>• Typical job duration: 5-30 minutes</li>
                <li>• Estimated cost per job: $0.10 - $0.50</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => triggerMutation.mutate()}
          disabled={!modelType || !trainingDataId || triggerMutation.isPending}
          size="lg"
          className="w-full"
        >
          {triggerMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Starting Training Job...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              Start Training Job
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
