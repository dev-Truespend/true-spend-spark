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
import Geofences from "./pages/dashboard/Geofences";
import Auth from "./pages/Auth";
import ResendTest from "./pages/ResendTest";
import NotFound from "./pages/NotFound";
import { PWAInstallPrompt } from "./components/pwa/PWAInstallPrompt";
import { OfflineIndicator } from "./components/pwa/OfflineIndicator";
import { SyncIndicator } from "./components/pwa/SyncIndicator";
import { ServiceWorkerUpdatePrompt } from "./components/pwa/ServiceWorkerUpdatePrompt";
import { CSPViolationReporter } from "./components/security/CSPViolationReporter";
import { RateLimitStatus } from "./components/api/RateLimitStatus";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <CSPViolationReporter />
          <ServiceWorkerUpdatePrompt />
          <PWAInstallPrompt />
          <OfflineIndicator />
          <SyncIndicator />
          <GlobalNav />
          <RateLimitStatus />
          <div className="pt-14">
            <Routes>
              {/* Public Home Page */}
              <Route path="/" element={<Home />} />
              
            <Route path="/auth" element={<Auth />} />
            <Route path="/resend-test" element={<ResendTest />} />
              
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
                <Route path="geofences" element={<Geofences />} />
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
);

export default App;
