insert into lookup.conflict_resolutions (code, display_name) values
  ('use_local',  'Use Local'),
  ('use_remote', 'Use Remote'),
  ('use_merged', 'Use Merged')
on conflict (code) do update
  set display_name = excluded.display_name;
