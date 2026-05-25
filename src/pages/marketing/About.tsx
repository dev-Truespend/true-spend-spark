import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Target, Users, Heart, Sparkles } from "lucide-react";

export default function About() {
  const values = [
    {
      icon: Heart,
      title: "Privacy First",
      description: "Your financial data belongs to you. We built TrueSpend on the principle that your data should never be sold or exploited.",
    },
    {
      icon: Sparkles,
      title: "Innovation",
      description: "We leverage cutting-edge AI and machine learning to give you insights that actually help you save money and maximize rewards.",
    },
    {
      icon: Users,
      title: "User-Centric",
      description: "Every feature we build starts with one question: Does this genuinely help our users make better financial decisions?",
    },
    {
      icon: Target,
      title: "Transparency",
      description: "No hidden fees, no dark patterns, no data selling. What you see is what you get—a tool that's on your side.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      <section className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6">About Us</Badge>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
              Built for People Who <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent">Value Their Money</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              TrueSpend was created by a team of privacy advocates, financial experts, and engineers who were frustrated with expense tracking apps that profit from selling user data.
            </p>
          </div>

          <div className="space-y-12">
            <Card className="border-2">
              <CardContent className="pt-8">
                <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  To empower individuals to take control of their financial lives through intelligent expense tracking and AI-powered insights—without compromising their privacy or data security.
                </p>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-3xl font-bold mb-8 text-center">Our Core Values</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {values.map((value, idx) => (
                  <Card key={idx} className="border-2 hover:border-brand-blue/50 transition-all duration-300 hover:shadow-premium">
                    <CardContent className="pt-8">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                          <value.icon className="w-6 h-6 text-brand-blue" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                          <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="border-2 bg-gradient-to-br from-brand-blue/5 via-background to-brand-purple/5">
              <CardContent className="pt-8">
                <h2 className="text-3xl font-bold mb-4">Why We're Different</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Unlike other expense tracking apps, TrueSpend doesn't make money by selling your data to advertisers or credit card companies. We don't track your spending habits to build advertising profiles. We don't share your information with third parties.
                  </p>
                  <p>
                    Instead, we offer a freemium model: our core features are free forever, and users who want advanced AI-powered insights and optimization can upgrade to a paid plan. It's that simple.
                  </p>
                  <p>
                    We believe that your financial data is some of the most sensitive information you have, and we've built TrueSpend from the ground up with privacy and security as the foundation—not an afterthought.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
