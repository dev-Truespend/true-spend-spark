-- Fix search_path security warning for update_user_consents_updated_at function
CREATE OR REPLACE FUNCTION public.update_user_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';