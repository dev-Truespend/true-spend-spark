import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BudgetOptimizer } from '@/components/ml/BudgetOptimizer';
import { GeofenceOptimizer } from '@/components/ml/GeofenceOptimizer';
import { SemanticSearchBar } from '@/components/ml/SemanticSearchBar';
import { Brain, Target, Search } from 'lucide-react';

export default function Phase15ML() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Phase 15: Advanced ML Models</h1>
        <p className="text-muted-foreground">
          Production-ready ML models for budget optimization, geofence clustering, and semantic search
        </p>
      </div>

      <Tabs defaultValue="budget" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Budget Optimizer
          </TabsTrigger>
          <TabsTrigger value="geofence" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Geofence Optimizer
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Semantic Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="budget">
          <BudgetOptimizer />
        </TabsContent>

        <TabsContent value="geofence">
          <GeofenceOptimizer />
        </TabsContent>

        <TabsContent value="search">
          <SemanticSearchBar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
