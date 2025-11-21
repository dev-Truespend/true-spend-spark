import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BudgetOptimizer } from '@/components/ml/BudgetOptimizer';
import { GeofenceOptimizer } from '@/components/ml/GeofenceOptimizer';
import { SemanticSearchBar } from '@/components/ml/SemanticSearchBar';
import { LambdaMARTTrainer } from '@/components/admin/LambdaMARTTrainer';
import { ProphetForecaster } from '@/components/admin/ProphetForecaster';
import { ALSRecommender } from '@/components/admin/ALSRecommender';
import { DQNCacheOptimizer } from '@/components/admin/DQNCacheOptimizer';
import { TrainingJobMonitor } from '@/components/admin/TrainingJobMonitor';
import { Phase15CompletionPlan } from '@/components/ml/Phase15CompletionPlan';
import { Brain, Target, Search, TrendingUp, Calendar, Store, Zap, Map } from 'lucide-react';

export default function Phase15ML() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Phase 15: Advanced ML Models</h1>
        <p className="text-muted-foreground">
          Production-ready ML models for budget optimization, geofence clustering, and semantic search
        </p>
      </div>

      <TrainingJobMonitor />

      <Tabs defaultValue="roadmap" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 h-auto flex-wrap">
          <TabsTrigger value="roadmap" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Roadmap
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="geofence" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Geofence
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="lambdamart" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            LambdaMART
          </TabsTrigger>
          <TabsTrigger value="prophet" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Prophet
          </TabsTrigger>
          <TabsTrigger value="als" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            ALS
          </TabsTrigger>
          <TabsTrigger value="dqn" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            DQN Cache
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap">
          <Phase15CompletionPlan />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetOptimizer />
        </TabsContent>

        <TabsContent value="geofence">
          <GeofenceOptimizer />
        </TabsContent>

        <TabsContent value="search">
          <SemanticSearchBar />
        </TabsContent>

        <TabsContent value="lambdamart">
          <LambdaMARTTrainer />
        </TabsContent>

        <TabsContent value="prophet">
          <ProphetForecaster />
        </TabsContent>

        <TabsContent value="als">
          <ALSRecommender />
        </TabsContent>

        <TabsContent value="dqn">
          <DQNCacheOptimizer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
