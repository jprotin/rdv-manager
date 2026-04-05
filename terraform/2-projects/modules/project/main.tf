terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

variable "project_id"          { type = string }
variable "folder_id"           { type = string }
variable "billing_account_id"  { type = string }
variable "region"              { default = "europe-west1" }
variable "github_owner"        { type = string }
variable "github_repo"         { type = string }
variable "project_owner_email" { type = string }

# ── Projet GCP
resource "google_project" "project" {
  name            = var.project_id
  project_id      = var.project_id
  folder_id       = var.folder_id
  billing_account = var.billing_account_id
}

# ── APIs nécessaires
resource "google_project_service" "apis" {
  for_each = toset([
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudidentity.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "identitytoolkit.googleapis.com",
  ])
  project            = google_project.project.project_id
  service            = each.value
  disable_on_destroy = false
}

# ── Projet Firebase
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = google_project.project.project_id
  depends_on = [google_project_service.apis]
}

# ── Base Firestore (mode natif)
resource "google_firestore_database" "default" {
  project     = google_project.project.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
  depends_on  = [google_firebase_project.default]
}

# ── Service Account GitHub Actions
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-cicd"
  display_name = "GitHub Actions CI/CD"
  project      = google_project.project.project_id
}

resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset([
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/iam.serviceAccountUser",
    "roles/firebase.admin",
    "roles/datastore.owner",
    "roles/serviceusage.serviceUsageConsumer",
  ])
  project = google_project.project.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# ── Workload Identity Federation
resource "google_iam_workload_identity_pool" "github" {
  project                   = google_project.project.project_id
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  depends_on                = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = google_project.project.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "assertion.repository == '${var.github_owner}/${var.github_repo}'"
}

resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_owner}/${var.github_repo}"
}

# ── Accès projet pour le propriétaire (editor, pas owner — évite ORG_MUST_INVITE)
resource "google_project_iam_member" "project_owner_editor" {
  project = google_project.project.project_id
  role    = "roles/editor"
  member  = "user:${var.project_owner_email}"
}


# ── Outputs
output "project_id" {
  value = google_project.project.project_id
}

output "wif_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}

output "github_actions_sa_email" {
  value = google_service_account.github_actions.email
}
