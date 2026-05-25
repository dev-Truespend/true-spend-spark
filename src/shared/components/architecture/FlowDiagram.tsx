import { motion } from "framer-motion";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { ArrowRight, ArrowDown, Database, Cloud, Shield, Cpu, Zap } from "lucide-react";

const flowSteps = [
  { id: 1, name: "Client", icon: Cloud, color: "#2563EB", description: "User Request" },
  { id: 2, name: "CDN/WAF", icon: Shield, color: "#f97316", description: "Security Filter" },
  { id: 3, name: "API Gateway", icon: Zap, color: "#7c3aed", description: "Rate Limit" },
  { id: 4, name: "Auth", icon: Shield, color: "#0284c7", description: "Verify Token" },
  { id: 5, name: "BFF Layer", icon: Cpu, color: "#22c55e", description: "Aggregate" },
  { id: 6, name: "Business Logic", icon: Cpu, color: "#8b5cf6", description: "Process" },
  { id: 7, name: "Database", icon: Database, color: "#0284c7", description: "Persist" },
];

const AnimatedArrow = ({ delay, vertical = false }: { delay: number; vertical?: boolean }) => {
  return (
    <motion.div
      className={`flex items-center justify-center ${vertical ? 'py-4' : 'px-4'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
    >
      <motion.div
        className="relative"
        animate={{
          [vertical ? 'y' : 'x']: [0, 8, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        }}
      >
        {vertical ? (
          <ArrowDown className="h-6 w-6 text-primary" />
        ) : (
          <ArrowRight className="h-6 w-6 text-primary" />
        )}
      </motion.div>
      <motion.div
        className={`absolute ${vertical ? 'w-0.5 h-8' : 'h-0.5 w-8'} bg-gradient-to-${vertical ? 'b' : 'r'} from-primary to-transparent`}
        animate={{
          opacity: [0.3, 1, 0.3],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        }}
      />
    </motion.div>
  );
};

export const FlowDiagram = () => {
  return (
    <Card className="p-6 bg-gradient-to-br from-background to-muted/20">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Request Lifecycle Flow</h3>
        <p className="text-sm text-muted-foreground">
          Complete journey of a request through the architecture
        </p>
      </div>

      {/* Desktop Horizontal Flow */}
      <div className="hidden lg:flex items-center justify-between">
        {flowSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
                className="relative group"
              >
                <Card
                  className="p-6 min-w-[140px] relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer"
                  style={{
                    borderTop: `4px solid ${step.color}`,
                  }}
                >
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
                    style={{ backgroundColor: step.color }}
                  />
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div
                      className="p-3 rounded-full"
                      style={{ backgroundColor: `${step.color}20` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: step.color }} />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-sm mb-1">{step.name}</div>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: step.color, color: step.color }}
                      >
                        {step.description}
                      </Badge>
                    </div>
                    <motion.div
                      className="text-xs font-mono text-muted-foreground"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.2 + 0.3 }}
                    >
                      {index + 1}/7
                    </motion.div>
                  </div>
                </Card>
                
                {/* Animated pulse effect */}
                <motion.div
                  className="absolute inset-0 rounded-lg border-2"
                  style={{ borderColor: step.color }}
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0, 0.5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: index * 0.3,
                  }}
                />
              </motion.div>

              {index < flowSteps.length - 1 && (
                <AnimatedArrow delay={index * 0.2 + 0.5} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile/Tablet Vertical Flow */}
      <div className="lg:hidden space-y-2">
        {flowSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.id}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15, duration: 0.4 }}
              >
                <Card
                  className="p-4 relative overflow-hidden"
                  style={{
                    borderLeft: `4px solid ${step.color}`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="p-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `${step.color}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: step.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm mb-1">{step.name}</div>
                      <div className="text-xs text-muted-foreground">{step.description}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {index + 1}/7
                    </Badge>
                  </div>
                </Card>
              </motion.div>
              {index < flowSteps.length - 1 && (
                <div className="flex justify-center">
                  <AnimatedArrow delay={index * 0.15 + 0.4} vertical />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Timing Information */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-8 p-4 rounded-lg bg-muted/50 border"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground mb-1">Total Time</div>
            <div className="font-semibold">~150ms</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Network</div>
            <div className="font-semibold">~50ms</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Processing</div>
            <div className="font-semibold">~80ms</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">DB Query</div>
            <div className="font-semibold">~20ms</div>
          </div>
        </div>
      </motion.div>
    </Card>
  );
};
