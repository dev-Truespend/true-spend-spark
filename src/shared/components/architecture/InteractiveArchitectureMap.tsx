import { useState } from "react";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface Layer {
  id: string;
  name: string;
  color: string;
  purpose: string;
  components: string[];
  group: string;
}

const layers: Layer[] = [
  { id: "1", name: "Client Layer", color: "#2563EB", purpose: "User-facing interface", components: ["React SPA", "State Management", "React Query Cache"], group: "Client & Ingress" },
  { id: "2", name: "Edge & Ingress", color: "#f97316", purpose: "Request routing and filtering", components: ["CDN", "WAF", "Edge Functions", "DDoS Protection"], group: "Client & Ingress" },
  { id: "3", name: "API Gateway", color: "#7c3aed", purpose: "Centralized API management", components: ["Request Routing", "Rate Limiting", "API Versioning"], group: "Client & Ingress" },
  { id: "4", name: "Modern Safety", color: "#16a34a", purpose: "Client-side security enforcement", components: ["CSP", "SRI", "CORS", "Security Headers"], group: "Security & Auth" },
  { id: "5", name: "Auth & Session", color: "#0284c7", purpose: "Identity and access management", components: ["Supabase Auth", "JWT", "MFA"], group: "Security & Auth" },
  { id: "6", name: "Supply Chain Security", color: "#d97706", purpose: "Third-party dependency security", components: ["Dependency Scanning", "License Compliance"], group: "Security & Auth" },
  { id: "7", name: "BFF Layer", color: "#22c55e", purpose: "Backend For Frontend", components: ["Request Aggregation", "Response Transform"], group: "Services" },
  { id: "8", name: "Business Logic", color: "#8b5cf6", purpose: "Core application functionality", components: ["Transaction Processing", "Budget Management"], group: "Services" },
  { id: "9", name: "AI Agents", color: "#9333ea", purpose: "Intelligent automation", components: ["Pattern Analysis", "Anomaly Detection", "NLP"], group: "Services" },
  { id: "10", name: "Egress Gateway", color: "#7c3aed", purpose: "External API communication", components: ["API Key Management", "Circuit Breakers"], group: "External Communication" },
  { id: "11", name: "Retry Scheduler", color: "#f97316", purpose: "Resilient communication", components: ["Exponential Backoff", "Dead Letter Queue"], group: "External Communication" },
  { id: "12", name: "Control Plane", color: "#9333ea", purpose: "System orchestration", components: ["Feature Flags", "Service Discovery"], group: "External Communication" },
  { id: "13", name: "Notification Amplifier", color: "#ea580c", purpose: "Multi-channel notifications", components: ["Email", "SMS", "Push Notifications"], group: "Messaging & Notifications" },
  { id: "14", name: "Event Bus", color: "#06b6d4", purpose: "Asynchronous events", components: ["Message Broker", "Event Streaming"], group: "Messaging & Notifications" },
  { id: "15", name: "Database", color: "#0284c7", purpose: "Persistent data storage", components: ["PostgreSQL", "Connection Pooling"], group: "Data & Storage" },
  { id: "16", name: "Storage", color: "#0891b2", purpose: "File and object storage", components: ["Object Storage", "Receipt Uploads"], group: "Data & Storage" },
  { id: "17", name: "Public Data Plane", color: "#38bdf8", purpose: "Public data services", components: ["Read Replicas", "Caching Layer"], group: "Data & Storage" },
  { id: "18", name: "Private Data Plane", color: "#b91c1c", purpose: "Secure internal data", components: ["Encrypted Storage", "Audit Logging"], group: "Data & Storage" },
  { id: "19", name: "Backup & DR", color: "#475569", purpose: "Data protection", components: ["Automated Backups", "Point-in-time Recovery"], group: "Data & Storage" },
];

