# ──────────────────────────────────────────────────────────────────────────────────────────
# TrueSpend Azure infrastructure (deployment-guide.md §4–§5). Topology B (MVP):
# Container Apps with PUBLIC ingress directly — no App Gateway / WAF / VNet. The custom domain
# (api.truespend.<env>) + TLS cert are bound to the API Container App out of band (README).
#
# IMPORTANT — secrets are NOT in Terraform. The Container Apps project Key Vault secrets by id;
# those KV entries are seeded out of band (CLI, deployment-guide §5) and are NOT created here.
# First apply infra (RG/KV/identity/env), seed the secrets, then apply again so the apps resolve them:
#   terraform apply -target=azurerm_key_vault.kv -target=azurerm_container_app_environment.cae ...
#   az keyvault secret set ...
#   terraform apply
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

resource "azurerm_key_vault" "kv" {
  name                      = "kv-truespend-${var.env}"
  resource_group_name       = azurerm_resource_group.rg.name
  location                  = azurerm_resource_group.rg.location
  tenant_id                 = var.tenant_id
  sku_name                  = "standard"
  enable_rbac_authorization = true
  purge_protection_enabled  = true
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

# Map of KV secret name -> env var name the app expects (-- becomes __). KV secret names can't
# contain "__", so the Container App secret block maps the projected env var name back.
locals {
  api_secrets = {
    "ConnectionStrings--TrueSpendDb"  = "ConnectionStrings__TrueSpendDb"
    "Supabase--JwtSecret"             = "Supabase__JwtSecret"
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
      key_vault_secret_id = "${azurerm_key_vault.kv.vault_uri}secrets/${secret.key}"
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
      key_vault_secret_id = "${azurerm_key_vault.kv.vault_uri}secrets/${secret.key}"
      identity            = azurerm_user_assigned_identity.app.id
    }
  }

  # No ingress — the worker runs cron jobs only.
  template {
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
