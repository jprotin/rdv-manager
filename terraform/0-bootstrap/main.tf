terraform {
  required_version = ">= 1.7"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  # Backend local au démarrage — migré vers GCS par bootstrap.sh
}

provider "google" {
  project = var.bootstrap_project_id
  region  = var.region
}

variable "bootstrap_project_id" {
  default = "bootstrap-nantares"
}

variable "region" {
  default = "europe-west1"
}

variable "billing_account" {
  default = "0197BD-386347-ADCA30"
}

variable "org_id" {
  default = "475592048777"
}

# ── Bucket GCS pour l'état Terraform
resource "google_storage_bucket" "tf_state" {
  name          = "tf-state-${var.bootstrap_project_id}"
  project       = var.bootstrap_project_id
  location      = var.region
  force_destroy = false

  versioning {
    enabled = true
  }

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition { num_newer_versions = 5 }
    action { type = "Delete" }
  }
}

# ── Service Account terraform-admin
resource "google_service_account" "terraform_admin" {
  account_id   = "terraform-admin"
  display_name = "Terraform Admin SA"
  project      = var.bootstrap_project_id
}

# ── Rôles org-level pour terraform-admin
locals {
  org_roles = [
    "roles/resourcemanager.organizationAdmin",
    "roles/resourcemanager.folderAdmin",
    "roles/resourcemanager.projectCreator",
    "roles/resourcemanager.projectDeleter",
    "roles/billing.user",
    "roles/iam.organizationRoleAdmin",
    "roles/orgpolicy.policyAdmin",
    "roles/serviceusage.serviceUsageAdmin",
    "roles/storage.admin",
    "roles/firebase.admin",
  ]
}

resource "google_organization_iam_member" "terraform_admin_org_roles" {
  for_each = toset(local.org_roles)
  org_id   = var.org_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.terraform_admin.email}"
}

# ── Accès au bucket d'état
resource "google_storage_bucket_iam_member" "terraform_admin_state" {
  bucket = google_storage_bucket.tf_state.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.terraform_admin.email}"
}

output "terraform_admin_email" {
  value = google_service_account.terraform_admin.email
}

output "state_bucket" {
  value = google_storage_bucket.tf_state.name
}
