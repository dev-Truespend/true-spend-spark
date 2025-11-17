import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { MFASetup } from "@/components/auth/MFASetup";
import { SessionsAndDevices } from "@/components/auth/SessionsAndDevices";
import { Shield, User, Monitor, Bell, Mail, Smartphone, MessageSquare, Clock } from "lucide-react";
import { GlobalNav } from "@/components/navigation/GlobalNav";
import { toast } from "sonner";

interface NotificationPreferences {
  // Master switches
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;

  // Email preferences
  email_budget_alerts: boolean;
  email_geofence_entry: boolean;
  email_geofence_exit: boolean;
  email_weekly_summary: boolean;
  email_transaction_alerts: boolean;
  email_security_alerts: boolean;

  // Push preferences
  push_budget_alerts: boolean;
  push_geofence_entry: boolean;
  push_geofence_exit: boolean;
  push_transaction_alerts: boolean;

  // SMS preferences
  sms_budget_alerts: boolean;
  sms_geofence_entry: boolean;
  sms_security_alerts: boolean;

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;

  // Threshold
  budget_alert_threshold: number;
}

export default function Settings() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email_enabled: true,
    push_enabled: true,
    sms_enabled: false,
    email_budget_alerts: true,
    email_geofence_entry: true,
    email_geofence_exit: false,
    email_weekly_summary: true,
    email_transaction_alerts: false,
    email_security_alerts: true,
    push_budget_alerts: true,
    push_geofence_entry: true,
    push_geofence_exit: true,
    push_transaction_alerts: true,
    sms_budget_alerts: false,
    sms_geofence_entry: false,
    sms_security_alerts: false,
    quiet_hours_enabled: false,
    quiet_hours_start: null,
    quiet_hours_end: null,
    budget_alert_threshold: 75,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load notification preferences from database
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // If no preferences exist, create default ones
          if (error.code === 'PGRST116') {
            const { data: newPrefs, error: insertError } = await supabase
              .from('notification_preferences')
              .insert({
                user_id: user.id,
                ...notificationPrefs
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error creating preferences:', insertError);
              toast.error('Failed to create notification preferences');
              return;
            }

            if (newPrefs) {
              setNotificationPrefs(newPrefs);
            }
          } else {
            console.error('Error loading preferences:', error);
            toast.error('Failed to load notification preferences');
          }
          return;
        }

        if (data) {
          setNotificationPrefs({
            email_enabled: data.email_enabled ?? true,
            push_enabled: data.push_enabled ?? true,
            sms_enabled: data.sms_enabled ?? false,
            email_budget_alerts: data.email_budget_alerts ?? true,
            email_geofence_entry: data.email_geofence_entry ?? true,
            email_geofence_exit: data.email_geofence_exit ?? false,
            email_weekly_summary: data.email_weekly_summary ?? true,
            email_transaction_alerts: data.email_transaction_alerts ?? false,
            email_security_alerts: data.email_security_alerts ?? true,
            push_budget_alerts: data.push_budget_alerts ?? true,
            push_geofence_entry: data.push_geofence_entry ?? true,
            push_geofence_exit: data.push_geofence_exit ?? true,
            push_transaction_alerts: data.push_transaction_alerts ?? true,
            sms_budget_alerts: data.sms_budget_alerts ?? false,
            sms_geofence_entry: data.sms_geofence_entry ?? false,
            sms_security_alerts: data.sms_security_alerts ?? false,
            quiet_hours_enabled: data.quiet_hours_enabled ?? false,
            quiet_hours_start: data.quiet_hours_start ?? null,
            quiet_hours_end: data.quiet_hours_end ?? null,
            budget_alert_threshold: data.budget_alert_threshold ?? 75,
          });
        }
      } catch (error) {
        console.error('Unexpected error loading preferences:', error);
        toast.error('Failed to load preferences');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  const saveNotificationPreferences = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({
          email_enabled: notificationPrefs.email_enabled,
          push_enabled: notificationPrefs.push_enabled,
          sms_enabled: notificationPrefs.sms_enabled,
          email_budget_alerts: notificationPrefs.email_budget_alerts,
          email_geofence_entry: notificationPrefs.email_geofence_entry,
          email_geofence_exit: notificationPrefs.email_geofence_exit,
          email_weekly_summary: notificationPrefs.email_weekly_summary,
          email_transaction_alerts: notificationPrefs.email_transaction_alerts,
          email_security_alerts: notificationPrefs.email_security_alerts,
          push_budget_alerts: notificationPrefs.push_budget_alerts,
          push_geofence_entry: notificationPrefs.push_geofence_entry,
          push_geofence_exit: notificationPrefs.push_geofence_exit,
          push_transaction_alerts: notificationPrefs.push_transaction_alerts,
          sms_budget_alerts: notificationPrefs.sms_budget_alerts,
          sms_geofence_entry: notificationPrefs.sms_geofence_entry,
          sms_security_alerts: notificationPrefs.sms_security_alerts,
          quiet_hours_enabled: notificationPrefs.quiet_hours_enabled,
          quiet_hours_start: notificationPrefs.quiet_hours_start,
          quiet_hours_end: notificationPrefs.quiet_hours_end,
          budget_alert_threshold: notificationPrefs.budget_alert_threshold,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Notification preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePref = (key: keyof NotificationPreferences, value: any) => {
    setNotificationPrefs({ ...notificationPrefs, [key]: value });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <GlobalNav />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

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
            {/* Email Notifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <CardTitle>Email Notifications</CardTitle>
                </div>
                <CardDescription>
                  Configure email alerts and notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-enabled" className="font-semibold">Enable Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Master switch for all email notifications
                    </p>
                  </div>
                  <Switch
                    id="email-enabled"
                    checked={notificationPrefs.email_enabled}
                    onCheckedChange={(checked) => updatePref('email_enabled', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-4 opacity-100" style={{ opacity: notificationPrefs.email_enabled ? 1 : 0.5 }}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-geofence-entry">Geofence Entry Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Email when you enter a geofence
                      </p>
                    </div>
                    <Switch
                      id="email-geofence-entry"
                      checked={notificationPrefs.email_geofence_entry}
                      onCheckedChange={(checked) => updatePref('email_geofence_entry', checked)}
                      disabled={!notificationPrefs.email_enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-geofence-exit">Geofence Exit Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Email when you leave a geofence
                      </p>
                    </div>
                    <Switch
                      id="email-geofence-exit"
                      checked={notificationPrefs.email_geofence_exit}
                      onCheckedChange={(checked) => updatePref('email_geofence_exit', checked)}
                      disabled={!notificationPrefs.email_enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-budget-alerts">Budget Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Email when budget thresholds are reached
                      </p>
                    </div>
                    <Switch
                      id="email-budget-alerts"
                      checked={notificationPrefs.email_budget_alerts}
                      onCheckedChange={(checked) => updatePref('email_budget_alerts', checked)}
                      disabled={!notificationPrefs.email_enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-transaction-alerts">Transaction Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Email for new transactions
                      </p>
                    </div>
                    <Switch
                      id="email-transaction-alerts"
                      checked={notificationPrefs.email_transaction_alerts}
                      onCheckedChange={(checked) => updatePref('email_transaction_alerts', checked)}
                      disabled={!notificationPrefs.email_enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-security-alerts">Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Email for security events
                      </p>
                    </div>
                    <Switch
                      id="email-security-alerts"
                      checked={notificationPrefs.email_security_alerts}
                      onCheckedChange={(checked) => updatePref('email_security_alerts', checked)}
                      disabled={!notificationPrefs.email_enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-weekly-summary">Weekly Summary</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive weekly spending summary
                      </p>
                    </div>
                    <Switch
                      id="email-weekly-summary"
                      checked={notificationPrefs.email_weekly_summary}
                      onCheckedChange={(checked) => updatePref('email_weekly_summary', checked)}
                      disabled={!notificationPrefs.email_enabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Push Notifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  <CardTitle>Push Notifications</CardTitle>
                </div>
                <CardDescription>
                  Configure push alerts on your mobile device
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-enabled" className="font-semibold">Enable Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Master switch for all push notifications
                    </p>
                  </div>
                  <Switch
                    id="push-enabled"
                    checked={notificationPrefs.push_enabled}
                    onCheckedChange={(checked) => updatePref('push_enabled', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-4" style={{ opacity: notificationPrefs.push_enabled ? 1 : 0.5 }}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-geofence-entry">Geofence Entry Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Push when you enter a geofence
                      </p>
                    </div>
                    <Switch
                      id="push-geofence-entry"
                      checked={notificationPrefs.push_geofence_entry}
                      onCheckedChange={(checked) => updatePref('push_geofence_entry', checked)}
                      disabled={!notificationPrefs.push_enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-geofence-exit">Geofence Exit Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Push when you leave a geofence
                      </p>
                    </div>
                    <Switch
                      id="push-geofence-exit"
                      checked={notificationPrefs.push_geofence_exit}
                      onCheckedChange={(checked) => updatePref('push_geofence_exit', checked)}
                      disabled={!notificationPrefs.push_enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-budget-alerts">Budget Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Push when budget thresholds are reached
                      </p>
                    </div>
                    <Switch
                      id="push-budget-alerts"
                      checked={notificationPrefs.push_budget_alerts}
                      onCheckedChange={(checked) => updatePref('push_budget_alerts', checked)}
                      disabled={!notificationPrefs.push_enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-transaction-alerts">Transaction Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Push for new transactions
                      </p>
                    </div>
                    <Switch
                      id="push-transaction-alerts"
                      checked={notificationPrefs.push_transaction_alerts}
                      onCheckedChange={(checked) => updatePref('push_transaction_alerts', checked)}
                      disabled={!notificationPrefs.push_enabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SMS Notifications (Coming Soon) */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  <CardTitle>SMS Notifications</CardTitle>
                </div>
                <CardDescription>
                  Configure SMS text alerts (Coming Soon)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-enabled" className="font-semibold">Enable SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Master switch for all SMS notifications
                    </p>
                  </div>
                  <Switch
                    id="sms-enabled"
                    checked={notificationPrefs.sms_enabled}
                    onCheckedChange={(checked) => updatePref('sms_enabled', checked)}
                    disabled
                  />
                </div>

                <Separator />

                <div className="space-y-4 opacity-50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Geofence Entry Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        SMS when you enter a geofence
                      </p>
                    </div>
                    <Switch disabled />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Budget Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        SMS when budget thresholds are reached
                      </p>
                    </div>
                    <Switch disabled />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        SMS for critical security events
                      </p>
                    </div>
                    <Switch disabled />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quiet Hours & Alert Threshold */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <CardTitle>Quiet Hours & Alert Threshold</CardTitle>
                </div>
                <CardDescription>
                  Configure when notifications are paused and budget alert threshold
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="quiet-hours-enabled" className="font-semibold">Enable Quiet Hours</Label>
                    <p className="text-sm text-muted-foreground">
                      Pause notifications during specified hours
                    </p>
                  </div>
                  <Switch
                    id="quiet-hours-enabled"
                    checked={notificationPrefs.quiet_hours_enabled}
                    onCheckedChange={(checked) => updatePref('quiet_hours_enabled', checked)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4" style={{ opacity: notificationPrefs.quiet_hours_enabled ? 1 : 0.5 }}>
                  <div className="space-y-2">
                    <Label htmlFor="quiet-start">Start Time</Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      value={notificationPrefs.quiet_hours_start || '22:00'}
                      onChange={(e) => updatePref('quiet_hours_start', e.target.value)}
                      disabled={!notificationPrefs.quiet_hours_enabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiet-end">End Time</Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      value={notificationPrefs.quiet_hours_end || '08:00'}
                      onChange={(e) => updatePref('quiet_hours_end', e.target.value)}
                      disabled={!notificationPrefs.quiet_hours_enabled}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="budget-threshold">Budget Alert Threshold (%)</Label>
                  <Input
                    id="budget-threshold"
                    type="number"
                    min="50"
                    max="100"
                    step="5"
                    value={notificationPrefs.budget_alert_threshold}
                    onChange={(e) => updatePref('budget_alert_threshold', parseInt(e.target.value) || 75)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Receive alerts when spending reaches this percentage of your budget (50-100%)
                  </p>
                </div>

                <Button 
                  onClick={saveNotificationPreferences} 
                  className="w-full"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save All Notification Preferences'}
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
