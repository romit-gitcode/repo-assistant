variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "ca-central-1"
}

variable "project_name" {
  description = "Name of the project."
  type        = string
  default     = "repo-assistant"
}

variable "neon_database_url" {
  description = "The URL for the Neon PostgreSQL database."
  type        = string
  sensitive   = true
}

variable "gemini_api_key" {
  type      = string
  sensitive = true
}

variable "github_client_id" {
  type      = string
  sensitive = true
}

variable "github_client_secret" {
  type      = string
  sensitive = true
}

variable "session_secret" {
  type      = string
  sensitive = true
}

variable "github_repo" {
  description = "The GitHub repository to trust for OIDC in the format org/repo."
  type        = string
  default     = "romit-gitcode/repo-assistant"
}
