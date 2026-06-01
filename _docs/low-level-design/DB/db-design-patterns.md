# DB Design Patterns

Simple structure for database files in this repo.

## Folder Structure

```text
supabase/
├── migrations/
│   ├── _init.sql
│   ├── app.sql
│   ├── catalog.sql
│   ├── finance.sql
│   ├── billing.sql
│   ├── messaging.sql
│   ├── insights.sql
│   ├── sync.sql
│   ├── lookup.sql
│   ├── privacy.sql
│   └── security.sql
├── seeds/
│   └── <schema>_<table>.sql
└── policies/
    └── <schema>.sql
```

Supabase runs files alphabetically inside each folder.

## `migrations/`

Migration files define the database structure.

### Naming

Use one migration file per schema:

```text
<schema>.sql
```

Examples:

```text
app.sql
finance.sql
billing.sql
```

Special file:

```text
_init.sql
```

### Content

`_init.sql` contains only:

- extensions
- `create schema` statements

Each `<schema>.sql` contains only objects for that schema:

- `create table`
- inline foreign keys
- indexes
- constraints

Do not put seed data or RLS policies in migration files.

## `seeds/`

Seed files insert reference data the app needs to run.

### Naming

Use one seed file per seeded table:

```text
<schema>_<table>.sql
```

Examples:

```text
lookup_card_sources.sql
billing_plans.sql
messaging_notification_types.sql
```

### Content

Seed files contain only idempotent inserts:

- lookup rows
- plan/catalog/reference rows
- no user test data

Use `on conflict do update` so seeds can be run more than once.

## `policies/`

Policy files define Row-Level Security.

### Naming

Use one policy file per schema:

```text
<schema>.sql
```

Examples:

```text
app.sql
finance.sql
messaging.sql
```

### Content

Each policy file contains:

- `alter table ... enable row level security`
- `create policy ...`

Keep policies grouped by schema.

## Naming Cheat Sheet

| File Type | Pattern | Example |
|---|---|---|
| Init migration | `_init.sql` | `_init.sql` |
| Schema migration | `<schema>.sql` | `finance.sql` |
| Seed file | `<schema>_<table>.sql` | `lookup_card_sources.sql` |
| Policy file | `<schema>.sql` | `finance.sql` |
| Index | `<schema>_<table>_<column>_idx` | `finance_user_cards_user_id_idx` |
| Policy | `<schema>_<table>_<access>_<verb>` | `finance_user_cards_owner_select` |
