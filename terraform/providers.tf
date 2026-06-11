# azurerm provider. Pinned to 3.x — the App Gateway `ssl_certificate.key_vault_secret_id`
# and Container App `secret.key_vault_secret_id` schemas used in main.tf/gateway.tf match this line.
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.116"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}
