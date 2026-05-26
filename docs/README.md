# TrueSpend Documentation

These are the canonical docs for the current Cloudflare + Supabase rewards MVP direction.

| Document | Use it for |
| --- | --- |
| [Architecture](ARCHITECTURE.md) | End-to-end system design and module boundaries |
| [API Reference](API.md) | Supabase Edge Function contracts |
| [Milestone Tracker](MILESTONE_TRACKER.md) | Current code-vs-roadmap status |
| [Production TODO](PRODUCTION_TODO.md) | Launch blockers and owner inputs |
| [Cloudflare + Supabase Production Guide](CLOUDFLARE_SUPABASE_PRODUCTION.md) | Deployment runbook |
| [Source of Truth](SOURCE_OF_TRUTH.md) | Ownership boundaries for catalog, merchants, user cards, and recommendations |
| [Card Catalog](CARD_CATALOG.md) | Catalog schema, review flow, and seed rules |
| [Rewards Engine](REWARDS_ENGINE.md) | Deterministic reward ranking rules |
| [Security](SECURITY.md) | RLS, admin, extension privacy, and production checks |

Historical one-off reviews, generated diagrams, and provider-specific setup notes were removed so the docs stay small enough to trust.

## Documentation Rules

- Keep `BUILD_PLAN.md` as the strategic rebuild plan.
- Keep this `docs/` folder as the operational reference.
- Do not add completion reports for individual tasks.
- Do not add diagram files unless they are editable and render consistently in GitHub.
- Update `MILESTONE_TRACKER.md` only after checking actual source files.
