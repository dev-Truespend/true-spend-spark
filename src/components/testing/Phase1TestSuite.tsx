import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhaseTest {
  id: string;
  test_category: string;
  test_name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  error_message: string | null;
  timestamp: string;
}

export function Phase1TestSuite({ phaseId }: { phaseId: string }) {
  const { data: tests, isLoading } = useQuery({
    queryKey: ['phase-tests', phaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phase_tests')
        .select('*')
        .eq('phase_id', phaseId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data as PhaseTest[];
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading test results...</div>;
  }

  if (!tests || tests.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No test results available for Phase 1</p>
      </Card>
    );
  }

  // Group by category
  const categories = ['unit', 'integration', 'e2e', 'performance'];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = tests.filter(t => t.test_category === cat);
    return acc;
  }, {} as Record<string, PhaseTest[]>);

  // Calculate overall stats
  const totalTests = tests.length;
  const passedTests = tests.filter(t => t.status === 'passed').length;
  const failedTests = tests.filter(t => t.status === 'failed').length;
  const passRate = Math.round((passedTests / totalTests) * 100);

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-muted-foreground">Total Tests</div>
            <div className="text-3xl font-bold text-foreground mt-1">{totalTests}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Passed</div>
            <div className="text-3xl font-bold text-green-500 mt-1">{passedTests}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Failed</div>
            <div className="text-3xl font-bold text-destructive mt-1">{failedTests}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Pass Rate</div>
            <div className="text-3xl font-bold text-foreground mt-1">{passRate}%</div>
            <Progress value={passRate} className="mt-2 h-2" />
          </div>
        </div>

        <Button className="mt-4" variant="outline">
          <Play className="h-4 w-4 mr-2" />
          Run All Tests
        </Button>
      </Card>

      {/* Tests by Category */}
      {categories.map(category => {
        const categoryTests = testsByCategory[category] || [];
        if (categoryTests.length === 0) return null;

        const categoryPassed = categoryTests.filter(t => t.status === 'passed').length;
        const categoryTotal = categoryTests.length;

        return (
          <Card key={category} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground capitalize">
                  {category} Tests
                </h3>
                <p className="text-sm text-muted-foreground">
                  {categoryPassed} / {categoryTotal} passed
                </p>
              </div>
              <Badge variant={categoryPassed === categoryTotal ? 'default' : 'destructive'}>
                {Math.round((categoryPassed / categoryTotal) * 100)}%
              </Badge>
            </div>

            <div className="space-y-2">
              {categoryTests.map(test => (
                <div
                  key={test.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {test.status === 'passed' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {test.status === 'failed' && (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    {test.status === 'skipped' && (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{test.test_name}</p>
                    {test.error_message && (
                      <p className="text-xs text-destructive mt-1">{test.error_message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Duration: {test.duration_ms}ms
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
