import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Sparkles, Smartphone, Check, X, ArrowRight, Lock, Eye, Database } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import heroDevice from "@/assets/hero-device-mockup.png";
import privacyShield from "@/assets/privacy-shield.png";
import multiDevice from "@/assets/multi-device-ecosystem.png";
import aiCards from "@/assets/ai-card-recommendations.png";
import localData from "@/assets/local-first-data.png";

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      
      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <Badge variant="secondary" className="text-sm font-medium">
                Your Rewards. Your Data. Your Control.
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
                Every Purchase.
                <br />
                <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent">
                  Perfectly Rewarded.
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                Smart expense tracking that respects your privacy. Your financial data stays yours—always encrypted, never sold.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white font-semibold px-8 h-14 text-lg shadow-premium">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-8 text-sm text-muted-foreground pt-4">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-teal" />
                  <span>No credit card</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-teal" />
                  <span>Free forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-brand-teal" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/20 to-brand-purple/20 blur-3xl rounded-full"></div>
              <img 
                src={heroDevice} 
                alt="TrueSpend App Dashboard" 
                className="relative w-full h-auto drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Promise Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-brand-purple/10 via-background to-brand-blue/10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Privacy First</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Your Data is <span className="text-brand-purple">Never</span> Sold
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Unlike other apps, we don't profit from your information. Your financial data is encrypted end-to-end and stored securely on your device.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center mb-16">
            <div className="relative">
              <img 
                src={privacyShield} 
                alt="Privacy Protection" 
                className="w-full h-auto drop-shadow-2xl"
              />
            </div>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-brand-blue" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">End-to-End Encryption</h3>
                  <p className="text-muted-foreground">Your data is encrypted before it leaves your device and only you have the keys.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-brand-purple" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Zero Data Tracking</h3>
                  <p className="text-muted-foreground">We don't track, analyze, or sell your spending habits to third parties.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center flex-shrink-0">
                  <Database className="w-6 h-6 text-brand-teal" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Local-First Storage</h3>
                  <p className="text-muted-foreground">Your data lives on your device first. Cloud sync is optional and always encrypted.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <Card className="border-2 shadow-premium">
            <CardContent className="pt-8">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <p className="text-sm text-muted-foreground mb-4">Other Apps</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <X className="w-5 h-5" />
                      <span className="text-sm">Sell your data</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <X className="w-5 h-5" />
                      <span className="text-sm">Track spending habits</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <X className="w-5 h-5" />
                      <span className="text-sm">Share with advertisers</span>
                    </div>
                  </div>
                </div>
                <div className="border-x">
                  <p className="text-sm font-semibold text-brand-purple mb-4">TrueSpend</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 text-brand-teal">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">Your data stays yours</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-brand-teal">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">Zero tracking</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-brand-teal">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">Complete privacy</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-4">Banks</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <X className="w-5 h-5" />
                      <span className="text-sm">Limited insights</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <X className="w-5 h-5" />
                      <span className="text-sm">No AI optimization</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <X className="w-5 h-5" />
                      <span className="text-sm">Single account view</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Key Features - Only 3 */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Three Things We Do <span className="text-brand-blue">Exceptionally Well</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="text-center space-y-6">
              <div className="relative mx-auto w-64 h-64">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 blur-2xl rounded-full"></div>
                <img 
                  src={aiCards} 
                  alt="Smart Rewards" 
                  className="relative w-full h-full object-contain drop-shadow-2xl"
                />
              </div>
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-blue/10 mb-4">
                  <Sparkles className="w-6 h-6 text-brand-blue" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Smart Rewards</h3>
                <p className="text-muted-foreground leading-relaxed">
                  AI analyzes your spending and recommends the best credit cards for maximum rewards on every purchase.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="text-center space-y-6">
              <div className="relative mx-auto w-64 h-64">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/20 to-brand-teal/20 blur-2xl rounded-full"></div>
                <img 
                  src={localData} 
                  alt="Privacy First" 
                  className="relative w-full h-full object-contain drop-shadow-2xl"
                />
              </div>
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-purple/10 mb-4">
                  <Shield className="w-6 h-6 text-brand-purple" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Privacy-First</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your financial data never leaves your device unencrypted. We can't see it, sell it, or share it. Period.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="text-center space-y-6">
              <div className="relative mx-auto w-64 h-64">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-teal/20 to-brand-blue/20 blur-2xl rounded-full"></div>
                <img 
                  src={multiDevice} 
                  alt="Everywhere You Shop" 
                  className="relative w-full h-full object-contain drop-shadow-2xl"
                />
              </div>
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-teal/10 mb-4">
                  <Smartphone className="w-6 h-6 text-brand-teal" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Everywhere You Shop</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Works seamlessly across mobile, desktop, and browser. Your data syncs securely in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - 3 Steps */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Getting Started is <span className="text-brand-purple">Simple</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Three easy steps to smarter spending
            </p>
          </div>

          <div className="space-y-12">
            <div className="flex items-start gap-8">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white text-2xl font-bold shadow-large">
                1
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3">Create Your Free Account</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Sign up with email or Google in seconds. No credit card required, no commitment.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-8">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-teal flex items-center justify-center text-white text-2xl font-bold shadow-large">
                2
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3">Track Your Expenses</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Snap photos of receipts or manually add transactions. Everything stays private on your device.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-8">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-teal to-brand-blue flex items-center justify-center text-white text-2xl font-bold shadow-large">
                3
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3">Get Smart Recommendations</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Receive AI-powered insights and card suggestions tailored to maximize your rewards.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Pricing */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free, upgrade when you're ready
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <Card className="border-2 hover:border-primary/50 transition-all">
              <CardContent className="pt-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Free</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-teal" />
                    <span>Track unlimited expenses</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-teal" />
                    <span>Receipt scanning</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-teal" />
                    <span>Basic budgets</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-teal" />
                    <span>End-to-end encryption</span>
                  </li>
                </ul>
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plus Plan */}
            <Card className="border-2 border-brand-purple shadow-premium relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-blue to-brand-purple text-white">
                Most Popular
              </Badge>
              <CardContent className="pt-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Plus</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">$9</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-brand-purple font-medium mt-2">Average savings: $250/month</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-purple" />
                    <span className="font-medium">Everything in Free, plus:</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-purple" />
                    <span>AI card recommendations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-purple" />
                    <span>Smart budgets with alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-purple" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-purple" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Link to="/auth" className="block">
                  <Button className="w-full bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white shadow-large">
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-2 hover:border-primary/50 transition-all">
              <CardContent className="pt-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Pro</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">$19</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-teal" />
                    <span className="font-medium">Everything in Plus, plus:</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-teal" />
                    <span>Location-based budgets</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-teal" />
                    <span>Custom categories</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-teal" />
                    <span>Export & integrations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand-teal" />
                    <span>White-glove onboarding</span>
                  </li>
                </ul>
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-brand-blue mb-2">10K+</div>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-brand-purple mb-2">$2M+</div>
              <p className="text-sm text-muted-foreground">Rewards Earned</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-brand-teal mb-2">99.9%</div>
              <p className="text-sm text-muted-foreground">Uptime SLA</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-brand-blue mb-2">SOC 2</div>
              <p className="text-sm text-muted-foreground">Certified Security</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Take Control of Your Finances?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust TrueSpend with their financial privacy.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 text-white font-semibold px-12 h-16 text-lg shadow-premium">
              Get Started Free
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-6">
            No credit card required • Free forever • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
