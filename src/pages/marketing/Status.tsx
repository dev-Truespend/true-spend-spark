import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { CheckCircle2, AlertCircle, Globe, Database, Zap, Shield } from "lucide-react";

export default function Status() {
  const services = [
    {
      icon: Globe,
      name: "Web Application",
      status: "operational",
      uptime: "99.99%",
    },
    {
      icon: Database,
      name: "Database",
      status: "operational",
      uptime: "99.98%",
    },
    {
      icon: Zap,
      name: "API",
      status: "operational",
      uptime: "99.97%",
    },
    {
      icon: Shield,
      name: "Authentication",
      status: "operational",
      uptime: "99.99%",
    },
  ];

  const incidents = [
    {
      date: "Dec 15, 2024",
      title: "Brief API Latency",
      description: "Increased response times on API endpoints. Resolved in 12 minutes.",
      status: "resolved",
    },
    {
      date: "Dec 10, 2024",
      title: "Scheduled Maintenance",
      description: "Database optimization and infrastructure upgrades completed successfully.",
      status: "resolved",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      <section className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6">System Status</Badge>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
              All Systems <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent">Operational</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Real-time status and uptime monitoring for all TrueSpend services.
            </p>
          </div>

          <div className="space-y-12">
            {/* Current Status */}
            <Card className="border-2 bg-gradient-to-br from-brand-teal/5 via-background to-brand-teal/10">
              <CardContent className="pt-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-brand-teal mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">All Systems Operational</h2>
                <p className="text-muted-foreground">
                  Last updated: {new Date().toLocaleString()}
                </p>
              </CardContent>
            </Card>

            {/* Service Status */}
            <div>
              <h2 className="text-3xl font-bold mb-8">Service Status</h2>
              <div className="space-y-4">
                {services.map((service, idx) => (
                  <Card key={idx} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                            <service.icon className="w-5 h-5 text-brand-blue" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{service.name}</h3>
                            <p className="text-sm text-muted-foreground">30-day uptime: {service.uptime}</p>
                          </div>
                        </div>
                        <Badge variant="availableNow" className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Operational
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Uptime Graph Placeholder */}
            <Card className="border-2">
              <CardContent className="pt-8">
                <h3 className="text-2xl font-bold mb-6">90-Day Uptime History</h3>
                <div className="h-32 bg-gradient-to-r from-brand-teal/20 to-brand-blue/20 rounded-lg flex items-end justify-center p-4">
                  <div className="flex gap-1 items-end h-full">
                    {Array.from({ length: 90 }).map((_, idx) => (
                      <div 
                        key={idx} 
                        className="flex-1 bg-brand-teal rounded-sm" 
                        style={{ height: `${Math.random() * 20 + 80}%` }}
                      ></div>
                    ))}
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Average uptime: 99.98%
                </p>
              </CardContent>
            </Card>

            {/* Incident History */}
            <div>
              <h2 className="text-3xl font-bold mb-8">Recent Incidents</h2>
              <div className="space-y-4">
                {incidents.map((incident, idx) => (
                  <Card key={idx} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{incident.title}</h3>
                            <Badge variant="outline" className="text-xs">Resolved</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{incident.description}</p>
                          <p className="text-xs text-muted-foreground">{incident.date}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Subscribe to Updates */}
            <Card className="border-2 bg-gradient-to-br from-brand-blue/5 via-background to-brand-purple/5">
              <CardContent className="pt-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Get Status Updates</h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
                  Subscribe to receive notifications about system status, planned maintenance, and incident updates.
                </p>
                <button className="px-8 py-3 rounded-lg bg-gradient-to-r from-brand-blue to-brand-purple text-white font-semibold hover:opacity-90 transition-opacity">
                  Subscribe to Updates
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
