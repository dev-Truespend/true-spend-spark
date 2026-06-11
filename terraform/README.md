# TrueSpend — Terraform IaC

Extracted from [deployment-guide.md](../_docs/Deployment/deployment-guide.md) §4–§5. One state file per
environment; resource naming is `<kind>-truespend-<env>`.

**Topology B (MVP):** Container Apps with **public ingress** directly — no App Gateway, WAF, or VNet. The API
is internet-facing but every request is authenticated in-app (Supabase JWT; webhooks verify provider
signatures). The custom domain + TLS cert are bound to the API Container App out of band (below).

## Layout

| File | Contents |
|---|---|
| `providers.tf` | azurerm provider (pinned `~> 3.116`) + required versions |
| `backend.tf` | remote state in Azure Storage (`rg-truespend-tfstate` / `sttruespendtfstate`) |
| `variables.tf` | `env`, `location`, `tenant_id`, `subscription_id`, `image_tag` |
| `main.tf` | RG, Log Analytics, ACR, identity + role assignments, **data** ref to the shared Key Vault, public Container Apps env, API (public ingress) + worker Container Apps |
| `outputs.tf` | `acr_login_server`, `api_public_fqdn`, `key_vault_uri`, identity principal |
| `envs/*.tfvars.example` | committed templates — copy to `<env>.tfvars` (gitignored) and fill real ids |

## Secrets are NOT in Terraform

Single-env MVP: Terraform does **not** create a per-env vault. It **references the existing shared vault**
`kv-truespend-shared` (`data.azurerm_key_vault.kv`, in `rg-truespend-shared`) as the runtime vault and grants
the app identity `Key Vault Secrets User` on it. Secret values are seeded out of band (`az keyvault secret set`)
and the Container Apps reference them by id, so **all required secrets must exist in `kv-truespend-shared`
before apply** — a missing one fails the app's create.

### Required secrets (must exist in `kv-truespend-shared`)

| KV secret name | Consumer |
|---|---|
| `ConnectionStrings--TrueSpendDb` | api + worker |
| `Supabase--JwtKeys` (JWKS JSON — project uses asymmetric ECC signing keys) | api |
| `SupabaseStorage--ServiceRoleKey` | api |
| `Stripe--SecretKey` | api |
| `Stripe--WebhookSecret` | api |
| `Resend--ApiKey` | api |
| `Plaid--ClientId` | api + worker |
| `Plaid--Secret` | api + worker |
| `AzureOpenAI--ApiKey` | worker |
| `RewardsCc--ApiKey` | worker |

(`--` maps to `__` when projected into the app's env vars. KV names can't contain `__`.)

## Apply order (per env)

Because the vault already exists and is pre-seeded, this is a **single apply** (no partial/seed/full dance):

```bash
terraform init -backend-config="key=truespend-<env>.tfstate"

# 1. Seed any missing secrets from the table above into kv-truespend-shared.
#    az keyvault secret set --vault-name kv-truespend-shared --name "Stripe--SecretKey" --value ...

# 2. Apply. Needs: Secrets Officer (to have seeded) + User Access Administrator/Owner on the
#    shared vault's RG (so TF can create the Key Vault Secrets User role assignment on it).
terraform apply -var-file=envs/<env>.tfvars
```

> Image chicken-and-egg: the Container Apps reference `…:latest`, which isn't in ACR yet. Apply normally still
> creates them (first revision unhealthy until an image lands); **service-deploy** pushes the real image next.
> If apply *errors* on the two container apps, apply ACR + identity + roles + env with `-target=…` first, push
> images, then re-run the full apply.

## Bind the custom domain + cert (out of band)

Container Apps custom-domain binding needs DNS ownership validation to pass first, so it's a one-time CLI step
after the app exists — not in Terraform. Using your existing domain + cert:

```bash
APP=ca-truespend-api-<env>; RG=rg-truespend-<env>; DOMAIN=api.truespend.<env>
# 1. Point DNS at the public FQDN (terraform output api_public_fqdn) + add the asuid validation TXT
#    that `az containerapp hostname add` reports. Then:
az containerapp hostname add  -n $APP -g $RG --hostname $DOMAIN
az containerapp hostname bind -n $APP -g $RG --hostname $DOMAIN \
  --certificate-file ./api-truespend.pfx --password '<pfx-password>'
```

Then set the mobile `EXPO_PUBLIC_API_BASE_URL=https://api.truespend.<env>` and continue with
deployment-guide §11. Webhooks (Stripe/Plaid) point at `https://api.truespend.<env>/api/v1/webhooks/...`.

## CI pipeline

[`.github/workflows/terraform.yml`](../.github/workflows/terraform.yml) is **manual only** (Run workflow
button). Pick an env, then tick the **plan** and/or **apply** checkbox. `apply` is paused for approval via the
GitHub **Environment** required-reviewers gate.

One-time setup before the pipeline works:

| What | Where |
|---|---|
| OIDC app registration with `Contributor` (subscription) + `Storage Blob Data Contributor` (state account) | Azure |
| Repo secrets `ARM_CLIENT_ID`, `ARM_TENANT_ID`, `ARM_SUBSCRIPTION_ID` | GitHub → Settings → Secrets |
| Environments `dev` / `staging` / `prod` with **required reviewers** (this is the apply gate) | GitHub → Settings → Environments |

The pipeline feeds variables via `TF_VAR_*` (real `*.tfvars` are gitignored), so it does **not** read
`envs/*.tfvars`. The **first** apply of a fresh env must still be done locally — the KV secrets are seeded out
of band between the partial and full apply, and the custom domain is bound by CLI.
