import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { useSessionActivity } from "@/features/auth/hooks/useSessionActivity";
import { ContinueSessionDialog } from "@/features/auth/components/ContinueSessionDialog";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { GlobalNav } from "@/shared/components/navigation/GlobalNav";
import { Footer } from "@/shared/components/navigation/Footer";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { CSPViolationReporter } from "@/shared/components/security/CSPViolationReporter";
import { RateLimitStatus } from "@/shared/components/api/RateLimitStatus";

// Admin pages (moved from pages/dashboard)
import AdminDashboardLayout from "./pages/internal/AdminDashboardLayout";
import Overview from "./pages/internal/Overview";
import Phases from "./pages/internal/Phases";
import Architecture from "./pages/internal/Architecture";
import Tasks from "./pages/internal/Tasks";
import Metrics from "./pages/internal/Metrics";
import Optimization from "./pages/internal/Optimization";
import Testing from "./pages/internal/Testing";
import Security from "./pages/internal/Security";
import SecurityDashboard from "./pages/internal/SecurityDashboard";
import Phase3Completion from "./pages/internal/Phase3Completion";
import Workflows from "./pages/internal/Workflows";

// Admin / Observability / ML / Location pages (feature-based paths)
import Timeline from "./pages/internal/Timeline";
import Geofences from "@/features/location/pages/Geofences";
import LocationMetrics from "@/features/location/pages/LocationMetrics";
import WebhookAnalytics from "@/features/observability/pages/WebhookAnalytics";
import AnomalyDetection from "@/features/ml/pages/AnomalyDetection";
import ABTesting from "@/features/ml/pages/ABTesting";
import HuggingFace from "@/features/ml/pages/HuggingFace";
import MLTraining from "@/features/ml/pages/MLTraining";
import RealtimeEvents from "@/features/observability/pages/RealtimeEvents";
import FeatureFlags from "@/features/ml/pages/FeatureFlags";
import DistributedTracing from "@/features/observability/pages/DistributedTracing";
import DataPlanes from "@/features/observability/pages/DataPlanes";
import SystemLogs from "@/features/observability/pages/SystemLogs";
import Observability from "@/features/observability/pages/Observability";
import Alerts from "@/features/observability/pages/Alerts";
import Performance from "@/features/observability/pages/Performance";
import RealTimeMetrics from "@/features/observability/pages/RealTimeMetrics";

// Shared pages (not yet moved to features)
import DashboardLauncher from "./pages/DashboardLauncher";
import UserDashboard from "./pages/UserDashboard";
import NotFound from "./pages/NotFound";

// Feature pages
import Auth from "@/features/auth/pages/Auth";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";
import ResetPassword from "@/features/auth/pages/ResetPassword";
import VerifyEmail from "@/features/auth/pages/VerifyEmail";
import ConfirmEmailChange from "@/features/auth/pages/ConfirmEmailChange";
import Transactions from "@/features/transactions/pages/Transactions";
import Budgets from "@/features/budgets/pages/Budgets";
import Insights from "@/features/insights/pages/Insights";
import Recommendations from "@/features/recommendations/pages/Recommendations";
import CreditCards from "@/features/credit-cards/pages/CreditCards";
import LocationHistory from "@/features/location/pages/LocationHistory";
import FavoriteMerchants from "@/features/merchants/pages/FavoriteMerchants";
import Settings from "@/features/settings/pages/Settings";
import Billing from "@/features/settings/pages/Billing";
import Onboarding from "@/features/onboarding/pages/Onboarding";
import { PendingDeletionBanner } from "@/features/settings/components/PendingDeletionBanner";
import { hasRecentLogoutFlag } from "@/shared/lib/auth/clearAuthState";

const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
  </div>
);

const SmallSpinner = () => (
  <div className="p-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: 2000,
    },
    mutations: {
      retry: 0,
    },
  },
});

