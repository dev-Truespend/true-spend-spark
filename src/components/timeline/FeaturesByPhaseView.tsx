import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeaturesByPhase, groupFeaturesByPhaseAndPlatform, PlatformFeature } from "@/hooks/usePlatformFeatures";
import { usePhases } from "@/hooks/useProjectData";
import { Globe, Puzzle, Smartphone, CheckCircle2, Clock, ListTodo } from "lucide-react";

export function FeaturesByPhaseView() {
  const { data: features, isLoading: featuresLoading } = useFeaturesByPhase();
  const phases = usePhases();

  if (featuresLoading || phases.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const featuresByPhase = groupFeaturesByPhaseAndPlatform(features || []);

  // Calculate summary stats
  const webFeatures = features?.filter(f => f.platform === 'web').length || 0;
  const extensionFeatures = features?.filter(f => f.platform === 'extension').length || 0;
  const mobileFeatures = features?.filter(f => f.platform === 'mobile').length || 0;
  const totalFeatures = webFeatures + extensionFeatures + mobileFeatures;
  const completedFeatures = features?.filter(f => f.status === 'complete').length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{webFeatures}</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Web Features</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <Puzzle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{extensionFeatures}</p>
              <p className="text-sm text-purple-700 dark:text-purple-300">Extension Features</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{mobileFeatures}</p>
              <p className="text-sm text-green-700 dark:text-green-300">Mobile Features</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{completedFeatures}/{totalFeatures}</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">Completed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="p-4">
        <div className="flex gap-2 items-center text-sm text-muted-foreground">
          <ListTodo className="h-4 w-4" />
          <span>Showing {totalFeatures} user-facing features across 16 phases and 3 platforms</span>
        </div>
      </Card>

      {/* Phase Accordion */}
      <Accordion type="single" collapsible className="w-full">
        {phases.data?.sort((a, b) => a.phase_number - b.phase_number).map((phase) => {
          const phaseFeatures = featuresByPhase[phase.id] || { web: [], extension: [], mobile: [] };
          const phaseFeatureCount = phaseFeatures.web.length + phaseFeatures.extension.length + phaseFeatures.mobile.length;

          return (
            <AccordionItem key={phase.id} value={phase.id}>
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      Phase {phase.phase_number}: {phase.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {phaseFeatureCount} features
                    </Badge>
                  </div>
                  <Badge variant="outline">
                    Weeks {phase.start_week}-{phase.end_week}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid md:grid-cols-3 gap-6 pt-4">
                  {/* Web Features Column */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400">
                      <Globe className="h-4 w-4" />
                      Web App
                    </div>
                    {phaseFeatures.web.length > 0 ? (
                      <div className="space-y-2">
                        {phaseFeatures.web.map((feature) => (
                          <FeatureCard key={feature.id} feature={feature} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No web features</p>
                    )}
                  </div>

                  {/* Extension Features Column */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-purple-600 dark:text-purple-400">
                      <Puzzle className="h-4 w-4" />
                      Browser Extension
                    </div>
                    {phaseFeatures.extension.length > 0 ? (
                      <div className="space-y-2">
                        {phaseFeatures.extension.map((feature) => (
                          <FeatureCard key={feature.id} feature={feature} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No extension features</p>
                    )}
                  </div>

                  {/* Mobile Features Column */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-green-600 dark:text-green-400">
                      <Smartphone className="h-4 w-4" />
                      Mobile App
                    </div>
                    {phaseFeatures.mobile.length > 0 ? (
                      <div className="space-y-2">
                        {phaseFeatures.mobile.map((feature) => (
                          <FeatureCard key={feature.id} feature={feature} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No mobile features</p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function FeatureCard({ feature }: { feature: PlatformFeature }) {
  const statusConfig = {
    complete: { 
      icon: CheckCircle2, 
      color: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800', 
      label: 'Complete' 
    },
    in_progress: { 
      icon: Clock, 
      color: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800', 
      label: 'In Progress' 
    },
    planned: { 
      icon: ListTodo, 
      color: 'text-muted-foreground bg-muted border-border', 
      label: 'Planned' 
    },
  };

  const status = statusConfig[feature.status];
  const StatusIcon = status.icon;

  const categoryColors: Record<string, string> = {
    auth: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    rewards: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    ai: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    cashback: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    geofence: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    privacy: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    wallet: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
    performance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
    integration: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  };

  return (
    <Card className="p-3 hover:shadow-md transition-shadow border">
      <div className="flex items-start gap-2">
        <StatusIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${status.color.split(' ')[0]}`} />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm leading-tight">{feature.feature_name}</h4>
          {feature.feature_description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {feature.feature_description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {feature.category && (
              <Badge 
                variant="outline" 
                className={`text-xs px-1.5 py-0 ${categoryColors[feature.category] || 'bg-muted text-muted-foreground'}`}
              >
                {feature.category}
              </Badge>
            )}
            <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${status.color}`}>
              {status.label}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
