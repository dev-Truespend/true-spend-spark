# TrueSpend Documentation

These are the canonical docs for the current Cloudflare + Supabase + AI-agent direction.

| Document | Use it for |
| --- | --- |
| [Architecture](ARCHITECTURE.md) | End-to-end system design and module boundaries |
| [API Reference](API.md) | Supabase Edge Function contracts |
| [Milestone Tracker](MILESTONE_TRACKER.md) | Current code-vs-roadmap status |
| [Production TODO](PRODUCTION_TODO.md) | Launch blockers and owner inputs |
| [Cloudflare + Supabase Production Guide](CLOUDFLARE_SUPABASE_PRODUCTION.md) | Deployment runbook |
| [AI Agent UX Guide](AI_AGENT_UX_GUIDE.md) | Dashboard and engagement recommendations |

Historical one-off reviews, generated diagrams, and provider-specific setup notes were removed so the docs stay small enough to trust.

## Documentation Rules

- Keep `BUILD_PLAN.md` as the strategic rebuild plan.
- Keep this `docs/` folder as the operational reference.
- Do not add completion reports for individual tasks.
- Do not add diagram files unless they are editable and render consistently in GitHub.
- Update `MILESTONE_TRACKER.md` only after checking actual source files.
