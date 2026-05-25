
-- alert_rules: restrict view to admins
DROP POLICY IF EXISTS "Users can view active alert rules" ON public.alert_rules;
CREATE POLICY "Admins can view alert rules" ON public.alert_rules
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- feature_flag_audit: restrict reads to admins
DROP POLICY IF EXISTS "Feature flag audit readable by authenticated users" ON public.feature_flag_audit;
CREATE POLICY "Admins can read feature flag audit" ON public.feature_flag_audit
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- geofence_heatmap_data: restrict manage to service_role
DROP POLICY IF EXISTS "System can manage heatmap data" ON public.geofence_heatmap_data;
CREATE POLICY "Service role manages heatmap data" ON public.geofence_heatmap_data
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- location_analytics: restrict manage to service_role
DROP POLICY IF EXISTS "System can manage location analytics" ON public.location_analytics;
CREATE POLICY "Service role manages location analytics" ON public.location_analytics
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- user_experiment_assignments: restrict manage to service_role
DROP POLICY IF EXISTS "System can manage assignments" ON public.user_experiment_assignments;
CREATE POLICY "Service role manages assignments" ON public.user_experiment_assignments
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- rate_limits: restrict manage to service_role
DROP POLICY IF EXISTS "Service role full access to rate_limits" ON public.rate_limits;
CREATE POLICY "Service role manages rate_limits" ON public.rate_limits
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- workflow_executions: restrict to admins
DROP POLICY IF EXISTS "Executions readable by authenticated users" ON public.workflow_executions;
DROP POLICY IF EXISTS "Executions insertable by authenticated users" ON public.workflow_executions;
DROP POLICY IF EXISTS "Executions updatable by authenticated users" ON public.workflow_executions;
CREATE POLICY "Admins manage workflow executions" ON public.workflow_executions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- workflow_step_executions: restrict to admins
DROP POLICY IF EXISTS "Step executions readable by authenticated users" ON public.workflow_step_executions;
DROP POLICY IF EXISTS "Step executions writable by authenticated users" ON public.workflow_step_executions;
CREATE POLICY "Admins manage workflow step executions" ON public.workflow_step_executions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ml-models storage bucket: restrict broad policy to service_role
DROP POLICY IF EXISTS "System can manage ML models" ON storage.objects;
CREATE POLICY "Service role manages ML models" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'ml-models')
  WITH CHECK (bucket_id = 'ml-models');
