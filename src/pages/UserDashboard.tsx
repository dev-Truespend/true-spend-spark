import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, Wallet, TrendingUp, Settings, User, LogOut, CreditCard, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAdaptiveContent } from "@/hooks/useAdaptiveContent";
import { LowDataModeIndicator } from "@/components/ui/LowDataModeIndicator";
import { UnverifiedBanner } from "@/components/auth/UnverifiedBanner";
import { CreditCardGrid } from "@/components/credit-cards/CreditCardGrid";
import { cn } from "@/lib/utils";

export default function UserDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { shouldAnimate, imageQuality } = useAdaptiveContent();
  const [activeTab, setActiveTab] = useState("overview");

  // Restrict actions if unverified
  const isRestricted = profile?.status === 'pending_verification';

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully logged out.",
    });
    // Navigation is handled by signOut function
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Unverified Banner */}
        <UnverifiedBanner />

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}!
            </h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="credit-cards" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Credit Cards
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-primary/10 to-primary/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$0.00</div>
                  <p className="text-xs text-muted-foreground">No expenses yet</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-accent/10 to-accent/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receipts</CardTitle>
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-accent" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Start uploading receipts</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-brand-teal/10 to-brand-teal/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
                  <div className="w-10 h-10 rounded-lg bg-brand-teal/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-brand-teal" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">--</div>
                  <p className="text-xs text-muted-foreground">Set up your first budget</p>
                </CardContent>
              </Card>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className={cn(
                "border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary border-2 border-transparent",
                isRestricted ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              )}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Receipts & Expenses</CardTitle>
                      <CardDescription>
                        {isRestricted 
                          ? "Verify your email to access this feature" 
                          : "Capture and manage your receipts"
                        }
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    disabled={isRestricted}
                  >
                    {isRestricted ? "🔒 Locked" : "Coming Soon"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-accent border-2 border-transparent cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <CardTitle>Budgets</CardTitle>
                      <CardDescription>Track spending against your budgets</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full"
                  >
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-brand-teal border-2 border-transparent cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-brand-teal" />
                    </div>
                    <div>
                      <CardTitle>Profile</CardTitle>
                      <CardDescription>Manage your account settings</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full"
                  >
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary border-2 border-transparent cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Settings className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Settings</CardTitle>
                      <CardDescription>Configure app preferences</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full"
                  >
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Credit Cards Tab */}
          <TabsContent value="credit-cards">
            <CreditCardGrid />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
