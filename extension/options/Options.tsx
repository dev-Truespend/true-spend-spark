import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Settings as SettingsIcon } from 'lucide-react';

interface ExtensionSettings {
  merchantDetection: boolean;
  desktopNotifications: boolean;
  telemetryEnabled: boolean;
  budgetAlerts: boolean;
  dealAlerts: boolean;
  merchantAlerts: boolean;
}

export function Options() {
  const [settings, setSettings] = useState<ExtensionSettings>({
    merchantDetection: true,
    desktopNotifications: true,
    telemetryEnabled: true,
    budgetAlerts: true,
    dealAlerts: true,
    merchantAlerts: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.sync.get(['settings']);
        if (result.settings) {
          setSettings(result.settings);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.sync.set({ settings });
        toast.success('Settings saved successfully');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const updateSetting = <K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">TrueSpend Settings</h1>
            <p className="text-muted-foreground">
              Customize your extension experience
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Privacy & Data Collection</CardTitle>
            <CardDescription>
              Control what data the extension collects and how it's used
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="merchant-detection">Merchant Detection</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically detect merchants and prices on e-commerce sites
                </p>
              </div>
              <Switch
                id="merchant-detection"
                checked={settings.merchantDetection}
                onCheckedChange={(checked) =>
                  updateSetting('merchantDetection', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notifications">Desktop Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show budget alerts and spending notifications
                </p>
              </div>
              <Switch
                id="notifications"
                checked={settings.desktopNotifications}
                onCheckedChange={(checked) =>
                  updateSetting('desktopNotifications', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="telemetry">Anonymous Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Help improve the extension with anonymous usage data
                </p>
              </div>
              <Switch
                id="telemetry"
                checked={settings.telemetryEnabled}
                onCheckedChange={(checked) =>
                  updateSetting('telemetryEnabled', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose which types of alerts you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="budget-alerts">Budget Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when approaching budget limits while shopping
                </p>
              </div>
              <Switch
                id="budget-alerts"
                checked={settings.budgetAlerts}
                onCheckedChange={(checked) =>
                  updateSetting('budgetAlerts', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="deal-alerts">Deal Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Notify about deals and discounts at nearby favorite merchants
                </p>
              </div>
              <Switch
                id="deal-alerts"
                checked={settings.dealAlerts}
                onCheckedChange={(checked) =>
                  updateSetting('dealAlerts', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="merchant-alerts">Merchant Detection Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications when shopping on supported e-commerce sites
                </p>
              </div>
              <Switch
                id="merchant-alerts"
                checked={settings.merchantAlerts}
                onCheckedChange={(checked) =>
                  updateSetting('merchantAlerts', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version:</span>
              <span className="font-medium">
                {typeof chrome !== 'undefined' && chrome.runtime
                  ? chrome.runtime.getManifest().version
                  : '1.0.0'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Privacy Policy:</span>
              <a
                href="https://truespend.org/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View Policy
              </a>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Support:</span>
              <a
                href="https://truespend.org/support"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Get Help
              </a>
            </div>
          </CardContent>
        </Card>

        <Button onClick={saveSettings} className="w-full" size="lg">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
