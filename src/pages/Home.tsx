import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, TrendingUp, Shield, Smartphone, KeyRound, Lock, ScanFace, UserCheck, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Logo } from "@/components/brand/Logo";

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirecting authenticated users
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Logo variant="full" className="h-16" showTagline={false} />
            <Badge variant="secondary" className="text-xs">v5.5.5</Badge>
          </div>
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 font-medium">
            Every Purchase. Perfectly Rewarded.
          </p>
          <p className="text-lg text-muted-foreground/80 mb-8">
            Smart expense tracking with secure sign-in. Use Google or Email to get started.
          </p>
          <div className="flex justify-center">
            <Link to="/auth">
              <Button size="lg" variant="gradient" className="text-lg px-8">
                Get Started with Google or Email
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Receipt Scanning</h3>
              <p className="text-sm text-muted-foreground">
                Capture and digitize receipts with your camera or by uploading images.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-accent/50 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Budget Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Set budgets and monitor your spending in real-time across categories.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-chart-3/50 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-chart-3" />
              </div>
              <h3 className="font-semibold mb-2">Works Offline</h3>
              <p className="text-sm text-muted-foreground">
                Track expenses even without internet. Syncs automatically when online.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Secure & Private</h3>
              <p className="text-sm text-muted-foreground">
                Your financial data is encrypted and stored securely in the cloud.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Authentication Features Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Enterprise-Grade Security</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sign in with Google or Email, protected by industry-standard security features
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <ScanFace className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Google OAuth</h3>
              <p className="text-sm text-muted-foreground">
                One-click authentication with your Google account
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Email/Password</h3>
              <p className="text-sm text-muted-foreground">
                Secure authentication with strong password requirements
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Two-Factor Auth</h3>
              <p className="text-sm text-muted-foreground">
                Optional TOTP-based 2FA with backup codes for extra security
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <UserCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Account Protection</h3>
              <p className="text-sm text-muted-foreground">
                Rate limiting and automatic lockout after failed attempts
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Audit Logging</h3>
              <p className="text-sm text-muted-foreground">
                Complete security event tracking for your account
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-16">
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="pt-8 pb-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to take control of your spending?</h2>
            <p className="text-muted-foreground mb-6">Join TrueSpend today and start tracking smarter.</p>
            <Link to="/auth">
              <Button size="lg" variant="gradient" className="text-lg px-8">
                Get Started with Google or Email
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
