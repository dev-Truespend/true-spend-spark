import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Send, Loader2 } from "lucide-react";

export const NotificationTestPanel = () => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("Test Notification");
  const [body, setBody] = useState("This is a test notification from TrueSpend");
  const [category, setCategory] = useState("general");
  const [customData, setCustomData] = useState("");

  const sendTestNotification = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      let data = {};
      if (customData) {
        try {
          data = JSON.parse(customData);
        } catch (e) {
          toast.error("Invalid JSON in custom data");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title,
          body,
          category,
          data,
        },
      });

      if (error) {
        console.error('Notification error:', error);
        toast.error(`Failed to send: ${error.message}`);
      } else {
        toast.success("Test notification sent!");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to send test notification");
    } finally {
      setLoading(false);
    }
  };

  const sendQuickTest = async (type: 'budget' | 'geofence' | 'transaction') => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const templates = {
        budget: {
          title: "Budget Alert",
          body: "You've spent 80% of your monthly food budget",
          category: "budget_alert",
          data: { budget_id: "test-123", percentage: 80 }
        },
        geofence: {
          title: "Location Reminder",
          body: "You're near Whole Foods - don't forget the milk!",
          category: "geofence_reminder",
          data: { geofence_id: "test-456", place_name: "Whole Foods" }
        },
        transaction: {
          title: "New Transaction",
          body: "$45.67 spent at Starbucks",
          category: "transaction_alert",
          data: { transaction_id: "test-789", amount: 45.67, merchant: "Starbucks" }
        }
      };

      const template = templates[type];

      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          ...template,
        },
      });

      if (error) {
        toast.error(`Failed: ${error.message}`);
      } else {
        toast.success(`${type} notification sent!`);
      }
    } catch (error) {
      toast.error("Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Test Push Notifications
        </CardTitle>
        <CardDescription>
          Send test notifications to your device
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Tests */}
        <div className="space-y-2">
          <Label>Quick Tests</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={() => sendQuickTest('budget')}
              disabled={loading}
              className="w-full"
            >
              Budget Alert
            </Button>
            <Button
              variant="outline"
              onClick={() => sendQuickTest('geofence')}
              disabled={loading}
              className="w-full"
            >
              Geofence
            </Button>
            <Button
              variant="outline"
              onClick={() => sendQuickTest('transaction')}
              disabled={loading}
              className="w-full"
            >
              Transaction
            </Button>
          </div>
        </div>

        {/* Custom Test */}
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Notification message"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="budget_alert">Budget Alert</SelectItem>
                <SelectItem value="geofence_reminder">Geofence</SelectItem>
                <SelectItem value="transaction_alert">Transaction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data">Custom Data (JSON)</Label>
            <Textarea
              id="data"
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
              placeholder='{"key": "value"}'
              rows={3}
              className="font-mono text-sm"
            />
          </div>

          <Button
            onClick={sendTestNotification}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Custom Notification
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
