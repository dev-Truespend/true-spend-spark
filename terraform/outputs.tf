output "acr_login_server" {
  description = "ACR login server — used by the service-deploy pipeline to tag/push images."
  value       = azurerm_container_registry.acr.login_server
}

output "api_public_fqdn" {
  description = "Public API Container App FQDN. Point a CNAME for api.truespend.<env> at this, then bind the custom domain + cert (README)."
  value       = azurerm_container_app.api.ingress[0].fqdn
}

output "key_vault_uri" {
  description = "Runtime Key Vault URI (the shared vault, reused for this single-env MVP)."
  value       = data.azurerm_key_vault.kv.vault_uri
}

output "app_identity_principal_id" {
  description = "Shared user-assigned identity principal id (AcrPull + Key Vault Secrets User)."
  value       = azurerm_user_assigned_identity.app.principal_id
}
