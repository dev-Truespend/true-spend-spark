import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, TrendingUp, Shield, Smartphone } from "lucide-react";
import { VersionDisplay } from "@/components/version/VersionDisplay";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center justify-center gap-2">
            TrueSpend
            <VersionDisplay />
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Smart expense tracking that works everywhere. Capture receipts, track spending, and manage budgets with ease.
          </p>
          <div className="flex justify-center">
            <Link to="/auth">
              <Button size="lg">
                Login/Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-2 hover:border-primary/50 transition-colors">
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

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Budget Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Set budgets and monitor your spending in real-time across categories.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Works Offline</h3>
              <p className="text-sm text-muted-foreground">
                Track expenses even without internet. Syncs automatically when online.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
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

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-16">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-8 pb-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to take control of your spending?</h2>
            <p className="text-muted-foreground mb-6">Join TrueSpend today and start tracking smarter.</p>
            <Link to="/auth">
              <Button size="lg">
                Login/Create Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
