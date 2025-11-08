import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import Phases from "./pages/dashboard/Phases";
import Architecture from "./pages/dashboard/Architecture";
import Timeline from "./pages/dashboard/Timeline";
import Tasks from "./pages/dashboard/Tasks";
import Metrics from "./pages/dashboard/Metrics";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardLayout />
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
              <Route path="risks" element={<div className="p-8">Risks view coming soon...</div>} />
              <Route path="testing" element={<div className="p-8">Testing view coming soon...</div>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
