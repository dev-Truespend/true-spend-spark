# Remote state in an Azure Storage account. Never store state locally for shared envs —
# it contains secret values (KV references, connection details) in plaintext.
# Pass `-backend-config="key=truespend-<env>.tfstate"` at `terraform init` to isolate state per env.
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-truespend-tfstate"
    storage_account_name = "sttruespendtfstate"
    container_name       = "tfstate"
    key                  = "truespend.tfstate"
  }
}
