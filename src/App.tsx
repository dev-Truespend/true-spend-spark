import React, { useState, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncPersister } from '@/lib/queryPersister';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GlobalNav } from "@/components/navigation/GlobalNav";
import { ConflictResolutionDialog } from "@/components/sync/ConflictResolutionDialog";
import { syncManager, SyncStatus } from "@/services/syncManager";
import { offlineSyncService, SyncConflict, ConflictResolution } from "@/services/offlineSync";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { toast } from "sonner";
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
import LocationHistory from "./pages/LocationHistory";
import LocationMetrics from "./pages/dashboard/LocationMetrics";
import NotFound from "./pages/NotFound";
import FavoriteMerchants from "./pages/FavoriteMerchants";
import Settings from "./pages/Settings";
import WebhookAnalytics from "./pages/dashboard/WebhookAnalytics";
import AnomalyDetection from "./pages/dashboard/AnomalyDetection";
import ABTesting from "./pages/dashboard/ABTesting";
import { CSPViolationReporter } from "./components/security/CSPViolationReporter";
import { RateLimitStatus } from "./components/api/RateLimitStatus";
import { useNotificationTriggers } from "./hooks/useNotificationTriggers";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours for persistence
      staleTime: 1000 * 30, // 30 seconds (reduced from 5 minutes)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

const persister = createSyncPersister();

function NotificationTriggersWrapper() {
  // Initialize notification triggers for automatic push notifications
  useNotificationTriggers();
  return null;
}

function SyncManagerWrapper() {
  const { storage, status, resolveConflict } = useOfflineStorage();
  const [currentConflict, setCurrentConflict] = useState<SyncConflict | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const conflictResolutionRef = useRef<((resolution: ConflictResolution) => void) | null>(null);

  // Subscribe to syncManager status changes
  useEffect(() => {
    console.log('[App] Subscribing to sync status changes');
    const unsubscribe = syncManager.onStatusChange((status, error) => {
      setSyncStatus(status);
      if (error) {
        console.error('[App] Sync error:', error);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Start auto-sync on mount
  useEffect(() => {
    console.log('[App] Starting auto-sync (every 30 seconds)');
    syncManager.startAutoSync(30000);

    return () => {
      console.log('[App] Stopping auto-sync');
      syncManager.stopAutoSync();
    };
  }, []);

  // Check for conflicts when coming back online
  useEffect(() => {
    const checkConflicts = async () => {
      if (!status.isOnline) return;

      console.log('[App] Checking for sync conflicts...');
      
      try {
        // Check transactions for conflicts
        const transactions = await storage.getAll('transactions');
        const txResult = await offlineSyncService.sync(
          'transactions',
          transactions,
          async (conflict) => {
            console.log('[App] Conflict detected:', conflict);
            setCurrentConflict(conflict);
            setShowConflictDialog(true);
            
            // Wait for user resolution
            return new Promise<ConflictResolution>((resolve) => {
              conflictResolutionRef.current = resolve;
            });
          }
        );

        // Check budgets for conflicts
        const budgets = await storage.getAll('budgets');
        const budgetResult = await offlineSyncService.sync(
          'budgets',
          budgets,
          async (conflict) => {
            console.log('[App] Conflict detected:', conflict);
            setCurrentConflict(conflict);
            setShowConflictDialog(true);
            
            return new Promise<ConflictResolution>((resolve) => {
              conflictResolutionRef.current = resolve;
            });
          }
        );

        const totalConflicts = txResult.conflicts.length + budgetResult.conflicts.length;
        if (totalConflicts > 0) {
          toast.warning(`${totalConflicts} sync conflict(s) need resolution`);
        } else if (txResult.pushed > 0 || txResult.pulled > 0 || budgetResult.pushed > 0 || budgetResult.pulled > 0) {
          toast.success('Successfully synced all changes');
        }
      } catch (error) {
        console.error('[App] Conflict check error:', error);
      }
    };

    // Check on mount and when coming back online
    checkConflicts();
    
    window.addEventListener('online', checkConflicts);
    return () => window.removeEventListener('online', checkConflicts);
  }, [status.isOnline, storage]);

  const handleConflictResolve = async (resolution: 'local' | 'remote') => {
    if (!currentConflict) return;

    console.log('[App] Resolving conflict:', resolution);
    
    // Call the resolution callback
    if (conflictResolutionRef.current) {
      conflictResolutionRef.current(resolution);
      conflictResolutionRef.current = null;
    }

    // Use the resolveConflict method from useOfflineStorage
    await resolveConflict(currentConflict, resolution);

    setShowConflictDialog(false);
    setCurrentConflict(null);
    
    toast.success('Conflict resolved successfully');
  };

  return (
    <>
      <ConflictResolutionDialog
        conflict={currentConflict}
        open={showConflictDialog}
        onClose={() => {
          setShowConflictDialog(false);
          setCurrentConflict(null);
          // Resolve as "manual" to skip
          if (conflictResolutionRef.current) {
            conflictResolutionRef.current('manual');
            conflictResolutionRef.current = null;
          }
        }}
        onResolve={handleConflictResolve}
      />
    </>
  );
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
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <NotificationTriggersWrapper />
              <SyncManagerWrapper />
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

              {/* Phase 7: Location Intelligence */}
              <Route 
                path="/location-history" 
                element={
                  <ProtectedRoute>
                    <LocationHistory />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/favorites" 
                element={
                  <ProtectedRoute>
                    <FavoriteMerchants />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
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
                <Route path="location-metrics" element={<LocationMetrics />} />
                <Route path="webhook-analytics" element={<WebhookAnalytics />} />
                <Route path="anomaly-detection" element={<AnomalyDetection />} />
                <Route path="ab-testing" element={<ABTesting />} />
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
      </PersistQueryClientProvider>
    </React.Fragment>
  );
}

export default App;
