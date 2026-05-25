import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';

export function Phase15CompletionPlan() {
  const currentProgress = 60;

  const tasks = [
    {
      id: 1,
      title: 'Train First Model',
      progress: 15,
      status: 'pending' as 'pending' | 'completed',
      description: 'Use prepare-training-data and modal-training-trigger to train your first model',
      steps: [
        'Choose model type (e.g., thompson-sampling-budget)',
        'Call prepare-training-data edge function',
        'Trigger modal-training-trigger with training data',
        'Wait for callback to populate ml_model_registry',
      ],
      edgeFunctions: ['prepare-training-data', 'modal-training-trigger', 'modal-training-callback'],
    },
    {
      id: 2,
      title: 'Generate Transaction Embeddings',
      progress: 10,
      status: 'pending' as 'pending' | 'completed',
      description: 'Create batch job to populate transaction.embedding column',
      steps: [
        'Create edge function to batch process transactions',
        'Generate embeddings using HuggingFace API',
        'Store embeddings in transactions.embedding column',
        'Verify embeddings are generated correctly',
      ],
      edgeFunctions: ['semantic-search-transactions'],
      sqlNeeded: false,
    },
    {
      id: 3,
      title: 'Create Vector Search RPC',
      progress: 5,
      status: 'pending' as 'pending' | 'completed',
      description: 'Add PostgreSQL function for semantic search',
      steps: [
        'Create search_transactions_semantic function',
        'Use pgvector for cosine similarity search',
        'Test with existing embeddings',
        'Update semantic-search-transactions to use RPC',
      ],
      edgeFunctions: ['semantic-search-transactions'],
      sqlNeeded: true,
      sql: `CREATE OR REPLACE FUNCTION search_transactions_semantic(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  target_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  merchant_name text,
  category text,
  amount numeric,
  timestamp timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.merchant_name,
    t.category,
    t.amount,
    t.timestamp,
    1 - (t.embedding <=> query_embedding) as similarity
  FROM transactions t
  WHERE 
    (target_user_id IS NULL OR t.user_id = target_user_id)
    AND t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;`,
    },
    {
      id: 4,
      title: 'Execute Real Inference',
      progress: 5,
      status: 'pending' as 'pending' | 'completed',
      description: 'Call ml-inference with a trained model',
      steps: [
        'Ensure at least one model is trained and in registry',
        'Call ml-inference edge function',
        'Verify prediction is logged to ml_predictions',
        'Check prediction accuracy',
      ],
      edgeFunctions: ['ml-inference'],
    },
    {
      id: 5,
      title: 'Populate Monitoring Data',
      progress: 5,
      status: 'pending' as 'pending' | 'completed',
      description: 'Generate real metrics from model usage',
      steps: [
        'Run inference jobs to generate predictions',
        'Collect model performance metrics',
        'Update health monitoring with real data',
        'Replace simulated metrics with production data',
      ],
      edgeFunctions: ['ml-inference'],
    },
  ];

  const totalRemaining = tasks.reduce((sum, task) => sum + task.progress, 0);
  const finalProgress = currentProgress + totalRemaining;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Phase 15: ML Models Completion Roadmap
            <Badge variant="outline" className="text-lg">
              {currentProgress}% Complete
            </Badge>
          </CardTitle>
          <CardDescription>
            Detailed action plan to reach 100% completion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Progress</span>
                <span className="font-medium">{currentProgress}%</span>
              </div>
              <Progress value={currentProgress} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Target Progress</span>
                <span className="font-medium">{finalProgress}%</span>
              </div>
              <Progress value={finalProgress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Remaining Work</p>
                <p className="text-2xl font-bold">{totalRemaining}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {tasks.map((task, index) => (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                    {index + 1}. {task.title}
                  </CardTitle>
                  <CardDescription>{task.description}</CardDescription>
                </div>
                <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                  +{task.progress}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Steps:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {task.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {task.edgeFunctions && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Edge Functions:</p>
                  <div className="flex flex-wrap gap-2">
                    {task.edgeFunctions.map((func) => (
                      <Badge key={func} variant="outline" className="font-mono text-xs">
                        {func}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {task.sqlNeeded && task.sql && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">SQL Required:</p>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                    <code>{task.sql}</code>
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Infrastructure & Backend</span>
              <Badge variant="default">100% Complete</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Frontend UI Components</span>
              <Badge variant="default">100% Complete</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Edge Functions</span>
              <Badge variant="default">100% Complete</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Production Data</span>
              <Badge variant="secondary">0% Complete</Badge>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Next Action:</strong> Start by training your first model using the{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">prepare-training-data</code>{' '}
              and{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">modal-training-trigger</code>{' '}
              edge functions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
