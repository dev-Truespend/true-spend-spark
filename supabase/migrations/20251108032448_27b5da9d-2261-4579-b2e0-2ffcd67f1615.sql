-- ============================================
-- Blueprint v4.0 Geofencing Migration
-- ============================================

-- Create geofences table (user-defined spending zones)
CREATE TABLE IF NOT EXISTS public.geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('budget_zone', 'alert_zone', 'restricted_zone')),
  center_lat NUMERIC(10, 8) NOT NULL,
  center_lng NUMERIC(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL,
  budget_limit NUMERIC(12, 2),
  alert_threshold NUMERIC(12, 2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create geofence_events table
CREATE TABLE IF NOT EXISTS public.geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  geofence_id UUID REFERENCES public.geofences(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('entered', 'exited', 'dwelling')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  location_lat NUMERIC(10, 8),
  location_lng NUMERIC(11, 8),
  accuracy_meters NUMERIC
);

-- Create merchants table
CREATE TABLE IF NOT EXISTS public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  lat NUMERIC(10, 8),
  lng NUMERIC(11, 8),
  category TEXT,
  phone TEXT,
  website TEXT,
  photo_url TEXT,
  rating NUMERIC(2, 1),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for geofences
CREATE POLICY "Users can CRUD own geofences"
ON public.geofences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for geofence_events
CREATE POLICY "Users can view own events"
ON public.geofence_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
ON public.geofence_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for merchants
CREATE POLICY "Authenticated users read merchants"
ON public.merchants FOR SELECT
USING (auth.role() = 'authenticated');

-- Trigger for geofences
CREATE TRIGGER update_geofences_updated_at
BEFORE UPDATE ON public.geofences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Phase 9: Geofencing Foundation (represents Phase 2.5)
INSERT INTO public.phases (phase_number, name, start_week, end_week, duration_weeks, status, risk_level, progress, team_size, objective, dependencies)
VALUES (
  9,
  'Phase 2.5: Geofencing Foundation 📍',
  8,
  10,
  3,
  'Not Started',
  'Medium',
  0,
  6,
  'Establish native mobile geofencing capabilities: Capacitor setup, location permissions, geofence database schema, Google Places API integration, and basic location tracking',
  '["Security & Ingress"]'::jsonb
);

-- Insert Phase 10: Location Intelligence (represents Phase 5.5)
INSERT INTO public.phases (phase_number, name, start_week, end_week, duration_weeks, status, risk_level, progress, team_size, objective, dependencies)
VALUES (
  10,
  'Phase 5.5: Location Intelligence 🗺️',
  23,
  25,
  3,
  'Not Started',
  'Medium',
  0,
  5,
  'Build AI-powered location insights and merchant discovery: background geolocation tracking, geofence entry/exit detection, location-based budget rules, and AI location analysis using Lovable AI (Gemini 2.5 Flash)',
  '["External Communication"]'::jsonb
);

-- Update existing phases to adjust week numbers per Blueprint v4.0
UPDATE public.phases SET start_week = 11, end_week = 14 WHERE phase_number = 3;
UPDATE public.phases SET start_week = 15, end_week = 19 WHERE phase_number = 4;
UPDATE public.phases SET start_week = 20, end_week = 22 WHERE phase_number = 5;
UPDATE public.phases SET start_week = 26, end_week = 28 WHERE phase_number = 6;
UPDATE public.phases SET start_week = 29, end_week = 32 WHERE phase_number = 7;
UPDATE public.phases SET start_week = 33, end_week = 34 WHERE phase_number = 8;

-- Create geofencing milestones
INSERT INTO public.milestones (name, week, status, gate_requirements)
VALUES (
  'Geofencing Foundation Complete 📍',
  10,
  'Upcoming',
  '["Capacitor native app configured", "Location permissions implemented", "Geofence database schema deployed", "Google Places API integrated", "Basic location tracking functional"]'::jsonb
);

INSERT INTO public.milestones (name, week, status, gate_requirements)
VALUES (
  'Location Intelligence Complete 🗺️',
  25,
  'Upcoming',
  '["Background geolocation active", "Geofence entry/exit detection working", "Location-based budget rules enforced", "AI location insights generating", "Merchant discovery functional"]'::jsonb
);