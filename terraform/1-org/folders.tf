variable "org_id" {
  default = "475592048777"
}

# ── Dossier racine Nantares
resource "google_folder" "nantares" {
  display_name = "nantares"
  parent       = "organizations/${var.org_id}"
}

# ── Sous-dossiers par environnement
resource "google_folder" "staging" {
  display_name = "staging"
  parent       = google_folder.nantares.name
}

resource "google_folder" "production" {
  display_name = "production"
  parent       = google_folder.nantares.name
}

output "folder_staging_id" {
  value = google_folder.staging.folder_id
}

output "folder_production_id" {
  value = google_folder.production.folder_id
}
