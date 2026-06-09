# TrueSpend — Deployment & E2E Test Guide

End-to-end deployment runbook: mobile to TestFlight (Expo/EAS), .NET service + worker to Azure
Container Apps, Supabase Postgres migrations/seeds, Terraform IaC, Key Vault for all secrets, and a
phased E2E test plan (auth → cards → Plaid; Foursquare and Stripe deferred to last).

This guide is the source of truth for the IaC and pipeline definitions. The HCL/YAML blocks below are
ready to extract into `terraform/` and `.github/workflows/`. Ask before scaffolding if not already done.

## 1. Topology

| Component | Runtime | Source | Notes |
|---|---|---|---|
| Mobile app | iOS (TestFlight), Android later | `ui-mobile/` (Expo + EAS) | bundle id `com.truespend.mobile`, scheme `truespend` |
| **Application Gateway (WAF v2)** | Azure App Gateway | this guide (Terraform) | **public HTTPS ingress**; TLS termination with a Key Vault cert; WAF in Prevention mode; routes to the API |
| API service | Azure Container App `truespend-api` | `docker/truespend.api.Dockerfile` (target `production`, port 8080) | **internal ingress only** (VNet) — reachable solely through App Gateway |
| Worker service | Azure Container App `truespend-worker` | `docker/truespend.workerservice.Dockerfile` (target `production`) | cron jobs, no ingress |
| Event consumer | **dormant in MVP** | `docker/truespend.eventconsumer.Dockerfile` | async→inline conversion ([sync-execution-conversion.md](../Refactors/sync-execution-conversion.md)); not deployed |
| Database + Auth | Supabase (managed Postgres) | `supabase/` | Auth providers (Apple/Google/email OTP), RLS policies, storage |
| Secrets | Azure Key Vault | this guide | app secrets + the App Gateway TLS cert; consumed via managed identity |

The Container Apps Environment is **internal** (VNet-integrated, internal load balancer). Only Application
Gateway is public; it is the single front door for the API and the only component holding a public IP. Stripe
and Plaid webhooks therefore arrive **through** App Gateway (custom-domain HTTPS), not the container directly.

```text
                     ┌────────────────────────────── Azure VNet ──────────────────────────────┐
  iOS device         │  ┌──────────────┐     ┌─────────────┐    ┌──────────────┐               │
  (TestFlight) ─HTTPS─▶ │ App Gateway  │ ───▶ │ truespend-  │    │ truespend-   │  cron          │
   Stripe/Plaid ─────────▶ (WAF v2,    │ int. │ api (CA,    │    │ worker (CA)  │ (AI/Plaid/RC)  │
   webhooks          │  │  public IP,  │  LB  │ internal    │    └──────┬───────┘               │
       │             │  │  TLS from KV)│     │  :8080)      │           │                        │
       │ Supabase    │  └──────────────┘     └──────┬──────┘           │   ┌────────┐ ┌────────┐ │
       │ Auth SDK    │         ▲                    │                  │   │  ACR   │ │  Log   │ │
       ▼             │  ┌──────┴──────┐             │                  │   │(images)│ │Analytics│ │
  ┌──────────┐       │  │  Key Vault  │◀────────────┴──────────────────┘   └────────┘ └────────┘ │
  │ Supabase │◀─────────┤ (managed id)│  app secrets + TLS cert                                  │
  │ Postgres │       │  └─────────────┘                                                          │
  │ + Auth   │       └───────────────────────────────────────────────────────────────────────────┘
  └──────────┘        External providers: Stripe · Plaid · Resend · Azure OpenAI · Foursquare(later)
```

## 2. Environments

| Env | Supabase project | Azure RG | Mobile EAS profile / channel | Plaid env | Stripe |
|---|---|---|---|---|---|
| dev | `truespend-dev` | `rg-truespend-dev` | `development` | sandbox | test |
| staging | `truespend-staging` | `rg-truespend-staging` | `staging` | sandbox | test |
| prod | `truespend-prod` | `rg-truespend-prod` | `production` | production | live |

TestFlight is fed by the **production** EAS profile (or `staging` for internal builds). One Azure Key Vault
per environment. Resource naming: `<kind>-truespend-<env>` (e.g. `kv-truespend-dev`, `ca-truespend-api-dev`).
Public API entry per env is the App Gateway custom domain `api.truespend.<env>` (prod: `api.truespend.app`).

## 3. Secrets, certs & API keys — full inventory

For **how to create each external account and obtain these values**, see the companion
[external-setup-guide.md](external-setup-guide.md). This section is the inventory + destinations.

