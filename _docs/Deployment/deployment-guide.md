# TrueSpend — Deployment & E2E Test Guide

End-to-end deployment runbook: mobile to TestFlight (Expo/EAS), .NET service + worker to Azure
Container Apps (public ingress + custom domain), Supabase Postgres migrations/seeds, Terraform IaC,
Key Vault for all secrets, and a phased E2E test plan (auth → cards → Plaid; Foursquare and Stripe
deferred to last).

> **Topology B (MVP).** No App Gateway / WAF / VNet. The API Container App is reached directly over a
> public ingress bound to the custom domain `api.truespend.<env>` with your TLS cert. Auth is enforced
> in-app (Supabase JWT; webhooks verify provider signatures), not at a network edge. An edge WAF can be
> added later (e.g. Cloudflare in front, or App Gateway) without changing the app.

This guide is the source of truth for the IaC and pipeline definitions. The HCL/YAML blocks below are
extracted into [`terraform/`](../../terraform/) (see its [README](../../terraform/README.md)) and
[`.github/workflows/`](../../.github/workflows/) — per-component CI/CD: `ci-ui` / `ci-service` / `ci-worker`
(auto on push to master, path-filtered) each gate a matching `cd-ui` / `cd-service` / `cd-worker`, plus
`terraform.yml` and `supabase-migrate.yml` (both manual `workflow_dispatch`). `cd-service` / `cd-worker`
auto-run on their CI's success (`workflow_run`); **`cd-ui` is manual** (EAS cloud builds cost credits). The
IaC pipeline has separate plan/apply checkboxes. Keep those files and these blocks in sync when either changes.

## 1. Topology

| Component | Runtime | Source | Notes |
|---|---|---|---|
| Mobile app | iOS (TestFlight), Android later | `ui-mobile/` (Expo + EAS) | bundle id `com.truespend.mobile`, scheme `truespend` |
| API service | Azure Container App `truespend-api` | `docker/truespend.api.Dockerfile` (target `production`, port 8080) | **public ingress** on the custom domain `api.truespend.<env>` (TLS cert bound to the app) |
| Worker service | Azure Container App `truespend-worker` | `docker/truespend.workerservice.Dockerfile` (target `production`) | cron jobs, no ingress |
| Event consumer | **dormant in MVP** | `docker/truespend.eventconsumer.Dockerfile` | async→inline conversion ([sync-execution-conversion.md](../Refactors/sync-execution-conversion.md)); not deployed |
| Database + Auth | Supabase (managed Postgres) | `supabase/` | Auth providers (Apple/Google/email OTP), RLS policies, storage |
| Secrets | Azure Key Vault | this guide | app secrets, consumed via managed identity (the custom-domain TLS cert is bound to the app, not via KV) |

The Container Apps Environment is **public** (external). The API ingress is the single front door; Stripe and
Plaid webhooks arrive directly at the custom domain over HTTPS. The worker has no ingress.

```text
  iOS device          ┌──────────────────────────────────────────────────────────────┐
  (TestFlight) ─HTTPS──▶  ┌─────────────┐      ┌──────────────┐  cron                  │
   Stripe/Plaid ─HTTPS───▶│ truespend-  │      │ truespend-   │ (AI/Plaid/RC)          │
   webhooks            │  │ api (CA,    │      │ worker (CA)  │                        │
       │               │  │ public      │      └──────┬───────┘                        │
       │ Supabase      │  │ :8080,      │             │      ┌────────┐ ┌─────────┐    │
       │ Auth SDK      │  │ custom dom.)│             │      │  ACR   │ │  Log    │    │
       ▼               │  └──────┬──────┘             │      │(images)│ │Analytics│    │
  ┌──────────┐         │  ┌──────┴──────┐             │      └────────┘ └─────────┘    │
  │ Supabase │◀────────│  │  Key Vault  │◀────────────┘  app secrets via managed id    │
  │ Postgres │         │  │ (managed id)│                                              │
  │ + Auth   │         │  └─────────────┘            Azure resource group              │
  └──────────┘         └──────────────────────────────────────────────────────────────┘
                        External providers: Stripe · Plaid · Resend · Azure OpenAI · Foursquare(later)
```

## 2. Environments

