# TrueSpend — External Tools & Credentials Setup

Companion to [deployment-guide.md](deployment-guide.md). That guide says *which* secrets exist and *where they
go*; this one is the step-by-step for **creating each external account and obtaining each key, secret, and
cert**. Work top-to-bottom — later providers reference values from earlier ones (e.g. the Supabase callback URL
is needed when configuring Google).

## How to use this

Each provider section ends with an **Outputs** table: the credential you obtained → its destination. Destinations:

| Code | Destination | Notes |
|---|---|---|
| **KV** | Azure Key Vault (`kv-truespend-<env>`) | per-env backend runtime secrets; names use `--` for `__` (deployment-guide §3a) |
| **KV-shared** | Azure Key Vault (`kv-truespend-shared`) | master archive of all long-lived certs/keys + generated secrets (§2.3a) |
| **SB** | Supabase dashboard config | auth providers, SMTP — not app secrets |
| **EAS** | Expo EAS (env vars + managed credentials) | mobile build/submit |
| **ENV** | mobile `.env.<profile>` (`EXPO_PUBLIC_*`) | bundled into the app (publishable) |
| **GH** | GitHub Actions secrets | CI pipelines |

Do one environment at a time (dev → staging → prod). Sandbox/test credentials for dev+staging; live for prod.

## 0. Accounts checklist

| Provider | Sign-up | Paid? | Produces |
|---|---|---|---|
| Domain registrar / DNS | any (Cloudflare, Namecheap, Azure DNS) | ~$10/yr | `truespend.app` + DNS records |
| Microsoft Azure | <https://portal.azure.com> | pay-as-you-go | Container Apps, Key Vault, ACR, Azure OpenAI |
| Supabase | <https://supabase.com> | free→pro | Postgres, Auth, Storage |
| Apple Developer Program | <https://developer.apple.com> | $99/yr | App ID, signing, Sign in with Apple, APNs, App Store Connect |
| Google Cloud | <https://console.cloud.google.com> | free tier | OAuth clients (Sign in with Google) |
| Stripe | <https://dashboard.stripe.com> | per-txn | billing keys + webhook |
| Plaid | <https://dashboard.plaid.com> | free sandbox; paid prod | bank linking keys |
| Resend | <https://resend.com> | free→paid | email API key + SMTP |
| Azure OpenAI | via Azure (access request) | usage | AI insights endpoint/key |
| RapidAPI | <https://rapidapi.com> | free→paid | RewardsCC catalog key |
| Foursquare | <https://foursquare.com/developers> | free→paid | **deferred** (geo) |
| Expo | <https://expo.dev> | free→paid builds | EAS project + token |
| GitHub | <https://github.com> | free | CI secret storage |

---

## 1. Domain & DNS

1. Register `truespend.app` (or use an existing domain). Point its nameservers at a DNS provider you control.
2. You will add these records later (kept here as the running list):
   - `CNAME  api.truespend.<env>` → the API Container App's public FQDN (`terraform output api_public_fqdn`),
     plus the `asuid.api.truespend.<env>` TXT validation value (from `az containerapp hostname add`).
   - `A/TXT` records for Resend domain verification (SPF + DKIM).
   - Static-hosted files for deep links: `/.well-known/apple-app-site-association` (Apple Universal Links) and
     `/.well-known/assetlinks.json` (Android App Links) — needed for OAuth redirects + Plaid OAuth return.

| Output | Destination |
|---|---|
| `truespend.app` + DNS zone | used by Azure (cert/domain), Apple, Google, Plaid, Resend |

## 2. Microsoft Azure

### 2.1 Subscription + CLI
1. Create/choose a subscription. Install Azure CLI: `az login`, `az account set --subscription <id>`.
2. Register providers (once per subscription):
   `az provider register --namespace Microsoft.App` (Container Apps), `Microsoft.ContainerRegistry`,
   `Microsoft.KeyVault`, `Microsoft.OperationalInsights`, `Microsoft.CognitiveServices`,
   `Microsoft.Storage` (Terraform state account in §2.3 — without it, `az storage account create`
   fails with a misleading `SubscriptionNotFound`).

### 2.2 CI service principal (for Terraform + deploy)
```bash
az ad sp create-for-rbac --name sp-truespend-cicd \
  --role Contributor --scopes /subscriptions/<sub-id> --sdk-auth
```
Save the JSON as the GitHub secret `AZURE_CREDENTIALS` (or use OIDC federated creds — preferred, no stored
secret). Grant the SP **User Access Administrator** too if Terraform creates role assignments.