const connections = [
  { from: "1", to: "2", type: "sync" },
  { from: "2", to: "3", type: "sync" },
  { from: "3", to: "4", type: "sync" },
  { from: "4", to: "5", type: "sync" },
  { from: "5", to: "6", type: "sync" },
  { from: "6", to: "7", type: "sync" },
  { from: "7", to: "8", type: "sync" },
  { from: "8", to: "9", type: "sync" },
  { from: "8", to: "10", type: "sync" },
  { from: "10", to: "11", type: "async" },
  { from: "11", to: "12", type: "async" },
  { from: "8", to: "15", type: "sync" },
  { from: "15", to: "17", type: "sync" },
  { from: "15", to: "18", type: "sync" },
  { from: "15", to: "16", type: "sync" },
  { from: "16", to: "19", type: "async" },
  { from: "8", to: "14", type: "async" },
  { from: "14", to: "13", type: "async" },
  { from: "13", to: "1", type: "async" },
];

export const InteractiveArchitectureMap = () => {
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);

  const groups = Array.from(new Set(layers.map(l => l.group)));

  const getConnectedLayers = (layerId: string) => {
    const connected = new Set<string>();
    connections.forEach(conn => {
      if (conn.from === layerId) connected.add(conn.to);
      if (conn.to === layerId) connected.add(conn.from);
    });
    return connected;
  };

  const connectedLayers = hoveredLayer ? getConnectedLayers(hoveredLayer) : new Set();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map */}
        <Card className="lg:col-span-2 p-6 bg-background/50">
          <h3 className="text-lg font-semibold mb-4">19-Layer Architecture Map</h3>
          <div className="space-y-2">
            {groups.map((group) => (
              <div key={group} className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground px-2">{group}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {layers.filter(l => l.group === group).map((layer) => {
                    const isSelected = selectedLayer?.id === layer.id;
                    const isHovered = hoveredLayer === layer.id;
                    const isConnected = connectedLayers.has(layer.id);
                    const shouldHighlight = !hoveredLayer || isHovered || isConnected;

                    return (
                      <motion.div
                        key={layer.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: shouldHighlight ? 1 : 0.3, y: 0 }}
                        transition={{ duration: 0.2 }}
                        onMouseEnter={() => setHoveredLayer(layer.id)}
                        onMouseLeave={() => setHoveredLayer(null)}
                        onClick={() => setSelectedLayer(layer)}
                        className="cursor-pointer"
                      >
                        <Card
                          className={`p-3 transition-all duration-200 ${
                            isSelected ? "ring-2 ring-primary shadow-lg" : ""
                          } ${isHovered ? "scale-105 shadow-md" : ""}`}
                          style={{
                            borderLeft: `4px solid ${layer.color}`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{layer.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{layer.purpose}</div>
                            </div>
                            <Badge
                              variant="secondary"
                              className="text-xs"
                              style={{ backgroundColor: `${layer.color}20`, color: layer.color }}
                            >
                              L{layer.id}
                            </Badge>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Details Panel */}
        <Card className="p-6 bg-background/50">
          <h3 className="text-lg font-semibold mb-4">Layer Details</h3>
          <AnimatePresence mode="wait">
            {selectedLayer ? (
              <motion.div
                key={selectedLayer.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: selectedLayer.color }}
                    />
                    <h4 className="font-semibold">{selectedLayer.name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedLayer.purpose}</p>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Components</div>
                  <div className="space-y-1">
                    {selectedLayer.components.map((component, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {component}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Group</div>
                  <Badge variant="secondary">{selectedLayer.group}</Badge>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Connections</div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {connections
                      .filter(c => c.from === selectedLayer.id || c.to === selectedLayer.id)
                      .map((conn, idx) => {
                        const other = conn.from === selectedLayer.id 
                          ? layers.find(l => l.id === conn.to)
                          : layers.find(l => l.id === conn.from);
                        const direction = conn.from === selectedLayer.id ? "→" : "←";
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {conn.type}
                            </Badge>
                            <span>
                              {direction} {other?.name}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-muted-foreground text-center py-8"
              >
                Click on any layer to view details and connections
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>

      {/* Flow Legend */}
      <Card className="p-4 bg-background/50">
        <div className="flex items-center gap-6 text-sm">
          <div className="font-medium">Flow Types:</div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-primary" />
            <span className="text-muted-foreground">Synchronous</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-primary/50 border-t-2 border-dashed" />
            <span className="text-muted-foreground">Asynchronous</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