| Env | Supabase project | Azure RG | Mobile EAS profile / channel | Plaid env | Stripe |
|---|---|---|---|---|---|
| dev | `truespend-dev` | `rg-truespend-dev` | `development` | sandbox | test |
| staging | `truespend-staging` | `rg-truespend-staging` | `staging` | sandbox | test |
| prod | `truespend-prod` | `rg-truespend-prod` | `production` | production | live |

TestFlight is fed by the **production** EAS profile (or `staging` for internal builds). One Azure Key Vault
per environment. Resource naming: `<kind>-truespend-<env>` (e.g. `kv-truespend-dev`, `ca-truespend-api-dev`).
Public API entry per env is the API Container App's custom domain `api.truespend.<env>` (prod: `api.truespend.app`).

## 3. Secrets, certs & API keys — full inventory

For **how to create each external account and obtain these values**, see the companion
[external-setup-guide.md](external-setup-guide.md). This section is the inventory + destinations.

Legend: **S** = secret (must be in Key Vault, never committed) · **C** = cert/key file · **P** = publishable/non-secret config.

**GitHub secrets vs Key Vault — split by consumer (not "KV for everything"):**

| Bucket | Lives in | Read by | Examples |
|---|---|---|---|
| App runtime secrets | per-env `kv-truespend-<env>` | the **Container App at runtime** via managed identity (`key_vault_secret_id` ref; plain env vars, no KV SDK) — **CI never reads these** | every **S**-row in §3a (`Plaid--Secret`, `Stripe--SecretKey`, `Supabase--JwtKeys`, `ConnectionStrings--TrueSpendDb`, …) |
| CI/bootstrap secrets | GitHub Actions secrets | the **pipeline** (to auth + build/migrate) | §3d (`AZURE_CREDENTIALS`/OIDC, `ACR_NAME`, `SUPABASE_DB_URL`, `EXPO_TOKEN`, `ASC_API_KEY_*`) |
| Master archive | `kv-truespend-shared` (external-setup §2.3a) | nothing at runtime — seeds the per-env vault at deploy | all `.p8`/PFX + collected secrets |

The pipeline does **not** pull app secrets from KV — the Container App resolves them itself. The only near-duplicate is the DB connection: app reads `ConnectionStrings--TrueSpendDb` (KV); the migration job reads `SUPABASE_DB_URL` (GitHub) — different consumers.

### 3a. Backend (.NET) — bound config sections

| Config key (`__` = nesting) | Type | Used by | Key Vault secret name | Where it comes from |
|---|---|---|---|---|
| `ConnectionStrings__TrueSpendDb` | S | api + worker | `ConnectionStrings--TrueSpendDb` | Supabase → Project Settings → Database (pooler, port 6543) |
| `Supabase__JwtIssuer` | P | api | `Supabase--JwtIssuer` | `https://<ref>.supabase.co/auth/v1` |
| `Supabase__JwtAudience` | P | api | — (static `authenticated`) | constant |
| `Supabase__JwtSecret` | S | api | `Supabase--JwtSecret` | Supabase → Auth → JWT settings → JWT Secret |
| `SupabaseStorage__Url` | P | api | `SupabaseStorage--Url` | `https://<ref>.supabase.co` |
| `SupabaseStorage__ServiceRoleKey` | S | api | `SupabaseStorage--ServiceRoleKey` | Supabase → API → `service_role` key (also used by admin/account-deletion) |
| `SupabaseStorage__PublicBaseUrl` | P | api | `SupabaseStorage--PublicBaseUrl` | storage public base |
| `Stripe__SecretKey` | S | api | `Stripe--SecretKey` | Stripe → Developers → API keys |
| `Stripe__PublishableKey` | P | api | `Stripe--PublishableKey` | Stripe (publishable) |
| `Stripe__WebhookSecret` | S | api | `Stripe--WebhookSecret` | Stripe → Webhooks → signing secret |
| `Plaid__ClientId` | S | api + worker | `Plaid--ClientId` | Plaid dashboard |
| `Plaid__Secret` | S | api + worker | `Plaid--Secret` | Plaid dashboard (per-env: sandbox/production) |
| `Plaid__Environment` | P | api + worker | — | `sandbox` / `production` |
| `Resend__ApiKey` | S | api | `Resend--ApiKey` | Resend dashboard |
| `Resend__FromAddress` | P | api | — | verified sender |
| `AzureOpenAI__Endpoint` | P | worker | `AzureOpenAI--Endpoint` | Azure OpenAI resource |
| `AzureOpenAI__ApiKey` | S | worker | `AzureOpenAI--ApiKey` | Azure OpenAI → Keys |
| `AzureOpenAI__DeploymentName` | P | worker | — | deployment name |
| `RewardsCc__BaseUrl` | P | worker | — | RapidAPI endpoint |
| `RewardsCc__ApiKey` | S | worker | `RewardsCc--ApiKey` | RapidAPI key |
| `RewardsCc__Host` | P | worker | — | RapidAPI host header |
| `Foursquare__WebhookSecret` | S (deferred) | api | `Foursquare--WebhookSecret` | set when geo is enabled |
| `ServiceBus__ConnectionString` | S (dormant) | eventconsumer | — | only if async re-enabled |
| TLS certificate (custom domain `api.truespend.<env>`) | C | API Container App | — (bound to the app) | bound to the Container App via `az containerapp hostname bind` (§4a); not stored in KV |

