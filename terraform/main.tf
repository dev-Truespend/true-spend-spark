# ──────────────────────────────────────────────────────────────────────────────────────────
# TrueSpend Azure infrastructure (deployment-guide.md §4–§5). Topology B (MVP):
# Container Apps with PUBLIC ingress directly — no App Gateway / WAF / VNet. The custom domain
# (api.truespend.<env>) + TLS cert are bound to the API Container App out of band (README).
#
# IMPORTANT — secrets are NOT in Terraform. The Container Apps project Key Vault secrets by id.
# Single-env MVP: we reuse the EXISTING shared vault (kv-truespend-shared) as the runtime vault
# instead of creating a per-env one (see data.azurerm_key_vault.kv below). All 10 app secrets must
# already exist in that vault before apply (the apps fail to create if a referenced secret is
# missing), so seed any missing ones first, then a single apply:
#   az keyvault secret set --vault-name kv-truespend-shared --name "ConnectionStrings--TrueSpendDb" --value ...
#   terraform apply -var-file=envs/prod.tfvars
# ──────────────────────────────────────────────────────────────────────────────────────────

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
  name                = "acrtruespend${var.env}" # globally unique, alphanumeric only
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
}

# Shared user-assigned identity for both Container Apps (AcrPull + Key Vault Secrets User).
resource "azurerm_user_assigned_identity" "app" {
  name                = "id-truespend-${var.env}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

# Single-env MVP: reuse the existing shared vault as the runtime vault rather than creating a
# per-env kv-truespend-<env>. It already exists (rg-truespend-shared) and holds the app secrets.
data "azurerm_key_vault" "kv" {
  name                = "kv-truespend-shared"
  resource_group_name = "rg-truespend-shared"
}

resource "azurerm_role_assignment" "kv_read" {
  scope                = data.azurerm_key_vault.kv.id
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

# Map of KV secret name -> env var name the app expects (-- becomes __). KV secret names can't
# contain "__", so the Container App secret block maps the projected env var name back.
locals {
  api_secrets = {
    "ConnectionStrings--TrueSpendDb"  = "ConnectionStrings__TrueSpendDb"
    "Supabase--JwtKeys"               = "Supabase__JwtKeys"
    "SupabaseStorage--ServiceRoleKey" = "SupabaseStorage__ServiceRoleKey"
    "Stripe--SecretKey"               = "Stripe__SecretKey"
    "Stripe--WebhookSecret"           = "Stripe__WebhookSecret"
    "Plaid--ClientId"                 = "Plaid__ClientId"
    "Plaid--Secret"                   = "Plaid__Secret"
    "Resend--ApiKey"                  = "Resend__ApiKey"
  }
  worker_secrets = {
    "ConnectionStrings--TrueSpendDb" = "ConnectionStrings__TrueSpendDb"
    "Plaid--ClientId"                = "Plaid__ClientId"
    "Plaid--Secret"                  = "Plaid__Secret"
    "AzureOpenAI--ApiKey"            = "AzureOpenAI__ApiKey"
    "RewardsCc--ApiKey"              = "RewardsCc__ApiKey"
  }
}

# ── API Container App: PUBLIC ingress on :8080. Bind the custom domain + cert out of band (README). ──
resource "azurerm_container_app" "api" {
  name                         = "ca-truespend-api-${var.env}"
  resource_group_name          = azurerm_resource_group.rg.name
  container_app_environment_id = azurerm_container_app_environment.cae.id
  revision_mode                = "Single"

  # Ensure the identity can read KV secrets before the app tries to resolve them.
  depends_on = [azurerm_role_assignment.kv_read, azurerm_role_assignment.acr_pull]

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
      name                = lower(replace(secret.key, "--", "-")) # ca secret name
      key_vault_secret_id = "${data.azurerm_key_vault.kv.vault_uri}secrets/${secret.key}"
      identity            = azurerm_user_assigned_identity.app.id
    }
  }

  ingress {
    external_enabled = true # public — internet-facing (requests still auth'd by Supabase JWT in-app)
    target_port      = 8080
    transport        = "auto"
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    # Pinned to a single replica: the session-mode Supabase pooler caps total
    # clients at pool_size, and each replica keeps its own Npgsql pool. Pin min=max=1
    # so connection count is bounded and deterministic (no scale-to-zero, which would
    # also drop the worker's schedulers). Raise deliberately alongside the pooler size.
    min_replicas = 1
    max_replicas = 1

    container {
      name   = "api"
      image  = "${azurerm_container_registry.acr.login_server}/truespend-api:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "ASPNETCORE_ENVIRONMENT"
        value = "Production"
      }
      env {
        name  = "ASPNETCORE_URLS"
        value = "http://+:8080"
      }
      # QA/pre-launch toggle: when true, checkout provisions a simulated trialing
      # subscription locally and skips Stripe entirely (BillingInsertBusiness.SimulateCheckoutAsync).
      # Must be false for real billing. Keep here so a terraform apply never silently wipes it.
      env {
        name  = "Stripe__SimulateCheckout"
        value = tostring(var.simulate_checkout)
      }
      dynamic "env" {
        for_each = local.api_secrets
        content {
          name        = env.value # e.g. Stripe__SecretKey
          secret_name = lower(replace(env.key, "--", "-"))
        }
      }

      # Probes hit the unauthenticated /health endpoint (deployment-guide §13).
      liveness_probe {
        transport               = "HTTP"
        port                    = 8080
        path                    = "/health"
        initial_delay           = 10
        interval_seconds        = 30
        failure_count_threshold = 3
      }
      readiness_probe {
        transport               = "HTTP"
        port                    = 8080
        path                    = "/health"
        interval_seconds        = 30
        failure_count_threshold = 3
      }
    }
  }
}

