# TrueSpend — External Tools & Credentials Setup

Companion to [deployment-guide.md](deployment-guide.md). That guide says *which* secrets exist and *where they
go*; this one is the step-by-step for **creating each external account and obtaining each key, secret, and
cert**. Work top-to-bottom — later providers reference values from earlier ones (e.g. the Supabase callback URL
is needed when configuring Google).

## How to use this

Each provider section ends with an **Outputs** table: the credential you obtained → its destination. Destinations:

| Code | Destination | Notes |
|---|---|---|
| **KV** | Azure Key Vault (`kv-truespend-<env>`) | backend secrets + the App Gateway TLS cert; secret names use `--` for `__` (see deployment-guide §3a) |
| **SB** | Supabase dashboard config | auth providers, SMTP — not app secrets |
| **EAS** | Expo EAS (env vars + managed credentials) | mobile build/submit |
| **ENV** | mobile `.env.<profile>` (`EXPO_PUBLIC_*`) | bundled into the app (publishable) |
| **GH** | GitHub Actions secrets | CI pipelines |

Do one environment at a time (dev → staging → prod). Sandbox/test credentials for dev+staging; live for prod.

## 0. Accounts checklist

| Provider | Sign-up | Paid? | Produces |
|---|---|---|---|
| Domain registrar / DNS | any (Cloudflare, Namecheap, Azure DNS) | ~$10/yr | `truespend.app` + DNS records |
| Microsoft Azure | <https://portal.azure.com> | pay-as-you-go | Container Apps, Key Vault, App Gateway, ACR, Azure OpenAI |
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
   - `A  api.truespend.<env>` → App Gateway public IP (from `terraform output agw_public_ip`).
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
   `Microsoft.KeyVault`, `Microsoft.Network`, `Microsoft.OperationalInsights`, `Microsoft.CognitiveServices`.

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

### 2.4 ACR, Key Vault, Container Apps, App Gateway
Provisioned by Terraform (deployment-guide §4 / §4a). After `terraform apply`, note `agw_public_ip`.

### 2.5 Azure OpenAI (AI insights — worker)
1. Request access to Azure OpenAI (if not already enabled on the subscription).
2. Create an **Azure OpenAI** resource (region with capacity). Studio → **Deployments** → deploy a model
   (e.g. `gpt-4o-mini`); the deployment name is your `AzureOpenAI__DeploymentName`.
3. Resource → **Keys and Endpoint** → copy Endpoint + Key 1.

### 2.6 App Gateway TLS certificate
Get a cert for `api.truespend.<env>`, then put it in Key Vault as a **certificate** named `agw-tls-cert`:
- Buy/issue (DigiCert, Let's Encrypt, etc.) → export PFX → `az keyvault certificate import --vault-name
  kv-truespend-<env> --name agw-tls-cert --file api-truespend.pfx`, **or**
- Use a Key Vault managed certificate with an integrated CA.

| Output | Destination |
|---|---|
| `AZURE_CREDENTIALS` (SP JSON) | GH |
| `AzureOpenAI__Endpoint`, `AzureOpenAI__ApiKey`, `AzureOpenAI__DeploymentName` | KV (`AzureOpenAI--ApiKey`) + appsettings for non-secrets |
| `agw-tls-cert` (PFX) | KV (certificate) |
| `ACR_NAME` | GH |

## 3. Supabase

### 3.1 Project
1. Create a project per env (`truespend-dev`, …). Choose a region near your Azure region. Save the **database
   password** shown at creation — it goes into the connection string.
2. **Project Settings → API**: copy the **Project URL**, **anon** key, and **service_role** key.
3. **Project Settings → API → JWT Settings**: copy the **JWT Secret**.
4. **Project Settings → Database**: copy the **connection string**. Use the **pooler** (port 6543) for app
   containers; use the **direct** connection (5432) for the migration pipeline.

### 3.2 Apply schema
Run the migration pipeline (deployment-guide §7) — `psql -f supabase/run-all.sql` against the direct URL.

### 3.3 Auth providers (configure in Authentication → Providers)
- **Email OTP**: enable Email; turn on OTP; set the SMTP sender to Resend (§8) so codes deliver.
- **Apple**: enable; add the Services ID, Team ID, Key ID, and the Sign-in-with-Apple `.p8` (from §5).
- **Google**: enable; add the **Web** client id + secret (from §6).
- **URL Configuration**: add redirect URLs `truespend://` and your universal-link host so callbacks return.

| Output | Destination |
|---|---|
| Project URL | KV `SupabaseStorage--Url`, `Supabase--JwtIssuer` base; ENV `EXPO_PUBLIC_SUPABASE_URL` |
| anon key | ENV `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| service_role key | KV `SupabaseStorage--ServiceRoleKey` |
| JWT Secret | KV `Supabase--JwtSecret` |
| DB password / connection string | KV `ConnectionStrings--TrueSpendDb`; GH `SUPABASE_DB_URL` (direct) |

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
| Sign in with Apple `.p8` + Services ID + Team ID + Key ID | SB (Apple provider) |
| APNs `.p8` + Key ID | EAS (push key) |
| App Store Connect API `.p8` + Key ID + Issuer ID | EAS (submit) or GH `ASC_API_KEY_*` |
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

- [ ] Domain registered; DNS zone editable; `api.truespend.<env>` ready to point at the App Gateway IP.
- [ ] Azure subscription + providers registered; CI SP / OIDC created; tfstate storage made.
- [ ] Azure OpenAI resource + model deployment; endpoint/key captured.
- [ ] TLS cert for `api.truespend.<env>` imported to Key Vault as `agw-tls-cert`.
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
