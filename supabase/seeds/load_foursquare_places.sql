-- Bulk-load the FSQ OS Places CSV into foursquare.places.
-- Runs as client-side \copy (local psql OR the foursquare-places-load.yml runner).
--
-- The \copy filename is the literal placeholder PLACES_CSV_PATH — psql does NOT interpolate a
-- :'var' into \copy, so the caller substitutes the real absolute path with sed before piping:
--
--   sed "s|PLACES_CSV_PATH|/abs/path/foursquare_places.csv|" supabase/seeds/load_foursquare_places.sql \
--     | psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f -
--
-- Idempotent: upsert on (provider, provider_place_id). category_id is resolved via
-- foursquare.category_bridge (exact id OR descendant path-prefix). If the bridge isn't
-- filled yet, category_id loads as NULL; just re-run after filling the bridge to backfill.
-- The heavy indexes (GiST geog + 3 GIN trigram + 2 btree) are dropped for the load and
-- rebuilt after — keep the UNIQUE index (ON CONFLICT depends on it).

\set ON_ERROR_STOP on

-- 1. Staging (unlogged = no WAL, fast). Columns match the CSV header exactly.
drop table if exists _stage_fsq_places;
create unlogged table _stage_fsq_places (
  fsq_place_id               text,
  name                       text,
  lat                        double precision,
  lng                        double precision,
  address                    text,
  locality                   text,
  region                     text,
  postal_code                text,
  country                    text,
  primary_fsq_category_id    text,
  primary_fsq_category_label text,
  all_fsq_category_ids       text,
  all_fsq_category_labels    text
);

\copy _stage_fsq_places from 'PLACES_CSV_PATH' with (format csv, header true)

-- 2. Drop the secondary indexes for a faster insert (keep foursquare_places_provider_place_idx —
-- ON CONFLICT needs it). We DROP the GiST geog + GIN trigram indexes if a prior migration created
-- them (so the 4M-row upsert doesn't maintain them — that is what blew past the instance disk) but we
-- do NOT rebuild them in step 5: they are unused by the current read path (lat/lng bounding box) and
-- are multi-GB / slow on 4M+ rows. See the note in migrations/foursquare.sql; re-add when needed.
drop index if exists foursquare.foursquare_places_geog_gist_idx;
drop index if exists foursquare.foursquare_places_normalized_name_trgm_idx;
drop index if exists foursquare.foursquare_places_locality_trgm_idx;
drop index if exists foursquare.foursquare_places_region_trgm_idx;
drop index if exists foursquare.foursquare_places_chain_id_idx;
drop index if exists foursquare.foursquare_places_lat_lng_idx;

-- 3. Upsert in BATCHES, committing after each, so WAL is checkpointed between commits and never
-- accumulates to GBs (a single 4M-row transaction's WAL is what exhausted the instance disk). Rows are
-- partitioned deterministically by a stable hash of the place id, so every staging row lands in exactly
-- one batch. category_id is resolved via the bridge (most-specific match wins). Idempotent on
-- (provider, provider_place_id). A procedure is required because only procedures may COMMIT mid-run.
create or replace procedure foursquare._load_places_from_stage(p_batches int)
language plpgsql as $$
declare i int;
begin
  for i in 0 .. p_batches - 1 loop
    insert into foursquare.places
      (provider, provider_place_id, name, normalized_name, category_id,
       lat, lng, address, locality, region, postal_code, country, source, is_active)
    select
      'foursquare',
      s.fsq_place_id,
      s.name,
      lower(btrim(s.name)),
      b.category_id,
      s.lat, s.lng,
      nullif(btrim(s.address), ''),
      nullif(btrim(s.locality), ''),
      nullif(btrim(s.region), ''),
      nullif(btrim(s.postal_code), ''),
      s.country,
      'os_places',
      true
    from public._stage_fsq_places s
    left join lateral (
      select cb.category_id
      from foursquare.category_bridge cb
      where cb.is_active
        and cb.category_id is not null
        and (
          cb.foursquare_category_id = s.primary_fsq_category_id
          or (cb.include_descendants and s.primary_fsq_category_label = cb.foursquare_category_path)
          or (cb.include_descendants and s.primary_fsq_category_label like cb.foursquare_category_path || ' > %')
        )
      order by length(cb.foursquare_category_path) desc   -- most specific bridge row wins
      limit 1
    ) b on true
    where s.name is not null and s.lat is not null and s.lng is not null
      and ((hashtext(s.fsq_place_id) % p_batches) + p_batches) % p_batches = i
    on conflict (provider, provider_place_id) do update set
      name            = excluded.name,
      normalized_name = excluded.normalized_name,
      category_id     = excluded.category_id,
      lat             = excluded.lat,
      lng             = excluded.lng,
      address         = excluded.address,
      locality        = excluded.locality,
      region          = excluded.region,
      postal_code     = excluded.postal_code,
      country         = excluded.country,
      last_seen_at    = now(),
      updated_at      = now();
    commit;
    raise notice 'batch %/% committed', i + 1, p_batches;
  end loop;
end$$;

call foursquare._load_places_from_stage(20);
drop procedure foursquare._load_places_from_stage(int);

-- 4. Free the staging table BEFORE rebuilding indexes, so the rebuild has the space back.
drop table if exists _stage_fsq_places;

-- 5. Rebuild the secondary indexes (matches the active set in migrations/foursquare.sql).
create index if not exists foursquare_places_chain_id_idx
  on foursquare.places(chain_id);
create index if not exists foursquare_places_lat_lng_idx
  on foursquare.places(lat, lng);

-- 6. Report.
select count(*) as places_total,
       count(category_id) as with_category,
       count(*) filter (where category_id is null) as base_rate
from foursquare.places;
