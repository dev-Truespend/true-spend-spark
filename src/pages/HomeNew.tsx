import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, Lock, Eye, Database, MapPin, CreditCard, 
  Smartphone, Monitor, Globe, Zap, TrendingUp, Camera,
  BarChart3, Bell, CheckCircle2, Award, Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import featureGeofencing from "@/assets/feature-geofencing.png";
import featureCardSuggestions from "@/assets/feature-card-suggestions.png";
import featureSecurity from "@/assets/feature-security.png";
import featureMultiplatform from "@/assets/feature-multiplatform.png";
import featureReceiptScanning from "@/assets/feature-receipt-scanning.png";
import featureBudgetTracking from "@/assets/feature-budget-tracking.png";

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

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3882F6]/10 via-[#9333EA]/10 to-[#1488A6]/10 dark:from-[#3882F6]/5 dark:via-[#9333EA]/5 dark:to-[#1488A6]/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(56,130,246,0.1),rgba(147,51,234,0.1),transparent)]"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto text-center space-y-12">
          <div className="space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800">
              <Sparkles className="w-4 h-4 text-[#3882F6]" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Trusted by 50,000+ users worldwide</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-gray-900 dark:text-white leading-[1.1]">
              Track Every Purchase.
              <br />
              <span className="bg-gradient-to-r from-[#3882F6] via-[#9333EA] to-[#1488A6] bg-clip-text text-transparent">
                Maximize Every Reward.
              </span>
            </h1>
            
            <p className="text-2xl md:text-3xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto font-light leading-relaxed">
              Smart expense tracking with AI-powered insights.
              <br />
              <span className="text-gray-900 dark:text-white font-medium">Zero data selling. Total privacy.</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/auth">
              <Button 
                size="lg" 
                className="text-xl px-16 py-8 rounded-full bg-gradient-to-r from-[#3882F6] via-[#9333EA] to-[#1488A6] hover:opacity-90 shadow-2xl hover:shadow-[#3882F6]/40 transition-all duration-300 hover:scale-105 text-white font-semibold"
              >
                Get Started Free
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#3882F6]" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#9333EA]" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#1488A6]" />
              <span>100% privacy guaranteed</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-400 dark:border-gray-600 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-gray-600 dark:bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Location Intelligence Section */}
      <section className="py-32 px-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-black border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3882F6]/10 border border-[#3882F6]/20">
                <MapPin className="w-4 h-4 text-[#3882F6]" />
                <span className="text-sm font-semibold text-[#3882F6]">Location Intelligence</span>
              </div>
              
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                Smart Geofencing
                <br />
                <span className="bg-gradient-to-r from-[#3882F6] to-[#9333EA] bg-clip-text text-transparent">
                  Tracks Your Spending
                </span>
              </h2>
              
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                Set virtual boundaries around your favorite stores and locations. Get instant alerts when you spend in specific areas. 
                Track where your money goes with beautiful heat maps and location analytics.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#3882F6]/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-[#3882F6]" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">Custom Zones</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Create unlimited spending zones</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#9333EA]/10 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-[#9333EA]" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">Smart Alerts</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Real-time spending notifications</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#1488A6]/10 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-[#1488A6]" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">Heat Maps</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Visualize spending patterns</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#3882F6]/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-[#3882F6]" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">Budget Limits</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Set zone-specific budgets</p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#3882F6]/20 to-[#9333EA]/20 blur-3xl rounded-full"></div>
                <img 
                  src={featureGeofencing} 
                  alt="Geofencing on mobile" 
                  className="relative rounded-3xl shadow-2xl hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI-Powered Card Recommendations */}
      <section className="py-32 px-6 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-l from-[#9333EA]/20 to-[#1488A6]/20 blur-3xl rounded-full"></div>
                <img 
                  src={featureCardSuggestions} 
                  alt="Smart card suggestions" 
                  className="relative rounded-3xl shadow-2xl hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#9333EA]/10 border border-[#9333EA]/20">
                <CreditCard className="w-4 h-4 text-[#9333EA]" />
                <span className="text-sm font-semibold text-[#9333EA]">AI-Powered Insights</span>
              </div>
              
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                Best Card.
                <br />
                <span className="bg-gradient-to-r from-[#9333EA] to-[#1488A6] bg-clip-text text-transparent">
                  Every Purchase.
                </span>
              </h2>
              
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                Our AI analyzes your location, merchant category, and spending patterns to recommend the credit card 
                that maximizes your cashback and rewards—automatically, every single time.
              </p>

              <div className="space-y-6 pt-4">
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#9333EA]/5 to-[#1488A6]/5 border border-gray-200 dark:border-gray-800">
                  <div className="w-12 h-12 rounded-xl bg-[#9333EA] flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Real-Time Optimization</h4>
                    <p className="text-gray-600 dark:text-gray-400">Get instant card recommendations before you pay, based on merchant bonuses and rotating categories.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#1488A6]/5 to-[#3882F6]/5 border border-gray-200 dark:border-gray-800">
                  <div className="w-12 h-12 rounded-xl bg-[#1488A6] flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Maximize Every Reward</h4>
                    <p className="text-gray-600 dark:text-gray-400">Never miss out on bonus categories. Our AI tracks all your cards and tells you which one earns the most.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Receipt Scanning Section */}
      <section className="py-32 px-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-black border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3882F6]/10 border border-[#3882F6]/20">
                <Camera className="w-4 h-4 text-[#3882F6]" />
                <span className="text-sm font-semibold text-[#3882F6]">Smart Scanning</span>
              </div>
              
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                Snap. Scan.
                <br />
                <span className="bg-gradient-to-r from-[#3882F6] to-[#9333EA] bg-clip-text text-transparent">
                  Never Type Again.
                </span>
              </h2>
              
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                Just point your camera at any receipt. Our AI instantly extracts merchant, amount, date, and categorizes 
                the transaction—with 99.8% accuracy. Works even offline.
              </p>

              <div className="grid gap-4 pt-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#3882F6] flex-shrink-0" />
                  <span className="text-lg text-gray-700 dark:text-gray-300">Instant OCR processing in under 2 seconds</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#9333EA] flex-shrink-0" />
                  <span className="text-lg text-gray-700 dark:text-gray-300">Works with crumpled, faded, or damaged receipts</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#1488A6] flex-shrink-0" />
                  <span className="text-lg text-gray-700 dark:text-gray-300">Offline-first: scans even without internet</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#3882F6] flex-shrink-0" />
                  <span className="text-lg text-gray-700 dark:text-gray-300">Auto-categorization with AI learning</span>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#3882F6]/20 to-[#9333EA]/20 blur-3xl rounded-full"></div>
                <img 
                  src={featureReceiptScanning} 
                  alt="Receipt scanning with AI" 
                  className="relative rounded-3xl shadow-2xl hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Budget Tracking Section */}
      <section className="py-32 px-6 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-l from-[#9333EA]/20 to-[#1488A6]/20 blur-3xl rounded-full"></div>
                <img 
                  src={featureBudgetTracking} 
                  alt="Real-time budget tracking" 
                  className="relative rounded-3xl shadow-2xl hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1488A6]/10 border border-[#1488A6]/20">
                <BarChart3 className="w-4 h-4 text-[#1488A6]" />
                <span className="text-sm font-semibold text-[#1488A6]">Smart Analytics</span>
              </div>
              
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                See Where
                <br />
                <span className="bg-gradient-to-r from-[#1488A6] to-[#3882F6] bg-clip-text text-transparent">
                  Every Dollar Goes
                </span>
              </h2>
              
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                Beautiful, real-time dashboards show your spending trends, category breakdowns, and budget progress. 
                Set alerts before you overspend—not after.
              </p>

              <div className="grid grid-cols-2 gap-6 pt-4">
                <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-[#1488A6] transition-colors">
                  <CardContent className="pt-6 pb-6">
                    <div className="text-3xl font-bold text-[#1488A6] mb-2">99.9%</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Categorization Accuracy</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-[#3882F6] transition-colors">
                  <CardContent className="pt-6 pb-6">
                    <div className="text-3xl font-bold text-[#3882F6] mb-2">&lt;1s</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Real-Time Sync Speed</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-[#9333EA] transition-colors">
                  <CardContent className="pt-6 pb-6">
                    <div className="text-3xl font-bold text-[#9333EA] mb-2">24/7</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Budget Monitoring</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-[#1488A6] transition-colors">
                  <CardContent className="pt-6 pb-6">
                    <div className="text-3xl font-bold text-[#1488A6] mb-2">∞</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Custom Categories</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-32 px-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-black border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3882F6]/10 border border-[#3882F6]/20 mb-6">
              <Shield className="w-4 h-4 text-[#3882F6]" />
              <span className="text-sm font-semibold text-[#3882F6]">Bank-Grade Security</span>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Your Data is <span className="bg-gradient-to-r from-[#3882F6] to-[#9333EA] bg-clip-text text-transparent">Sacred</span>
            </h2>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              We <span className="font-bold text-gray-900 dark:text-white">never</span> store your credit card numbers. 
              We <span className="font-bold text-gray-900 dark:text-white">never</span> sell your data. 
              Your financial privacy is non-negotiable.
            </p>
          </div>

          <div className="mb-16">
            <img 
              src={featureSecurity} 
              alt="Bank-grade security" 
              className="w-full max-w-4xl mx-auto rounded-3xl shadow-2xl"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-xl bg-white dark:bg-gray-900 hover:shadow-[#3882F6]/20 transition-all duration-500">
              <CardContent className="pt-10 pb-10 px-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3882F6] to-[#9333EA] flex items-center justify-center mb-6 mx-auto">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">AES-256 Encryption</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                  Military-grade encryption protects your data at rest and in transit. Same standard used by banks and governments.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white dark:bg-gray-900 hover:shadow-[#9333EA]/20 transition-all duration-500">
              <CardContent className="pt-10 pb-10 px-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9333EA] to-[#1488A6] flex items-center justify-center mb-6 mx-auto">
                  <Eye className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">Read-Only Access</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                  We can only view transactions—never move money or make changes to your accounts. Zero risk.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white dark:bg-gray-900 hover:shadow-[#1488A6]/20 transition-all duration-500">
              <CardContent className="pt-10 pb-10 px-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1488A6] to-[#3882F6] flex items-center justify-center mb-6 mx-auto">
                  <Database className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">No Data Selling</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                  Unlike "free" tools that sell your data, we make money from subscriptions—not surveillance. Ever.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-16">
            <Badge className="px-6 py-3 text-sm font-semibold bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 hover:border-[#3882F6]">
              🔒 SOC 2 Type II Certified
            </Badge>
            <Badge className="px-6 py-3 text-sm font-semibold bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 hover:border-[#9333EA]">
              🛡️ GDPR Compliant
            </Badge>
            <Badge className="px-6 py-3 text-sm font-semibold bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 hover:border-[#1488A6]">
              ✓ PCI DSS Level 1
            </Badge>
          </div>
        </div>
      </section>

      {/* Multi-Platform Section */}
      <section className="py-32 px-6 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#9333EA]/10 border border-[#9333EA]/20 mb-6">
              <Globe className="w-4 h-4 text-[#9333EA]" />
              <span className="text-sm font-semibold text-[#9333EA]">Seamless Sync</span>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              One Subscription. <span className="bg-gradient-to-r from-[#9333EA] to-[#1488A6] bg-clip-text text-transparent">Every Platform.</span>
            </h2>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Your complete financial command center synchronized across web, mobile, Chrome & Safari—
              seamlessly working together as one powerful ecosystem.
            </p>
          </div>

          <div className="mb-16">
            <img 
              src={featureMultiplatform} 
              alt="Multi-platform support" 
              className="w-full max-w-5xl mx-auto rounded-3xl shadow-2xl"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-[#3882F6]/5 to-[#9333EA]/5 hover:shadow-[#3882F6]/20 transition-all duration-500 hover:-translate-y-2">
              <CardContent className="pt-12 pb-12 px-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3882F6] to-[#9333EA] flex items-center justify-center mb-8 mx-auto shadow-lg">
                  <Monitor className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Web App</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                  Full-featured dashboard with advanced analytics, reports, and comprehensive financial insights.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge className="bg-[#3882F6]/10 text-[#3882F6] hover:bg-[#3882F6]/20 border-0">Advanced Charts</Badge>
                  <Badge className="bg-[#9333EA]/10 text-[#9333EA] hover:bg-[#9333EA]/20 border-0">Export Data</Badge>
                  <Badge className="bg-[#1488A6]/10 text-[#1488A6] hover:bg-[#1488A6]/20 border-0">Team Access</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-[#9333EA]/5 to-[#1488A6]/5 hover:shadow-[#9333EA]/20 transition-all duration-500 hover:-translate-y-2">
              <CardContent className="pt-12 pb-12 px-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#9333EA] to-[#1488A6] flex items-center justify-center mb-8 mx-auto shadow-lg">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Native Mobile</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                  iOS & Android apps with offline support, receipt scanning, and location-based insights on the go.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge className="bg-[#9333EA]/10 text-[#9333EA] hover:bg-[#9333EA]/20 border-0">Camera Scan</Badge>
                  <Badge className="bg-[#1488A6]/10 text-[#1488A6] hover:bg-[#1488A6]/20 border-0">Offline Mode</Badge>
                  <Badge className="bg-[#3882F6]/10 text-[#3882F6] hover:bg-[#3882F6]/20 border-0">Geofencing</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-[#1488A6]/5 to-[#3882F6]/5 hover:shadow-[#1488A6]/20 transition-all duration-500 hover:-translate-y-2">
              <CardContent className="pt-12 pb-12 px-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1488A6] to-[#3882F6] flex items-center justify-center mb-8 mx-auto shadow-lg">
                  <Globe className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Browser Extensions</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                  Chrome & Safari extensions track online shopping automatically. Get card recommendations in real-time.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge className="bg-[#1488A6]/10 text-[#1488A6] hover:bg-[#1488A6]/20 border-0">Auto-Track</Badge>
                  <Badge className="bg-[#3882F6]/10 text-[#3882F6] hover:bg-[#3882F6]/20 border-0">Card Tips</Badge>
                  <Badge className="bg-[#9333EA]/10 text-[#9333EA] hover:bg-[#9333EA]/20 border-0">Quick Add</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Privacy Pills Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-black border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 text-4xl mb-4">
            <Shield className="w-10 h-10 text-[#3882F6]" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Your Data is <span className="text-[#3882F6]">NEVER</span> Sold or Shared
            </h2>
          </div>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Unlike Honey, Rakuten, and other "free" tools that profit from your data, 
            TrueSpend makes money from subscriptions—<span className="font-semibold text-gray-900 dark:text-white">not surveillance</span>.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-6">
            <div className="rounded-full bg-white dark:bg-gray-900 px-6 py-3 border border-gray-200 dark:border-gray-800 shadow-sm hover:border-[#3882F6] transition-colors">
              <span className="text-sm font-medium text-gray-900 dark:text-white">✓ No tracking pixels</span>
            </div>
            <div className="rounded-full bg-white dark:bg-gray-900 px-6 py-3 border border-gray-200 dark:border-gray-800 shadow-sm hover:border-[#9333EA] transition-colors">
              <span className="text-sm font-medium text-gray-900 dark:text-white">✓ No data brokers</span>
            </div>
            <div className="rounded-full bg-white dark:bg-gray-900 px-6 py-3 border border-gray-200 dark:border-gray-800 shadow-sm hover:border-[#1488A6] transition-colors">
              <span className="text-sm font-medium text-gray-900 dark:text-white">✓ No targeted ads</span>
            </div>
            <div className="rounded-full bg-white dark:bg-gray-900 px-6 py-3 border border-gray-200 dark:border-gray-800 shadow-sm hover:border-[#3882F6] transition-colors">
              <span className="text-sm font-medium text-gray-900 dark:text-white">✓ No data selling. Ever.</span>
            </div>
          </div>

          <Link to="/privacy" className="inline-block text-[#3882F6] hover:text-[#9333EA] font-medium text-sm transition-colors">
            Read our Privacy Policy →
          </Link>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 px-6 bg-gradient-to-br from-[#3882F6]/10 via-[#9333EA]/10 to-[#1488A6]/10 dark:from-[#3882F6]/5 dark:via-[#9333EA]/5 dark:to-[#1488A6]/5">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white">
            Ready to Take Control?
          </h2>
          
          <p className="text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Join 50,000+ users who trust TrueSpend with their financial privacy.
          </p>

          <Link to="/auth">
            <Button 
              size="lg" 
              className="text-xl px-16 py-8 rounded-full bg-gradient-to-r from-[#3882F6] via-[#9333EA] to-[#1488A6] hover:opacity-90 shadow-2xl hover:shadow-[#3882F6]/40 transition-all duration-300 hover:scale-105 text-white font-semibold"
            >
              Start Free Today
            </Button>
          </Link>

          <p className="text-sm text-gray-500 dark:text-gray-500 pt-4">
            No credit card required • Cancel anytime • 100% privacy guaranteed
          </p>
        </div>
      </section>
    </div>
  );
}
