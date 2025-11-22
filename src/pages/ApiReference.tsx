import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Code, Key, Lock, Zap } from "lucide-react";

export default function ApiReference() {
  const endpoints = [
    {
      method: "GET",
      path: "/api/v1/transactions",
      description: "Retrieve all transactions for the authenticated user",
      auth: "Required",
    },
    {
      method: "POST",
      path: "/api/v1/transactions",
      description: "Create a new transaction",
      auth: "Required",
    },
    {
      method: "GET",
      path: "/api/v1/budgets",
      description: "Get all budgets for the authenticated user",
      auth: "Required",
    },
    {
      method: "POST",
      path: "/api/v1/budgets",
      description: "Create a new budget",
      auth: "Required",
    },
    {
      method: "GET",
      path: "/api/v1/analytics",
      description: "Get spending analytics and insights",
      auth: "Required",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      <section className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6">API Reference</Badge>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
              TrueSpend <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent">API</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Build powerful integrations with TrueSpend's RESTful API. Pro plan required for API access.
            </p>
          </div>

          <div className="space-y-12">
            {/* Authentication */}
            <Card className="border-2">
              <CardContent className="pt-8">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <Lock className="w-8 h-8 text-brand-blue" />
                  Authentication
                </h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  All API requests must include your API key in the Authorization header:
                </p>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm">
                  <code>Authorization: Bearer YOUR_API_KEY</code>
                </div>
                <div className="mt-6 p-4 bg-brand-blue/5 border border-brand-blue/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-brand-blue">Note:</strong> Generate your API key in Settings → API Keys. Keep it secure and never share it publicly.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Base URL */}
            <Card className="border-2">
              <CardContent className="pt-8">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <Zap className="w-8 h-8 text-brand-purple" />
                  Base URL
                </h2>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm">
                  <code>https://api.truespend.org/v1</code>
                </div>
              </CardContent>
            </Card>

            {/* Endpoints */}
            <div>
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Code className="w-8 h-8 text-brand-teal" />
                API Endpoints
              </h2>
              <div className="space-y-4">
                {endpoints.map((endpoint, idx) => (
                  <Card key={idx} className="border-2 hover:border-brand-blue/50 transition-all duration-300">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <Badge 
                          variant={endpoint.method === "GET" ? "secondary" : "default"}
                          className="w-fit"
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="font-mono text-sm flex-grow">{endpoint.path}</code>
                        <Badge variant="outline" className="w-fit">
                          <Key className="w-3 h-3 mr-1" />
                          {endpoint.auth}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                        {endpoint.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Rate Limits */}
            <Card className="border-2 bg-gradient-to-br from-brand-blue/5 via-background to-brand-purple/5">
              <CardContent className="pt-8">
                <h2 className="text-2xl font-bold mb-4">Rate Limits</h2>
                <div className="space-y-3 text-muted-foreground leading-relaxed">
                  <p><strong className="text-foreground">Plus Plan:</strong> 1,000 requests per hour</p>
                  <p><strong className="text-foreground">Pro Plan:</strong> 10,000 requests per hour</p>
                  <p className="text-sm mt-4">
                    Rate limit headers are included in every response. If you exceed the limit, you'll receive a 429 status code.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Code Examples */}
            <Card className="border-2">
              <CardContent className="pt-8">
                <h2 className="text-3xl font-bold mb-6">Example Request</h2>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <pre>{`curl -X GET https://api.truespend.org/v1/transactions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}</pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
