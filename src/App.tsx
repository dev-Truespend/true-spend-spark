import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useSessionActivity } from "@/hooks/useSessionActivity";
import { ContinueSessionDialog } from "@/components/auth/ContinueSessionDialog";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GlobalNav } from "@/components/navigation/GlobalNav";
import { Footer } from "@/components/navigation/Footer";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { CSPViolationReporter } from "./components/security/CSPViolationReporter";
import { RateLimitStatus } from "./components/api/RateLimitStatus";
import AdminDashboardLayout from "./pages/dashboard/AdminDashboardLayout";
import DashboardLauncher from "./pages/DashboardLauncher";
import Home from './pages/Home';
import UserDashboard from "./pages/UserDashboard";
import Overview from "./pages/dashboard/Overview";
import Phases from "./pages/dashboard/Phases";
import Architecture from "./pages/dashboard/Architecture";
import Timeline from "./pages/dashboard/Timeline";
import Tasks from "./pages/dashboard/Tasks";
import Metrics from "./pages/dashboard/Metrics";
import Optimization from "./pages/dashboard/Optimization";
import Testing from "./pages/dashboard/Testing";
import Security from "./pages/dashboard/Security";
import SecurityDashboard from "./pages/dashboard/SecurityDashboard";
import Geofences from "./pages/dashboard/Geofences";
import Phase3Completion from "./pages/dashboard/Phase3Completion";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import ConfirmEmailChange from "./pages/ConfirmEmailChange";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import Insights from "./pages/Insights";
import CreditCards from "./pages/CreditCards";
import LocationHistory from "./pages/LocationHistory";
import LocationMetrics from "./pages/dashboard/LocationMetrics";
import NotFound from "./pages/NotFound";
import FavoriteMerchants from "./pages/FavoriteMerchants";
import Settings from "./pages/Settings";
import Workflows from "./pages/dashboard/Workflows";
import WebhookAnalytics from "./pages/dashboard/WebhookAnalytics";
import AnomalyDetection from "./pages/dashboard/AnomalyDetection";
import ABTesting from "./pages/dashboard/ABTesting";
import HuggingFace from "./pages/dashboard/HuggingFace";
import MLTraining from "./pages/dashboard/MLTraining";
import RealtimeEvents from "./pages/dashboard/RealtimeEvents";
import FeatureFlags from "./pages/dashboard/FeatureFlags";
import DistributedTracing from "./pages/dashboard/DistributedTracing";
import DataPlanes from "./pages/dashboard/DataPlanes";
import SystemLogs from "./pages/dashboard/SystemLogs";
import Observability from "./pages/dashboard/Observability";
import Alerts from "./pages/dashboard/Alerts";
import Performance from "./pages/dashboard/Performance";
import RealTimeMetrics from "./pages/dashboard/RealTimeMetrics";

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
      staleTime: 1000 * 60,          // 1 min — queries are fresh for 60s
      refetchOnWindowFocus: false,   // opt-in per query instead of globally refetching everything
      refetchOnReconnect: true,
      retry: 1,                      // one retry on failure, not the silent 3x default
      retryDelay: 2000,
    },
    mutations: {
      retry: 0,                      // never auto-retry mutations — side effects aren't idempotent
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
                <Toaster />
                <Sonner />
                <CSPViolationReporter />
                <GlobalNav />
                <RateLimitStatus />
                <div className="pt-14">
                  <Routes>
                    <Route path="/" element={<Home />} />

                    <Route path="/features" element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/Features')))}</Suspense>} />
                    <Route path="/pricing" element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/Pricing')))}</Suspense>} />
                    <Route path="/about" element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/About')))}</Suspense>} />
                    <Route path="/careers" element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/Careers')))}</Suspense>} />
                    <Route path="/brand" element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/BrandAssets')))}</Suspense>} />
                    <Route path="/docs" element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/Documentation')))}</Suspense>} />
                    <Route path="/api" element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/ApiReference')))}</Suspense>} />
                    <Route path="/community" element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/Community')))}</Suspense>} />
                    <Route path="/status" element={<Suspense fallback={<PageSpinner />}>{React.createElement(lazy(() => import('@/pages/Status')))}</Suspense>} />

                    {/* Login aliases */}
                    <Route path="/login" element={<Navigate to="/auth" replace />} />
                    <Route path="/signin" element={<Navigate to="/auth" replace />} />
                    <Route path="/sign-in" element={<Navigate to="/auth" replace />} />
                    <Route path="/account/login" element={<Navigate to="/auth" replace />} />
                    <Route path="/v3" element={<Navigate to="/auth" replace />} />
                    <Route path="/v3/*" element={<Navigate to="/auth" replace />} />
                    <Route path="/old-auth" element={<Navigate to="/auth" replace />} />
                    <Route path="/project-management-dashboard" element={<Navigate to="/auth" replace />} />

                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth/*" element={<Auth />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />

                    <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
                    <Route path="/launcher" element={<ProtectedRoute><DashboardLauncher /></ProtectedRoute>} />
                    <Route path="/credit-cards" element={<ProtectedRoute><CreditCards /></ProtectedRoute>} />
                    <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                    <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
                    <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
                    <Route path="/location-history" element={<ProtectedRoute><LocationHistory /></ProtectedRoute>} />
                    <Route path="/favorites" element={<ProtectedRoute><FavoriteMerchants /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                    <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminDashboardLayout /></ProtectedRoute>}>
                      <Route index element={<Overview />} />
                      <Route path="phases" element={<Phases />} />
                      <Route path="timeline" element={<Timeline />} />
                      <Route path="architecture" element={<Architecture />} />
                      <Route path="tasks" element={<Tasks />} />
                      <Route path="team" element={<div className="p-8">Team view coming soon...</div>} />
                      <Route path="milestones" element={<div className="p-8">Milestones view coming soon...</div>} />
                      <Route path="metrics" element={<Metrics />} />
                      <Route path="optimization" element={<Optimization />} />
                      <Route path="risks" element={<div className="p-8">Risks view coming soon...</div>} />
                      <Route path="testing" element={<Testing />} />
                      <Route path="security" element={<Security />} />
                      <Route path="security-monitor" element={<SecurityDashboard />} />
                      <Route path="geofences" element={<Geofences />} />
                      <Route path="phase3" element={<Phase3Completion />} />
                      <Route path="location-metrics" element={<LocationMetrics />} />
                      <Route path="webhook-analytics" element={<WebhookAnalytics />} />
                      <Route path="anomaly-detection" element={<AnomalyDetection />} />
                      <Route path="ab-testing" element={<ABTesting />} />
                      <Route path="huggingface" element={<HuggingFace />} />
                      <Route path="ml-training" element={<MLTraining />} />
                      <Route path="realtime-events" element={<RealtimeEvents />} />
                      <Route path="feature-flags" element={<FeatureFlags />} />
                      <Route path="workflows" element={<Workflows />} />
                      <Route path="distributed-tracing" element={<DistributedTracing />} />
                      <Route path="data-planes" element={<DataPlanes />} />
                      <Route path="system-logs" element={<SystemLogs />} />
                      <Route path="observability" element={<Observability />} />
                      <Route path="incidents" element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/dashboard/Incidents')))}</Suspense>} />
                      <Route path="slo-tracking" element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/dashboard/SLOTracking')))}</Suspense>} />
                      <Route path="alerts" element={<Alerts />} />
                      <Route path="performance" element={<Performance />} />
                      <Route path="real-time-metrics" element={<RealTimeMetrics />} />
                    </Route>

                    <Route path="/app" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/monitoring" element={<Navigate to="/admin/observability" replace />} />
                    <Route path="/website" element={<Navigate to="/" replace />} />

                    <Route path="/legal/terms" element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/legal/TermsOfService')))}</Suspense>} />
                    <Route path="/legal/privacy" element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/legal/PrivacyPolicy')))}</Suspense>} />
                    <Route path="/legal/data-processing" element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/legal/DataProcessingPolicy')))}</Suspense>} />
                    <Route path="/legal/ai-recommendations" element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/legal/AIRecommendationPolicy')))}</Suspense>} />
                    <Route path="/legal/affiliate-transparency" element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/legal/AffiliateTransparency')))}</Suspense>} />
                    <Route path="/legal/consent" element={<Suspense fallback={<SmallSpinner />}>{React.createElement(lazy(() => import('@/pages/legal/ConsentAgreement')))}</Suspense>} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <Footer />
                </div>
              </AuthProvider>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </React.Fragment>
  );
}

export default App;
