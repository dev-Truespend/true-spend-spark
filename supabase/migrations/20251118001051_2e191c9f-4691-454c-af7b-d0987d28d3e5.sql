-- Enable realtime for Phase 8 tables
ALTER PUBLICATION supabase_realtime ADD TABLE service_registry;
ALTER PUBLICATION supabase_realtime ADD TABLE service_health_history;
ALTER PUBLICATION supabase_realtime ADD TABLE feature_flags;
ALTER PUBLICATION supabase_realtime ADD TABLE feature_flag_audit;