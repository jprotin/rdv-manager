variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west1"
}

variable "zone" {
  type    = string
  default = "europe-west1-b"
}

variable "mongo_password" {
  description = "Mot de passe MongoDB admin"
  type        = string
  sensitive   = true
}

variable "backend_image" {
  description = "Image Docker backend (Artifact Registry)"
  type        = string
}

variable "frontend_image" {
  description = "Image Docker frontend (Artifact Registry)"
  type        = string
}
