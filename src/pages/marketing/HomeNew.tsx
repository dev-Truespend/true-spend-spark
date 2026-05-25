import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  MapPin,
  CreditCard,
  Camera,
  PieChart,
  Shield,
  Smartphone,
  Chrome,
  Check,
  X,
  Star,
  ArrowRight,
  Zap,
  Lock,
  TrendingUp,
  Users,
  Award,
  Clock,
  DollarSign,
  Target,
  Sparkles,
  ShieldCheck,
  Wallet,
  Receipt,
  Bell,
  BarChart3,
  Globe,
  Layers,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Loader2 } from "lucide-react";

import featureGeofencing from "@/assets/feature-geofencing.png";
import featureCardSuggestions from "@/assets/feature-card-suggestions.png";
import featureSecurity from "@/assets/feature-security.png";
import featureMultiplatform from "@/assets/feature-multiplatform.png";
import featureReceiptScanning from "@/assets/feature-receipt-scanning.png";
import featureBudgetTracking from "@/assets/feature-budget-tracking.png";

const Home = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Enhanced */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 gradient-animate opacity-10" />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 animate-float-slow">
          <div className="glass w-16 h-16 rounded-2xl flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="absolute bottom-40 right-20 animate-float" style={{ animationDelay: '1s' }}>
          <div className="glass w-20 h-20 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-accent" />
          </div>
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-5xl mx-auto text-center space-y-8 animate-fade-in-up">
            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Badge variant="outline" className="pill-badge glass border-border/50">
                <Users className="w-4 h-4" />
                50,000+ Active Users
              </Badge>
              <Badge variant="outline" className="pill-badge glass border-border/50">
                <ShieldCheck className="w-4 h-4" />
                SOC 2 Compliant
              </Badge>
              <Badge variant="outline" className="pill-badge glass border-border/50">
                <Award className="w-4 h-4" />
                99.9% Uptime
              </Badge>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Never Miss a{" "}
              <span className="gradient-text">Reward.</span>
              <br />
              Ever Again.
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light">
              The smartest way to maximize credit card rewards, stack coupons, and track expenses.
              <span className="block mt-2 text-primary font-semibold">
                Join 50,000+ users who've saved $10M+ in rewards.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button
                size="lg"
                className="text-lg px-8 py-6 shadow-premium hover:shadow-premium-hover transition-all animate-pulse-glow"
                onClick={() => navigate("/auth")}
              >
                <Zap className="w-5 h-5 mr-2" />
                Start Saving Now - It's Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-sm text-muted-foreground">
                No credit card required • 50,000+ users trust us
              </p>
            </div>

            {/* Value Props */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-4xl mx-auto">
              <div className="glass rounded-2xl p-6 text-center hover:scale-105 transition-transform">
                <div className="text-3xl font-bold gradient-text mb-2">$150/mo</div>
                <p className="text-sm text-muted-foreground">Average Savings</p>
              </div>
              <div className="glass rounded-2xl p-6 text-center hover:scale-105 transition-transform">
                <div className="text-3xl font-bold gradient-text mb-2">100ft</div>
                <p className="text-sm text-muted-foreground">Geofence Precision</p>
              </div>
              <div className="glass rounded-2xl p-6 text-center hover:scale-105 transition-transform">
                <div className="text-3xl font-bold gradient-text mb-2">3sec</div>
                <p className="text-sm text-muted-foreground">Coupon Testing</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Enhanced */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Users, value: "50,000+", label: "Active Users", color: "text-primary" },
              { icon: DollarSign, value: "$10M+", label: "Total Rewards Saved", color: "text-accent" },
              { icon: Clock, value: "99.9%", label: "Uptime SLA", color: "text-chart-3" },
              { icon: Star, value: "4.9/5", label: "User Rating", color: "text-chart-4" },
            ].map((stat, idx) => (
              <Card key={idx} className="glass-dark border-border/50 hover:scale-105 transition-all card-hover">
                <CardContent className="pt-6 text-center">
                  <stat.icon className={`w-8 h-8 mx-auto mb-4 ${stat.color}`} />
                  <div className="text-3xl md:text-4xl font-bold gradient-text mb-2 animate-counter-up">
                    {stat.value}
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Smart Coupon Stacking Section - NEW */}
      <section className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Badge variant="accent" className="mb-6 animate-shimmer">
              <Sparkles className="w-4 h-4 mr-2" />
              NEW: AI-Powered Coupon Engine
            </Badge>
            
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 animate-slide-in-left">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Stack Coupons.{" "}
                  <span className="gradient-text">Maximize Savings.</span>
                </h2>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Our AI-powered coupon stacking engine automatically tests <strong className="text-foreground">10-15 coupon combinations</strong> at checkout in under 3 seconds, finding the absolute best deal every single time.
                </p>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 glass rounded-xl">
                    <div className="text-3xl font-bold text-accent mb-1">25%</div>
                    <div className="text-xs text-muted-foreground">Up To Savings</div>
                  </div>
                  <div className="text-center p-4 glass rounded-xl">
                    <div className="text-3xl font-bold text-primary mb-1">10-15</div>
                    <div className="text-xs text-muted-foreground">Codes Tested</div>
                  </div>
                  <div className="text-center p-4 glass rounded-xl">
                    <div className="text-3xl font-bold text-chart-3 mb-1">&lt;3s</div>
                    <div className="text-xs text-muted-foreground">Testing Time</div>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  {[
                    "Tests every coupon combination automatically",
                    "Works on all major shopping sites",
                    "Average savings: 10-15% per purchase",
                    "Up to 25% on big-ticket items",
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button size="lg" variant="gradient" className="mt-6">
                  Try Coupon Stacking Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

              <div className="relative animate-slide-in-right">
                <div className="gradient-border">
                  <div className="gradient-border-inner">
                    <div className="space-y-4">
                      {/* Mock coupon testing animation */}
                      {[
                        { code: "SAVE20", status: "testing", savings: "$24.50" },
                        { code: "WELCOME15", status: "testing", savings: "$18.75" },
                        { code: "FREESHIP", status: "testing", savings: "$8.99" },
                        { code: "STACK25", status: "best", savings: "$31.25" },
                      ].map((coupon, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-4 rounded-lg ${
                            coupon.status === "best"
                              ? "bg-accent/10 border-2 border-accent"
                              : "bg-muted/50"
                          }`}
                          style={{ animationDelay: `${idx * 0.2}s` }}
                        >
                          <div className="flex items-center gap-3">
                            {coupon.status === "best" ? (
                              <CheckCircle2 className="w-5 h-5 text-accent" />
                            ) : (
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            )}
                            <span className="font-mono font-semibold">{coupon.code}</span>
                          </div>
                          <span className={coupon.status === "best" ? "text-accent font-bold" : "text-muted-foreground"}>
                            {coupon.savings}
                          </span>
                        </div>
                      ))}
                      
                      <div className="text-center pt-4">
                        <Badge variant="accent" className="text-base">
                          <Sparkles className="w-4 h-4 mr-2" />
                          Best Deal Found: Save $31.25!
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Precision Geofencing Section - Enhanced */}
      <section className="py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="relative order-2 md:order-1 animate-slide-in-left">
                <img
                  src={featureGeofencing}
                  alt="Precision Geofencing"
                  className="rounded-2xl shadow-premium card-3d"
                />
                <div className="absolute -top-4 -right-4 glass rounded-2xl p-4 animate-float">
                  <div className="text-2xl font-bold gradient-text">100ft</div>
                  <div className="text-xs text-muted-foreground">Precision</div>
                </div>
              </div>

              <div className="space-y-6 order-1 md:order-2 animate-slide-in-right">
                <Badge variant="teal" className="mb-2">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location Intelligence
                </Badge>
                
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                  The Right Card.{" "}
                  <span className="gradient-text">At The Right Time.</span>
                </h2>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Walk into any store and instantly know which card gives you the most cashback. Our <strong className="text-foreground">100ft precision geofencing</strong> with parking lot detection is <strong className="text-accent">3x more accurate</strong> than competitors.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="glass rounded-xl p-4">
                    <Target className="w-6 h-6 text-accent mb-2" />
                    <div className="font-semibold">100ft Precision</div>
                    <div className="text-sm text-muted-foreground">Industry-leading accuracy</div>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <Zap className="w-6 h-6 text-primary mb-2" />
                    <div className="font-semibold">3x More Accurate</div>
                    <div className="text-sm text-muted-foreground">vs. competitors</div>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <MapPin className="w-6 h-6 text-chart-3 mb-2" />
                    <div className="font-semibold">Parking Detection</div>
                    <div className="text-sm text-muted-foreground">Alert before you walk in</div>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <Bell className="w-6 h-6 text-chart-4 mb-2" />
                    <div className="font-semibold">No Spam</div>
                    <div className="text-sm text-muted-foreground">Only relevant alerts</div>
                  </div>
                </div>

                <ul className="space-y-3">
                  {[
                    "Set custom spending zones and budgets",
                    "Get intelligent alerts automatically",
                    "No spam, no guesswork—just smart savings",
                    "Works everywhere: grocery stores, gas stations, restaurants",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Card Recommendations - Enhanced */}
      <section className="py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 animate-slide-in-left">
                <Badge variant="accent" className="mb-2">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI-Powered Intelligence
                </Badge>
                
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Your Personal{" "}
                  <span className="gradient-text">Rewards Maximizer</span>
                </h2>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  AI instantly finds your best card at checkout, applies every coupon, tracks price drops, and compares prices—all while you shop. Works seamlessly on <strong className="text-foreground">Chrome and Safari</strong>. Zero effort, maximum rewards.
                </p>

                <div className="glass rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Average Monthly Savings</span>
                    <span className="text-2xl font-bold gradient-text">$150</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-accent w-[85%] animate-shimmer" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Join users saving an average of $1,800/year in rewards they would have missed
                  </p>
                </div>

                <ul className="space-y-3">
                  {[
                    "Automatic card selection at every purchase",
                    "Real-time price comparison across stores",
                    "Instant coupon application (no searching)",
                    "Price drop tracking on past purchases",
                    "Works on 10,000+ shopping sites",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative animate-slide-in-right">
                <img
                  src={featureCardSuggestions}
                  alt="AI Card Recommendations"
                  className="rounded-2xl shadow-premium card-3d"
                />
                <div className="absolute -bottom-4 -left-4 glass-dark rounded-2xl p-4 animate-pulse-glow">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    <div>
                      <div className="text-sm font-semibold">AI Active</div>
                      <div className="text-xs text-muted-foreground">Analyzing best card...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Receipt Scanning - Enhanced */}
      <section className="py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="relative order-2 md:order-1 animate-slide-in-left">
                <img
                  src={featureReceiptScanning}
                  alt="Receipt Scanning"
                  className="rounded-2xl shadow-premium card-3d"
                />
                <div className="absolute top-4 right-4 glass rounded-xl p-3 animate-float">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-accent" />
                    <span className="text-sm font-semibold">99.9% Accurate</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 order-1 md:order-2 animate-slide-in-right">
                <Badge variant="accent">
                  <Camera className="w-4 h-4 mr-2" />
                  Instant OCR Technology
                </Badge>
                
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Snap a Photo.{" "}
                  <span className="gradient-text">Done.</span>
                </h2>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Our AI-powered OCR extracts transaction details in under <strong className="text-foreground">2 seconds</strong> with <strong className="text-accent">99.9% accuracy</strong>. Auto-categorization, searchable digital archive, and warranty tracking—all from one photo.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="glass rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold gradient-text mb-1">&lt;2s</div>
                    <div className="text-sm text-muted-foreground">Processing Time</div>
                  </div>
                  <div className="glass rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold gradient-text mb-1">99.9%</div>
                    <div className="text-sm text-muted-foreground">Accuracy Rate</div>
                  </div>
                </div>

                <ul className="space-y-3">
                  {[
                    "Automatic merchant and category detection",
                    "Digital archive of all receipts (never lose one again)",
                    "Warranty tracking with expiration reminders",
                    "Tax deduction helper for business expenses",
                    "Works with crumpled, faded, or damaged receipts",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Budget Tracking - Enhanced */}
      <section className="py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 animate-slide-in-left">
                <Badge variant="teal">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Smart Budget Intelligence
                </Badge>
                
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Stay On Track.{" "}
                  <span className="gradient-text">Effortlessly.</span>
                </h2>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Set category budgets and get intelligent alerts <strong className="text-foreground">BEFORE you overspend</strong>. Our predictive AI analyzes your spending patterns and warns you <strong className="text-accent">3 days before</strong> you hit limits.
                </p>

                <div className="glass rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Dining Budget</span>
                    <span className="text-sm font-semibold text-accent">$450 / $500</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-chart-3 to-accent w-[90%]" />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-accent" />
                    <span className="text-muted-foreground">
                      Predicted to exceed in 3 days at current pace
                    </span>
                  </div>
                </div>

                <ul className="space-y-3">
                  {[
                    "Predictive alerts before you overspend",
                    "Beautiful visualizations of spending trends",
                    "Automatic anomaly detection (unusual purchases)",
                    "Custom budget categories and time periods",
                    "Family budget sharing and tracking",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-chart-3 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative animate-slide-in-right">
                <img
                  src={featureBudgetTracking}
                  alt="Budget Tracking"
                  className="rounded-2xl shadow-premium card-3d"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-Time Features Section - NEW */}
      <section className="py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-4 animate-fade-in-up">
              <Badge variant="accent" className="mb-4">
                <Zap className="w-4 h-4 mr-2" />
                Lightning Fast Sync
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Real-Time Everything.{" "}
                <span className="gradient-text">Everywhere.</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Your data syncs instantly across all devices. Make a change anywhere, see it everywhere.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: Zap,
                  title: "Instant Updates",
                  description: "Changes sync in real-time across all your devices",
                  color: "text-primary",
                },
                {
                  icon: Globe,
                  title: "Real-Time Sync",
                  description: "Web, mobile, and extension stay perfectly in sync",
                  color: "text-accent",
                },
                {
                  icon: Bell,
                  title: "Live Notifications",
                  description: "Get instant alerts when you enter geofences",
                  color: "text-chart-3",
                },
                {
                  icon: Layers,
                  title: "Auto Categorization",
                  description: "Transactions categorized automatically as you spend",
                  color: "text-chart-4",
                },
              ].map((feature, idx) => (
                <Card key={idx} className="glass border-border/50 hover:scale-105 transition-all card-hover">
                  <CardContent className="pt-6">
                    <feature.icon className={`w-12 h-12 ${feature.color} mb-4`} />
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - NEW */}
      <section className="py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-4 animate-fade-in-up">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Get Started in{" "}
                <span className="gradient-text">3 Simple Steps</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                From signup to savings in under 5 minutes
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  icon: Wallet,
                  title: "Connect Your Cards",
                  description: "Add your credit cards securely. We never store card credentials—only reward categories.",
                  color: "text-primary",
                },
                {
                  step: "2",
                  icon: Chrome,
                  title: "Shop Anywhere",
                  description: "Our AI watches in the background, automatically optimizing every purchase.",
                  color: "text-accent",
                },
                {
                  step: "3",
                  icon: TrendingUp,
                  title: "Maximize Rewards",
                  description: "Sit back and watch your rewards grow. Average users save $150/month automatically.",
                  color: "text-chart-3",
                },
              ].map((step, idx) => (
                <div key={idx} className="relative animate-fade-in-up" style={{ animationDelay: `${idx * 0.2}s` }}>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl shadow-premium">
                    {step.step}
                  </div>
                  <Card className="glass border-border/50 pt-12 h-full hover:scale-105 transition-all">
                    <CardContent className="text-center space-y-4">
                      <step.icon className={`w-16 h-16 mx-auto ${step.color}`} />
                      <h3 className="text-2xl font-semibold">{step.title}</h3>
                      <p className="text-muted-foreground">{step.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Platform Showcase - Enhanced */}
      <section className="py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-16 animate-fade-in-up">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                One Platform.{" "}
                <span className="gradient-text">Every Device.</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Seamlessly track expenses and maximize rewards across web, mobile, and browser extension
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Globe,
                  title: "Web Dashboard",
                  features: ["Advanced Analytics", "Budget Management", "Receipt Archive", "Custom Reports", "Team Collaboration"],
                  badge: "15 Features",
                  color: "primary",
                },
                {
                  icon: Chrome,
                  title: "Browser Extension",
                  features: ["Auto Coupon Apply", "Price Comparison", "Card Recommendations", "Shopping Alerts", "Price Drop Tracking"],
                  badge: "13 Features",
                  color: "accent",
                  popular: true,
                },
                {
                  icon: Smartphone,
                  title: "Mobile App",
                  features: ["Receipt Scanning", "Geofencing Alerts", "Quick Entry", "Offline Support", "Widgets"],
                  badge: "11 Features",
                  color: "chart-3",
                },
              ].map((platform, idx) => (
                <Card
                  key={idx}
                  className={`relative glass border-border/50 hover:scale-105 transition-all ${
                    platform.popular ? "border-accent shadow-premium" : ""
                  }`}
                >
                  {platform.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge variant="accent" className="text-sm px-4 py-1">
                        <Star className="w-4 h-4 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pt-8">
                    <platform.icon className={`w-16 h-16 mx-auto mb-4 text-${platform.color}`} />
                    <CardTitle className="text-2xl">{platform.title}</CardTitle>
                    <Badge variant="outline" className="mt-2">{platform.badge}</Badge>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {platform.features.map((feature, featureIdx) => (
                        <li key={featureIdx} className="flex items-center gap-2">
                          <Check className={`w-4 h-4 text-${platform.color} flex-shrink-0`} />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <img
                src={featureMultiplatform}
                alt="Multi-Platform Support"
                className="rounded-2xl shadow-premium mx-auto max-w-3xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table - NEW */}
      <section className="py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-16 animate-fade-in-up">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Why Choose{" "}
                <span className="gradient-text">TrueSpend?</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                See how we compare to the competition
              </p>
            </div>

            <div className="glass rounded-2xl overflow-hidden border border-border/50">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold">Feature</th>
                      <th className="px-6 py-4 text-center font-semibold">
                        <div className="flex flex-col items-center gap-2">
                          <span className="gradient-text text-lg">TrueSpend</span>
                          <Badge variant="accent" className="text-xs">Best Choice</Badge>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-muted-foreground">Honey</th>
                      <th className="px-6 py-4 text-center text-muted-foreground">Mint</th>
                      <th className="px-6 py-4 text-center text-muted-foreground">Rakuten</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {[
                      { feature: "Precision Geofencing (100ft)", truespend: true, honey: false, mint: false, rakuten: false },
                      { feature: "AI Coupon Stacking", truespend: true, honey: false, mint: false, rakuten: false },
                      { feature: "Card Recommendations", truespend: true, honey: false, mint: false, rakuten: false },
                      { feature: "Zero Data Selling", truespend: true, honey: false, mint: false, rakuten: false },
                      { feature: "Privacy-First Design", truespend: true, honey: false, mint: false, rakuten: false },
                      { feature: "Receipt Scanning", truespend: true, honey: false, mint: false, rakuten: false },
                      { feature: "Budget Tracking", truespend: true, honey: false, mint: true, rakuten: false },
                      { feature: "Multi-Platform Support", truespend: true, honey: true, mint: true, rakuten: true },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium">{row.feature}</td>
                        <td className="px-6 py-4 text-center">
                          {row.truespend ? (
                            <Check className="w-6 h-6 text-accent mx-auto" />
                          ) : (
                            <X className="w-6 h-6 text-muted-foreground mx-auto" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.honey ? (
                            <Check className="w-6 h-6 text-muted-foreground mx-auto" />
                          ) : (
                            <X className="w-6 h-6 text-muted-foreground mx-auto" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.mint ? (
                            <Check className="w-6 h-6 text-muted-foreground mx-auto" />
                          ) : (
                            <X className="w-6 h-6 text-muted-foreground mx-auto" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.rakuten ? (
                            <Check className="w-6 h-6 text-muted-foreground mx-auto" />
                          ) : (
                            <X className="w-6 h-6 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section - Enhanced */}
      <section className="py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-6 animate-fade-in-up">
              <Badge variant="accent" className="mb-4">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Privacy-First Philosophy
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Your Data is{" "}
                <span className="gradient-text">NEVER Sold.</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Unlike Honey, Rakuten, and other "free" tools that profit from your data...
              </p>
              <p className="text-2xl font-semibold">
                <span className="gradient-text">TrueSpend makes money from subscriptions—not surveillance.</span>
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: ShieldCheck, text: "No Tracking Pixels" },
                { icon: Lock, text: "No Data Brokers" },
                { icon: X, text: "No Targeted Ads" },
                { icon: ShieldCheck, text: "No Data Selling. Ever." },
              ].map((item, idx) => (
                <div key={idx} className="glass rounded-xl p-6 text-center hover:scale-105 transition-all">
                  <item.icon className="w-8 h-8 text-accent mx-auto mb-3" />
                  <p className="text-sm font-semibold">{item.text}</p>
                </div>
              ))}
            </div>

            <Card className="glass-dark border-accent/50">
              <CardContent className="pt-6">
                <p className="text-lg text-muted-foreground">
                  "We believe in transparent pricing and keeping your financial data private. That's why we charge for our service instead of selling your information to advertisers and data brokers."
                </p>
                <p className="text-sm text-muted-foreground mt-4">— The TrueSpend Team</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Security Grid - Enhanced Bento Layout */}
      <section className="py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-16 animate-fade-in-up">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Your Money is{" "}
                <span className="gradient-text">Safe & Secure</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Enterprise-grade security protecting $10M+ in tracked transactions
              </p>
            </div>

            <div className="bento-grid">
              {[
                {
                  icon: ShieldCheck,
                  title: "SOC 2 Compliant",
                  description: "Annual third-party security audits",
                  stat: "Certified",
                  color: "text-accent",
                },
                {
                  icon: Lock,
                  title: "AES-256 Encryption",
                  description: "Bank-level data encryption",
                  stat: "Military Grade",
                  color: "text-primary",
                },
                {
                  icon: Shield,
                  title: "GDPR Compliant",
                  description: "Full EU data protection compliance",
                  stat: "Verified",
                  color: "text-chart-3",
                },
                {
                  icon: ShieldCheck,
                  title: "Zero Breaches",
                  description: "Perfect security track record",
                  stat: "Since 2022",
                  color: "text-chart-4",
                },
                {
                  icon: Lock,
                  title: "2FA Authentication",
                  description: "Multi-factor security protection",
                  stat: "Optional",
                  color: "text-accent",
                },
                {
                  icon: Shield,
                  title: "No Credentials Stored",
                  description: "We never store your banking passwords",
                  stat: "Guaranteed",
                  color: "text-primary",
                },
              ].map((item, idx) => (
                <Card key={idx} className="glass border-border/50 hover:scale-105 transition-all card-hover">
                  <CardContent className="pt-6">
                    <item.icon className={`w-12 h-12 ${item.color} mb-4`} />
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm mb-3">{item.description}</p>
                    <Badge variant="outline" className="text-xs">{item.stat}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <img
                src={featureSecurity}
                alt="Security Features"
                className="rounded-2xl shadow-premium mx-auto max-w-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - Enhanced */}
      <section className="py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-16 animate-fade-in-up">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Loved by{" "}
                <span className="gradient-text">50,000+ Users</span>
              </h2>
              <div className="flex items-center justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-accent text-accent" />
                ))}
                <span className="ml-2 text-lg font-semibold">4.9/5 Average Rating</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  name: "Sarah Chen",
                  role: "Small Business Owner",
                  content: "TrueSpend's geofencing is a game-changer. I save an average of $200/month just by using the right card at each store. The ROI is incredible!",
                  rating: 5,
                  savings: "$2,400/year",
                },
                {
                  name: "Michael Rodriguez",
                  role: "Travel Enthusiast",
                  content: "The coupon stacking feature is insane. I saved $180 on my last flight booking by combining codes I never would have found manually. This app pays for itself 100x over.",
                  rating: 5,
                  savings: "$1,800/year",
                },
                {
                  name: "Emily Thompson",
                  role: "Budget-Conscious Mom",
                  content: "Finally, a finance app that actually respects my privacy! No ads, no tracking, just pure functionality. The receipt scanning saves me hours every month.",
                  rating: 5,
                  savings: "$1,200/year",
                },
              ].map((testimonial, idx) => (
                <Card key={idx} className="glass-dark border-border/50 hover:scale-105 transition-all card-hover">
                  <CardHeader>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                      ))}
                    </div>
                    <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                    <CardDescription>{testimonial.role}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                    <Badge variant="accent" className="text-sm">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Saves {testimonial.savings}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators - NEW */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-60">
              <div className="text-center">
                <Award className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-semibold">SOC 2 Certified</p>
              </div>
              <div className="text-center">
                <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-semibold">GDPR Compliant</p>
              </div>
              <div className="text-center">
                <Star className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-semibold">4.9/5 Rating</p>
              </div>
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-semibold">50,000+ Users</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Enhanced */}
      <section className="py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-6 mb-16 animate-fade-in-up">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Simple Pricing.{" "}
                <span className="gradient-text">Maximum Value.</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Start free, upgrade when you're ready. All plans include our core features.
              </p>
              <Badge variant="accent" className="text-base px-6 py-2">
                <Zap className="w-4 h-4 mr-2" />
                30-Day Money-Back Guarantee
              </Badge>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  name: "Basic",
                  price: "Free",
                  period: "forever",
                  description: "Perfect for trying out TrueSpend",
                  features: [
                    "Up to 3 credit cards",
                    "Basic geofencing (1 zone)",
                    "Manual receipt entry",
                    "Basic budget tracking",
                    "Web access only",
                  ],
                  cta: "Get Started Free",
                  popular: false,
                },
                {
                  name: "Plus",
                  price: "$9.99",
                  period: "/month",
                  description: "Most popular for power users",
                  features: [
                    "Unlimited credit cards",
                    "Advanced geofencing (unlimited zones)",
                    "AI receipt scanning",
                    "Smart budget predictions",
                    "All platforms (web, mobile, extension)",
                    "Coupon stacking engine",
                    "Priority support",
                  ],
                  cta: "Start Plus Free Trial",
                  popular: true,
                  badge: "Most Popular",
                  roi: "Average ROI: $1,680/year",
                },
                {
                  name: "Elite",
                  price: "$18.99",
                  period: "/month",
                  description: "For serious reward maximizers",
                  features: [
                    "Everything in Plus",
                    "Advanced AI recommendations",
                    "Family account sharing (5 members)",
                    "Custom reports & analytics",
                    "Tax deduction helper",
                    "Dedicated account manager",
                    "Early access to new features",
                  ],
                  cta: "Start Elite Free Trial",
                  popular: false,
                },
              ].map((plan, idx) => (
                <Card
                  key={idx}
                  className={`relative glass hover:scale-105 transition-all ${
                    plan.popular ? "border-accent shadow-premium scale-105" : "border-border/50"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge variant="accent" className="text-sm px-4 py-1">
                        <Star className="w-4 h-4 mr-1" />
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-8 pt-8">
                    <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                    <div className="mb-4">
                      <span className="text-5xl font-bold gradient-text">{plan.price}</span>
                      {plan.period && (
                        <span className="text-muted-foreground ml-1">{plan.period}</span>
                      )}
                    </div>
                    <CardDescription className="text-base">{plan.description}</CardDescription>
                    {plan.roi && (
                      <Badge variant="accent" className="mt-3">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        {plan.roi}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIdx) => (
                        <li key={featureIdx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="lg"
                      variant={plan.popular ? "gradient" : "outline"}
                      className="w-full"
                      onClick={() => navigate("/auth")}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12 space-y-4">
              <p className="text-muted-foreground">
                All paid plans include a <strong className="text-foreground">14-day free trial</strong> and <strong className="text-foreground">30-day money-back guarantee</strong>
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span>Secure payment processing • Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight animate-fade-in-up">
              Ready to Stop Leaving{" "}
              <span className="gradient-text">Money on the Table?</span>
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground animate-fade-in-up">
              Join 50,000+ users who are already maximizing their rewards with TrueSpend
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 animate-scale-in">
              <Button
                size="lg"
                variant="gradient"
                className="text-lg px-12 py-6 shadow-premium hover:shadow-premium-hover transition-all"
                onClick={() => navigate("/auth")}
              >
                <Zap className="w-5 h-5 mr-2" />
                Start Saving Today - Free Forever
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground pt-4">
              No credit card required • Takes 2 minutes to set up • 14-day free trial on paid plans
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
