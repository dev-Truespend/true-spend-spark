import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { NotificationSettings } from "@/features/settings/components/NotificationSettings";
import { SyncControlPanel } from "@/features/sync/components/SyncControlPanel";
import { DataManagement } from "@/features/settings/components/DataManagement";
import { MFASetup } from "@/features/auth/components/MFASetup";
import { SessionsAndDevices } from "@/features/auth/components/SessionsAndDevices";
import { UserProfileDropdown } from "@/features/auth/components/UserProfileDropdown";
import { Button } from "@/shared/components/ui/button";
import { useDataExport } from "@/features/settings/hooks/useDataExport";
import { Bell, Shield, User, Smartphone, Download, RefreshCw } from "lucide-react";

export default function Settings() {
  const { exportUserData, isExporting } = useDataExport();

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MFASetup />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <SessionsAndDevices />
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserProfileDropdown />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          <SyncControlPanel />
        </TabsContent>

        <TabsContent value="privacy">
          <DataManagement />
          <div className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Data Export</CardTitle>
                <CardDescription>
                  Export your data for compliance (GDPR/CCPA)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Export Your Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Download a complete copy of your personal data including profile, transactions, budgets, geofences, and audit logs.
                  </p>
                  <Button
                    onClick={exportUserData}
                    disabled={isExporting}
                    className="w-full sm:w-auto"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? "Exporting..." : "Export My Data"}
                  </Button>
                </div>
                
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-2">Data Retention</h3>
                  <p className="text-sm text-muted-foreground">
                    Your data is retained according to our privacy policy. Audit logs are kept for 90 days.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
