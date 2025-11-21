import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
          {/* Logo with float animation */}
          <div className="flex justify-center mb-8 animate-float">
            <img 
              src={logoGradient} 
              alt="TrueSpend" 
              className="h-32 w-32 md:h-40 md:w-40 drop-shadow-2xl"
            />
          </div>
          
          {/* Hero Text */}
          <div className="space-y-6 animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
              Every Purchase.
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Perfectly Rewarded.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
              The intelligent expense tracker that puts your privacy first. 
              Your data stays yours. Always.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/auth">
              <Button 
                size="lg" 
                className="text-lg px-12 py-7 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105"
              >
                Get Started
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-12 py-7 rounded-full border-2 border-gray-300 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-400 transition-all duration-300"
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-400 dark:border-gray-600 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-gray-600 dark:bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Privacy First Section */}
      <section className="py-32 px-6 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Privacy. At our core.
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto font-light">
              We believe privacy isn't just a feature. It's a fundamental human right. 
              That's why we built TrueSpend from the ground up with privacy as the foundation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <Card className="border-0 shadow-2xl bg-white dark:bg-gray-900 hover:shadow-blue-500/20 transition-all duration-500 hover:-translate-y-2">
              <CardContent className="pt-12 pb-12 px-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-8 mx-auto">
                  <Lock className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">End-to-End Encryption</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Your financial data is encrypted on your device before it ever reaches our servers. Not even we can read it.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-2xl bg-white dark:bg-gray-900 hover:shadow-purple-500/20 transition-all duration-500 hover:-translate-y-2">
              <CardContent className="pt-12 pb-12 px-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-8 mx-auto">
                  <Eye className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Zero Data Sharing</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  We don't sell, share, or monetize your data. Ever. Your information is yours and yours alone.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-2xl bg-white dark:bg-gray-900 hover:shadow-indigo-500/20 transition-all duration-500 hover:-translate-y-2">
              <CardContent className="pt-12 pb-12 px-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mb-8 mx-auto">
                  <Database className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Local-First Storage</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Your data lives on your device. Sync is optional, and you control what gets backed up.
                </p>
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
