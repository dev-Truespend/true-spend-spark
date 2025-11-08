import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface Layer {
  id: number;
  name: string;
  color: string;
  group: string;
  x: number;
  y: number;
  z: number;
}

const layers: Layer[] = [
  { id: 1, name: "Client Layer", color: "#2563EB", group: "Client", x: 0, y: 0, z: 0 },
  { id: 2, name: "Edge & Ingress", color: "#f97316", group: "Ingress", x: 0, y: 1, z: 0 },
  { id: 3, name: "API Gateway", color: "#7c3aed", group: "Gateway", x: 0, y: 2, z: 0 },
  { id: 4, name: "Modern Safety", color: "#16a34a", group: "Security", x: -1, y: 3, z: 0 },
  { id: 5, name: "Auth & Session", color: "#0284c7", group: "Security", x: 0, y: 3, z: 0 },
  { id: 6, name: "Supply Chain", color: "#d97706", group: "Security", x: 1, y: 3, z: 0 },
  { id: 7, name: "BFF Layer", color: "#22c55e", group: "Services", x: -1, y: 4, z: 0 },
  { id: 8, name: "Business Logic", color: "#8b5cf6", group: "Services", x: 0, y: 4, z: 0 },
  { id: 9, name: "AI Agents", color: "#9333ea", group: "Services", x: 1, y: 4, z: 0 },
  { id: 10, name: "Egress Gateway", color: "#7c3aed", group: "Egress", x: -1, y: 5, z: 0 },
  { id: 11, name: "Retry Scheduler", color: "#f97316", group: "Reliability", x: 0, y: 5, z: 0 },
  { id: 12, name: "Control Plane", color: "#9333ea", group: "Reliability", x: 1, y: 5, z: 0 },
  { id: 13, name: "Notifications", color: "#ea580c", group: "Messaging", x: -0.5, y: 6, z: 0 },
  { id: 14, name: "Event Bus", color: "#06b6d4", group: "Messaging", x: 0.5, y: 6, z: 0 },
  { id: 15, name: "Database", color: "#0284c7", group: "Data", x: -1, y: 7, z: 0 },
  { id: 16, name: "Storage", color: "#0891b2", group: "Data", x: 0, y: 7, z: 0 },
  { id: 17, name: "Public Data", color: "#38bdf8", group: "Data", x: 1, y: 7, z: 0 },
  { id: 18, name: "Private Data", color: "#b91c1c", group: "Data", x: -0.5, y: 8, z: 0 },
  { id: 19, name: "Backup & DR", color: "#475569", group: "Backup", x: 0.5, y: 8, z: 0 },
];

const connections = [
  [1, 2], [2, 3], [3, 4], [3, 5], [3, 6],
  [4, 7], [5, 8], [6, 9], [7, 8], [8, 9],
  [8, 10], [8, 11], [8, 12], [8, 14],
  [14, 13], [8, 15], [8, 16], [15, 17],
  [15, 18], [16, 18], [18, 19],
];

