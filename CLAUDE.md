# TrueSpend — Working Agreement (Claude Code)

Single entry point for any session. Read this first, then route to the right sub-guide.

## 1. Project

TrueSpend is a personal-finance mobile app (React Native + Expo) backed by a .NET service. Mobile and service mirror the same layered separation of concerns.

Start here: [mvp-architecture.md](_docs/high-level-design/mvp-architecture.md).

## 1a. Root structure

Use this simple root layout as the implementation target:

| Path | Purpose |
|---|---|
| `docs/` | Product, architecture, workflow, design, and implementation docs |
| `ui-mobile/` | React Native + Expo mobile app |
| `service/` | .NET backend service, jobs, tests, and service contracts |
| `supabase/` | Supabase local config, migrations, seeds, functions, and database assets |

## 2. Spec doc index

| Area | Doc | Purpose |
|---|---|---|
| Architecture | [mvp-architecture.md](_docs/high-level-design/mvp-architecture.md) | MVP architecture |
| Architecture | [scaling-architecture.md](_docs/high-level-design/scaling-architecture.md) | Scaling path |
| Tooling | [Tools-Used.md](_docs/Tools-Used.md) | Stack list |
| Tooling | [mvp-tooling-guide.md](_docs/high-level-design/mvp-tooling-guide.md) | MVP tooling decisions |
| Service code | [api-design-patterns.md](_docs/low-level-design/Service/api-design-patterns.md) | .NET service code standards |
| Service architecture | [current-api-architecture.md](_docs/low-level-design/Service/current-api-architecture.md), [new-api-architecture.md](_docs/low-level-design/Service/new-api-architecture.md) | Current and target API architecture |
| Service contracts | [api-design.md](_docs/low-level-design/Service/api-design.md), [api-design-extended.md](_docs/low-level-design/Service/api-design-extended.md) | API contracts |
| Service jobs | [job-architecture.md](_docs/low-level-design/Service/job-architecture.md) | Background jobs |
| DB code | [db-design-patterns.md](_docs/low-level-design/DB/db-design-patterns.md) | DB code standards |
| DB design | [db-design.md](_docs/low-level-design/DB/db-design.md), [db-design-extended.md](_docs/low-level-design/DB/db-design-extended.md) | Schema |
| Mobile code | [ui-design-patterns.md](_docs/low-level-design/UI/ui-design-patterns.md) | React Native + Expo code standards |
| Mockups | [MobileApp-Mockup/](_docs/MobileApp-Mockup/), [Current-Web-Mockup/](_docs/Current-Web-Mockup/), [Current-Web-Mockup README](_docs/Current-Web-Mockup/README.md) | Design references |
| User stories | [mobile-user-stories.md](_docs/UserStory/mobile-user-stories.md) | All user stories |
| Core workflows | [01-auth-session.md](_docs/Workflows/01-auth-session.md), [02-onboarding.md](_docs/Workflows/02-onboarding.md), [03-home-recommendations.md](_docs/Workflows/03-home-recommendations.md), [04-cards.md](_docs/Workflows/04-cards.md), [05-transactions.md](_docs/Workflows/05-transactions.md) | Auth, onboarding, home, cards, transactions |
| Analytics workflows | [06-insights-analytics.md](_docs/Workflows/06-insights-analytics.md), [10-geo-recommendations.md](_docs/Workflows/10-geo-recommendations.md) | Insights and location-aware recommendations |
| Platform workflows | [07-notifications.md](_docs/Workflows/07-notifications.md), [09-billing-entitlements.md](_docs/Workflows/09-billing-entitlements.md), [11-sync-status.md](_docs/Workflows/11-sync-status.md), [13-feature-gating.md](_docs/Workflows/13-feature-gating.md) | Notifications, billing, sync, feature gates |
| Account workflows | [08-profile-preferences.md](_docs/Workflows/08-profile-preferences.md), [14-privacy-data.md](_docs/Workflows/14-privacy-data.md) | Profile, preferences, privacy, account data |
| Cross-cutting workflows | [12-cross-cutting.md](_docs/Workflows/12-cross-cutting.md), [notification-production.md](_docs/Workflows/notification-production.md), [webhook-handlers.md](_docs/Workflows/webhook-handlers.md) | Shared workflow concerns, production notifications, webhooks |
| Workflow conventions | [common-guide.md](_docs/Workflows/common-guide.md) | How workflow docs are structured |

