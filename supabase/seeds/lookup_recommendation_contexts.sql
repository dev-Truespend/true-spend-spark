insert into lookup.recommendation_contexts (code, display_name)
values
  ('home', 'Home'),
  ('in_store', 'In store'),
  ('geofence_arrival', 'Geofence arrival')
on conflict (code) do update set display_name = excluded.display_name;