# ── Worker Container App: no ingress, worker_secrets, DOTNET_ENVIRONMENT=Production ──
resource "azurerm_container_app" "worker" {
  name                         = "ca-truespend-worker-${var.env}"
  resource_group_name          = azurerm_resource_group.rg.name
  container_app_environment_id = azurerm_container_app_environment.cae.id
  revision_mode                = "Single"

  # Ensure the identity can read KV secrets before the app tries to resolve them.
  depends_on = [azurerm_role_assignment.kv_read, azurerm_role_assignment.acr_pull]

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server   = azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.app.id
  }

  dynamic "secret" {
    for_each = local.worker_secrets
    content {
      name                = lower(replace(secret.key, "--", "-"))
      key_vault_secret_id = "${data.azurerm_key_vault.kv.vault_uri}secrets/${secret.key}"
      identity            = azurerm_user_assigned_identity.app.id
    }
  }

  # Public ingress on :8080 for the manual job-trigger surface (/jobs, /health).
  # The endpoints are UNAUTHENTICATED, so access is restricted to an explicit
  # CIDR allow-list (var.worker_trigger_allowed_cidrs); all other sources are denied.
  ingress {
    external_enabled = true
    target_port      = 8080
    transport        = "auto"
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
    dynamic "ip_security_restriction" {
      for_each = var.worker_trigger_allowed_cidrs
      content {
        name             = "allow-${ip_security_restriction.key}"
        ip_address_range = ip_security_restriction.value
        action           = "Allow"
      }
    }
  }

  template {
    # Pin min=max=1 — the worker runs scheduled hosted services that must stay
    # resident (scale-to-zero would stop them) and must not multiply DB connections.
    min_replicas = 1
    max_replicas = 1

    container {
      name   = "worker"
      image  = "${azurerm_container_registry.acr.login_server}/truespend-worker:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "DOTNET_ENVIRONMENT"
        value = "Production"
      }
      dynamic "env" {
        for_each = local.worker_secrets
        content {
          name        = env.value
          secret_name = lower(replace(env.key, "--", "-"))
        }
      }
    }
  }
}
