import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Eye, Database, KeyRound, FileCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import logoGradient from "@/assets/truespend-logo-gradient.png";

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
      {/* Hero Section - Apple Style */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-white dark:from-blue-950/20 dark:via-purple-950/20 dark:to-black opacity-60"></div>
        
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
          {/* Hero Text */}
          <div className="space-y-6 animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
              Track Every Purchase.
              <br />
              <span className="bg-gradient-to-r from-[#3882F6] to-[#9333EA] bg-clip-text text-transparent">
                Maximize Every Reward.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
              Smart expense tracking. Uncompromising privacy.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/auth">
              <Button 
                size="lg" 
                className="text-lg px-12 py-7 rounded-full bg-gradient-to-r from-[#3882F6] to-[#9333EA] hover:opacity-90 shadow-2xl hover:shadow-[#3882F6]/30 transition-all duration-300 hover:scale-105 text-white"
              >
                Start 7-Day Free Trial
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-12 py-7 rounded-full border-2 border-gray-300 dark:border-gray-700 hover:border-[#3882F6] dark:hover:border-[#3882F6] transition-all duration-300"
            >
              Try Demo First
            </Button>
          </div>

          {/* Trust Badges */}
          <p className="text-sm text-gray-500 dark:text-gray-500 pt-4">
            No credit card required • Cancel anytime
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-400 dark:border-gray-600 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-gray-600 dark:bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Privacy Commitment - Pill Badges Section */}
      <section className="py-20 px-6 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
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

          {/* Pill Badges */}
          <div className="flex flex-wrap justify-center gap-3 pt-6">
            <div className="rounded-full bg-white dark:bg-gray-900 px-6 py-3 border border-gray-200 dark:border-gray-800 shadow-sm">
              <span className="text-sm font-medium text-gray-900 dark:text-white">✓ No tracking pixels</span>
            </div>
            <div className="rounded-full bg-white dark:bg-gray-900 px-6 py-3 border border-gray-200 dark:border-gray-800 shadow-sm">
              <span className="text-sm font-medium text-gray-900 dark:text-white">✓ No data brokers</span>
            </div>
            <div className="rounded-full bg-white dark:bg-gray-900 px-6 py-3 border border-gray-200 dark:border-gray-800 shadow-sm">
              <span className="text-sm font-medium text-gray-900 dark:text-white">✓ No targeted ads</span>
            </div>
            <div className="rounded-full bg-white dark:bg-gray-900 px-6 py-3 border border-gray-200 dark:border-gray-800 shadow-sm">
              <span className="text-sm font-medium text-gray-900 dark:text-white">✓ No data selling. Ever.</span>
            </div>
          </div>

          <Link to="/privacy" className="inline-block text-[#3882F6] hover:text-[#9333EA] font-medium text-sm transition-colors">
            Read our Privacy Policy →
          </Link>
        </div>
      </section>

      {/* Your Money is Safe Section */}
      <section className="py-32 px-6 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3882F6] to-[#9333EA] flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                Your Money is Safe
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-900">
              <CardContent className="pt-8 pb-8 px-6">
                <div className="w-14 h-14 rounded-2xl bg-[#3882F6]/10 flex items-center justify-center mb-4">
                  <Lock className="w-7 h-7 text-[#3882F6]" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Bank-Grade 256-bit Encryption</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Military-grade encryption protects your financial data at rest and in transit.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-900">
              <CardContent className="pt-8 pb-8 px-6">
                <div className="w-14 h-14 rounded-2xl bg-[#9333EA]/10 flex items-center justify-center mb-4">
                  <Eye className="w-7 h-7 text-[#9333EA]" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Read-Only Access</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  We can only view your transactions—never move money or make changes.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-900">
              <CardContent className="pt-8 pb-8 px-6">
                <div className="w-14 h-14 rounded-2xl bg-[#1488A6]/10 flex items-center justify-center mb-4">
                  <Lock className="w-7 h-7 text-[#1488A6]" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Zero Credit Card Numbers Stored</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  We never store full card numbers. Only encrypted transaction metadata.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-900">
              <CardContent className="pt-8 pb-8 px-6">
                <div className="w-14 h-14 rounded-2xl bg-[#3882F6]/10 flex items-center justify-center mb-4">
                  <Database className="w-7 h-7 text-[#3882F6]" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">No Data Selling. Ever.</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Your financial data will never be sold, shared, or monetized. Period.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-900">
              <CardContent className="pt-8 pb-8 px-6">
                <div className="w-14 h-14 rounded-2xl bg-[#9333EA]/10 flex items-center justify-center mb-4">
                  <FileCheck className="w-7 h-7 text-[#9333EA]" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">SOC 2 Compliant Infrastructure</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Enterprise-grade security standards with regular third-party audits.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-900">
              <CardContent className="pt-8 pb-8 px-6">
                <div className="w-14 h-14 rounded-2xl bg-[#1488A6]/10 flex items-center justify-center mb-4">
                  <Shield className="w-7 h-7 text-[#1488A6]" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Trusted by 50,000+ Users</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Join thousands who trust us with their financial privacy.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center gap-4 pt-8">
            <div className="rounded-full bg-white dark:bg-gray-900 px-6 py-3 border border-gray-200 dark:border-gray-800 shadow-sm">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">🔒 SOC 2 Compliant</span>
            </div>
            <div className="rounded-full bg-white dark:bg-gray-900 px-6 py-3 border border-gray-200 dark:border-gray-800 shadow-sm">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">🛡️ AES-256 Encryption</span>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy First Section */}
      <section className="py-32 px-6 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              One Subscription. <span className="bg-gradient-to-r from-[#3882F6] to-[#9333EA] bg-clip-text text-transparent">Every Platform.</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-light">
              Your complete financial command center synchronized across web, mobile, Chrome & Safari—seamlessly working together as one powerful ecosystem.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <Card className="border-0 shadow-xl bg-white dark:bg-gray-900 hover:shadow-[#3882F6]/20 transition-all duration-500 hover:-translate-y-2">
              <CardContent className="pt-12 pb-12 px-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3882F6] to-[#9333EA] flex items-center justify-center mb-8 mx-auto shadow-lg">
                  <Database className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">🚀 Web App</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Full-featured dashboard with advanced analytics and reporting.
                </p>
                <Badge className="bg-[#3882F6]/10 text-[#3882F6] hover:bg-[#3882F6]/20 border-0">
                  15 Features
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white dark:bg-gray-900 hover:shadow-[#9333EA]/20 transition-all duration-500 hover:-translate-y-2">
              <CardContent className="pt-12 pb-12 px-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#9333EA] to-[#1488A6] flex items-center justify-center mb-8 mx-auto shadow-lg">
                  <Eye className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">📱 Mobile App</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Capture receipts on-the-go. iOS & Android native experience.
                </p>
                <Badge className="bg-[#9333EA]/10 text-[#9333EA] hover:bg-[#9333EA]/20 border-0">
                  13 Features
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white dark:bg-gray-900 hover:shadow-[#1488A6]/20 transition-all duration-500 hover:-translate-y-2">
              <CardContent className="pt-12 pb-12 px-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1488A6] to-[#3882F6] flex items-center justify-center mb-8 mx-auto shadow-lg">
                  <Lock className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">🔌 Browser Extensions</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Track spending seamlessly as you browse. Chrome & Safari support.
                </p>
                <Badge className="bg-[#1488A6]/10 text-[#1488A6] hover:bg-[#1488A6]/20 border-0">
                  11 Features
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section - Minimalist */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Powerful. Simple. Secure.
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-light">
              Everything you need to take control of your spending, without compromising your privacy.
            </p>
          </div>

          <div className="space-y-32">
            {/* Feature 1 */}
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-4xl font-bold text-gray-900 dark:text-white">
                  Bank-Level Security
                </h3>
                <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                  Military-grade AES-256 encryption protects your data at rest and in transit. 
                  Two-factor authentication and biometric locks keep your account secure.
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 rounded-3xl h-96 flex items-center justify-center">
                <Shield className="w-32 h-32 text-blue-600 dark:text-blue-400 opacity-20" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-950 dark:to-pink-950 rounded-3xl h-96 flex items-center justify-center md:order-first">
                <KeyRound className="w-32 h-32 text-purple-600 dark:text-purple-400 opacity-20" />
              </div>
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <KeyRound className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-4xl font-bold text-gray-900 dark:text-white">
                  Your Keys. Your Control.
                </h3>
                <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                  You hold the encryption keys. Not us, not third parties. 
                  Delete your data anytime, and it's gone forever.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                  <FileCheck className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-4xl font-bold text-gray-900 dark:text-white">
                  Transparent & Audited
                </h3>
                <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                  Regular third-party security audits ensure we meet the highest standards. 
                  Our privacy policy is clear, concise, and written in plain English.
                </p>
              </div>
              <div className="bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-950 dark:to-blue-950 rounded-3xl h-96 flex items-center justify-center">
                <FileCheck className="w-32 h-32 text-indigo-600 dark:text-indigo-400 opacity-20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Commitment Section */}
      <section className="py-32 px-6 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <h2 className="text-5xl md:text-6xl font-bold mb-8">
            Our Privacy Promise
          </h2>
          
          <div className="space-y-8 text-left">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold">
                1
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-2">No Third-Party Tracking</h3>
                <p className="text-gray-400 text-lg">
                  We don't use analytics tools that track you across the web. No cookies, no fingerprinting, no hidden trackers.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-xl font-bold">
                2
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-2">No Data Sales</h3>
                <p className="text-gray-400 text-lg">
                  Your financial information will never be sold, leased, or shared with advertisers or data brokers.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-bold">
                3
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-2">Minimal Data Collection</h3>
                <p className="text-gray-400 text-lg">
                  We only collect what's necessary for the app to function. No email scanning, no contact syncing, no background location tracking.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-pink-600 flex items-center justify-center text-xl font-bold">
                4
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-2">Full Transparency</h3>
                <p className="text-gray-400 text-lg">
                  Every permission we request has a clear explanation. You decide what data to share and when.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <h2 className="text-5xl md:text-6xl font-bold leading-tight">
            Ready to take control?
            <br />
            Your privacy awaits.
          </h2>
          <p className="text-2xl font-light opacity-90">
            Join thousands who've chosen privacy without compromise.
          </p>
          <Link to="/auth">
            <Button 
              size="lg" 
              className="text-xl px-16 py-8 rounded-full bg-white text-blue-600 hover:bg-gray-100 shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105 font-semibold"
            >
              Get Started Today
            </Button>
          </Link>
          <p className="text-sm opacity-75 mt-8">
            No credit card required. Start in seconds.
          </p>
        </div>
      </section>
    </div>
  );
}
