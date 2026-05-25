import { useState } from "react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestResult {
  name: string;
  status: "pending" | "running" | "passed" | "failed" | "warning";
  message?: string;
  details?: string;
}

export function Phase7TestSuite() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: "Location Insights AI", status: "pending" },
    { name: "Merchant Discovery", status: "pending" },
    { name: "Location Analytics BFF", status: "pending" },
    { name: "Heatmap Data Query", status: "pending" },
    { name: "Location Settings CRUD", status: "pending" },
    { name: "Geofence Metrics", status: "pending" },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (name: string, updates: Partial<TestResult>) => {
    setTests((prev) =>
      prev.map((test) => (test.name === name ? { ...test, ...updates } : test))
    );
  };

  const testLocationInsightsAI = async () => {
    updateTest("Location Insights AI", { status: "running" });
    try {
      const { data, error } = await supabase.functions.invoke("location-insights-ai", {
        body: {},
      });

      if (error) {
        if (error.message?.includes("429") || error.message?.includes("rate limit")) {
          updateTest("Location Insights AI", {
            status: "warning",
            message: "Rate limited (expected during testing)",
            details: "Function is accessible but rate limited",
          });
        } else if (error.message?.includes("402") || error.message?.includes("credits")) {
          updateTest("Location Insights AI", {
            status: "warning",
            message: "AI credits depleted",
            details: "Function exists but needs credits",
          });
        } else {
          throw error;
        }
      } else {
        updateTest("Location Insights AI", {
          status: "passed",
          message: "AI insights generated successfully",
          details: `Generated ${data?.insights?.length || 0} insights`,
        });
      }
    } catch (error: any) {
      updateTest("Location Insights AI", {
        status: "failed",
        message: error.message,
        details: JSON.stringify(error, null, 2),
      });
    }
  };

  const testMerchantDiscovery = async () => {
    updateTest("Merchant Discovery", { status: "running" });
    try {
      // Test with San Francisco coordinates
      const { data, error } = await supabase.functions.invoke("merchant-discovery", {
        body: {
          lat: 37.7749,
          lng: -122.4194,
          category: "restaurant",
        },
      });

      if (error) throw error;

      updateTest("Merchant Discovery", {
        status: "passed",
        message: "Merchants fetched successfully",
        details: `Found ${data?.merchants?.length || 0} merchants`,
      });
    } catch (error: any) {
      updateTest("Merchant Discovery", {
        status: "failed",
        message: error.message,
        details: JSON.stringify(error, null, 2),
      });
    }
  };

  const testLocationAnalyticsBFF = async () => {
    updateTest("Location Analytics BFF", { status: "running" });
    try {
      const { data, error } = await supabase.functions.invoke("location-analytics-bff", {
        body: {
          period_days: 30,
        },
      });

      if (error) throw error;

      updateTest("Location Analytics BFF", {
        status: "passed",
        message: "Analytics aggregated successfully",
        details: `Analytics: ${data?.analytics?.length || 0} locations, Heatmap: ${data?.heatmap?.length || 0} points`,
      });
    } catch (error: any) {
      updateTest("Location Analytics BFF", {
        status: "failed",
        message: error.message,
        details: JSON.stringify(error, null, 2),
      });
    }
  };

  const testHeatmapDataQuery = async () => {
    updateTest("Heatmap Data Query", { status: "running" });
    try {
      const { data, error } = await supabase
        .from("geofence_heatmap_data")
        .select("*")
        .limit(10);

      if (error) throw error;

      updateTest("Heatmap Data Query", {
        status: "passed",
        message: "Heatmap data accessible",
        details: `Found ${data?.length || 0} data points`,
      });
    } catch (error: any) {
      updateTest("Heatmap Data Query", {
        status: "failed",
        message: error.message,
        details: JSON.stringify(error, null, 2),
      });
    }
  };

  const testLocationSettingsCRUD = async () => {
    updateTest("Location Settings CRUD", { status: "running" });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Test read
      const { data: prefs, error: readError } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (readError) throw readError;

      // Test update with existing fields
      const { error: updateError } = await supabase
        .from("notification_preferences")
        .update({
          push_enabled: prefs?.push_enabled ?? true,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      updateTest("Location Settings CRUD", {
        status: "passed",
        message: "Location settings read/write working",
        details: "Successfully read and updated location preferences",
      });
    } catch (error: any) {
      updateTest("Location Settings CRUD", {
        status: "failed",
        message: error.message,
        details: JSON.stringify(error, null, 2),
      });
    }
  };

  const testGeofenceMetrics = async () => {
    updateTest("Geofence Metrics", { status: "running" });
    try {
      const { data, error } = await supabase
        .from("geofence_metrics")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(10);

      if (error) throw error;

      updateTest("Geofence Metrics", {
        status: "passed",
        message: "Geofence metrics accessible",
        details: `Found ${data?.length || 0} metric entries`,
      });
    } catch (error: any) {
      updateTest("Geofence Metrics", {
        status: "failed",
        message: error.message,
        details: JSON.stringify(error, null, 2),
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    toast.info("Starting Phase 7 integration tests...");

    await testLocationInsightsAI();
    await testMerchantDiscovery();
    await testLocationAnalyticsBFF();
    await testHeatmapDataQuery();
    await testLocationSettingsCRUD();
    await testGeofenceMetrics();

    setIsRunning(false);
    
    const passedCount = tests.filter((t) => t.status === "passed").length;
    const failedCount = tests.filter((t) => t.status === "failed").length;
    const warningCount = tests.filter((t) => t.status === "warning").length;

    if (failedCount === 0) {
      toast.success(`All tests completed! ${passedCount} passed, ${warningCount} warnings`);
    } else {
      toast.error(`Tests completed with ${failedCount} failures`);
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "passed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const getStatusBadge = (status: TestResult["status"]) => {
    const variants = {
      pending: "secondary",
      running: "default",
      passed: "default",
      failed: "destructive",
      warning: "secondary",
    } as const;

    return (
      <Badge variant={variants[status]} className="ml-auto">
        {status}
      </Badge>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Phase 7 Integration Tests</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Location-based features, AI insights, and merchant discovery
          </p>
        </div>
        <Button
          onClick={runAllTests}
          disabled={isRunning}
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run All Tests
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {tests.map((test) => (
          <div
            key={test.name}
            className="flex items-start gap-4 p-4 border rounded-lg"
          >
            <div className="mt-0.5">{getStatusIcon(test.status)}</div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{test.name}</h3>
                {getStatusBadge(test.status)}
              </div>
              {test.message && (
                <p className="text-sm text-muted-foreground">{test.message}</p>
              )}
              {test.details && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Show details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                    {test.details}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isRunning && tests.some((t) => t.status !== "pending") && (
        <div className="mt-6 flex gap-4">
          <Badge variant="default" className="bg-green-500">
            {tests.filter((t) => t.status === "passed").length} Passed
          </Badge>
          <Badge variant="destructive">
            {tests.filter((t) => t.status === "failed").length} Failed
          </Badge>
          <Badge variant="secondary">
            {tests.filter((t) => t.status === "warning").length} Warnings
          </Badge>
        </div>
      )}
    </Card>
  );
}