Legend: **S** = secret (must be in Key Vault, never committed) · **C** = cert/key file · **P** = publishable/non-secret config.

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
| TLS certificate (custom domain `api.truespend.<env>`) | C | App Gateway | `agw-tls-cert` (KV certificate) | imported/managed cert; App Gateway reads it via its managed identity |

> Key Vault secret names can't contain `__`; use `--` and let the Container App map `--`→`__` when it
> projects the secret into an env var (see §6).

### 3b. Mobile (Expo) — `EXPO_PUBLIC_*` ship in the binary (NOT secret)

| Env var | Type | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | P | App Gateway custom domain, e.g. `https://api.truespend.<env>` (not the container FQDN) |
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
| Role: AcrPull | `azurerm_role_assignment` | identity pulls from ACR |
| Role: Key Vault Secrets User | `azurerm_role_assignment` | identity reads KV secrets + TLS cert |
| Role: AcrPull | `azurerm_role_assignment` | identity pulls images |
| Virtual network + 2 subnets | `azurerm_virtual_network`, `azurerm_subnet` | env infrastructure subnet (≥/23) + App Gateway subnet |
| Container Apps Environment | `azurerm_container_app_environment` | **internal** LB, VNet-integrated, wired to Log Analytics |
| Private DNS zone + record + link | `azurerm_private_dns_zone` (+ `a_record`, `virtual_network_link`) | resolve the internal env domain so App Gateway can reach the API |
| Container App (api) | `azurerm_container_app` | **internal** ingress :8080 (VNet only) |
| Container App (worker) | `azurerm_container_app` | no ingress |
| Public IP | `azurerm_public_ip` | App Gateway frontend (Standard, static) |
| WAF policy | `azurerm_web_application_firewall_policy` | OWASP 3.2, Prevention mode |
| Application Gateway | `azurerm_application_gateway` | WAF_v2; TLS from Key Vault; routes → API |
| Key Vault secrets | `azurerm_key_vault_secret` | one per §3a secret |

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

# ── Networking: VNet with a subnet for the Container Apps env and one for App Gateway ──
resource "azurerm_virtual_network" "vnet" {
  name                = "vnet-truespend-${var.env}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  address_space       = ["10.20.0.0/16"]
}
resource "azurerm_subnet" "cae" {            # Container Apps infrastructure subnet (min /23)
  name                 = "snet-cae"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.20.0.0/23"]
}
resource "azurerm_subnet" "agw" {            # App Gateway dedicated subnet (no other resources)
  name                 = "snet-agw"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.20.2.0/24"]
}

resource "azurerm_container_app_environment" "cae" {
  name                           = "cae-truespend-${var.env}"
  resource_group_name            = azurerm_resource_group.rg.name
  location                       = azurerm_resource_group.rg.location
  log_analytics_workspace_id     = azurerm_log_analytics_workspace.law.id
  infrastructure_subnet_id       = azurerm_subnet.cae.id
  internal_load_balancer_enabled = true        # no public ingress — App Gateway is the front door
}