> Key Vault secret names can't contain `__`; use `--` and let the Container App map `--`→`__` when it
> projects the secret into an env var (see §6).

### 3b. Mobile (Expo) — `EXPO_PUBLIC_*` ship in the binary (NOT secret)

| Env var | Type | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | P | API custom domain, e.g. `https://api.truespend.<env>` (once bound; the raw `*.azurecontainerapps.io` FQDN also works) |
| `EXPO_PUBLIC_SUPABASE_URL` | P | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | P | anon key — publishable by design (RLS enforces access) |
| `EXPO_PUBLIC_PLAID_REDIRECT_URI` | P | must match Plaid allowed redirect URIs |
| `EXPO_PUBLIC_FOURSQUARE_API_KEY` | P (deferred) | blank until geo |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | P | from `eas init` |

Template: [ui-mobile/.env.example](../../ui-mobile/.env.example). Local `.env.*` are gitignored.

### 3c. Apple / iOS signing & push (certs) — managed by EAS

| Item | Type | Where | Used for |
|---|---|---|---|
| Apple Distribution certificate (`.p12`) | C/S | EAS-managed (recommended) or `credentials.json` | signing the IPA |
| Provisioning profile (`.mobileprovision`) | C | EAS-managed | app + entitlements |
| App Store Connect API key (`AuthKey_*.p8` + Key ID + Issuer ID) | C/S | App Store Connect → Users → Integrations | `eas submit` to TestFlight |
| APNs key (`.p8`) | C/S | Apple Developer → Keys | `expo-notifications` push |
| Apple Sign In key (`.p8`, Services ID, Team ID, Key ID) | C/S | **Supabase Auth** provider config | Sign in with Apple |
| Google OAuth client (Web client id + secret; iOS client id) | S | **Supabase Auth** provider config | Sign in with Google |

All `.p8`/`.p12`/`.mobileprovision`/`credentials.json` are gitignored (§ root `.gitignore`). Prefer EAS-managed
credentials so nothing signing-related lives in the repo.

### 3d. CI / automation secrets (store as GitHub Actions secrets or Azure DevOps variable groups)

| Secret | Used by pipeline |
|---|---|
| `AZURE_CREDENTIALS` (or OIDC: `ARM_CLIENT_ID`/`ARM_TENANT_ID`/`ARM_SUBSCRIPTION_ID`) | Terraform + Container App deploy |
| `ACR_NAME` | service deploy (image push) |
| `SUPABASE_DB_URL` (prod connection string) | supabase migrate pipeline |
| `EXPO_TOKEN` | EAS build/submit (`eas` CLI auth) |
| `ASC_API_KEY_*` (App Store Connect key id/issuer/.p8) | `eas submit` (or store in EAS) |

## 4. Azure infrastructure — Terraform IaC

Recommended layout:

```text
terraform/
├── backend.tf              # remote state in an Azure Storage account
├── providers.tf            # azurerm provider
├── variables.tf
├── main.tf                 # resources below
├── outputs.tf
└── envs/
    ├── dev.tfvars.example  # committed template (real *.tfvars are gitignored)
    ├── staging.tfvars.example
    └── prod.tfvars.example
```

