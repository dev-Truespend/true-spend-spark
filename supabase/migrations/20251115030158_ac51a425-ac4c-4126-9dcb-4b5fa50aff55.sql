-- Enable realtime for push notification triggers
-- This allows useNotificationTriggers hook to listen for changes

-- Enable realtime on budgets table (for budget threshold alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;

-- Enable realtime on geofence_events table (for location-based notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.geofence_events;

-- Enable realtime on transactions table (for new transaction notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;