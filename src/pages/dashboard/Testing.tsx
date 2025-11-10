import { useState } from 'react';
import { usePhases } from '@/hooks/useProjectData';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phase1TestSuite } from '@/components/testing/Phase1TestSuite';
import { Badge } from '@/components/ui/badge';
import { TestTube, TrendingUp, AlertCircle } from 'lucide-react';

export default function Testing() {
  const { data: phases, isLoading } = usePhases();
  const [selectedPhase, setSelectedPhase] = useState<string>('1');

  if (isLoading) {
    return <div className="text-muted-foreground">Loading testing dashboard...</div>;
  }

  const currentPhase = phases?.find(p => p.phase_number === 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Testing Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor test results, coverage, and quality metrics across all project phases
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <TestTube className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tests Run</p>
              <p className="text-2xl font-bold text-foreground">121</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-500/10">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pass Rate</p>
              <p className="text-2xl font-bold text-foreground">92.6%</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-500/10">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Code Coverage</p>
              <p className="text-2xl font-bold text-foreground">86.8%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Phase Selector */}
      <Tabs value={selectedPhase} onValueChange={setSelectedPhase}>
        <TabsList className="grid w-full grid-cols-5">
          {phases?.slice(0, 5).map(phase => (
            <TabsTrigger key={phase.id} value={phase.phase_number.toString()}>
              <span className="hidden sm:inline">Phase </span>
              {phase.phase_number}
              {phase.phase_number === 1 && (
                <Badge variant="default" className="ml-2">
                  Active
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {phases?.slice(0, 5).map(phase => (
          <TabsContent key={phase.id} value={phase.phase_number.toString()} className="mt-6">
            {phase.phase_number === 1 && currentPhase ? (
              <Phase1TestSuite phaseId={currentPhase.id} />
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  Test results for Phase {phase.phase_number} will appear here once testing begins
                </p>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