export const IsometricArchitecture = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 0.5) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const toIsometric = (x: number, y: number, z: number) => {
    const scale = 60;
    const isoX = (x - z) * Math.cos(Math.PI / 6) * scale;
    const isoY = (x + z) * Math.sin(Math.PI / 6) * scale - y * scale;
    return { isoX, isoY };
  };

  const getConnectionPath = (from: Layer, to: Layer) => {
    const fromPos = toIsometric(from.x, from.y, from.z);
    const toPos = toIsometric(to.x, to.y, to.z);
    
    const midX = (fromPos.isoX + toPos.isoX) / 2;
    const midY = (fromPos.isoY + toPos.isoY) / 2;
    
    return `M ${fromPos.isoX + 300} ${fromPos.isoY + 100} Q ${midX + 300} ${midY + 100} ${toPos.isoX + 300} ${toPos.isoY + 100}`;
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-background via-muted/20 to-background overflow-hidden">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">3D Architecture Visualization</h3>
        <p className="text-sm text-muted-foreground">
          Isometric view of all 19 layers • Click layers for details
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Isometric View */}
        <div className="lg:col-span-2">
          <div
            ref={canvasRef}
            className="relative w-full bg-muted/30 rounded-lg border"
            style={{ height: "600px" }}
          >
            <svg
              className="w-full h-full"
              viewBox="0 0 600 700"
              style={{ transform: `rotateZ(${rotation * 0.05}deg)` }}
            >
              {/* Draw connections */}
              <g className="connections">
                {connections.map(([fromId, toId], idx) => {
                  const from = layers.find(l => l.id === fromId);
                  const to = layers.find(l => l.id === toId);
                  if (!from || !to) return null;

                  return (
                    <motion.path
                      key={idx}
                      d={getConnectionPath(from, to)}
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      fill="none"
                      opacity="0.2"
                      strokeDasharray="4 4"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, delay: idx * 0.05 }}
                    />
                  );
                })}
              </g>

              {/* Draw layers */}
              <g className="layers">
                {layers.map((layer, idx) => {
                  const { isoX, isoY } = toIsometric(layer.x, layer.y, layer.z);
                  const isHovered = hoveredLayer === layer.id;
                  const isSelected = selectedLayer?.id === layer.id;

                  return (
                    <motion.g
                      key={layer.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: isHovered || isSelected ? 1.1 : 1 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                      onMouseEnter={() => setHoveredLayer(layer.id)}
                      onMouseLeave={() => setHoveredLayer(null)}
                      onClick={() => setSelectedLayer(layer)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Block shadow */}
                      <rect
                        x={isoX + 295}
                        y={isoY + 105}
                        width="50"
                        height="50"
                        rx="4"
                        fill="black"
                        opacity="0.1"
                      />
                      
                      {/* Main block */}
                      <rect
                        x={isoX + 290}
                        y={isoY + 100}
                        width="50"
                        height="50"
                        rx="4"
                        fill={layer.color}
                        opacity={isHovered || isSelected ? 1 : 0.8}
                      />

                      {/* Hover effect */}
                      {(isHovered || isSelected) && (
                        <motion.rect
                          x={isoX + 290}
                          y={isoY + 100}
                          width="50"
                          height="50"
                          rx="4"
                          fill={layer.color}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 0.3, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}

                      {/* Layer number */}
                      <text
                        x={isoX + 315}
                        y={isoY + 130}
                        textAnchor="middle"
                        fill="white"
                        fontSize="14"
                        fontWeight="bold"
                      >
                        {layer.id}
                      </text>

                      {/* Animated pulse ring */}
                      <motion.circle
                        cx={isoX + 315}
                        cy={isoY + 125}
                        r="30"
                        stroke={layer.color}
                        strokeWidth="2"
                        fill="none"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                          opacity: [0, 0.5, 0],
                          scale: [0.8, 1.2, 0.8],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: idx * 0.1,
                        }}
                      />
                    </motion.g>
                  );
                })}
              </g>
            </svg>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg border text-xs space-y-1">
              <div className="font-semibold mb-2">Groups</div>
              {Array.from(new Set(layers.map(l => l.group))).map((group) => (
                <div key={group} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{
                      backgroundColor: layers.find(l => l.group === group)?.color,
                    }}
                  />
                  <span className="text-muted-foreground">{group}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Details Panel */}
        <div className="space-y-4">
          <Card className="p-4 bg-muted/50">
            <h4 className="font-semibold mb-3">Layer Details</h4>
            <AnimatePresence mode="wait">
              {selectedLayer ? (
                <motion.div
                  key={selectedLayer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: selectedLayer.color }}
                    >
                      {selectedLayer.id}
                    </div>
                    <div>
                      <div className="font-semibold">{selectedLayer.name}</div>
                      <Badge variant="outline" className="mt-1">
                        {selectedLayer.group}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Layer ID</span>
                      <span className="font-mono">L{selectedLayer.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Position</span>
                      <span className="font-mono">
                        ({selectedLayer.x}, {selectedLayer.y}, {selectedLayer.z})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Color</span>
                      <span className="font-mono">{selectedLayer.color}</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-muted-foreground text-center py-8"
                >
                  Select a layer to view details
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          <Card className="p-4 bg-muted/50">
            <h4 className="font-semibold mb-3">Architecture Stats</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Layers</span>
                <span className="font-semibold">19</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Layer Groups</span>
                <span className="font-semibold">
                  {Array.from(new Set(layers.map(l => l.group))).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connections</span>
                <span className="font-semibold">{connections.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Depth</span>
                <span className="font-semibold">9 levels</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Card>
  );
};