Resources to provision per environment:

| Resource | Terraform type | Purpose |
|---|---|---|
| Resource group | `azurerm_resource_group` | container for env |
| Log Analytics workspace | `azurerm_log_analytics_workspace` | Container Apps logs |
| Container Registry | `azurerm_container_registry` | API + worker images |
| Key Vault | `azurerm_key_vault` | all backend secrets (RBAC mode) |
| User-assigned identity | `azurerm_user_assigned_identity` | shared by both Container Apps |
| Role: AcrPull | `azurerm_role_assignment` | identity pulls images from ACR |
| Role: Key Vault Secrets User | `azurerm_role_assignment` | identity reads KV secrets |
| Container Apps Environment | `azurerm_container_app_environment` | **public** (external), wired to Log Analytics |
| Container App (api) | `azurerm_container_app` | **public** ingress :8080; custom domain + cert bound out of band (§4a) |
| Container App (worker) | `azurerm_container_app` | no ingress |

KV secret values are **not** Terraform resources — they're seeded out of band (§5). Terraform creates only the
empty vault + RBAC.

Core `main.tf` (abbreviated — fill variables; secrets seeded once then managed out-of-band):

```hcl
resource "azurerm_resource_group" "rg" {
  name     = "rg-truespend-${var.env}"
  location = var.location
}

resource "azurerm_log_analytics_workspace" "law" {
  name                = "law-truespend-${var.env}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_container_registry" "acr" {
  name                = "acrtruespend${var.env}"   # globally unique, alphanumeric
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
}

resource "azurerm_user_assigned_identity" "app" {
  name                = "id-truespend-${var.env}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

resource "azurerm_key_vault" "kv" {
  name                       = "kv-truespend-${var.env}"
  resource_group_name        = azurerm_resource_group.rg.name
  location                   = azurerm_resource_group.rg.location
  tenant_id                  = var.tenant_id
  sku_name                   = "standard"
  enable_rbac_authorization  = true
  purge_protection_enabled   = true
}

resource "azurerm_role_assignment" "kv_read" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Public (external) Container Apps environment — no VNet injection, no internal LB.
resource "azurerm_container_app_environment" "cae" {
  name                       = "cae-truespend-${var.env}"
  resource_group_name        = azurerm_resource_group.rg.name
  location                   = azurerm_resource_group.rg.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.law.id
}

# Map of KV secret name -> env var name the app expects (-- becomes __)
locals {
  api_secrets = {
    "ConnectionStrings--TrueSpendDb"     = "ConnectionStrings__TrueSpendDb"
    "Supabase--JwtSecret"                = "Supabase__JwtSecret"
    "SupabaseStorage--ServiceRoleKey"    = "SupabaseStorage__ServiceRoleKey"
    "Stripe--SecretKey"                  = "Stripe__SecretKey"
    "Stripe--WebhookSecret"              = "Stripe__WebhookSecret"
    "Plaid--ClientId"                    = "Plaid__ClientId"
    "Plaid--Secret"                      = "Plaid__Secret"
    "Resend--ApiKey"                     = "Resend__ApiKey"
  }
  worker_secrets = {
    "ConnectionStrings--TrueSpendDb"     = "ConnectionStrings__TrueSpendDb"
    "Plaid--ClientId"                    = "Plaid__ClientId"
    "Plaid--Secret"                      = "Plaid__Secret"
    "AzureOpenAI--ApiKey"                = "AzureOpenAI__ApiKey"
    "RewardsCc--ApiKey"                  = "RewardsCc__ApiKey"
  }
}

resource "azurerm_container_app" "api" {
  name                         = "ca-truespend-api-${var.env}"
  resource_group_name          = azurerm_resource_group.rg.name
  container_app_environment_id = azurerm_container_app_environment.cae.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }
  registry {
    server   = azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.app.id
  }

  dynamic "secret" {
    for_each = local.api_secrets
    content {
      name                = lower(replace(secret.key, "--", "-"))   # ca secret name
      key_vault_secret_id = "${azurerm_key_vault.kv.vault_uri}secrets/${secret.key}"
      identity            = azurerm_user_assigned_identity.app.id
    }
  }

  ingress {
    # Public ingress — internet-facing. Requests are still authenticated in-app (Supabase JWT).
    # Bind the custom domain api.truespend.<env> + cert to this app out of band (§4a).
    external_enabled = true
    target_port      = 8080
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
    # liveness/readiness probes hit /health (§13) — see terraform/main.tf for the probe blocks.
  }

  template {
    container {
      name   = "api"
      image  = "${azurerm_container_registry.acr.login_server}/truespend-api:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"
      env { name = "ASPNETCORE_ENVIRONMENT"; value = "Production" }
      env { name = "ASPNETCORE_URLS";        value = "http://+:8080" }
      dynamic "env" {
        for_each = local.api_secrets
        content {
          name        = env.value                                   # e.g. Stripe__SecretKey
          secret_name = lower(replace(env.key, "--", "-"))
        }
      }
    }
  }
}
# worker Container App mirrors the above with no ingress, worker_secrets, and
# env DOTNET_ENVIRONMENT=Production.
```