# Private DNS so App Gateway (in the VNet) resolves the internal env's default domain to its static IP.
resource "azurerm_private_dns_zone" "cae" {
  name                = azurerm_container_app_environment.cae.default_domain
  resource_group_name = azurerm_resource_group.rg.name
}
resource "azurerm_private_dns_a_record" "cae_wildcard" {
  name                = "*"
  zone_name           = azurerm_private_dns_zone.cae.name
  resource_group_name = azurerm_resource_group.rg.name
  ttl                 = 300
  records             = [azurerm_container_app_environment.cae.static_ip_address]
}
resource "azurerm_private_dns_zone_virtual_network_link" "cae" {
  name                  = "cae-link"
  resource_group_name   = azurerm_resource_group.rg.name
  private_dns_zone_name  = azurerm_private_dns_zone.cae.name
  virtual_network_id    = azurerm_virtual_network.vnet.id
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
    # On an INTERNAL Container Apps env, external_enabled=true exposes the app on the
    # internal load balancer only (VNet-reachable) — App Gateway is the sole public entry.
    external_enabled = true
    target_port      = 8080
    traffic_weight { latest_revision = true; percentage = 100 }
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
env                   = "prod"
location              = "eastus"
tenant_id             = "00000000-0000-0000-0000-000000000000"
subscription_id       = "00000000-0000-0000-0000-000000000000"
image_tag             = "latest"
# KV certificate secret id for the App Gateway TLS cert (see §4a / §5)
agw_tls_kv_secret_id  = "https://kv-truespend-prod.vault.azure.net/secrets/agw-tls-cert"
```

### 4a. Application Gateway (WAF v2) — public ingress + TLS from Key Vault

App Gateway is the only public component. It terminates TLS (cert from Key Vault), runs the OWASP WAF in
Prevention mode, and forwards to the API container app over the internal load balancer. Add the
`agw_tls_kv_secret_id` variable to `variables.tf`; the API container app's ingress must already be internal (§4).

```hcl
# Public frontend IP for the gateway.
resource "azurerm_public_ip" "agw" {
  name                = "pip-truespend-agw-${var.env}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  allocation_method   = "Static"
  sku                 = "Standard"
}

# OWASP WAF policy, blocking mode.
resource "azurerm_web_application_firewall_policy" "agw" {
  name                = "waf-truespend-${var.env}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  policy_settings { enabled = true, mode = "Prevention" }
  managed_rules {
    managed_rule_set { type = "OWASP", version = "3.2" }
  }
}

# The gateway reads its TLS cert from Key Vault via the shared user-assigned identity.
# (KV certs are exposed as secrets, so "Key Vault Secrets User" covers cert read.)
resource "azurerm_role_assignment" "agw_kv_cert" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

resource "azurerm_application_gateway" "agw" {
  name                = "agw-truespend-${var.env}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location

  sku { name = "WAF_v2", tier = "WAF_v2", capacity = 2 }
  firewall_policy_id                = azurerm_web_application_firewall_policy.agw.id
  force_firewall_policy_association = true

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  gateway_ip_configuration { name = "gwip", subnet_id = azurerm_subnet.agw.id }

  frontend_ip_configuration { name = "feip", public_ip_address_id = azurerm_public_ip.agw.id }
  frontend_port             { name = "https", port = 443 }

  # TLS cert sourced from Key Vault (the KV certificate's secret id).
  ssl_certificate {
    name                = "api-tls"
    key_vault_secret_id = var.agw_tls_kv_secret_id
  }

  # Backend = the API container app's internal FQDN (resolved via the private DNS zone, §4).
  backend_address_pool {
    name  = "api-pool"
    fqdns = [azurerm_container_app.api.ingress[0].fqdn]
  }

  backend_http_settings {
    name                                = "api-https"
    cookie_based_affinity               = "Disabled"
    port                                = 443
    protocol                            = "Https"
    pick_host_name_from_backend_address = true     # SNI/Host = the app FQDN
    request_timeout                     = 30
    probe_name                          = "api-probe"
  }

  probe {
    name                                      = "api-probe"
    protocol                                  = "Https"
    path                                      = "/health"     # wire a probe endpoint (§13)
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true
    match { status_code = ["200-399"] }
  }

  http_listener {
    name                           = "https-listener"
    frontend_ip_configuration_name = "feip"
    frontend_port_name             = "https"
    protocol                       = "Https"
    ssl_certificate_name           = "api-tls"
  }

  request_routing_rule {
    name                       = "api-rule"
    rule_type                  = "Basic"
    priority                   = 100
    http_listener_name         = "https-listener"
    backend_address_pool_name  = "api-pool"
    backend_http_settings_name = "api-https"
  }
}

output "agw_public_ip" { value = azurerm_public_ip.agw.ip_address }
```

DNS: create an A record `api.truespend.<env>` → `azurerm_public_ip.agw.ip_address`, and issue the TLS cert for
that hostname (upload/managed in Key Vault as `agw-tls-cert`). The mobile `EXPO_PUBLIC_API_BASE_URL` and the
Stripe/Plaid webhook URLs all point at `https://api.truespend.<env>` (the gateway), never the container FQDN.

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
4. **App Gateway TLS cert** — import the `api.truespend.<env>` certificate into Key Vault as a *certificate*
   named `agw-tls-cert` (not a plain secret); the gateway reads it via the shared identity (`agw_kv_cert` role).
   Rotation is in-place — App Gateway auto-refreshes from the latest KV certificate version.

```bash
az keyvault certificate import --vault-name $KV --name "agw-tls-cert" --file api-truespend.pfx
# managed cert alternative: az keyvault certificate create with a DigiCert/issuer policy.
```

## 6. Service deployment pipeline (GitHub Actions)

`.github/workflows/service-deploy.yml` — build/test → build & push both images → roll Container Apps:

```yaml
name: service-deploy
on:
  push:
    branches: [main]
    paths: ["service/**", "docker/**", ".github/workflows/service-deploy.yml"]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: "9.0.x" }
      - run: dotnet test service/TrueSpend.sln -c Release
  deploy:
    needs: build-test
    runs-on: ubuntu-latest
    env: { ACR: ${{ secrets.ACR_NAME }}, TAG: ${{ github.sha }} }
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with: { creds: ${{ secrets.AZURE_CREDENTIALS }} }
      - run: az acr login --name "$ACR"
      - name: Build & push API
        run: |
          docker build -f docker/truespend.api.Dockerfile --target production \
            -t "$ACR.azurecr.io/truespend-api:$TAG" service
          docker push "$ACR.azurecr.io/truespend-api:$TAG"
      - name: Build & push worker
        run: |
          docker build -f docker/truespend.workerservice.Dockerfile --target production \
            -t "$ACR.azurecr.io/truespend-worker:$TAG" service
          docker push "$ACR.azurecr.io/truespend-worker:$TAG"
      - name: Roll Container Apps
        run: |
          az containerapp update -n ca-truespend-api-prod    -g rg-truespend-prod \
            --image "$ACR.azurecr.io/truespend-api:$TAG"
          az containerapp update -n ca-truespend-worker-prod -g rg-truespend-prod \
            --image "$ACR.azurecr.io/truespend-worker:$TAG"
```

> The Dockerfiles build context is `service/` (matches `docker-compose.prod.yml`). Both images share the
> solution; the target stage selects which entrypoint runs.

## 7. Supabase deployment pipeline (migrations + seeds)

The schema lives as **schema-named** SQL (`_init`, `lookup`, …, `app`) + RLS policies + seeds, orchestrated by
[supabase/run-all.sql](../../supabase/run-all.sql). It is **idempotent** (`CREATE … IF NOT EXISTS`,
`INSERT … ON CONFLICT DO NOTHING`), so re-running on an existing DB is safe. This is NOT the Supabase-CLI
timestamped-migration system; deploy with `psql`, not `supabase db push`.

`.github/workflows/supabase-migrate.yml`:

```yaml
name: supabase-migrate
on:
  push:
    branches: [main]
    paths: ["supabase/**", ".github/workflows/supabase-migrate.yml"]
  workflow_dispatch:
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

## 8. Mobile pipeline — EAS build → TestFlight

Prereqs (one-time): `npm i -g eas-cli`, `eas login`, `eas init` (writes `EXPO_PUBLIC_EAS_PROJECT_ID`),
`eas credentials` (let EAS manage the distribution cert + provisioning profile), and add the App Store Connect
API key to EAS (`eas credentials` → iOS → App Store Connect API Key) so `eas submit` is non-interactive.

`.github/workflows/mobile-testflight.yml`:

```yaml
name: mobile-testflight
on:
  workflow_dispatch:
  push:
    tags: ["mobile-v*"]
jobs:
  build-submit:
    runs-on: ubuntu-latest
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

1. `terraform apply` (per env) → RG, ACR, KV, identity, **VNet + subnets**, internal Container Apps Env,
   private DNS, two Container Apps, Log Analytics, **public IP + WAF policy + Application Gateway**.
   (Import `agw-tls-cert` into KV first, or split the apply: infra → cert → gateway.)
2. Seed Key Vault secrets **and the `agw-tls-cert` certificate** (§5).
3. Point DNS `api.truespend.<env>` → `agw_public_ip` output; verify HTTPS reaches the API through the gateway.
4. Run the **supabase-migrate** pipeline → schema + policies + seeds.
5. Configure Supabase Auth providers + SMTP + redirect URLs (§9).
6. Run **service-deploy** → images to ACR, Container Apps roll to the new revision.
7. Set EAS env vars (`EXPO_PUBLIC_API_BASE_URL=https://api.truespend.<env>`); run **mobile-testflight** →
   build + submit; accept in TestFlight.
8. Point Stripe + Plaid webhook URLs at `https://api.truespend.<env>/api/v1/webhooks/...` (through the gateway).
9. Execute the E2E plan (§10) Phases 0→4, defer 5, finish with 6.

## 12. Rollback

| Layer | Rollback |
|---|---|
| Container App | `az containerapp revision set-active` to the previous healthy revision (or redeploy prior image tag) |
| Supabase | Migrations are forward-only + idempotent; keep a pre-deploy DB backup/PITR; restore on a bad migration |
| Mobile | Promote the prior TestFlight build; EAS Update channel rollback for JS-only changes |
| Secrets | Key Vault keeps prior secret versions; restore a version if a rotation breaks auth |

## 13. Open items before production

- Re-enable `react-native-plaid-link-sdk` in `app.config.ts` (prebuild fix) ahead of Phase 4.
- Add a `/health` endpoint to the API and wire it to both the App Gateway probe and Container App probes.
- Tune the WAF: start in Prevention with OWASP 3.2; review blocked-request logs for false positives on the
  Stripe/Plaid webhook bodies and add scoped rule exclusions before go-live.
- Issue/renew the `api.truespend.<env>` TLS cert (managed in Key Vault); confirm App Gateway auto-rotates.
- Stripe/Plaid webhooks now ingress **through App Gateway** — no Container App public exposure to allow-list.
- Foursquare + Stripe live keys provisioned only when their phases begin.
