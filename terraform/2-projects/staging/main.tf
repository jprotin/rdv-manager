terraform {
  required_version = ">= 1.7"
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
  backend "gcs" {
    bucket = "tf-state-bootstrap-nantares"
    prefix = "2-projects-staging"
  }
}

provider "google" {
  impersonate_service_account = "terraform-admin@bootstrap-nantares.iam.gserviceaccount.com"
}

provider "google-beta" {
  impersonate_service_account = "terraform-admin@bootstrap-nantares.iam.gserviceaccount.com"
}

data "terraform_remote_state" "org" {
  backend = "gcs"
  config = {
    bucket = "tf-state-bootstrap-nantares"
    prefix = "1-org"
  }
}

module "project" {
  source = "../modules/project"

  project_id          = var.project_id
  folder_id           = data.terraform_remote_state.org.outputs.folder_staging_id
  billing_account_id  = var.billing_account_id
  github_owner        = var.github_owner
  github_repo         = var.github_repo
  project_owner_email = var.project_owner_email
}

output "project_id"             { value = module.project.project_id }
output "wif_provider"           { value = module.project.wif_provider }
output "github_actions_sa_email" { value = module.project.github_actions_sa_email }