State backend (`backend.tf`) — never store state locally for shared envs; it contains secret values:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-truespend-tfstate"
    storage_account_name = "sttruespendtfstate"
    container_name       = "tfstate"
    key                  = "truespend.tfstate"
  }
}
```

`envs/prod.tfvars.example` (committed; copy to `prod.tfvars`, which is gitignored):

```hcl
env             = "prod"
location        = "eastus"
tenant_id       = "00000000-0000-0000-0000-000000000000"
subscription_id = "00000000-0000-0000-0000-000000000000"
image_tag       = "latest"
```

### 4a. Custom domain + TLS on the API Container App

There is no App Gateway. The API Container App's public ingress serves `api.truespend.<env>` directly. Bind the
custom domain + your existing TLS cert to the app **out of band** — Container Apps custom-domain binding requires
DNS ownership validation to pass first, so it isn't a Terraform resource:

```bash
APP=ca-truespend-api-<env>; RG=rg-truespend-<env>; DOMAIN=api.truespend.<env>
# 1. CNAME $DOMAIN -> the app's public FQDN (terraform output api_public_fqdn), and add the
#    asuid.<domain> TXT validation value that the next command reports. Then:
az containerapp hostname add  -n $APP -g $RG --hostname $DOMAIN
az containerapp hostname bind -n $APP -g $RG --hostname $DOMAIN \
  --certificate-file ./api-truespend.pfx --password '<pfx-password>'
```

The mobile `EXPO_PUBLIC_API_BASE_URL` and the Stripe/Plaid webhook URLs point at `https://api.truespend.<env>`
once bound (the raw `*.azurecontainerapps.io` FQDN also works before the domain is attached). No edge WAF in
MVP — put Cloudflare in front of the ingress, or reintroduce an App Gateway, later if you want one.

## 5. Key Vault — secret seeding & rotation

1. Terraform creates the empty vault + identity + RBAC. It does **not** hold secret values in code.
2. Seed secrets once (CLI), then rotate in-place; Container Apps pick up new values on next revision:

```bash
KV=kv-truespend-prod
az keyvault secret set --vault-name $KV --name "Stripe--SecretKey"       --value "sk_live_xxx"
az keyvault secret set --vault-name $KV --name "Supabase--JwtSecret"     --value "xxx"
az keyvault secret set --vault-name $KV --name "ConnectionStrings--TrueSpendDb" --value "Host=...;Password=...;"
# ...repeat for every S-row in §3a present for that app.
```

3. The app reads them as plain env vars (`Stripe__SecretKey` etc.) — **no Key Vault SDK code change needed**;
   the Container App's `secret` + `env.secret_name` mapping does the projection. `.NET` binds `Section__Key`
   automatically.
4. **Custom-domain TLS cert** — not a Key Vault item. The `api.truespend.<env>` cert is bound directly to the
   API Container App via `az containerapp hostname bind` (§4a); rotate by re-binding a new cert.

## 6. Service deployment pipeline (GitHub Actions)

Per-component and path-filtered. `ci-service` / `ci-worker` build + test the solution and push the image to
ACR on a push to master that touches their paths; each gates a `cd-*` that rolls the matching Container App to
the exact `:<sha>` CI built. Shared `truespend.domain` is in both path filters, so a domain change triggers
both. Both CDs also accept manual `workflow_dispatch` (which deploys `:latest`).