### 2.3 Terraform state storage (one-time, shared)
```bash
az group create -n rg-truespend-tfstate -l eastus
az storage account create -n sttruespendtfstate -g rg-truespend-tfstate -l eastus --sku Standard_LRS
az storage container create -n tfstate --account-name sttruespendtfstate
```

### 2.3a Shared cert/secret vault (`kv-truespend-shared`)
One-time, shared, **not** Terraform-managed (kept separate from the per-env `kv-truespend-<env>` runtime vaults
to avoid an import/purge-protection collision). It is the **master archive** for every long-lived cert/key and
generated secret collected during setup. RBAC mode + purge protection.
```bash
az group create -n rg-truespend-shared -l eastus
az keyvault create -n kv-truespend-shared -g rg-truespend-shared -l eastus \
  --enable-rbac-authorization true --enable-purge-protection true
# grant yourself secret write (RBAC):
az role assignment create --assignee <your-object-id> --role "Key Vault Secrets Officer" \
  --scope $(az keyvault show -n kv-truespend-shared -g rg-truespend-shared --query id -o tsv)
```
**Convention — every cert/key goes here.** Store `.p8`/PFX from a file; store generated secrets with their
expiry so KV tracks the rotation natively:
```bash
az keyvault secret set --vault-name kv-truespend-shared --name "Apple--SignInKeyP8"   --file AuthKey_<kid>.p8
az keyvault secret set --vault-name kv-truespend-shared --name "Apple--ApnsKeyP8"      --file AuthKey_<apnsKid>.p8
az keyvault secret set --vault-name kv-truespend-shared --name "Apple--AscApiKeyP8"    --file AuthKey_<ascKid>.p8
az keyvault secret set --vault-name kv-truespend-shared --name "Apple--SignInClientSecret" \
  --value "<jwt>" --expires "<6-months-out>"   # regenerate via scripts/generate-apple-secret.js
```

**Rotation reminders.** Secrets that expire carry a KV-native `--expires` date (visible in the portal; wire an
Azure Monitor / Event Grid *near-expiry* alert to an email action group for a proactive nudge). Calendar:

| Item | KV secret | Expires | Rotate via |
|---|---|---|---|
| Apple Sign in with Apple OAuth client secret | `Apple--SignInClientSecret` | every 6 months | [scripts/generate-apple-secret.js](../../scripts/generate-apple-secret.js) → repaste in Supabase + `secret set` |
| Apple `.p8` keys (Sign In / APNs / ASC) | `Apple--*KeyP8` | do not expire | n/a (archive only) |
| Custom-domain TLS PFX | bound to Container App (not KV) | per CA (~1 yr) | reissue + re-bind (§2.6) |
| Apple distribution cert / provisioning profile | EAS-managed | ~1 yr | `eas credentials` auto-renews |

### 2.4 ACR, Key Vault, Container Apps
Provisioned by Terraform (deployment-guide §4). After `terraform apply`, note `api_public_fqdn`.

### 2.5 Azure OpenAI (AI insights — worker)
1. Request access to Azure OpenAI (if not already enabled on the subscription).
2. Create an **Azure OpenAI** resource (region with capacity). Studio → **Deployments** → deploy a model
   (e.g. `gpt-4o-mini`); the deployment name is your `AzureOpenAI__DeploymentName`.
3. Resource → **Keys and Endpoint** → copy Endpoint + Key 1.

