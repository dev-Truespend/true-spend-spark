import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, Smartphone, Laptop, Tablet, Globe, Brain, 
  TrendingUp, Sparkles, Lock, Database, Eye, Shield
} from "lucide-react";
import multiDevice from "@/assets/multi-device-ecosystem.png";
import aiCards from "@/assets/ai-card-recommendations.png";
import localData from "@/assets/local-first-data.png";

export default function Features() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge variant="secondary" className="mb-6 text-base px-6 py-2">
            Platform Features
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Works <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent">Everywhere</span> You Need It
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            One account. All your devices. Seamlessly synced in real-time with bank-level security. Available on mobile, desktop, tablet, and web.
          </p>
        </div>
      </section>

      {/* Platform Overview */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-brand-blue/10 hover:to-brand-purple/10 transition-all duration-300 hover:scale-105 hover:shadow-medium">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-brand-purple" />
              </div>
              <div className="text-center">
                <div className="font-bold text-lg mb-1">iOS & Android</div>
                <div className="text-sm text-muted-foreground">Native mobile apps</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-brand-purple/10 hover:to-brand-teal/10 transition-all duration-300 hover:scale-105 hover:shadow-medium">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-purple/20 to-brand-teal/20 flex items-center justify-center">
                <Laptop className="w-8 h-8 text-brand-teal" />
              </div>
              <div className="text-center">
                <div className="font-bold text-lg mb-1">Desktop</div>
                <div className="text-sm text-muted-foreground">Windows, Mac, Linux</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-brand-teal/10 hover:to-brand-blue/10 transition-all duration-300 hover:scale-105 hover:shadow-medium">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-teal/20 to-brand-blue/20 flex items-center justify-center">
                <Tablet className="w-8 h-8 text-brand-blue" />
              </div>
              <div className="text-center">
                <div className="font-bold text-lg mb-1">Tablet</div>
                <div className="text-sm text-muted-foreground">iPad & Android tablets</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-brand-blue/10 hover:to-brand-purple/10 transition-all duration-300 hover:scale-105 hover:shadow-medium">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 flex items-center justify-center">
                <Globe className="w-8 h-8 text-brand-purple" />
              </div>
              <div className="text-center">
                <div className="font-bold text-lg mb-1">Web</div>
                <div className="text-sm text-muted-foreground">Any modern browser</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase with Animated Images */}
      <section className="py-24 px-6 bg-gradient-to-br from-brand-purple/5 via-background to-brand-blue/5">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-24">
            {/* Multi-Device Section */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/20 to-brand-purple/20 blur-3xl rounded-full group-hover:blur-2xl transition-all"></div>
                <img 
                  src={multiDevice} 
                  alt="Multi-device ecosystem" 
                  className="relative w-full h-auto drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500 animate-float-slow"
                />
              </div>
              <div className="space-y-6">
                <Badge variant="secondary" className="text-sm px-4 py-1">Cross-Platform</Badge>
                <h3 className="text-3xl font-bold">Your Data Follows You</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Start tracking on your phone, review on your laptop, and check insights on your tablet. Everything syncs instantly and securely across all platforms.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <Smartphone className="w-6 h-6 text-brand-blue mb-2" />
                    <div className="font-semibold text-sm">Mobile Apps</div>
                    <div className="text-xs text-muted-foreground">iOS & Android</div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <Laptop className="w-6 h-6 text-brand-purple mb-2" />
                    <div className="font-semibold text-sm">Desktop</div>
                    <div className="text-xs text-muted-foreground">Win, Mac, Linux</div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <Tablet className="w-6 h-6 text-brand-teal mb-2" />
                    <div className="font-semibold text-sm">Tablets</div>
                    <div className="text-xs text-muted-foreground">iPad & more</div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <Globe className="w-6 h-6 text-brand-blue mb-2" />
                    <div className="font-semibold text-sm">Web App</div>
                    <div className="text-xs text-muted-foreground">Any browser</div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Features Section */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 order-2 lg:order-1">
                <Badge variant="secondary" className="text-sm px-4 py-1">AI-Powered</Badge>
                <h3 className="text-3xl font-bold">Smart Recommendations That Save You Money</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Our AI analyzes your spending patterns and recommends the best credit cards for maximum rewards on every purchase. Stop leaving money on the table.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-5 h-5 text-brand-blue" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Personalized Card Matching</div>
                      <div className="text-sm text-muted-foreground">Get recommendations based on your unique spending habits</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-brand-purple" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Maximize Rewards</div>
                      <div className="text-sm text-muted-foreground">Earn 2-5x more cashback and points automatically</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-brand-teal" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Real-Time Optimization</div>
                      <div className="text-sm text-muted-foreground">Instantly know which card to use for every transaction</div>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="relative group order-1 lg:order-2">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/20 to-brand-teal/20 blur-3xl rounded-full group-hover:blur-2xl transition-all"></div>
                <img 
                  src={aiCards} 
                  alt="AI card recommendations" 
                  className="relative w-full h-auto drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500 animate-float-slow"
                  style={{ animationDelay: '1s' }}
                />
              </div>
            </div>

            {/* Privacy Section */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-teal/20 to-brand-blue/20 blur-3xl rounded-full group-hover:blur-2xl transition-all"></div>
                <img 
                  src={localData} 
                  alt="Local-first data flow" 
                  className="relative w-full h-auto drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500 animate-float-slow"
                  style={{ animationDelay: '2s' }}
                />
              </div>
              <div className="space-y-6">
                <Badge variant="secondary" className="text-sm px-4 py-1">Privacy-First</Badge>
                <h3 className="text-3xl font-bold">Your Data Never Leaves Your Control</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Unlike other apps, we don't sell your data. Everything is encrypted end-to-end and stored locally on your device first. Cloud sync is optional and always private.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-5 h-5 text-brand-blue" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">End-to-End Encryption</div>
                      <div className="text-sm text-muted-foreground">Military-grade encryption for all your data</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                      <Eye className="w-5 h-5 text-brand-purple" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Zero Data Tracking</div>
                      <div className="text-sm text-muted-foreground">We don't track, analyze, or sell your information</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center flex-shrink-0">
                      <Database className="w-5 h-5 text-brand-teal" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Local-First Storage</div>
                      <div className="text-sm text-muted-foreground">Your data lives on your device, backed up optionally</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue via-brand-purple to-brand-teal p-12 md:p-16 text-center text-white shadow-premium">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold">
                Ready to Take Control?
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                Join thousands who are already maximizing their rewards with privacy-first expense tracking.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link to="/auth">
                  <Button size="lg" variant="secondary" className="bg-white text-brand-purple hover:bg-white/90 font-semibold px-8 h-14 text-lg shadow-large">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 font-semibold px-8 h-14 text-lg">
                    View Pricing
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-white/70 pt-4">
                No credit card required • Free forever • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
