import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, Wallet, TrendingUp, Settings, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAdaptiveContent } from "@/hooks/useAdaptiveContent";
import { LowDataModeIndicator } from "@/components/ui/LowDataModeIndicator";
import { UnverifiedBanner } from "@/components/auth/UnverifiedBanner";
import { cn } from "@/lib/utils";

export default function UserDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { shouldAnimate, imageQuality } = useAdaptiveContent();

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
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto px-6 py-8">
        {/* Unverified Banner */}
        <UnverifiedBanner />
        <LowDataModeIndicator />

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

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-[#3882F6]/10 to-[#3882F6]/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-[#3882F6]/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-[#3882F6]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">No expenses yet</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-[#9333EA]/10 to-[#9333EA]/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receipts</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-[#9333EA]/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-[#9333EA]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Start uploading receipts</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-[#1488A6]/10 to-[#1488A6]/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-[#1488A6]/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-[#1488A6]" />
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
            "border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-[#3882F6] border-2 border-transparent",
            isRestricted ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#3882F6]/10 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-[#3882F6]" />
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
                className="w-full border-[#3882F6]/20 hover:bg-[#3882F6]/10 hover:text-[#3882F6] hover:border-[#3882F6]" 
                disabled={isRestricted}
              >
                {isRestricted ? "🔒 Locked" : "Coming Soon"}
              </Button>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-[#9333EA] border-2 border-transparent cursor-pointer"
          )}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#9333EA]/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#9333EA]" />
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
                className="w-full border-[#9333EA]/20 hover:bg-[#9333EA]/10 hover:text-[#9333EA] hover:border-[#9333EA]"
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-[#1488A6] border-2 border-transparent cursor-pointer"
          )}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#1488A6]/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-[#1488A6]" />
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
                className="w-full border-[#1488A6]/20 hover:bg-[#1488A6]/10 hover:text-[#1488A6] hover:border-[#1488A6]"
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-[#3882F6] border-2 border-transparent cursor-pointer"
          )}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#3882F6]/10 flex items-center justify-center">
                  <Settings className="w-6 h-6 text-[#3882F6]" />
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
                className="w-full border-[#3882F6]/20 hover:bg-[#3882F6]/10 hover:text-[#3882F6] hover:border-[#3882F6]"
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
