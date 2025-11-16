import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GlobalNav } from "@/components/navigation/GlobalNav";
import AdminDashboardLayout from "./pages/dashboard/AdminDashboardLayout";
import DashboardLauncher from "./pages/DashboardLauncher";
import Home from "./pages/Home";
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
import NotFound from "./pages/NotFound";
import { CSPViolationReporter } from "./components/security/CSPViolationReporter";
import { RateLimitStatus } from "./components/api/RateLimitStatus";
import { useNotificationTriggers } from "./hooks/useNotificationTriggers";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 5, // 5 minutes (reduced from 24 hours)
      staleTime: 1000 * 30, // 30 seconds (reduced from 5 minutes)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

function NotificationTriggersWrapper() {
  // Initialize notification triggers for automatic push notifications
  useNotificationTriggers();
  return null;
}

function App() {
  // Maintenance mode gate
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
          <BrowserRouter>
            <AuthProvider>
              <NotificationTriggersWrapper />
              <Toaster />
              <Sonner />
              <CSPViolationReporter />
              <GlobalNav />
              <RateLimitStatus />
              <div className="pt-14">
            <Routes>
              {/* Root shows Home page */}
              <Route path="/" element={<Home />} />
              
              {/* Legacy Login Route Redirects - Force consistency to /auth */}
              <Route path="/login" element={<Navigate to="/auth" replace />} />
              <Route path="/signin" element={<Navigate to="/auth" replace />} />
              <Route path="/sign-in" element={<Navigate to="/auth" replace />} />
              <Route path="/account/login" element={<Navigate to="/auth" replace />} />
              <Route path="/v3" element={<Navigate to="/auth" replace />} />
              <Route path="/v3/*" element={<Navigate to="/auth" replace />} />
              <Route path="/old-auth" element={<Navigate to="/auth" replace />} />
              <Route path="/project-management-dashboard" element={<Navigate to="/auth" replace />} />
              
              {/* Main Auth Route */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/*" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />
              
              {/* User Dashboard */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Dashboard Launcher (kept for workspace selection if needed) */}
              <Route 
                path="/launcher" 
                element={
                  <ProtectedRoute>
                    <DashboardLauncher />
                  </ProtectedRoute>
                } 
              />

              {/* Phase 4: User Features */}
              <Route 
                path="/transactions" 
                element={
                  <ProtectedRoute>
                    <Transactions />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/budgets" 
                element={
                  <ProtectedRoute>
                    <Budgets />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/insights" 
                element={
                  <ProtectedRoute>
                    <Insights />
                  </ProtectedRoute>
                } 
              />

              {/* Admin Dashboard - Project Management */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireRole="admin">
                    <AdminDashboardLayout />
                  </ProtectedRoute>
                }
              >
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
              </Route>

              {/* TrueSpend User App - Coming Soon */}
              <Route 
                path="/app" 
                element={
                  <ProtectedRoute requireRole={['user', 'developer', 'admin']}>
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold mb-4">TrueSpend App</h1>
                        <p className="text-muted-foreground">Coming Soon - Phase 1 Implementation</p>
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* Monitoring Dashboard - Coming Soon */}
              <Route 
                path="/monitoring" 
                element={
                  <ProtectedRoute requireRole={['admin', 'developer']}>
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold mb-4">Performance Monitoring</h1>
                        <p className="text-muted-foreground">Coming Soon</p>
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* Public Website - Coming Soon */}
              <Route 
                path="/website" 
                element={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold mb-4">TrueSpend Website</h1>
                      <p className="text-muted-foreground">Coming Soon</p>
                    </div>
                  </div>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </React.Fragment>
  );
}

export default App;
