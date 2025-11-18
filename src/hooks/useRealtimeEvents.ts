import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeEvent {
  id: string;
  event_type: string;
  event_payload: Record<string, any>;
  user_id: string;
  topic: string;
  status: string;
  created_at: string;
  metadata: Record<string, any>;
}

export interface RealtimeEventsConfig {
  topics?: string[];
  eventTypes?: string[];
  onEvent?: (event: RealtimeEvent) => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  replayHistory?: boolean; // Load last 7 days of events
}

export interface RealtimeEventsReturn {
  events: RealtimeEvent[];
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastError: Error | null;
  reconnect: () => void;
  clearEvents: () => void;
}

export function useRealtimeEvents(
  config: RealtimeEventsConfig = {}
): RealtimeEventsReturn {
  const {
    topics = [],
    eventTypes = [],
    onEvent,
    onError,
    autoReconnect = true,
    replayHistory = false,
  } = config;

  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<Error | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Load historical events (last 7 days)
  const loadHistoricalEvents = useCallback(async () => {
    if (!replayHistory) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[useRealtimeEvents] Loading historical events...');

      let query = supabase
        .from('event_log')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      // Filter by topics if specified
      if (topics.length > 0) {
        query = query.in('topic', topics);
      }

      // Filter by event types if specified
      if (eventTypes.length > 0) {
        query = query.in('event_type', eventTypes);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useRealtimeEvents] Error loading historical events:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`[useRealtimeEvents] Loaded ${data.length} historical events`);
        setEvents(data.reverse() as RealtimeEvent[]); // Reverse to chronological order
      }
    } catch (error) {
      console.error('[useRealtimeEvents] Error loading history:', error);
    }
  }, [replayHistory, topics, eventTypes]);

  // Connect to realtime channel
  const connect = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      setConnectionState('connecting');
      console.log('[useRealtimeEvents] Connecting to realtime channel...', {
        topics,
        eventTypes,
        userId: user.id,
      });

      // Create channel with user-specific name
      const channelName = `user-events:${user.id}`;
      const channel = supabase.channel(channelName);

      // Configure postgres changes listener
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_log',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[useRealtimeEvents] Received new event:', payload);
          
          const newEvent = payload.new as RealtimeEvent;

          // Apply topic filter
          if (topics.length > 0 && !topics.includes(newEvent.topic)) {
            console.log('[useRealtimeEvents] Event filtered by topic:', newEvent.topic);
            return;
          }

          // Apply event type filter
          if (eventTypes.length > 0 && !eventTypes.includes(newEvent.event_type)) {
            console.log('[useRealtimeEvents] Event filtered by type:', newEvent.event_type);
            return;
          }

          // Add to events list
          setEvents((prev) => [...prev, newEvent]);

          // Call custom handler if provided
          if (onEvent) {
            onEvent(newEvent);
          }
        }
      );

      // Subscribe with callbacks
      channel.subscribe((status, err) => {
        console.log('[useRealtimeEvents] Subscription status:', status, err);

        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionState('connected');
          setLastError(null);
          reconnectAttemptsRef.current = 0;
          console.log('[useRealtimeEvents] ✅ Successfully connected to realtime');
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionState('error');
          const error = new Error(err?.message || 'Channel error');
          setLastError(error);
          if (onError) onError(error);
          console.error('[useRealtimeEvents] ❌ Channel error:', err);

          // Auto-reconnect if enabled
          if (autoReconnect && reconnectAttemptsRef.current < 5) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            console.log(`[useRealtimeEvents] Reconnecting in ${delay}ms...`);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          }
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setConnectionState('disconnected');
          console.warn('[useRealtimeEvents] Connection timed out');
        }
      });

      channelRef.current = channel;

      // Load historical events after connecting
      await loadHistoricalEvents();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[useRealtimeEvents] Connection error:', err);
      setConnectionState('error');
      setLastError(err);
      if (onError) onError(err);
    }
  }, [topics, eventTypes, onEvent, onError, autoReconnect, loadHistoricalEvents]);

  // Disconnect from channel
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (channelRef.current) {
      console.log('[useRealtimeEvents] Disconnecting from realtime channel...');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  // Manual reconnect
  const reconnect = useCallback(() => {
    console.log('[useRealtimeEvents] Manual reconnect triggered');
    disconnect();
    setTimeout(() => connect(), 100);
  }, [disconnect, connect]);

  // Clear events list
  const clearEvents = useCallback(() => {
    console.log('[useRealtimeEvents] Clearing events list');
    setEvents([]);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    events,
    isConnected,
    connectionState,
    lastError,
    reconnect,
    clearEvents,
  };
}
