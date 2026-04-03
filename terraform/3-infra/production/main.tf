terraform {
  required_version = ">= 1.7"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "tf-state-bootstrap-nantares"
    prefix = "3-infra-production"
  }
}

provider "google" {
  impersonate_service_account = "terraform-admin@bootstrap-nantares.iam.gserviceaccount.com"
}

data "terraform_remote_state" "projects_production" {
  backend = "gcs"
  config = {
    bucket = "tf-state-bootstrap-nantares"
    prefix = "2-projects-production"
  }
}

module "app" {
  source         = "../modules/app"
  project_id     = data.terraform_remote_state.projects_production.outputs.project_id
  support_email  = var.support_email
  iap_members    = var.iap_members
}

output "service_url"  { value = module.app.service_url }
output "registry_url" { value = module.app.registry_url }
