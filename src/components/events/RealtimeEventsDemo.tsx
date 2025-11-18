import { useState } from 'react';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Radio, 
  RadioTower, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Trash2,
  RefreshCw,
  Clock,
  Tag,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function RealtimeEventsDemo() {
  const { toast } = useToast();
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['transactions', 'budgets', 'geofences']);

  const { 
    events, 
    isConnected, 
    connectionState, 
    lastError,
    reconnect,
    clearEvents 
  } = useRealtimeEvents({
    topics: selectedTopics,
    autoReconnect: true,
    replayHistory: true,
    onEvent: (event) => {
      toast({
        title: 'New Event Received',
        description: `${event.event_type} - ${event.topic}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Connection Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const publishTestEvent = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('publish-event', {
        body: {
          event_type: 'test.demo',
          event_payload: {
            message: 'Test event from demo',
            timestamp: new Date().toISOString(),
          },
          topic: 'transactions',
          metadata: {
            source: 'realtime_demo',
          },
        },
      });

      if (error) throw error;

      toast({
        title: 'Test Event Published',
        description: 'Event will appear in real-time below',
      });
    } catch (error) {
      toast({
        title: 'Failed to publish event',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Radio className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : [...prev, topic]
    );
  };

  return (
    <div className="grid gap-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RadioTower className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Realtime Event Stream</CardTitle>
                <CardDescription>
                  Live event monitoring with automatic reconnection
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {connectionState}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Connection indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected to event stream' : 'Not connected'}
              </span>
            </div>

            {/* Error display */}
            {lastError && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm text-destructive">{lastError.message}</p>
              </div>
            )}

            {/* Topic filters */}
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Topics:</label>
              <div className="flex flex-wrap gap-2">
                {['transactions', 'budgets', 'geofences', 'notifications'].map((topic) => (
                  <Badge
                    key={topic}
                    variant={selectedTopics.includes(topic) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTopic(topic)}
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={publishTestEvent} size="sm">
                Publish Test Event
              </Button>
              <Button onClick={reconnect} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
              <Button onClick={clearEvents} size="sm" variant="outline">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Events
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Events ({events.length})</CardTitle>
          <CardDescription>
            Real-time event stream with last 7 days of history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Radio className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No events yet</p>
                <p className="text-sm text-muted-foreground">
                  Publish a test event or wait for real events
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event, index) => (
                  <div key={event.id || index}>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {event.event_type}
                            </Badge>
                            <Badge variant="secondary">
                              <Tag className="h-3 w-3 mr-1" />
                              {event.topic}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={event.status === 'delivered' ? 'default' : 'secondary'}>
                          {event.status}
                        </Badge>
                      </div>
                      
                      <div className="bg-muted/50 p-3 rounded-md">
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(event.event_payload, null, 2)}
                        </pre>
                      </div>

                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer">Metadata</summary>
                          <pre className="mt-2 bg-muted/30 p-2 rounded">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    {index < events.length - 1 && <Separator className="my-4" />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
