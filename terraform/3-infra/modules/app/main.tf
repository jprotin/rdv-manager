terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id"   { type = string }
variable "region"       { default = "europe-west1" }
variable "service_name" { default = "rdv-frontend" }
variable "image"        { default = "nginx:alpine" }

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

# ── Cloud Run Service
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

# ── Accès public — la sécurité est portée par Firebase Auth + Firestore rules
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "service_url" {
  value = google_cloud_run_v2_service.frontend.uri
}

output "registry_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.rdv_manager.repository_id}"
}
