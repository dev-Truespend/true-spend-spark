-- Local POI store for the geo-arrival `custom` path (10a). Pre-loaded by FoursquarePlacesCatalogSyncJob
-- (batch) and filled on-demand by read-through upsert on a live-lookup miss. Catalog-level reference
-- data, shared across users, never user PII. Requires the postgis + pg_trgm extensions (see _init.sql).

-- Brand/chain dimension. A place is a "chain location" when its chain_id is set.
create table if not exists foursquare.chains (
  id int generated always as identity primary key,
  provider_chain_id text unique,
  name text not null,
  normalized_name text not null,
  default_category_id smallint references catalog.categories(id),
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists foursquare_chains_normalized_name_trgm_idx
  on foursquare.chains using gin (normalized_name gin_trgm_ops);

-- Geocoded POIs. provider records the row source ('foursquare' batch | 'google'/'overture' on-miss
-- fallback). geog is generated from lat/lng for PostGIS nearby queries (ST_DWithin + <->).
create table if not exists foursquare.places (
  id int generated always as identity primary key,
  provider text not null default 'foursquare',
  provider_place_id text not null,
  chain_id int references foursquare.chains(id) on delete set null,
  name text not null,
  normalized_name text not null,
  category_id smallint references catalog.categories(id),
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  geog geography(Point,4326) generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  address text,
  locality text,
  region text,
  postal_code text,
  country text,
  source text not null default 'catalog_sync',
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists foursquare_places_provider_place_idx
  on foursquare.places(provider, provider_place_id);

-- Trigram index on normalized_name powers the home-screen place search (ILIKE '%term%' over the 4M+
-- rows; without it that's a full scan). Build it from the migration AFTER the bulk load has finished —
-- NOT inside seeds/load_foursquare_places.sql, where building it mid-load blew past the instance disk.
-- On an already-loaded table this is a one-time multi-minute GIN build that locks writes; foursquare.places
-- is batch-loaded (no user writes), so run it in a maintenance window.
create index if not exists foursquare_places_normalized_name_trgm_idx
  on foursquare.places using gin (normalized_name gin_trgm_ops);

-- DEFERRED: still unused by any read path and multi-GB to build on the 4M+ row dataset. Re-enable when
-- spatial (ST_DWithin via geog) or locality/region text search is actually implemented.
-- create index if not exists foursquare_places_geog_gist_idx
--   on foursquare.places using gist (geog);
-- create index if not exists foursquare_places_locality_trgm_idx
--   on foursquare.places using gin (locality gin_trgm_ops);
-- create index if not exists foursquare_places_region_trgm_idx
--   on foursquare.places using gin (region gin_trgm_ops);

create index if not exists foursquare_places_chain_id_idx
  on foursquare.places(chain_id);

-- Supports the bounding-box prefilter the place-match read path uses before in-memory Haversine ranking.
create index if not exists foursquare_places_lat_lng_idx
  on foursquare.places(lat, lng);

-- FSQ category -> internal category map AND the configurable fetch allowlist. The active, mapped rows
-- ARE the list the catalog sync job fetches. A parent row with include_descendants = true covers its
-- whole subtree. category_id stays null while a row is pending RewardsCC reward-category mapping.
-- Mirrors finance.transaction_category_bridge; built once, deterministic lookup at sync time, no runtime AI.
create table if not exists foursquare.category_bridge (
  id int generated always as identity primary key,
  foursquare_category_id text not null unique,
  foursquare_category_path text not null,
  category_id smallint references catalog.categories(id),
  include_descendants boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists foursquare_category_bridge_active_idx
  on foursquare.category_bridge(is_active)
  where is_active;
