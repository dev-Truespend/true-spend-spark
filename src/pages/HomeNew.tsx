import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, Lock, Eye, Database, MapPin, CreditCard, 
  Smartphone, Monitor, Globe, Zap, TrendingUp, Camera,
  BarChart3, Bell, CheckCircle2, Award, Sparkles, Star,
  Users, DollarSign, ChevronRight, Quote
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import featureGeofencing from "@/assets/feature-geofencing.png";
import featureCardSuggestions from "@/assets/feature-card-suggestions.png";
import featureSecurity from "@/assets/feature-security.png";
import featureMultiplatform from "@/assets/feature-multiplatform.png";
import featureReceiptScanning from "@/assets/feature-receipt-scanning.png";
import featureBudgetTracking from "@/assets/feature-budget-tracking.png";

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
        <div 
          className="absolute inset-0 gradient-animate opacity-10 dark:opacity-5"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        ></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(56,130,246,0.15),rgba(147,51,234,0.15),transparent)]"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto text-center space-y-12">
          <div className="space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass border-white/20 shadow-premium">
              <Sparkles className="w-5 h-5 text-brand-blue" />
              <span className="text-sm font-semibold gradient-text">Trusted by 50,000+ users worldwide</span>
            </div>
            
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight text-gray-900 dark:text-white leading-[0.95]">
              Track Every
              <br />
              Purchase.
              <br />
              <span className="gradient-text text-shadow-glow">
                Maximize Rewards.
              </span>
            </h1>
            
            <p className="text-2xl md:text-3xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto font-light leading-relaxed">
              AI-powered expense tracking with location intelligence.
              <br />
              <span className="text-gray-900 dark:text-white font-semibold">Zero data selling. Total privacy.</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <Link to="/auth">
              <Button 
                size="lg" 
                className="group text-xl px-16 py-8 rounded-full bg-gradient-to-r from-brand-blue via-accent to-brand-teal hover:opacity-90 shadow-premium hover:shadow-premium-hover transition-all duration-500 hover:scale-105 text-white font-bold"
              >
                Get Started Free
                <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm text-gray-600 dark:text-gray-400">
            {[
              { icon: CheckCircle2, text: "No credit card required", color: "text-brand-blue" },
              { icon: CheckCircle2, text: "Cancel anytime", color: "text-accent" },
              { icon: CheckCircle2, text: "100% privacy guaranteed", color: "text-brand-teal" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-400 dark:border-gray-600 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-gray-600 dark:bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "50K+", label: "Active Users", icon: Users },
              { value: "$10M+", label: "Saved in Rewards", icon: DollarSign },
              { value: "99.9%", label: "Uptime", icon: Zap },
              { value: "4.9★", label: "User Rating", icon: Star }
            ].map((stat, i) => (
              <div 
                key={i} 
                className="text-center space-y-4 p-8 glass rounded-3xl card-hover animate-scale-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <stat.icon className="w-12 h-12 mx-auto text-brand-blue" />
                <div className="stat-number text-5xl font-bold gradient-text">
                  {stat.value}
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location Intelligence Feature */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-accent/5"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-slide-in-left">
              <Badge className="px-4 py-2 bg-brand-blue/10 text-brand-blue border-brand-blue/20">
                <MapPin className="w-4 h-4 mr-2" />
                Location Intelligence
              </Badge>
              <h2 className="text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                Smart Geofencing
                <br />
                <span className="gradient-text">That Works</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                Create custom spending zones around your favorite locations. Get instant alerts when you enter a geofence and track spending patterns by location with precision.
              </p>
              <div className="space-y-4">
                {[
                  "Automatic location detection",
                  "Budget alerts by zone",
                  "Historical spending patterns",
                  "Privacy-first approach"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-lg">
                    <CheckCircle2 className="w-6 h-6 text-brand-blue flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="animate-slide-in-right">
              <div className="card-3d">
                <img 
                  src={featureGeofencing} 
                  alt="Geofencing feature showing location-based budget tracking"
                  className="rounded-3xl shadow-premium w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Card Recommendations */}
      <section className="py-32 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 animate-slide-in-left">
              <div className="card-3d">
                <img 
                  src={featureCardSuggestions} 
                  alt="AI-powered credit card recommendations"
                  className="rounded-3xl shadow-premium w-full"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8 animate-slide-in-right">
              <Badge className="px-4 py-2 bg-accent/10 text-accent border-accent/20">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered Insights
              </Badge>
              <h2 className="text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                Perfect Card,
                <br />
                <span className="gradient-text">Every Time</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                AI analyzes your location and spending to suggest the best credit card for maximum cashback and rewards. Never miss a reward again.
              </p>
              <div className="space-y-4">
                {[
                  "Real-time card recommendations",
                  "Location-aware suggestions",
                  "Maximize every purchase",
                  "No card data stored"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-lg">
                    <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Receipt Scanning */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-slide-in-left">
              <Badge className="px-4 py-2 bg-brand-teal/10 text-brand-teal border-brand-teal/20">
                <Camera className="w-4 h-4 mr-2" />
                Smart Scanning
              </Badge>
              <h2 className="text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                Scan Receipts
                <br />
                <span className="gradient-text">In Seconds</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                AI-powered OCR extracts transaction details instantly. Just snap a photo and let our AI do the rest.
              </p>
              <div className="space-y-4">
                {[
                  "Instant text extraction",
                  "Auto-categorization",
                  "Digital receipt library",
                  "Searchable archive"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-lg">
                    <CheckCircle2 className="w-6 h-6 text-brand-teal flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="animate-slide-in-right">
              <div className="card-3d">
                <img 
                  src={featureReceiptScanning} 
                  alt="Receipt scanning with AI text extraction"
                  className="rounded-3xl shadow-premium w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Budget Tracking */}
      <section className="py-32 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 animate-slide-in-left">
              <div className="card-3d">
                <img 
                  src={featureBudgetTracking} 
                  alt="Budget tracking dashboard with analytics"
                  className="rounded-3xl shadow-premium w-full"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8 animate-slide-in-right">
              <Badge className="px-4 py-2 bg-brand-blue/10 text-brand-blue border-brand-blue/20">
                <BarChart3 className="w-4 h-4 mr-2" />
                Smart Analytics
              </Badge>
              <h2 className="text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                Stay On Budget,
                <br />
                <span className="gradient-text">Effortlessly</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                Set category budgets and get intelligent alerts before you overspend. Beautiful visualizations keep you informed.
              </p>
              <div className="space-y-4">
                {[
                  "Custom category budgets",
                  "Real-time spending alerts",
                  "Trend analysis",
                  "Predictive insights"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-lg">
                    <CheckCircle2 className="w-6 h-6 text-brand-blue flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-6xl font-bold text-gray-900 dark:text-white">
              Loved by <span className="gradient-text">Thousands</span>
            </h2>
            <p className="text-2xl text-gray-600 dark:text-gray-400">
              See what our users have to say
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                role: "Small Business Owner",
                quote: "TrueSpend's geofencing feature has revolutionized how I track business expenses. The location-based insights are incredible!",
                rating: 5
              },
              {
                name: "Michael Chen",
                role: "Digital Nomad",
                quote: "Finally, an expense tracker that respects privacy. No data selling, just pure functionality. The card recommendations have saved me hundreds.",
                rating: 5
              },
              {
                name: "Emily Rodriguez",
                role: "Finance Professional",
                quote: "The AI-powered insights and receipt scanning save me hours every month. This is the future of expense tracking.",
                rating: 5
              }
            ].map((testimonial, i) => (
              <Card 
                key={i} 
                className="glass-dark border-white/10 card-hover animate-scale-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <CardContent className="p-8 space-y-6">
                  <Quote className="w-10 h-10 text-brand-blue opacity-50" />
                  <p className="text-lg text-gray-300 leading-relaxed italic">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <div>
                    <div className="font-bold text-white">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-6xl font-bold text-gray-900 dark:text-white">
              Simple, <span className="gradient-text">Transparent Pricing</span>
            </h2>
            <p className="text-2xl text-gray-600 dark:text-gray-400">
              Choose the plan that fits your needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Basic",
                price: "Free",
                description: "Perfect for getting started",
                features: [
                  "5 geofences",
                  "Basic receipt scanning",
                  "Monthly budget tracking",
                  "Web & mobile access"
                ],
                cta: "Get Started",
                popular: false
              },
              {
                name: "Plus",
                price: "$9.99",
                period: "/month",
                description: "Most popular choice",
                features: [
                  "Unlimited geofences",
                  "AI receipt scanning",
                  "Advanced analytics",
                  "Priority support",
                  "Card recommendations"
                ],
                cta: "Start Free Trial",
                popular: true
              },
              {
                name: "Elite",
                price: "$18.99",
                period: "/month",
                description: "For power users",
                features: [
                  "Everything in Plus",
                  "Custom integrations",
                  "White-label option",
                  "Dedicated support",
                  "Advanced AI insights"
                ],
                cta: "Contact Sales",
                popular: false
              }
            ].map((plan, i) => (
              <Card 
                key={i}
                className={`relative overflow-hidden card-hover ${
                  plan.popular 
                    ? 'glass border-accent shadow-premium scale-105' 
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-brand-blue to-accent text-white px-4 py-1 text-sm font-bold rounded-bl-lg">
                    POPULAR
                  </div>
                )}
                <CardContent className="p-8 space-y-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {plan.description}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold gradient-text">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-xl text-gray-600 dark:text-gray-400">
                          {plan.period}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {plan.features.map((feature, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link to="/auth" className="block">
                    <Button 
                      className={`w-full ${
                        plan.popular
                          ? 'bg-gradient-to-r from-brand-blue to-accent hover:opacity-90'
                          : ''
                      }`}
                      size="lg"
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-20">
            <Badge className="px-4 py-2 bg-brand-blue/10 text-brand-blue border-brand-blue/20">
              <Shield className="w-4 h-4 mr-2" />
              Enterprise-Grade Security
            </Badge>
            <h2 className="text-6xl font-bold text-gray-900 dark:text-white">
              Your Data, <span className="gradient-text">Your Control</span>
            </h2>
            <p className="text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              We never sell your data. Period. Your financial information stays private and secure.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Shield,
                title: "Zero Data Storage",
                description: "No customer data or card information stored on our servers"
              },
              {
                icon: Lock,
                title: "End-to-End Encryption",
                description: "Military-grade encryption protects all your transactions"
              },
              {
                icon: Eye,
                title: "Local Processing",
                description: "AI analysis happens on your device for maximum privacy"
              },
              {
                icon: Database,
                title: "GDPR Compliant",
                description: "Full compliance with international data protection laws"
              }
            ].map((item, i) => (
              <Card 
                key={i}
                className="border-gray-200 dark:border-gray-800 card-hover card-3d animate-scale-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <CardContent className="p-8 space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-brand-blue to-accent rounded-2xl flex items-center justify-center">
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center">
            <img 
              src={featureSecurity} 
              alt="Security dashboard showing privacy features"
              className="rounded-3xl shadow-premium max-w-4xl mx-auto"
            />
          </div>
        </div>
      </section>

      {/* Multi-Platform Section */}
      <section className="py-32 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-20">
            <h2 className="text-6xl font-bold text-gray-900 dark:text-white">
              Everywhere You Go,
              <br />
              <span className="gradient-text">We're There</span>
            </h2>
            <p className="text-2xl text-gray-600 dark:text-gray-400">
              Seamless sync across all your devices
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                icon: Monitor,
                title: "Web App",
                description: "Full-featured dashboard accessible from any browser"
              },
              {
                icon: Smartphone,
                title: "Mobile Apps",
                description: "Native iOS and Android apps with offline support"
              },
              {
                icon: Globe,
                title: "Browser Extension",
                description: "Track expenses while you browse with one click"
              }
            ].map((platform, i) => (
              <Card 
                key={i}
                className="border-gray-200 dark:border-gray-800 card-hover animate-scale-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <CardContent className="p-8 space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent to-brand-teal rounded-2xl flex items-center justify-center">
                    <platform.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {platform.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {platform.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <img 
              src={featureMultiplatform} 
              alt="Multi-platform support across devices"
              className="rounded-3xl shadow-premium max-w-5xl mx-auto"
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 gradient-animate opacity-20"></div>
        <div className="max-w-4xl mx-auto text-center space-y-12 relative z-10">
          <h2 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-white">
            Ready to Take Control?
          </h2>
          <p className="text-2xl text-gray-600 dark:text-gray-400">
            Join thousands of users who've transformed their financial habits
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link to="/auth">
              <Button 
                size="lg" 
                className="group text-xl px-16 py-8 rounded-full bg-gradient-to-r from-brand-blue via-accent to-brand-teal hover:opacity-90 shadow-premium hover:shadow-premium-hover transition-all duration-500 hover:scale-105 text-white font-bold"
              >
                Get Started Free
                <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
