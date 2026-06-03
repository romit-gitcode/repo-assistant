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
