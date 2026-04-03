terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id"    { type = string }
variable "region"        { default = "europe-west1" }
variable "service_name"  { default = "rdv-frontend" }
variable "image"         { default = "nginx:alpine" }  # remplacé par le pipeline CI/CD
variable "support_email" { type = string; description = "Email affiché sur l'écran de consentement IAP" }
variable "iap_members"   { type = list(string); description = "Identités Google autorisées (ex: ['user:alice@example.com'])" }

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

# ── IAP Brand (écran de consentement OAuth — 1 seul par projet)
resource "google_iap_brand" "default" {
  project           = var.project_id
  support_email     = var.support_email
  application_title = "RDV Manager"
}

# ── IAP OAuth Client
resource "google_iap_client" "default" {
  brand        = google_iap_brand.default.name
  display_name = "RDV Manager IAP Client"
}

# ── Cloud Run Service avec IAP natif
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

  # IAP natif Cloud Run
  iap {
    enabled              = true
    oauth2_client_id     = google_iap_client.default.client_id
    oauth2_client_secret = google_iap_client.default.secret
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].containers[0].env,
    ]
  }
}

# ── Accès restreint via IAP (remplace allUsers)
resource "google_cloud_run_v2_service_iam_member" "iap_invoker" {
  for_each = toset(var.iap_members)

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
