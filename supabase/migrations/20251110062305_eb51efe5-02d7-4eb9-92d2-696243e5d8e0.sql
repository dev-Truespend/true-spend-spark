-- Drop insecure policies on geofence_metrics
DROP POLICY IF EXISTS "System can insert metrics" ON public.geofence_metrics;
DROP POLICY IF EXISTS "Authenticated users can read metrics" ON public.geofence_metrics;

-- Create secure INSERT policy: Users can only insert their own metrics
CREATE POLICY "Users can insert own metrics" 
ON public.geofence_metrics 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Create secure SELECT policy: Users can view own metrics, admins can view all
CREATE POLICY "Users can view own metrics or admins view all" 
ON public.geofence_metrics 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);