`ci-service.yml` (`ci-worker.yml` is identical with worker paths / image / Dockerfile):

```yaml
name: ci-service
on:
  push:
    branches: [master]
    paths: ["service/truespend.api/**", "service/truespend.domain/**", "service/TrueSpend.sln", "docker/truespend.api.Dockerfile"]
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    env: { ACR: ${{ secrets.ACR_NAME }}, TAG: ${{ github.sha }} }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: "9.0.x" }
      - run: dotnet test service/TrueSpend.sln -c Release
      - uses: azure/login@v2
        with: { creds: ${{ secrets.AZURE_CREDENTIALS }} }
      - run: az acr login --name "$ACR"
      - name: Build & push API (tagged :<sha> and :latest)
        run: |
          docker build -f docker/truespend.api.Dockerfile --target production \
            -t "$ACR.azurecr.io/truespend-api:$TAG" -t "$ACR.azurecr.io/truespend-api:latest" service
          docker push "$ACR.azurecr.io/truespend-api:$TAG"
          docker push "$ACR.azurecr.io/truespend-api:latest"
```

`cd-service.yml` (`cd-worker.yml` identical with worker app / image):

```yaml
name: cd-service
on:
  workflow_run: { workflows: ["ci-service"], types: [completed], branches: [master] }
  workflow_dispatch:
jobs:
  deploy:
    if: ${{ github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    environment: prod   # add required reviewers here to gate the prod roll
    env: { ACR: ${{ secrets.ACR_NAME }}, TAG: ${{ github.event.workflow_run.head_sha || 'latest' }} }
    steps:
      - uses: azure/login@v2
        with: { creds: ${{ secrets.AZURE_CREDENTIALS }} }
      - run: |
          az containerapp update -n ca-truespend-api-prod -g rg-truespend-prod \
            --image "$ACR.azurecr.io/truespend-api:$TAG"
```

> Build context is `service/` (matches `docker-compose.prod.yml`); both images share the solution and the
> target stage selects the entrypoint. Because each `ci-*` is path-filtered, the `workflow_run`-triggered
> `cd-*` inherits path-scoping — `cd-service` only fires when the API (or shared domain) actually changed.

## 7. Supabase deployment pipeline (migrations + seeds)

The schema lives as **schema-named** SQL (`_init`, `lookup`, …, `app`) + RLS policies + seeds, orchestrated by
[supabase/run-all.sql](../../supabase/run-all.sql). It is **idempotent** (`CREATE … IF NOT EXISTS`,
`INSERT … ON CONFLICT DO NOTHING`), so re-running on an existing DB is safe. This is NOT the Supabase-CLI
timestamped-migration system; deploy with `psql`, not `supabase db push`.

`.github/workflows/supabase-migrate.yml`:

```yaml
name: supabase-migrate
on:
  workflow_dispatch:   # manual trigger only
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install psql
        run: sudo apt-get update && sudo apt-get install -y postgresql-client
      - name: Apply migrations + policies + seeds
        env: { DB_URL: ${{ secrets.SUPABASE_DB_URL }} }
        run: |
          psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/run-all.sql
```

- Use the **direct** connection (port 5432) for DDL migrations, not the transaction pooler.
- `SUPABASE_DB_URL` = `postgresql://postgres:<db-password>@db.<ref>.supabase.co:5432/postgres`.
- Auth providers (Apple/Google/email OTP) and SMTP are **dashboard/`config.toml` configuration**, not part of
  `run-all.sql` — configure them in the Supabase dashboard per §9.

## 8. Mobile pipeline — CI (auto) + EAS build → TestFlight (manual)

Prereqs (one-time): `npm i -g eas-cli`, `eas login`, `eas init` (writes `EXPO_PUBLIC_EAS_PROJECT_ID`),
`eas credentials` (let EAS manage the distribution cert + provisioning profile), and add the App Store Connect
API key to EAS (`eas credentials` → iOS → App Store Connect API Key) so `eas submit` is non-interactive. Set
`cli.appVersionSource: remote` in eas.json (with `autoIncrement: true` on the production profile) so the build
number increments on EAS's servers — required because the dynamic `app.config.ts` can't be auto-written.

