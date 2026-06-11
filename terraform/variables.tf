variable "env" {
  type        = string
  description = "Environment name: dev | staging | prod. Used in every resource name as -<env>."
  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "env must be one of: dev, staging, prod."
  }
}

variable "location" {
  type        = string
  description = "Azure region for all resources, e.g. eastus."
  default     = "eastus"
}

variable "tenant_id" {
  type        = string
  description = "Azure AD tenant id."
}

variable "subscription_id" {
  type        = string
  description = "Azure subscription id."
}

variable "image_tag" {
  type        = string
  description = "Container image tag deployed to both Container Apps (the service-deploy pipeline pushes :<git-sha>)."
  default     = "latest"
}
