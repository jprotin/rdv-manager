terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id"          { type = string }
variable "region"               { default = "europe-west1" }
variable "service_name"         { default = "rdv-frontend" }
variable "image"                { default = "nginx:alpine" }
variable "authorized_members"   {
  type        = list(string)
  description = "Identités Google autorisées à invoquer le service (ex: ['user:alice@nantares.com'])"
}

# ── Artifact Registry
resource "google_artifact_registry_repository" "rdv_manager" {
  project       = var.project_id
  location      = var.region
  repository_id = "rdv-manager"
  format        = "DOCKER"
  description   = "Images Docker RDV Manager"
}

# ── Service Account Cloud Run
resource "google_service_account" "cloud_run" {
  account_id   = "cloud-run-sa"
  display_name = "Cloud Run Service Account"
  project      = var.project_id
}

resource "google_project_iam_member" "cloud_run_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# ── Cloud Run Service (pas d'accès public)
resource "google_cloud_run_v2_service" "frontend" {
  name     = var.service_name
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.cloud_run.email

    containers {
      image = var.image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].containers[0].env,
    ]
  }
}

# ── Accès restreint aux membres autorisés uniquement
resource "google_cloud_run_v2_service_iam_member" "invoker" {
  for_each = toset(var.authorized_members)

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = each.value
}

output "service_url" {
  value = google_cloud_run_v2_service.frontend.uri
}

output "registry_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.rdv_manager.repository_id}"
}
