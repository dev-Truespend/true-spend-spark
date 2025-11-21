import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmailDigest } from "@/hooks/useEmailDigest";
import { Mail, Send } from "lucide-react";

export function NotificationSettings() {
  const {
    preferences: digestPrefs,
    updatePreferences: updateDigest,
    sendTestDigest,
  } = useEmailDigest();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Digests
          </CardTitle>
          <CardDescription>
            Receive periodic summaries of your spending activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="digest-enabled">Enable Email Digests</Label>
              <p className="text-sm text-muted-foreground">
                Get spending summaries, insights, and recommendations
              </p>
            </div>
            <Switch
              id="digest-enabled"
              checked={digestPrefs?.enabled || false}
              onCheckedChange={(checked) => {
                updateDigest.mutate({ enabled: checked });
              }}
            />
          </div>

          {digestPrefs?.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="digest-frequency">Frequency</Label>
                <Select
                  value={digestPrefs.frequency}
                  onValueChange={(value: any) => {
                    updateDigest.mutate({ frequency: value });
                  }}
                >
                  <SelectTrigger id="digest-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="digest-time">Preferred Time</Label>
                <Select
                  value={digestPrefs.preferred_time || '09:00'}
                  onValueChange={(value) => {
                    updateDigest.mutate({ preferred_time: value });
                  }}
                >
                  <SelectTrigger id="digest-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="06:00">6:00 AM</SelectItem>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="18:00">6:00 PM</SelectItem>
                    <SelectItem value="21:00">9:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => sendTestDigest.mutate()}
                disabled={sendTestDigest.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Test Digest
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
