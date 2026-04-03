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
    prefix = "1-org"
  }
}

provider "google" {
  impersonate_service_account = "terraform-admin@bootstrap-nantares.iam.gserviceaccount.com"
  region                      = "europe-west1"
}
