-- Add EMAIL_TEMPLATES_ENABLED feature flag
INSERT INTO public.feature_flags (flag_name, enabled, config)
VALUES ('EMAIL_TEMPLATES_ENABLED', true, '{"version": "1.0", "templates": ["budget_alert", "geofence_alert", "transaction_notification", "weekly_summary", "security_alert", "password_reset"]}'::jsonb)
ON CONFLICT (flag_name) DO NOTHING;