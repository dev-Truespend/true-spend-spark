import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useArchitectureComponents } from "@/hooks/useProjectData";
import { Layers, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function Architecture() {
  const { data: components, isLoading } = useArchitectureComponents();

  // Group components by layer
  const layerGroups = components?.reduce((acc, comp) => {
    if (!acc[comp.layer_name]) {
      acc[comp.layer_name] = [];
    }
    acc[comp.layer_name].push(comp);
    return acc;
  }, {} as Record<string, typeof components>);

  const totalLayers = layerGroups ? Object.keys(layerGroups).length : 0;
  const implementedLayers = layerGroups 
    ? Object.values(layerGroups).filter(components => 
        components.every(c => c.status === 'Completed')
      ).length 
    : 0;
  const inProgressLayers = layerGroups
    ? Object.values(layerGroups).filter(components =>
        components.some(c => c.status === 'In Progress')
      ).length
    : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'In Progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'Testing':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Testing':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Architecture Overview</h1>
        <p className="text-muted-foreground mt-2">
          19-layer production-grade architecture with security-first design
        </p>
      </div>

      {/* Architecture Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Layers</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLayers}</div>
            <p className="text-xs text-muted-foreground">
              Enterprise architecture
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Implemented</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{implementedLayers}</div>
            <p className="text-xs text-muted-foreground">
              Layers completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressLayers}</div>
            <p className="text-xs text-muted-foreground">
              Active development
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalLayers > 0 ? Math.round((implementedLayers / totalLayers) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Architecture Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Architecture Diagram</CardTitle>
          <CardDescription>
            Complete 19-layer architecture with data flow visualization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/50 p-8">
            <pre className="text-sm overflow-x-auto">
{`
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│         Web App • Mobile PWA • Extension                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  CDN & WAF                              │
│       Cloudflare • DDoS Protection • SSL/TLS            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 API GATEWAY                             │
│      Rate Limiting • Schema Validation • Routing        │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
┌────────▼────────┐    ┌────────▼────────────────────────┐
│   BFF LAYER     │    │      AI AGENTS                  │
│  Edge Services  │    │  5 Specialized Agents           │
└────────┬────────┘    └────────┬────────────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              CORE MICROSERVICES                         │
│    8 Business Services • Transaction Processing         │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
┌────────▼────────┐    ┌────────▼────────────────────────┐
│  EGRESS GATEWAY │    │    STORAGE LAYER                │
│  External APIs  │    │  Files • Receipts • Images      │
└─────────────────┘    └─────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  DATA PLANE                             │
│         Public Data • Private Data (RLS)                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 BACKUP & DR                             │
│    Automated Backups • PITR • Replication               │
└─────────────────────────────────────────────────────────┘
`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Layer Details */}
      <Card>
        <CardHeader>
          <CardTitle>Layer Details</CardTitle>
          <CardDescription>
            Detailed breakdown of all 19 architectural layers and their components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {layerGroups && Object.entries(layerGroups).map(([layerName, layerComponents], index) => {
              const layerProgress = layerComponents.reduce((sum, c) => sum + c.implementation_progress, 0) / layerComponents.length;
              const layerColor = layerComponents[0]?.color_code || '#64748b';
              
              return (
                <AccordionItem key={layerName} value={`layer-${index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-4 w-4 rounded-full" 
                          style={{ backgroundColor: layerColor }}
                        />
                        <span className="font-semibold">{layerName}</span>
                        <Badge variant="outline" className="ml-2">
                          {layerComponents.length} components
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {Math.round(layerProgress)}%
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <Progress value={layerProgress} className="h-2" />
                      <div className="grid gap-3">
                        {layerComponents.map((component) => (
                          <div 
                            key={component.id}
                            className="flex items-start justify-between p-4 rounded-lg border bg-card"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(component.status)}
                                <h4 className="font-medium">{component.component_name}</h4>
                              </div>
                              {component.description && (
                                <p className="text-sm text-muted-foreground">
                                  {component.description}
                                </p>
                              )}
                              {component.technology && (
                                <Badge variant="secondary" className="mt-2">
                                  {component.technology}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 ml-4">
                              <Badge variant={getStatusVariant(component.status)}>
                                {component.status}
                              </Badge>
                              <span className="text-sm font-medium">
                                {component.implementation_progress}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Data Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Data Flow Patterns</CardTitle>
          <CardDescription>
            Primary request flow and data patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Ingress Flow (Client → Database)</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>→ Client Layer → CDN & WAF → API Gateway → BFF Layer</p>
                <p>→ AI Agents / Core Services → Data Plane → Event Bus</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Egress Flow (Services → External APIs)</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>→ Core Services → Egress Gateway → External APIs</p>
                <p>→ Circuit Breaker → Retry Logic → Response</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Persistence Flow</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>→ Data Plane (Write) → Storage Layer → Backup & DR</p>
                <p>→ Automated Backups → Cross-Region Replication</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
