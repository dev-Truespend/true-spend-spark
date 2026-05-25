import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, LayoutDashboard, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn("404:", location.pathname);
    }
  }, [location.pathname]);

  // Suggest the most likely destination based on the URL fragment
  const suggest = (): { label: string; to: string } | null => {
    const p = location.pathname.toLowerCase();
    if (!user) return null;
    if (p.includes("transact")) return { label: "Go to Transactions", to: "/transactions" };
    if (p.includes("budget"))   return { label: "Go to Budgets",      to: "/budgets" };
    if (p.includes("card") || p.includes("credit")) {
      return { label: "Go to Credit Cards", to: "/credit-cards" };
    }
    if (p.includes("setting") || p.includes("billing") || p.includes("subscription")) {
      return { label: "Go to Settings", to: "/settings" };
    }
    if (p.includes("insight") || p.includes("analytic")) {
      return { label: "Go to Insights", to: "/insights" };
    }
    if (p.includes("admin")) return { label: "Go to Admin Dashboard", to: "/admin" };
    return null;
  };

  const suggestion = suggest();
  const primaryHome = user ? "/dashboard" : "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-6">
      <Card className="w-full max-w-lg border shadow-lg">
        <CardContent className="pt-10 pb-8 text-center space-y-6">
          {/* Big 404 */}
          <div className="space-y-2">
            <p className="text-7xl font-extrabold bg-gradient-to-r from-brand-blue via-brand-purple to-brand-teal bg-clip-text text-transparent leading-none">
              404
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
            <p className="text-muted-foreground text-sm">
              The page you're looking for doesn't exist or has been moved.
            </p>
            {location.pathname !== "/" && (
              <code className="inline-block text-xs text-muted-foreground/70 bg-muted/40 rounded px-2 py-1 mt-2 max-w-full truncate">
                {location.pathname}
              </code>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            {!loading && suggestion && (
              <Button asChild className="w-full gap-2">
                <Link to={suggestion.to}>
                  <Compass className="h-4 w-4" />
                  {suggestion.label}
                </Link>
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Go back
              </Button>

              <Button asChild variant="outline" className="gap-2">
                <Link to={primaryHome}>
                  {user ? <LayoutDashboard className="h-4 w-4" /> : <Home className="h-4 w-4" />}
                  {user ? "Dashboard" : "Home"}
                </Link>
              </Button>
            </div>
          </div>

          {/* Help link */}
          <p className="text-xs text-muted-foreground pt-2">
            Need help?{" "}
            <a
              href="mailto:support@truespend.org"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Contact support
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
