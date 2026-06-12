# Data load: Foursquare OS Places + RewardsCC → prod

One-time bulk load of `foursquare.*` and `catalog.*` into prod **without running any API job in prod**.
Foursquare places load via SQL (no worker job). RewardsCC runs **locally once**, then its data is seeded into prod.

## Approach (how the pieces fit)

The runtime feature is **geo-aware card recommendations**: when a user arrives somewhere, figure out the
merchant category of that place, then which of their cards earns the most in that category. That needs two
independent datasets joined by a translation layer:

| Dataset | Lands in | What it gives us | Its category vocabulary |
|---|---|---|---|
| **Foursquare OS Places** | `foursquare.places` | POIs — name, lat/lng, address, FSQ category per place | FSQ taxonomy (1,245 categories, hierarchical paths like `Travel and Transportation > Lodging > Hotel`) |
| **RewardsCC catalog** | `catalog.*` | Cards + their reward categories + multipliers (`reward_rules`) | Reward categories (`catalog.categories`, e.g. Dining, Gas Stations, Grocery Stores) |

These two speak **different category languages**. The join between them is the **bridge**
(`foursquare.category_bridge`) — the only thing that knows "an FSQ *Hotel* is a *Hotels* reward category."

**How the bridge translates** — each bridge row maps one FSQ category (`foursquare_category_id` + its full
`foursquare_category_path`) to one catalog reward category. `include_descendants = true` makes a parent row
cover its whole subtree (one `Lodging` row catches Hotel/Motel/Resort/…). At place-load time each place's FSQ
category is resolved against the bridge — **exact id match, or descendant path-prefix, most-specific row wins** —
and the resulting `catalog.categories` id is stamped onto `foursquare.places.category_id`. A place whose FSQ
category has no bridge row (or an unmapped one) loads with `category_id = null` — it's still a known location,
just not tied to a reward category.

**Why the bridge maps to a catalog _code_, not an id** — `catalog.*` uses `generated always as identity` PKs
whose values differ between local and prod. So the bridge stores the catalog **code** (`rcc_<rewardsCcId>`) and
every seed resolves the FK by code against the target DB. That makes the whole load environment-independent: the
same CSVs/seeds produce correct links whether ids match or not.

**Why this split (RewardsCC local + places via SQL)** — both datasets are essentially static reference data, so
there's no reason to run live API jobs in prod. RewardsCC runs once locally and we snapshot `catalog.*`; FSQ
places are pulled once (HF mirror) and bulk-loaded by SQL. Prod stays read-only for this data.

## Decisions (locked)

- **Foursquare places → NO new worker job.** Pure SQL: `\copy` CSV → staging → upsert.
- **RewardsCC → runs LOCALLY only, once.** Snapshot local `catalog.*`, seed into prod. Never runs in prod.
- **Scope:** US + Canada, `date_closed IS NULL`, MVP reward categories only (~4.27M places).
- **Big places CSV lives in Supabase Storage** (gzipped); small catalog snapshot CSVs committed under `supabase/seeds/data/`.
- **Catalog snapshot is a normal seed.** `catalog_snapshot.sql` is wired into `run-all.sql`, so `supabase-migrate` applies it (prod is in testing — no separate catalog workflow). Only the 4.27M-row places load stays a dedicated workflow.

## Data source — Foursquare OS Places (gated since 2026-06-11)

We don't ship FSQ's raw dataset — we **build our own trimmed CSVs from it** (only the columns, regions, and
categories we need), then those feed the loads. FSQ OS Places is the upstream; the two CSVs below are ours.