`ci-ui.yml` runs lint + typecheck + tests on every UI commit (auto, path-filtered `ui-mobile/**`).
`cd-ui.yml` is **manual** (`workflow_dispatch`) — EAS cloud builds consume credits, so it's not auto-triggered:

```yaml
name: cd-ui
on:
  workflow_dispatch:   # manual trigger only
jobs:
  build-submit:
    runs-on: ubuntu-latest
    environment: prod
    defaults: { run: { working-directory: ui-mobile } }
    env: { EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }} }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with: { eas-version: latest, token: ${{ secrets.EXPO_TOKEN }} }
      - name: Build iOS (production)
        run: eas build --platform ios --profile production --non-interactive --wait
      - name: Submit to TestFlight
        run: eas submit --platform ios --profile production --latest --non-interactive
```

- The `production` profile in [eas.json](../../ui-mobile/eas.json) sets `APP_ENV=production`; ensure the
  matching `EXPO_PUBLIC_*` values are set as **EAS environment variables** (or `.env.production`) so the build
  embeds the prod API/Supabase URLs.
- `submit.production` in `eas.json` can hold `appleId`/`ascAppId`/`appleTeamId` to avoid prompts.
- Plaid Link: the `react-native-plaid-link-sdk` plugin is currently disabled in `app.config.ts` (prebuild
  issue). **Re-enable it before the Plaid E2E phase** (§10 Phase 4) — uncomment the plugin and bump/patch the
  SDK, then rebuild.

## 9. Supabase Auth provider setup (for the auth E2E phase)

| Provider | What to configure (Supabase → Authentication → Providers) |
|---|---|
| Email OTP | Enable Email + "Email OTP"; set SMTP (Resend SMTP works) so OTP emails deliver; set redirect URLs |
| Apple | Enable; add Services ID, Team ID, Key ID, and the `.p8` private key; add `truespend://` + universal-link redirect |
| Google | Enable; add Web client id + secret (Supabase callback) and the iOS client id; configure consent screen |

Add the app's deep-link/redirect URLs to Supabase Auth → URL Configuration:
`truespend://` and any universal link host. These let Apple/Google callbacks and email magic/OTP links return
into the app.

## 10. E2E test plan (phased)

Run top-to-bottom. **Foursquare/geo is skipped** (awaiting SDK). **Stripe subscription is the last phase.**
Each phase lists preconditions, steps, and the pass criteria. Use a Plaid **sandbox** item and Stripe **test**
mode throughout TestFlight validation.

### Phase 0 — Environment ready
- Supabase migrate pipeline green (`run-all.sql` applied; seeds present: plans, features, plan_features, lookups).
- `truespend-api` + `truespend-worker` revisions healthy; API `/health` (or root) reachable over HTTPS.
- Key Vault secrets seeded for the env; Container Apps resolving them (no boot crash in logs).
- TestFlight build installed on a physical device; `EXPO_PUBLIC_API_BASE_URL` points at the deployed API.

### Phase 1 — Authentication (Apple, Google, Email OTP)
| Step | Verify |
|---|---|
| Sign in with **Email OTP** | OTP email arrives (Resend/SMTP); code exchanges for a Supabase session; app reaches authenticated shell |
| Sign in with **Apple** | Apple sheet completes; Supabase returns session; first-time creates the user; returning recognizes it |
| Sign in with **Google** | Google consent completes; session returned; account links to same email if applicable |
| Token use | API calls carry the Supabase JWT; server validates against `Supabase__JwtSecret`; `GET /auth bootstrap` returns profile/entitlements |
| Sign out / back in | Session clears; re-auth works |

Pass: all three methods yield an authenticated session and a successful auth-bootstrap from the API.

### Phase 2 — Onboarding, profile, preferences (Free path, no Stripe yet)
- Complete onboarding choosing the **Free** plan (no Stripe checkout — entitlements default to Free server-side).
- Verify profile edit, preferences (theme/locale), notification settings persist (round-trip via API).
- Verify entitlements: Free baseline (1 manual card, no Plaid, AI insights locked) reflected in UI gating.

