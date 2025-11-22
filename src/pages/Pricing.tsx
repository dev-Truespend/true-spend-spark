import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, ArrowRight, Sparkles, Shield, Smartphone, 
  Laptop, Tablet, Globe, Zap, TrendingUp, Brain, 
  Lock, Database, MapPin, Receipt, Camera, BarChart3
} from "lucide-react";

export default function Pricing() {
  const features = {
    free: [
      { icon: Receipt, text: "Unlimited receipt scanning" },
      { icon: Camera, text: "OCR text extraction" },
      { icon: BarChart3, text: "Basic expense tracking" },
      { icon: Shield, text: "End-to-end encryption" },
      { icon: Database, text: "Local-first storage" },
      { icon: Globe, text: "Web & mobile access" },
    ],
    plus: [
      { icon: Brain, text: "AI-powered card recommendations" },
      { icon: Sparkles, text: "Smart budget optimization" },
      { icon: TrendingUp, text: "Advanced spending analytics" },
      { icon: Zap, text: "Real-time alerts & notifications" },
      { icon: MapPin, text: "Location-based insights" },
      { icon: Lock, text: "Priority support" },
    ],
    pro: [
      { icon: MapPin, text: "Geofencing & location budgets" },
      { icon: Globe, text: "Custom categories & tags" },
      { icon: Database, text: "Advanced data export (CSV, JSON)" },
      { icon: Zap, text: "API access for integrations" },
      { icon: Shield, text: "White-glove onboarding" },
      { icon: Brain, text: "Dedicated account manager" },
    ],
  };

  const platforms = [
    { icon: Smartphone, name: "iOS & Android", desc: "Native mobile apps" },
    { icon: Laptop, name: "Desktop", desc: "Windows, Mac, Linux" },
    { icon: Tablet, name: "Tablet", desc: "iPad & Android tablets" },
    { icon: Globe, name: "Web", desc: "Any modern browser" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge variant="secondary" className="mb-6 text-base px-6 py-2">
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Choose Your <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent">Perfect Plan</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Start free forever. Upgrade when you need advanced features. All plans include privacy-first architecture and work seamlessly across all your devices.
          </p>
          
          {/* Platform Showcase */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
            {platforms.map((platform, idx) => (
              <div 
                key={idx}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-brand-blue/10 hover:to-brand-purple/10 transition-all duration-300 hover:scale-105 hover:shadow-medium"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 flex items-center justify-center">
                  <platform.icon className="w-7 h-7 text-brand-purple" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm mb-1">{platform.name}</div>
                  <div className="text-xs text-muted-foreground">{platform.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-3 gap-10">
            
            {/* Free Plan */}
            <Card className="border-2 hover:border-brand-blue/50 transition-all duration-300 hover:shadow-large group">
              <CardContent className="pt-8 space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-blue/10 group-hover:scale-110 transition-transform duration-300">
                    <Shield className="w-7 h-7 text-brand-blue" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold mb-2">Free</h3>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-5xl font-bold">$0</span>
                      <span className="text-muted-foreground text-lg">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Perfect for individuals starting their expense tracking journey
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <p className="font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-blue" />
                    Everything you need to start
                  </p>
                  <ul className="space-y-3">
                    {features.free.map((feature, idx) => {
                      const Icon = feature.icon;
                      return (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon className="w-3 h-3 text-brand-blue" />
                          </div>
                          <span className="text-sm">{feature.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <Link to="/auth" className="block">
                  <Button variant="outline" size="lg" className="w-full group-hover:border-brand-blue group-hover:text-brand-blue transition-colors">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plus Plan */}
            <Card className="border-2 border-brand-purple shadow-premium relative group scale-[1.02] lg:scale-[1.05]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal text-white px-6 py-2 text-sm font-semibold shadow-large">
                  🔥 Most Popular
                </Badge>
              </div>
              
              <CardContent className="pt-12 space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-purple/20 to-brand-blue/20 group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="w-7 h-7 text-brand-purple" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold mb-2">Plus</h3>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-5xl font-bold bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">$9</span>
                      <span className="text-muted-foreground text-lg">/month</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20">
                      <TrendingUp className="w-4 h-4 text-brand-purple" />
                      <p className="text-sm font-semibold text-brand-purple">
                        Average savings: $250/month
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      For power users who want AI-driven optimization and maximum rewards
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <p className="font-semibold mb-4 flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-purple" />
                    Everything in Free, plus:
                  </p>
                  <ul className="space-y-3">
                    {features.plus.map((feature, idx) => {
                      const Icon = feature.icon;
                      return (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon className="w-3 h-3 text-brand-purple" />
                          </div>
                          <span className="text-sm font-medium">{feature.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <Link to="/auth" className="block">
                  <Button size="lg" className="w-full bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal hover:opacity-90 text-white font-semibold shadow-premium group-hover:shadow-glow transition-all">
                    Start 14-Day Free Trial
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <p className="text-xs text-center text-muted-foreground">
                  No credit card required • Cancel anytime
                </p>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-2 hover:border-brand-teal/50 transition-all duration-300 hover:shadow-large group">
              <CardContent className="pt-8 space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-teal/10 group-hover:scale-110 transition-transform duration-300">
                    <Zap className="w-7 h-7 text-brand-teal" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold mb-2">Pro</h3>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-5xl font-bold">$19</span>
                      <span className="text-muted-foreground text-lg">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      For businesses and professionals who need advanced features and integrations
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <p className="font-semibold mb-4 flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-teal" />
                    Everything in Plus, plus:
                  </p>
                  <ul className="space-y-3">
                    {features.pro.map((feature, idx) => {
                      const Icon = feature.icon;
                      return (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-brand-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon className="w-3 h-3 text-brand-teal" />
                          </div>
                          <span className="text-sm">{feature.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <Link to="/auth" className="block">
                  <Button variant="outline" size="lg" className="w-full group-hover:border-brand-teal group-hover:text-brand-teal transition-colors">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">Everything you need to know about our pricing</p>
          </div>
          
          <div className="space-y-6">
            <Card className="border-2 hover:border-brand-blue/30 transition-colors">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-2">Can I switch plans anytime?</h3>
                <p className="text-muted-foreground">Yes! Upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the difference.</p>
              </CardContent>
            </Card>
            
            <Card className="border-2 hover:border-brand-blue/30 transition-colors">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-2">Is the free plan really free forever?</h3>
                <p className="text-muted-foreground">Absolutely! Our Free plan includes unlimited expense tracking, receipt scanning, and end-to-end encryption—forever, no credit card required.</p>
              </CardContent>
            </Card>
            
            <Card className="border-2 hover:border-brand-blue/30 transition-colors">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-2">What payment methods do you accept?</h3>
                <p className="text-muted-foreground">We accept all major credit cards, debit cards, and digital wallets. All payments are processed securely through Stripe.</p>
              </CardContent>
            </Card>
            
            <Card className="border-2 hover:border-brand-blue/30 transition-colors">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-2">Do you offer refunds?</h3>
                <p className="text-muted-foreground">Yes! If you're not satisfied within the first 30 days, we'll give you a full refund—no questions asked.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

    </div>
  );
}