## 3. Task routing

Identify the task type below at the start of every session. Follow the steps in order. Do not skip docs.

| Task | Steps |
|---|---|
| **Workflow implementation** | See [§3a Workflow lifecycle](#3a-workflow-lifecycle-phased-per-user-story) below — phased per user story, build/test runs only at the very end. |
| **User story** | 1. Find the story in [mobile-user-stories.md](_docs/UserStory/mobile-user-stories.md) <br>2. Identify the workflows touched <br>3. Trigger the Workflow lifecycle for each <br>4. Update Status next to the story |
| **Bug fix** | 1. Reproduce <br>2. Identify affected workflow / user story <br>3. Read the pattern doc for the affected layer <br>4. Fix + add a regression test <br>5. Add a one-line note under the workflow's Notes |
| **Design change** | 1. Update the mockup <br>2. Update affected workflow(s) <br>3. Update affected pattern doc only if standards change |
| **Spec / doc edit** | 1. Edit the doc — tables over prose, no narration, no empty sections <br>2. Resolved design-gap rows are deleted in place (use `None currently open.` when empty) |

### 3a. Workflow lifecycle (phased per user story)

Trigger phrase: **"start working on workflow X"** (or any equivalent).

After this trigger, continue through every user story in the workflow in the same session without waiting for additional user prompts. Stop only when the workflow is complete, a true blocker is found, or a required permission/approval is unavoidable.

| Step | Action |
|---|---|
| **1. Load context** | Read `_docs/Workflows/X.md`, [common-guide.md](_docs/Workflows/common-guide.md), and the matching pattern docs (service / mobile / DB). Read referenced API contracts + DB tables only if the workflow touches them. |
| **2. Enumerate user stories** | List every user story the workflow covers. If the workflow doc has no `## Progress` table yet, add one with columns `User story \| Status \| Notes`. Default Status: `Not started`. |
| **3. Mark workflow active** | Write the single word `active` to [.claude/.workflow-state](.claude/.workflow-state). The Stop hook now silently skips build/test until this is flipped back. |
| **4. Phased loop — for each user story, in order** | a. Set Status → `In progress`. <br>b. Implement the story end-to-end (code + tests). <br>c. Set Status → `Done` in the workflow doc Progress table. <br>d. Also update Status in [mobile-user-stories.md](_docs/UserStory/mobile-user-stories.md) if the story is listed there. <br>e. Continue immediately to the next story without ending the session. Stop only for a true blocker or unavoidable approval. |
| **5. Close the workflow** | When the last user story is `Done`: write `idle` to [.claude/.workflow-state](.claude/.workflow-state). The next Stop hook firing runs the full build + test for everything the workflow changed. |
| **6. Fix-forward on failures** | If the end-of-workflow build/test fails, fix forward immediately when the failure is available. State stays `idle`, so each fix triggers another build until it passes. Do not flip back to `active` to silence the hook. |

Notes:

- One workflow active at a time. Do not start a second workflow before closing the first.
- If a single user story spans multiple turns (large), keep Status as `In progress` until truly complete, then flip to `Done`.
- A bug fix or doc edit outside any workflow leaves the state file as `idle` or missing — Stop hook runs normally on those.
- A workflow trigger is permission to attempt the whole workflow, not just the first story. Keep working until all covered user stories are complete or a blocker prevents further progress.

## 4. Code standards

Pointers only — never duplicate standards into workflow docs, commits, or PR descriptions.

| Layer | Standard |
|---|---|
| .NET service, jobs, event consumer | [api-design-patterns.md](_docs/low-level-design/Service/api-design-patterns.md) |
| Database / EF entities | [db-design-patterns.md](_docs/low-level-design/DB/db-design-patterns.md) |
| Mobile (React Native + Expo) | [ui-design-patterns.md](_docs/low-level-design/UI/ui-design-patterns.md) |

## 5. Build & test discipline

- **Do not** run `npm test`, `npm run build`, `dotnet build`, or `dotnet test` mid-task or per user story.
- The Stop hook in [.claude/settings.json](.claude/settings.json) handles it automatically — but only fires when [.claude/.workflow-state](.claude/.workflow-state) is `idle` (or missing).
- During a workflow (`active` state), Stop hook fires every turn but exits silently — build/test stays held back.
- When you flip the state to `idle` at workflow close, the next Stop hook firing runs the full build/test for every file the workflow touched.
- Run build/test manually only when explicitly asked.
- Stop-hook failures appear in the next turn — fix forward, don't bypass with `--no-verify` (denied).

State file values:

| `.claude/.workflow-state` | Stop hook behavior |
|---|---|
| `active` | Skip build/test (workflow in progress) |
| `idle` or missing | Run build/test on changed areas (normal mode) |

What the Stop hook runs (when not gated):

| Changed area | Commands |
|---|---|
| `ui-mobile/**`, `*.ts`, `*.tsx`, `package.json` | `npm run lint && npx tsc --noEmit && npm test` |
| `service/**`, `*.cs`, `*.csproj`, `*.sln`, `appsettings*.json` | `dotnet build && dotnet test` |
| `supabase/**` | Validate through the workflow-specific DB checks when available |
| `docs/**.md` or `_docs/**.md` only | `markdownlint` for docs (if installed) |
| Nothing tracked changed | skipped |

## 6. Progress tracking

Progress is recorded per user story, in place, in the doc that owns the work.

| When | Update |
|---|---|
| Starting a user story | Workflow doc Progress table → Status `In progress` |
| Finishing a user story | Workflow doc Progress table → Status `Done`. Also update [mobile-user-stories.md](_docs/UserStory/mobile-user-stories.md) if the story is listed there. |
| Blocked on a story | Status `Blocked` + one-line reason in Notes |
| Workflow fully closed | Flip [.claude/.workflow-state](.claude/.workflow-state) to `idle`. Stop hook then runs end-of-workflow build/test. |

Rules:

- Status values: `Not started` / `In progress` / `Done` / `Blocked`.
- Update Status as the user story progresses — not in a batch at the end.
- Do not create a separate progress log file — Status lives in the doc.
- If a workflow doc has no `## Progress` section yet, add one as the first section after the intro with columns: `User story | Status | Notes`.

## 7. Don't do

- Don't `git push` (denied at the permission layer).
- Don't `rm` anything (denied).
- Don't `git reset --hard`, `git branch -D`, `git clean -f`, or `--no-verify` on commits (denied).
- Don't edit `.env*` files unless asked.
- Don't add npm, NuGet, or other third-party dependencies unless they are strictly necessary to complete the requested workflow. Prefer existing project dependencies and standard platform APIs first. If a dependency is truly necessary, list the package, explain why existing tools are insufficient, and ask before adding it.
- Don't put business rules in pattern docs. Don't put standards in workflow docs.
- Don't run dev servers or simulators unless asked.

## 8. Working remotely — keep the Mac awake

`caffeinate` is built into macOS (not Python). It prevents idle / system / display sleep.

Before walking away while Claude is working:

```bash
caffeinate -dimsu &           # keep awake indefinitely (stop with `kill %1`)
caffeinate -dimsu -t 7200     # keep awake for 2 hours, then exit
caffeinate -dimsu -w $$       # keep awake until this shell exits
```

Flags: `-d` display, `-i` idle, `-m` disk, `-s` system (AC only), `-u` user-active assertion.
