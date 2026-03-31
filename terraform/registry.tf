# Artifact Registry — dépôt Docker privé
resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = "rdv-manager"
  format        = "DOCKER"
  description   = "Images Docker RDV Manager"
  depends_on    = [google_project_service.apis]
}

# Autoriser Cloud Run à puller les images
resource "google_artifact_registry_repository_iam_member" "cloudrun_reader" {
  location   = google_artifact_registry_repository.repo.location
  repository = google_artifact_registry_repository.repo.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}
