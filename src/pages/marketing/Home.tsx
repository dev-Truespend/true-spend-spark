import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Shield, Sparkles, Smartphone, Check, X, ArrowRight, Lock, Eye, Database } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useEffect } from "react";
import { GetInTouch } from "@/shared/components/GetInTouch";
import heroCardsPhone from "@/assets/hero-cards-phone.png";
import privacyPremium from "@/assets/privacy-premium.png";
import multiDevice from "@/assets/multi-device-ecosystem.png";
import heroPremium from "@/assets/hero-premium.png";
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
            <div className="relative min-h-[600px] flex items-center justify-center group perspective-1000">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/30 via-brand-purple/30 to-brand-teal/30 blur-3xl animate-pulse-slow"></div>
              <div className="absolute -inset-4 bg-gradient-to-r from-brand-blue/20 to-brand-purple/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <img 
                src={heroCardsPhone} 
                alt="TrueSpend - Smart expense tracking with AI-powered rewards" 
                className="relative w-full h-auto max-h-[600px] drop-shadow-2xl transform group-hover:scale-[1.03] group-hover:rotate-1 transition-all duration-700 animate-float-slow"
              />
              {/* Floating badges */}
              <div className="absolute top-8 -left-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-premium text-sm font-semibold text-brand-blue border border-brand-blue/20 animate-float-slow">
                🤖 AI Powered
              </div>
              <div className="absolute bottom-12 -right-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-premium text-sm font-semibold text-brand-purple border border-brand-purple/20 animate-float-slow" style={{ animationDelay: '1s' }}>
                🔒 100% Private
              </div>
              <div className="absolute top-1/2 -right-8 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-premium text-sm font-semibold text-brand-teal border border-brand-teal/20 animate-float-slow" style={{ animationDelay: '2s' }}>
                ✨ Smart Rewards
              </div>
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
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 via-brand-purple/20 to-brand-teal/20 blur-3xl animate-pulse-slow"></div>
              <img 
                src={privacyPremium} 
                alt="Enterprise-grade privacy and security" 
                className="relative w-full h-auto drop-shadow-2xl transform group-hover:scale-[1.02] transition-all duration-700"
              />
            </div>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-brand-blue" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">End-to-End Encryption</h3>
                  <p className="text-muted-foreground">Your data is encrypted before it leaves your device and only you have the keys.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-brand-purple" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">Zero Data Tracking</h3>
                  <p className="text-muted-foreground">We don't track, analyze, or sell your spending habits to third parties.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center flex-shrink-0">
                  <Database className="w-6 h-6 text-brand-teal" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">Local-First Storage</h3>
                  <p className="text-muted-foreground">Your data lives on your device first. Cloud sync is optional and always encrypted.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Key Features - Only 3 */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Built for People Who <span className="text-brand-blue">Value Every Dollar</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="text-center space-y-6">
            <div className="relative mx-auto w-64 h-64 min-h-64 min-w-64 group">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 blur-2xl rounded-full animate-pulse-slow"></div>
              <img 
                src={heroPremium} 
                alt="Smart AI-powered rewards with credit cards" 
                className="relative w-64 h-64 object-cover rounded-2xl drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500 animate-float-slow"
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
              <div className="relative mx-auto w-64 h-64 min-h-64 min-w-64 group">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-teal/20 to-brand-blue/20 blur-2xl rounded-full animate-pulse-slow"></div>
                <img 
                  src={multiDevice} 
                  alt="Everywhere You Shop" 
                  className="relative w-64 h-64 object-cover rounded-2xl drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500 animate-float-slow"
                  style={{ animationDelay: '1s' }}
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

            {/* Feature 3 */}
            <div className="text-center space-y-6">
              <div className="relative mx-auto w-64 h-64 min-h-64 min-w-64 group">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/20 to-brand-teal/20 blur-2xl rounded-full animate-pulse-slow"></div>
                <img 
                  src={localData} 
                  alt="Privacy First" 
                  className="relative w-64 h-64 object-cover rounded-2xl drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500 animate-float-slow"
                  style={{ animationDelay: '2s' }}
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
          </div>
        </div>
      </section>

      {/* How It Works - 3 Steps */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Your Best Financial Decision <span className="text-brand-purple">Takes 60 Seconds</span>
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

      {/* Trust Indicators */}
      <section className="py-24 px-6 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Trusted by Thousands
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent mb-3">
                50K+
              </div>
              <p className="text-xl text-muted-foreground">Active Users</p>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-brand-purple to-brand-teal bg-clip-text text-transparent mb-3">
                $12M+
              </div>
              <p className="text-xl text-muted-foreground">In Rewards Earned</p>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-brand-teal to-brand-blue bg-clip-text text-transparent mb-3">
                99.9%
              </div>
              <p className="text-xl text-muted-foreground">Data Security</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 mt-16 opacity-60">
            <Badge variant="outline" className="text-sm px-4 py-2">SOC 2 Certified</Badge>
            <Badge variant="outline" className="text-sm px-4 py-2">GDPR Compliant</Badge>
            <Badge variant="outline" className="text-sm px-4 py-2">256-bit Encryption</Badge>
            <Badge variant="outline" className="text-sm px-4 py-2">ISO 27001</Badge>
          </div>
        </div>
      </section>

      {/* Get In Touch */}
      <GetInTouch />

    </div>
  );
}
