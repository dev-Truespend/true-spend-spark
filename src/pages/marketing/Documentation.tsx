import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Book, Code, Zap, Shield, Smartphone, Chrome } from "lucide-react";
import { Link } from "react-router-dom";

export default function Documentation() {
  const sections = [
    {
      icon: Zap,
      title: "Getting Started",
      description: "Learn the basics of TrueSpend",
      topics: [
        "Creating your account",
        "Adding your first transaction",
        "Setting up budgets",
        "Connecting credit cards",
      ],
    },
    {
      icon: Smartphone,
      title: "Mobile Apps",
      description: "iOS and Android documentation",
      topics: [
        "Installing the mobile app",
        "Camera receipt scanning",
        "Push notifications setup",
        "Geofencing features",
      ],
    },
    {
      icon: Chrome,
      title: "Browser Extension",
      description: "Track expenses while shopping",
      topics: [
        "Installing the extension",
        "Real-time budget alerts",
        "Merchant detection",
        "Auto-sync with mobile",
      ],
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "How we protect your data",
      topics: [
        "End-to-end encryption",
        "Local-first storage",
        "Data export and deletion",
        "Security best practices",
      ],
    },
    {
      icon: Code,
      title: "API Reference",
      description: "Integrate with TrueSpend",
      topics: [
        "Authentication",
        "Transactions API",
        "Budgets API",
        "Webhooks",
      ],
    },
    {
      icon: Book,
      title: "Advanced Features",
      description: "Power user guides",
      topics: [
        "AI budget optimization",
        "Custom categories",
        "Data analytics",
        "Bulk import/export",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      <section className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6">Documentation</Badge>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
              Everything You Need to <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent">Know</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Comprehensive guides, tutorials, and API documentation to help you get the most out of TrueSpend.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sections.map((section, idx) => (
              <Card key={idx} className="border-2 hover:border-brand-blue/50 transition-all duration-300 hover:shadow-premium group">
                <CardContent className="pt-8">
                  <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <section.icon className="w-6 h-6 text-brand-blue" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 group-hover:text-brand-blue transition-colors">{section.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
                  <ul className="space-y-2">
                    {section.topics.map((topic, topicIdx) => (
                      <li key={topicIdx} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-2"></div>
                        <span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">{topic}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-2 bg-gradient-to-br from-brand-blue/5 via-background to-brand-purple/5 mt-12">
            <CardContent className="pt-8 text-center">
              <h2 className="text-3xl font-bold mb-4">Can't Find What You're Looking For?</h2>
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
                Our support team is here to help. Search our knowledge base or contact us directly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/community">
                  <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-brand-blue to-brand-purple text-white font-semibold hover:opacity-90 transition-opacity">
                    Visit Community Forum
                  </button>
                </Link>
                <a href="mailto:support@truespend.org">
                  <button className="px-6 py-3 rounded-lg border-2 border-border hover:border-brand-blue hover:text-brand-blue transition-all font-semibold">
                    Contact Support
                  </button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