- The FSQ **Iceberg catalog** (`catalog.h3-hub.foursquare.com/iceberg`) returns **403** for our accounts (needs an account-level read grant we don't have). Do **not** use it.
- Use the **Hugging Face** mirror instead: dataset `foursquare/fsq-os-places` (`gated: auto` — accept terms on the HF page + a read token).
- HF read token file: `~/Documents/fsqdatasets/hf-token` (read scope). Account/dataset key in `~/Documents/fsqdatasets/FSQ-Dataset-Key`.
- Source parquet (release `dt=2024-12-03`):
  - places: `hf://datasets/foursquare/fsq-os-places/release/dt=2024-12-03/places/parquet/*.parquet`
  - categories: `hf://datasets/foursquare/fsq-os-places/release/dt=2024-12-03/categories/parquet/*.parquet`

### How we generated our CSVs (DuckDB ≥ v1.4)

Run DuckDB with the HF token in the environment so the secret can read the gated parquet:

```bash
HF_TOKEN="$(tr -d '[:space:]' < ~/Documents/fsqdatasets/hf-token)" duckdb
```
```sql
INSTALL httpfs;       LOAD httpfs;
INSTALL huggingface;  LOAD huggingface;
CREATE SECRET hf (TYPE huggingface, TOKEN getenv('HF_TOKEN'));
```

**Step 1 — categories first** (the taxonomy we map the bridge against → `foursquare_categories.csv`, 1,245 rows):

```sql
COPY (
  SELECT category_id, category_level, category_name, category_label,
         level1_category_name, level2_category_name, level3_category_name
  FROM read_parquet('hf://datasets/foursquare/fsq-os-places/release/dt=2024-12-03/categories/parquet/*.parquet')
  ORDER BY category_level, category_label
) TO '/Users/<you>/Documents/fsqdatasets/foursquare_categories.csv' (HEADER, DELIMITER ',');
```

**Step 2 — places for US + Canada**, open only, narrowed to the MVP categories (→ `foursquare_places.csv`,
4,266,083 rows). Source fields are renamed/derived: `latitude→lat`, `longitude→lng`, `postcode→postal_code`,
and the first element of the category lists becomes the `primary_*` columns:

```sql
COPY (
  SELECT
    fsq_place_id, name,
    latitude AS lat, longitude AS lng,
    address, locality, region, postcode AS postal_code, country,
    fsq_category_ids[1]    AS primary_fsq_category_id,
    fsq_category_labels[1] AS primary_fsq_category_label,
    array_to_string(fsq_category_ids, ',')    AS all_fsq_category_ids,
    array_to_string(fsq_category_labels, ',') AS all_fsq_category_labels
  FROM read_parquet('hf://datasets/foursquare/fsq-os-places/release/dt=2024-12-03/places/parquet/*.parquet')
  WHERE country IN ('US','CA')
    AND date_closed IS NULL
    AND latitude IS NOT NULL AND longitude IS NOT NULL
    -- keep a place if ANY of its category labels matches the MVP set (see "MVP category filter" below)
    AND len(list_filter(fsq_category_labels, x -> regexp_matches(x,
        '(?i)(Dining and Drinking|Arts and Entertainment|Fuel Station|Truck Stop|Lodging|Grocery|Supermarket|Pharmacy|Drugstore|Big Box Store|Wholesale|Department Store|Convenience Store|Transport Hub|Airport|Train Station)'))) > 0
) TO '/Users/<you>/Documents/fsqdatasets/foursquare_places.csv' (HEADER, DELIMITER ',');
```

Both run locally — the data is static, so we generate once. From here: `foursquare_categories.csv` is the reference
for the bridge mapping (kept local only), and `foursquare_places.csv` is gzipped + uploaded to Supabase Storage for
the prod load (see "One-time setup for the places load"). No script file is committed for this — it's a one-off recipe.

## Our generated artifacts (in `~/Documents/fsqdatasets/`, NOT in git)

| File | Rows | Role |
|---|---|---|
| `foursquare_categories.csv` | 1,245 | Our trim of the FSQ taxonomy (category_id, level, name, label, level1–3). Reference for the bridge mapping. |
| `foursquare_places.csv` | 4,266,083 (1.1 GB) | Our US+CA, open, MVP-only places. Columns: `fsq_place_id, name, lat, lng, address, locality, region, postal_code, country, primary_fsq_category_id, primary_fsq_category_label, all_fsq_category_ids, all_fsq_category_labels`. Gzipped → Storage → prod load. |
| `hf-token` / `FSQ-Dataset-Key` | — | HF read token (whitespace-stripped) and the FSQ account/dataset key. |

## MVP category filter (≈4.27M places)

Places where any `fsq_category_labels` entry matches (ILIKE): `Dining and Drinking`, `Arts and Entertainment`,
`Fuel Station`, `Truck Stop`, `Lodging`, `Grocery`, `Supermarket`, `Pharmacy`, `Drugstore`, `Big Box Store`,
`Wholesale`, `Department Store`, `Convenience Store`, `Transport Hub`, `Airport`, `Train Station`.

Per-category (US+CA): dining 2.56M · entertainment 573k · transit 263k · gas 273k · lodging 232k · convenience 195k · grocery 147k · pharmacy 103k · warehouse 77k → **~4.27M dedup**.

## Target tables

- `foursquare.places` — unique `(provider, provider_place_id)`. Heavy indexes: GiST `geog` (generated), GIN trigram on `name`/`locality`/`region`, btree `lat,lng`, `chain_id`. `category_id` → `catalog.categories`.
- `foursquare.category_bridge` — `foursquare_category_id`, `foursquare_category_path`, `category_id` (→catalog.categories, **null until filled**), `include_descendants`, `is_active`.
- `foursquare.chains` — stays EMPTY (OS Places free has no chain/brand data; `chain_id` null).
- `catalog.*` — `card_issuers, card_products, categories, category_aliases, reward_rules`. Normally runtime-loaded by the worker; here we seed a local snapshot.

## Plan

### Local (one-time)
1. **RewardsCC local** — run the existing `RewardsCcCatalogSync` worker against the **local** DB (RapidAPI key + curated `RewardsCc:Seed` in `appsettings.Development.json`) → fills local `catalog.*`.
2. **Fill the bridge** — now that `catalog.categories` exists, map the 9 MVP FSQ categories → `catalog.categories.id`; set `foursquare.category_bridge.category_id` (expand bridge to cover the MVP set).

### Prod load
3. **Seed `catalog.*` + bridge → prod** — run **`supabase-migrate`**. `run-all.sql` applies `catalog_snapshot.sql` (idempotent code-resolving upsert from `seeds/data/*.csv`) at the catalog slot, then `foursquare_category_bridge.sql` (resolves `category_id` against the just-seeded categories). No separate catalog workflow.
4. **Load `foursquare.places` → prod** (from Supabase Storage, dedicated `foursquare-places-load.yml`):
   a. `gzip foursquare_places.csv` (~1.1 GB → ~200 MB) and upload to a Supabase Storage bucket (e.g. `data-loads`).
   b. Runner **downloads** from Storage → **gunzip** → `\copy` into staging → upsert into `foursquare.places`, resolving `category_id` via `category_bridge` (exact id OR descendant path-prefix).
   c. **Drop the heavy indexes before load, rebuild after** (cuts ~40 min → ~20 min).

### Order
```
RewardsCC local (1) → catalog.categories exists
   └ fill bridge (2) → category_id known
        ├ supabase-migrate → catalog snapshot + bridge to prod (3)
        └ foursquare-places-load → places to prod (4)   ← uses bridge for category_id
```

## Where the `COPY` runs (important)

Supabase managed Postgres **cannot** `COPY` directly from Storage (no `aws_s3` extension, no server filesystem access).
So the load is **client-side `\copy`** from a machine that holds the file:
- **GitHub Actions runner** (a dedicated workflow): download the gzip from Supabase Storage (service-role key / signed URL) → gunzip → `\copy` staging → upsert. This is the "via the pipeline" path.
- **Or local `psql`** from this Mac (CSV already here) — simplest for a one-off.

Either way the bytes stream from the runner/Mac into prod Postgres over the **session pooler** (5432). Expect **~20–40 min** (index-bound).

## Caveats

- **Supabase free Storage cap = 1 GB.** The raw CSV is 1.1 GB → **gzip (~200 MB)** to fit (or use Pro). Runner/loader gunzips before `\copy`.
- Use the **session pooler** (`...pooler.supabase.com:5432`, user `postgres.<ref>`) for the load — never the transaction pooler (breaks COPY/prepared statements).
- Re-runnable: places upsert is idempotent on `provider_place_id`; re-running backfills `category_id` after the bridge is filled.

## Connection (prod)

`psql` URI (session pooler): `postgresql://postgres.mtdwzpcoflkfsacyqwvx:<pwd>@aws-1-us-west-2.pooler.supabase.com:5432/postgres`
(pipeline reads it from the `SUPABASE_DB_URL` GitHub secret).

---

## STATUS (as of this load effort)

Supabase plan: **Pro** (Storage cap 100 GB — raw 1.1 GB CSV fits; we gzip to ~200 MB for transfer speed).

### Layout (all under `supabase/seeds/`)
- `catalog_snapshot.sql` — replays the snapshot CSVs into `catalog.*`: text staging → code-resolving upserts. issuers/categories/products/aliases upsert on their code; reward_rules (no natural key) are replaced per seeded product. **Wired into `run-all.sql`** at the catalog seed slot (before the FSQ bridge), so `supabase-migrate` applies it. Validated end-to-end.
- `foursquare_category_bridge.sql` — full MVP allowlist (34 rows: dining, entertainment, grocery/supermarket, convenience/big-box/department/warehouse/wholesaler, pharmacy/drugstore, fuel, lodging, transport hub, train); `category_id` resolves by **catalog code** (`rcc_<id>`). Already in `run-all.sql` after the catalog snapshot.
- `data/catalog_*.csv` — the 5 snapshot CSVs (~200 KB), committed.
- `dump_local_catalog.sql` — regenerates `data/*.csv` from a local `catalog.*` (run from `seeds/data/`). FKs dumped as business codes, never identity ids.
- `load_foursquare_places.sql` + `.github/workflows/foursquare-places-load.yml` — the 4.27M-row places bulk load (drop indexes → `\copy` + upsert → rebuild). Stays a dedicated workflow (too big for `run-all`). `\copy` runs on the runner, streaming to prod over the session pooler.
- Places/categories source CSVs live in `~/Documents/fsqdatasets/` (NOT git): `foursquare_places.csv` (4,266,083 rows, 1.1 GB), `foursquare_categories.csv` (1,245).

### Remaining steps (in order)
1. ✅ **DONE — RewardsCC local.** Fixed local `catalog.reward_rules` drift, ran `RewardsCcCatalogSync` against local, dumped via `dump_local_catalog.sql`. Snapshot (seed-list only — prod adopts the list-all-cards API later): **8 issuers, 36 products, 47 categories, 64 aliases, 136 reward rules**. CSVs in `seeds/data/`.
2. ✅ **DONE — bridge mapping filled.** `foursquare_category_bridge.sql` validated: 34 rows, **30 mapped**, 4 unmapped by design (Car Wash, Laundromat, Laundry Service, Convenience Store — fetch-allowlist only).
3. **Catalog + bridge → prod** — commit `seeds/data/*.csv` + the seed files, then run **`supabase-migrate`** (applies `catalog_snapshot.sql` then the bridge, in order).
4. **Places → prod** — upload gz to Storage (cmd below), add the 2 Storage secrets, run **`foursquare-places-load`**. Run after step 3 so the bridge can resolve place `category_id`.

> ⚠️ `service/truespend.workerservice/appsettings.Development.json` is git-tracked and now holds the RapidAPI key — **do not commit it**. (`git restore` it or strip the key before any commit that would include it.)

### Order recap
RewardsCC local (1) → fill bridge `category_code` (2) → `supabase-migrate`: catalog snapshot + bridge to prod (3) → `foursquare-places-load`: places to prod (4).

### One-time setup for the places load
- **Create a private Storage bucket** `data-loads` (dashboard or API).
- **Upload the gz from your Mac** (the runner can't — file is local):
  ```bash
  gzip -kf ~/Documents/fsqdatasets/foursquare_places.csv     # -> foursquare_places.csv.gz (~200MB)
  curl -fSL -X POST "https://mtdwzpcoflkfsacyqwvx.supabase.co/storage/v1/object/data-loads/foursquare_places.csv.gz" \
    -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "Content-Type: application/gzip" \
    --data-binary @~/Documents/fsqdatasets/foursquare_places.csv.gz
  ```
- **Add GitHub repo secrets:** `SUPABASE_URL` = `https://mtdwzpcoflkfsacyqwvx.supabase.co`,
  `SUPABASE_SERVICE_ROLE_KEY` (= KV `SupabaseStorage--ServiceRoleKey`), and `SUPABASE_DB_URL` (already exists for supabase-migrate).
- Then run the **foursquare-places-load** workflow (Actions → Run workflow). ~20–40 min (index-bound).