### Phase 3 — Cards (manual + catalog + reward overrides)
- Add a **manual** card; hit the Free `manual_card_limit` (1) → upgrade CTA appears.
- Browse the card catalog; open card detail; reward rules render; add/edit/remove a **reward override**
  (CardDetailScreen) and confirm it round-trips via `/cards/{id}/reward-overrides`.
- Confirm card limits + gating behave per plan.

### Phase 4 — Plaid (link → transactions → recommendations → resync quota)
> Re-enable the Plaid Link SDK plugin (§8) and rebuild before this phase.
- **Link** a sandbox institution (e.g. `user_good` / `pass_good`); connection appears under Plaid connections.
- Transactions import (nightly worker job or manual sync); they show in the transactions list.
- Home recommendation + runner-ups render from linked-card data.
- `plaid_transactions_view_enabled` gating: Basic+ sees plaid rows; lower tier filtered (server 404s detail).
- **Manual resync quota** (Pro): trigger `POST /plaid/connections/sync`; remaining count decrements; exceeding
  the daily limit (default 5) returns the limit-reached/upgrade response.

### Phase 5 — Foursquare / geo — **SKIPPED**
Deferred until the Foursquare Movement SDK is available. `EXPO_PUBLIC_FOURSQUARE_API_KEY` and
`Foursquare__WebhookSecret` stay unset; geofencing is on for all tiers but no arrivals fire without the SDK.

### Phase 6 — Stripe subscription (LAST)
| Step | Verify |
|---|---|
| Start checkout for **Basic/Pro** | Stripe Checkout opens (test mode); complete with a test card (`4242…`) |
| Return deep link | App returns via `truespend://app/...?checkout=success` |
| Webhook | Stripe → `POST /webhooks/stripe`; signature validates (`Stripe__WebhookSecret`); subscription row written |
| Entitlement refresh | App refreshes entitlements on foreground; plan upgrades; gated features unlock; TrialBanner shows during trial |
| Billing portal | Manage subscription opens portal; cancel → entitlements drop to Free baseline after period/grace |

Pass: paid plan unlocks the right features end-to-end, trial countdown shows, and cancel reverts entitlements.

## 11. First-time deploy order

1. `terraform apply` (per env, two-phase per §5/terraform README) → RG, ACR, KV, identity, public Container
   Apps Env, two Container Apps, Log Analytics. Seed KV secrets between the partial and full apply.
2. Bind the custom domain + cert to the API app: `az containerapp hostname add` / `bind` (§4a). Point a CNAME
   for `api.truespend.<env>` at the `api_public_fqdn` output and add the asuid TXT; verify HTTPS reaches the API.
3. Run the **supabase-migrate** pipeline → schema + policies + seeds.
4. Configure Supabase Auth providers + SMTP + redirect URLs (§9).
5. Push service/worker changes (or manually dispatch **ci-service** / **ci-worker**) → image to ACR; on CI
   success **cd-service** / **cd-worker** roll the Container Apps to the new revision.
6. Set EAS env vars (`EXPO_PUBLIC_API_BASE_URL=https://api.truespend.<env>`); run **cd-ui** (manual) →
   build + submit; accept in TestFlight.
7. Point Stripe + Plaid webhook URLs at `https://api.truespend.<env>/api/v1/webhooks/...`.
8. Execute the E2E plan (§10) Phases 0→4, defer 5, finish with 6.

## 12. Rollback

| Layer | Rollback |
|---|---|
| Container App | `az containerapp revision set-active` to the previous healthy revision (or redeploy prior image tag) |
| Supabase | Migrations are forward-only + idempotent; keep a pre-deploy DB backup/PITR; restore on a bad migration |
| Mobile | Promote the prior TestFlight build; EAS Update channel rollback for JS-only changes |
| Secrets | Key Vault keeps prior secret versions; restore a version if a rotation breaks auth |

## 13. Open items before production

- Re-enable `react-native-plaid-link-sdk` in `app.config.ts` (prebuild fix) ahead of Phase 4.
- Bind + renew the `api.truespend.<env>` TLS cert on the API Container App (`az containerapp hostname bind`, §4a).
- Consider an edge WAF before heavy public traffic — Cloudflare in front of the ingress, or reintroduce an App
  Gateway. MVP relies on in-app auth (Supabase JWT) + provider signature verification on webhooks.
- Foursquare + Stripe live keys provisioned only when their phases begin.
