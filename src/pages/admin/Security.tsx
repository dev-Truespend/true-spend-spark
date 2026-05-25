import { Phase2TestSuite } from "@/shared/components/testing/Phase2TestSuite";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Shield, Lock, Zap, Globe } from "lucide-react";

export default function Security() {
  const securityLayers = [
    {
      icon: Globe,
      title: "Layer 2: Edge & Ingress",
      description: "CDN, WAF, DDoS Protection",
      status: "Configured",
      items: [
        "Cloudflare CDN integration",
        "WAF managed rules (OWASP, Cloudflare)",
        "Rate limiting (API & Login)",
        "DDoS mitigation",
      ],
    },
    {
      icon: Zap,
      title: "Layer 3: API Gateway",
      description: "Request validation, routing, rate limiting",
      status: "Active",
      items: [
        "Rate limiter edge function",
        "Request validation & sanitization",
        "Health check endpoint",
        "Intelligent routing",
      ],
    },
    {
      icon: Lock,
      title: "Layer 4: Modern Safety",
      description: "CSP, SRI, Security headers",
      status: "Implemented",
      items: [
        "Content Security Policy (CSP)",
        "Subresource Integrity (SRI)",
        "Security headers (HSTS, X-Frame-Options, etc.)",
        "CSP violation reporting",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Security Dashboard</h1>
        <p className="text-muted-foreground">
          Phase 2 implementation: Multi-layered security architecture
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {securityLayers.map((layer) => {
          const Icon = layer.icon;
          return (
            <Card key={layer.title}>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{layer.title}</CardTitle>
                </div>
                <CardDescription>{layer.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">
                    {layer.status}
                  </span>
                </div>
                <ul className="space-y-2">
                  {layer.items.map((item) => (
                    <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Phase2TestSuite />

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>
            Manual configuration required for full security deployment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. CDN Configuration</h4>
              <p className="text-sm text-muted-foreground">
                Follow <code>docs/CDN_SETUP.md</code> to configure Cloudflare CDN with caching rules and performance optimization.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. WAF Setup</h4>
              <p className="text-sm text-muted-foreground">
                Follow <code>docs/WAF_SETUP.md</code> to enable managed rules, custom rules, and bot protection.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">3. DDoS Protection</h4>
              <p className="text-sm text-muted-foreground">
                Follow <code>docs/DDOS_PROTECTION.md</code> to configure advanced DDoS mitigation and monitoring.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">4. Production Build</h4>
              <p className="text-sm text-muted-foreground">
                Build and deploy to production to enable SRI hash generation and verify all security features.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}