function SessionActivityManager() {
  const { showWarning, remainingTime, continueSession } = useSessionActivity();
  return (
    <ContinueSessionDialog
      open={showWarning}
      remainingTime={remainingTime}
      onContinue={continueSession}
    />
  );
}

const AUTH_CHROME_PATHS = new Set([
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/confirm-email-change",
]);

function shouldHideAppChrome(pathname: string): boolean {
  return pathname.startsWith("/auth/") || AUTH_CHROME_PATHS.has(pathname);
}

function BackForwardCacheAuthGuard() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && hasRecentLogoutFlag()) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const hideChrome = shouldHideAppChrome(location.pathname);

  return (
    <>
      {!hideChrome && <GlobalNav />}
      {!hideChrome && <PendingDeletionBanner />}
      {!hideChrome && <RateLimitStatus />}
      <div className={hideChrome ? "min-h-screen" : "pt-14"}>
        {children}
        {!hideChrome && <Footer />}
      </div>
    </>
  );
}

function App() {
  if (import.meta.env.VITE_MAINTENANCE_MODE === 'true') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-6">
          <h1 className="text-3xl font-bold text-foreground">Temporarily Offline</h1>
          <p className="text-muted-foreground">
            We're performing maintenance to improve your experience.
            Please check back in a few minutes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <AuthProvider>
                <SessionActivityManager />
                <BackForwardCacheAuthGuard />
                <Toaster />
                <Sonner />
                <CSPViolationReporter />
                <AppShell>
                  <Routes>
                    <Route path="/" element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/marketing/Home')))}</Suspense>} />

                    <Route path="/features"   element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/marketing/Features')))}</Suspense>} />
                    <Route path="/pricing"    element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/marketing/Pricing')))}</Suspense>} />
                    <Route path="/about"      element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/marketing/About')))}</Suspense>} />
                    <Route path="/careers"    element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/marketing/Careers')))}</Suspense>} />
                    <Route path="/brand"      element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/marketing/BrandAssets')))}</Suspense>} />
                    <Route path="/docs"       element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/marketing/Documentation')))}</Suspense>} />
                    <Route path="/api"        element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/marketing/ApiReference')))}</Suspense>} />
                    <Route path="/community"  element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/marketing/Community')))}</Suspense>} />
                    <Route path="/status"     element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/marketing/Status')))}</Suspense>} />

                    {/* Login aliases */}
                    <Route path="/login"   element={<Navigate to="/auth" replace />} />
                    <Route path="/signin"  element={<Navigate to="/auth" replace />} />
                    <Route path="/sign-in" element={<Navigate to="/auth" replace />} />
                    <Route path="/account/login" element={<Navigate to="/auth" replace />} />
                    <Route path="/v3"    element={<Navigate to="/auth" replace />} />
                    <Route path="/v3/*"  element={<Navigate to="/auth" replace />} />
                    <Route path="/old-auth" element={<Navigate to="/auth" replace />} />
                    <Route path="/project-management-dashboard" element={<Navigate to="/auth" replace />} />

                    {/* Auth pages */}
                    <Route path="/auth"              element={<Auth />} />
                    <Route path="/auth/*"            element={<Auth />} />
                    <Route path="/forgot-password"   element={<ForgotPassword />} />
                    <Route path="/reset-password"    element={<ResetPassword />} />
                    <Route path="/verify-email"      element={<VerifyEmail />} />
                    <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />

                    {/* Onboarding (its own ProtectedRoute exemption is handled by skipOnboardingCheck) */}
                    <Route path="/onboarding"      element={<ProtectedRoute skipOnboardingCheck><Onboarding /></ProtectedRoute>} />

                    {/* User app routes */}
                    <Route path="/dashboard"       element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
                    <Route path="/launcher"        element={<ProtectedRoute><DashboardLauncher /></ProtectedRoute>} />
                    <Route path="/credit-cards"    element={<ProtectedRoute><CreditCards /></ProtectedRoute>} />
                    <Route path="/transactions"    element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                    <Route path="/budgets"         element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
                    <Route path="/insights"         element={<ProtectedRoute requirePro><Insights /></ProtectedRoute>} />
                    <Route path="/recommendations"  element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
                    <Route path="/location-history" element={<ProtectedRoute><LocationHistory /></ProtectedRoute>} />
                    <Route path="/favorites"       element={<ProtectedRoute><FavoriteMerchants /></ProtectedRoute>} />
                    <Route path="/settings"         element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/settings/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />

                    {/* Admin routes */}
                    <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminDashboardLayout /></ProtectedRoute>}>
                      <Route index element={<Overview />} />
                      <Route path="phases"        element={<Phases />} />
                      <Route path="timeline"      element={<Timeline />} />
                      <Route path="architecture"  element={<Architecture />} />
                      <Route path="tasks"         element={<Tasks />} />
                      <Route path="team"      element={<div className="p-8">Team view coming soon...</div>} />
                      <Route path="milestones" element={<div className="p-8">Milestones view coming soon...</div>} />
                      <Route path="metrics"       element={<Metrics />} />
                      <Route path="optimization"  element={<Optimization />} />
                      <Route path="risks"     element={<div className="p-8">Risks view coming soon...</div>} />
                      <Route path="testing"       element={<Testing />} />
                      <Route path="security"      element={<Security />} />
                      <Route path="security-monitor" element={<SecurityDashboard />} />
                      <Route path="geofences"     element={<Geofences />} />
                      <Route path="phase3"        element={<Phase3Completion />} />
                      <Route path="location-metrics"   element={<LocationMetrics />} />
                      <Route path="webhook-analytics"  element={<WebhookAnalytics />} />
                      <Route path="anomaly-detection"  element={<AnomalyDetection />} />
                      <Route path="ab-testing"         element={<ABTesting />} />
                      <Route path="huggingface"        element={<HuggingFace />} />
                      <Route path="ml-training"        element={<MLTraining />} />
                      <Route path="realtime-events"    element={<RealtimeEvents />} />
                      <Route path="feature-flags"      element={<FeatureFlags />} />
                      <Route path="workflows"          element={<Workflows />} />
                      <Route path="distributed-tracing" element={<DistributedTracing />} />
                      <Route path="data-planes"        element={<DataPlanes />} />
                      <Route path="system-logs"        element={<SystemLogs />} />
                      <Route path="observability"      element={<Observability />} />
                      <Route path="incidents"   element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/features/observability/pages/Incidents')))}</Suspense>} />
                      <Route path="slo-tracking" element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/features/observability/pages/SLOTracking')))}</Suspense>} />
                      <Route path="alerts"        element={<Alerts />} />
                      <Route path="performance"   element={<Performance />} />
                      <Route path="real-time-metrics" element={<RealTimeMetrics />} />
                    </Route>

                    {/* Convenience redirects */}
                    <Route path="/app"        element={<Navigate to="/dashboard" replace />} />
                    <Route path="/monitoring" element={<Navigate to="/admin/observability" replace />} />
                    <Route path="/website"    element={<Navigate to="/" replace />} />

                    {/* Legal pages */}
                    <Route path="/legal/terms"                element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/legal/TermsOfService')))}</Suspense>} />
                    <Route path="/legal/privacy"              element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/legal/PrivacyPolicy')))}</Suspense>} />
                    <Route path="/legal/data-processing"      element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/legal/DataProcessingPolicy')))}</Suspense>} />
                    <Route path="/legal/ai-recommendations"   element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/legal/AIRecommendationPolicy')))}</Suspense>} />
                    <Route path="/legal/affiliate-transparency" element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/legal/AffiliateTransparency')))}</Suspense>} />
                    <Route path="/legal/consent"              element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/legal/ConsentAgreement')))}</Suspense>} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppShell>
              </AuthProvider>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </React.Fragment>
  );
}

export default App;
