import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MFASetup } from "@/components/auth/MFASetup";
import { SessionsAndDevices } from "@/components/auth/SessionsAndDevices";
import { Shield, User, Monitor, Bell } from "lucide-react";
import { GlobalNav } from "@/components/navigation/GlobalNav";
import { toast } from "sonner";

export default function Settings() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [notificationPrefs, setNotificationPrefs] = useState({
    geofence_entry: true,
    geofence_exit: true,
    budget_alerts: true,
    budget_threshold: 80,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load notification preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      const stored = localStorage.getItem(`notification_prefs_${user.id}`);
      if (stored) {
        setNotificationPrefs(JSON.parse(stored));
      }
    };

    loadPreferences();
  }, [user]);

  const saveNotificationPreferences = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem(
        `notification_prefs_${user.id}`,
        JSON.stringify(notificationPrefs)
      );

      toast.success('Notification preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <GlobalNav />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profile?.email || ''} 
                    disabled 
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={profile?.first_name || ''} 
                      placeholder="John"
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={profile?.last_name || ''} 
                      placeholder="Doe"
                      readOnly
                    />
                  </div>
                </div>
                <Button className="w-full" disabled>Save Changes (Coming Soon)</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Change your password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                <Button className="w-full" disabled>Update Password (Coming Soon)</Button>
              </CardContent>
            </Card>

            <MFASetup />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Geofence Notifications</CardTitle>
                <CardDescription>
                  Configure alerts for location-based events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="geofence-entry">Entry Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when you enter a geofence
                    </p>
                  </div>
                  <Switch
                    id="geofence-entry"
                    checked={notificationPrefs.geofence_entry}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, geofence_entry: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="geofence-exit">Exit Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when you leave a geofence
                    </p>
                  </div>
                  <Switch
                    id="geofence-exit"
                    checked={notificationPrefs.geofence_exit}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, geofence_exit: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Notifications</CardTitle>
                <CardDescription>
                  Configure alerts for budget thresholds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="budget-alerts">Budget Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when budget thresholds are reached
                    </p>
                  </div>
                  <Switch
                    id="budget-alerts"
                    checked={notificationPrefs.budget_alerts}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, budget_alerts: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget-threshold">Alert Threshold (%)</Label>
                  <Input
                    id="budget-threshold"
                    type="number"
                    min="50"
                    max="100"
                    step="5"
                    value={notificationPrefs.budget_threshold}
                    onChange={(e) =>
                      setNotificationPrefs({
                        ...notificationPrefs,
                        budget_threshold: parseInt(e.target.value),
                      })
                    }
                    disabled={!notificationPrefs.budget_alerts}
                  />
                  <p className="text-xs text-muted-foreground">
                    Receive alerts when spending reaches this percentage of your budget
                  </p>
                </div>

                <Button 
                  onClick={saveNotificationPreferences} 
                  className="w-full"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <SessionsAndDevices />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