### 2.6 Custom-domain TLS certificate
Get a PFX cert for `api.truespend.<env>` (DigiCert, Let's Encrypt, etc.). It is **not** stored in Key Vault —
after the Container App exists, bind it directly to the app (deployment-guide §4a):
```bash
az containerapp hostname add  -n ca-truespend-api-<env> -g rg-truespend-<env> --hostname api.truespend.<env>
az containerapp hostname bind -n ca-truespend-api-<env> -g rg-truespend-<env> --hostname api.truespend.<env> \
  --certificate-file ./api-truespend.pfx --password '<pfx-password>'
```

| Output | Destination |
|---|---|
| `AZURE_CREDENTIALS` (SP JSON) | GH |
| `AzureOpenAI__Endpoint`, `AzureOpenAI__ApiKey`, `AzureOpenAI__DeploymentName` | KV (`AzureOpenAI--ApiKey`) + appsettings for non-secrets |
| `api.truespend.<env>` PFX cert | bound to the API Container App (not KV) |
| `ACR_NAME` | GH |

## 3. Supabase

### 3.1 Project
1. Create a project per env (`truespend-dev`, …). Choose a region near your Azure region. Save the **database
   password** shown at creation — it goes into the connection string.
2. **Project Settings → API**: copy the **Project URL** and the API keys. Newer projects show a **Publishable
   key** (`sb_publishable_…`, client-safe — replaces the old **anon** key) and a **Secret key**
   (`sb_secret_…`, backend-only, full access, bypasses RLS — replaces the old **service_role** key). Use these
   wherever `anon`/`service_role` appear below.
3. **JWT validation material** — the API validates Supabase access tokens against the legacy HS256 shared
   secret **or** the new asymmetric (JWKS) signing keys, whichever signed the token (it accepts both, see
   `SupabaseAuthExtensions.cs`). Check which your project uses:
   `curl -s https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`.
   - Non-empty `"keys": [ … ]` → asymmetric signing: store that whole JSON as KV `Supabase--JwtKeys`.
   - Empty `[]` → HS256: copy the **Legacy JWT Secret** (Project Settings → API → JWT Keys) as KV `Supabase--JwtSecret`.
4. **Project Settings → Database**: copy the **connection string**. Use the **pooler** (port 6543) for app
   containers; use the **direct** connection (5432) for the migration pipeline.

### 3.2 Apply schema
Run the migration pipeline (deployment-guide §7) — `psql -f supabase/run-all.sql` against the direct URL.

### 3.2a Storage bucket
**Storage → New bucket**: name `avatars`, **Public = on**. The service uploads profile pictures here via the
service-role key (`SupabaseStorageProvider`) and returns a public `/storage/v1/object/public/avatars/…` URL —
without the bucket, avatar upload 404s; if it isn't public, the URLs 400.

### 3.3 Auth providers (Authentication → Providers)

Every provider's callback is `https://<ref>.supabase.co/auth/v1/callback`. **Dependency order:** Email OTP is
Supabase-only (do now); Google needs its OAuth client created first (§5); Apple needs a Services ID + key
first (§4, paid program). Configure the OAuth credential at the provider, then paste it here.

- **Email OTP** (no dependency): enable **Email**; turn on the email **OTP** (6-digit code) option; for
  code-only login turn **off** "Confirm email" (the app uses `signInWithOtp`). Dev delivers via Supabase's
  built-in email (rate-limited ~3–4/hr); for prod set custom SMTP = Resend (§8).
- **Google** (after §5): create the **Web** OAuth client in Google Cloud with Authorized redirect URI =
  the callback above; then enable **Google** here and paste the Web **client id + secret**.
- **Apple** (after §4): create a **Services ID** (e.g. `com.truespend.signin`) with Sign In with Apple →
  domain `<ref>.supabase.co`, return URL = the callback above; create a **Sign in with Apple key** (`.p8`).
  This Supabase provider exposes only **Client IDs** + **Secret Key (for OAuth)** — the secret is a
  **client-secret JWT** (not the raw `.p8`), valid 6 months. Generate it with
  [scripts/generate-apple-secret.js](../../scripts/generate-apple-secret.js) (edit `KEY_ID`/`P8_PATH` for the
  env), set **Client IDs** = the Services ID, paste the JWT into **Secret Key (for OAuth)**. Re-run before the
  printed expiry to avoid web sign-in breaking.
- **URL Configuration**: set the **Site URL** and add redirect URLs `truespend://` (the app's deep-link
  scheme) + your universal-link host so OAuth callbacks return to the app.

| Output | Destination |
|---|---|
| Project URL | KV `SupabaseStorage--Url`, `Supabase--JwtIssuer` base; ENV `EXPO_PUBLIC_SUPABASE_URL` |
| Publishable key (`sb_publishable_…`, = anon) | ENV `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Secret key (`sb_secret_…`, = service_role) | KV `SupabaseStorage--ServiceRoleKey` |
| JWKS JSON **or** legacy JWT Secret (per the `jwks.json` check) | KV `Supabase--JwtKeys` **or** `Supabase--JwtSecret` |
| DB password / connection string | KV `ConnectionStrings--TrueSpendDb` (pooler 6543); GH `SUPABASE_DB_URL` (direct 5432) |

## 4. Apple Developer

Enroll in the Apple Developer Program ($99/yr). Then in **Certificates, Identifiers & Profiles**:

### 4.1 App ID
1. Identifiers → **+** → App IDs → App → bundle id `com.truespend.mobile`.
2. Enable capabilities: **Sign In with Apple**, **Push Notifications**, **Associated Domains** (for universal
   links), **Background Modes** (location/remote-notification are set in `app.config.ts`).

### 4.2 Sign in with Apple key
1. Identifiers → **Services IDs** → create one (e.g. `com.truespend.signin`) → enable Sign in with Apple →
   add your domain + return URL `https://<ref>.supabase.co/auth/v1/callback`.
2. Keys → **+** → enable **Sign in with Apple** → download the `.p8`. Note the **Key ID** and your **Team ID**.

### 4.3 APNs key (push)
Keys → **+** → enable **Apple Push Notifications service (APNs)** → download `.p8` + Key ID. Upload to EAS
(`eas credentials` → iOS → Push Key) so Expo can send push.

### 4.4 App Store Connect API key (for `eas submit`)
App Store Connect → **Users and Access → Integrations → App Store Connect API** → generate a key (App Manager
role) → download the `.p8`; note **Key ID** + **Issuer ID**.

### 4.5 TestFlight app record
App Store Connect → **Apps → +** → create the app with bundle id `com.truespend.mobile`. TestFlight tab will
receive builds from `eas submit`.

> Distribution certificate + provisioning profile: let **EAS manage** these (`eas credentials`). Nothing
> signing-related should land in the repo (all `.p8`/`.p12`/`.mobileprovision` are gitignored).

| Output | Destination |
|---|---|
| Sign in with Apple `.p8` + Services ID + Team ID + Key ID | SB (Apple provider, via generated JWT) + **KV-shared** archive (`Apple--SignInKeyP8`, `Apple--SignInClientSecret`) |
| APNs `.p8` + Key ID | EAS (push key) + **KV-shared** archive (`Apple--ApnsKeyP8`) |
| App Store Connect API `.p8` + Key ID + Issuer ID | EAS (submit) or GH `ASC_API_KEY_*` + **KV-shared** archive (`Apple--AscApiKeyP8`) |
| App ID / bundle id | already in `app.config.ts` |

## 5. Google Cloud (Sign in with Google)

1. Create a project. **APIs & Services → OAuth consent screen** → External → fill app info + scopes
   (email, profile, openid) → add test users (until verified).
2. **Credentials → Create credentials → OAuth client ID**:
   - **Web application** (used by Supabase): Authorized redirect URI =
     `https://<ref>.supabase.co/auth/v1/callback`. Copy the **client id + secret**.
   - **iOS**: bundle id `com.truespend.mobile`. Copy the **iOS client id**.

| Output | Destination |
|---|---|
| Web client id + secret | SB (Google provider) |
| iOS client id | mobile native config (Google sign-in) |

## 6. Stripe

1. **Developers → API keys**: copy the **Secret key** and **Publishable key** (test for dev/staging, live for prod).
2. **Products**: create Basic and Pro products with recurring monthly/annual **Prices**; note the price ids
   (these map to `billing.plan_prices` seeds).
3. **Developers → Webhooks → Add endpoint**: URL `https://api.truespend.<env>/api/v1/webhooks/stripe`; select
   events (`customer.subscription.*`, `invoice.paid`, `payment_method.*`). Copy the **Signing secret**.
4. **Settings → Billing → Customer portal**: enable and configure (cancel, update payment method).

| Output | Destination |
|---|---|
| Secret key | KV `Stripe--SecretKey` |
| Publishable key | KV `Stripe--PublishableKey` (or appsettings) |
| Webhook signing secret | KV `Stripe--WebhookSecret` |

## 7. Plaid

1. **Team Settings → Keys**: copy `client_id`, the **Sandbox** secret (and **Production** secret once approved).
2. **API → Allowed redirect URIs**: add your OAuth return URI (matches `EXPO_PUBLIC_PLAID_REDIRECT_URI`, e.g.
   `https://truespend.app/plaid-oauth`).
3. Configure the **webhook** URL `https://api.truespend.<env>/api/v1/webhooks/plaid`.
4. Enable products: Transactions (+ Auth/Identity as needed). Request **Production** access for prod.

| Output | Destination |
|---|---|
| `client_id` | KV `Plaid--ClientId` |
| Sandbox/Production secret | KV `Plaid--Secret` (per env) |
| redirect URI | ENV `EXPO_PUBLIC_PLAID_REDIRECT_URI` + Plaid dashboard |

## 8. Resend (email)

1. Create an **API key** (Sending access).
2. **Domains → Add domain** for `truespend.app`; add the SPF + DKIM DNS records it provides; wait for verified.
3. For **Supabase email OTP** custom SMTP, use: host `smtp.resend.com`, port `465` (or `587`), username
   `resend`, password = the API key, from `no-reply@truespend.app`.

| Output | Destination |
|---|---|
| API key | KV `Resend--ApiKey` (backend) **and** SB SMTP password (OTP email) |
| Verified domain / from address | KV/appsettings `Resend--FromAddress`; SB SMTP |

## 9. RapidAPI — RewardsCC catalog (worker)

1. Create a RapidAPI account. Subscribe to the rewards-credit-card catalog API used by `RewardsCcProvider`.
2. From the endpoint page copy **X-RapidAPI-Key** and **X-RapidAPI-Host**; note the base URL.

| Output | Destination |
|---|---|
| X-RapidAPI-Key | KV `RewardsCc--ApiKey` |
| X-RapidAPI-Host + base URL | appsettings `RewardsCc__Host` / `RewardsCc__BaseUrl` |

## 10. Foursquare — DEFERRED

Geo is not enabled yet (awaiting the Movement SDK). When ready: create a Foursquare developer project, obtain
the SDK/Places API key (`EXPO_PUBLIC_FOURSQUARE_API_KEY`) and configure the webhook signing secret
(`Foursquare__WebhookSecret` → KV). Skip for now.

## 11. Expo / EAS (mobile build → TestFlight)

1. Create an Expo account; `npm i -g eas-cli`; `eas login`.
2. In `ui-mobile/`: `eas init` → writes the **EAS project id** (`EXPO_PUBLIC_EAS_PROJECT_ID`).
3. `eas credentials` → iOS → let EAS manage the **distribution certificate + provisioning profile**; add the
   **APNs push key** (§4.3) and the **App Store Connect API key** (§4.4) so build + submit are non-interactive.
4. expo.dev → Account → **Access tokens** → create one → store as GitHub secret `EXPO_TOKEN`.
5. Set the `EXPO_PUBLIC_*` values as **EAS environment variables** per profile (or `.env.production`), pointing
   `EXPO_PUBLIC_API_BASE_URL` at `https://api.truespend.<env>`.

| Output | Destination |
|---|---|
| EAS project id | ENV `EXPO_PUBLIC_EAS_PROJECT_ID` |
| `EXPO_TOKEN` | GH |
| Managed signing + push + ASC keys | EAS |

## 12. GitHub Actions secrets — final recap

Add these so the three pipelines (deployment-guide §6–§8) run unattended:

| Secret | From |
|---|---|
| `AZURE_CREDENTIALS` (or OIDC) | §2.2 |
| `ACR_NAME` | §2.4 (Terraform output) |
| `SUPABASE_DB_URL` (direct connection) | §3.1 |
| `EXPO_TOKEN` | §11 |
| `ASC_API_KEY_*` (if not stored in EAS) | §4.4 |

## 13. Pre-deploy readiness checklist

- [ ] Domain registered; DNS zone editable; `api.truespend.<env>` ready to CNAME at the Container App FQDN.
- [ ] Azure subscription + providers registered; CI SP / OIDC created; tfstate storage made.
- [ ] Azure OpenAI resource + model deployment; endpoint/key captured.
- [ ] PFX TLS cert for `api.truespend.<env>` ready to bind to the API Container App (`hostname bind`, §2.6).
- [ ] Supabase project(s) created; URL/anon/service_role/JWT/DB-password captured; schema applied.
- [ ] Supabase Auth: Apple + Google + Email OTP configured; redirect URLs added; Resend SMTP set.
- [ ] Apple: program enrolled; App ID + capabilities; Sign-in key, APNs key, ASC API key; TestFlight app created.
- [ ] Google: OAuth consent + Web client (Supabase) + iOS client.
- [ ] Stripe: keys, products/prices, webhook endpoint + signing secret, customer portal.
- [ ] Plaid: client_id + secret(s), redirect URI, webhook, products.
- [ ] Resend: API key + verified domain.
- [ ] RapidAPI: RewardsCC subscription + key/host.
- [ ] Expo: EAS project, token, managed credentials.
- [ ] All secrets seeded into Key Vault (§5); all CI secrets added to GitHub (§12).

Once every box is checked, follow deployment-guide §11 (first-time deploy order).
