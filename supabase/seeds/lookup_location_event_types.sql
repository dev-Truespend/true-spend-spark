insert into lookup.location_event_types (code, display_name)
values
  ('stop', 'Stop'),
  ('visit', 'Visit'),
  ('recommendation_request', 'Recommendation request'),
  ('geofence_entered', 'Geofence entered'),
  ('geofence_exited', 'Geofence exited')
on conflict (code) do update set display_name = excluded.display_name;
