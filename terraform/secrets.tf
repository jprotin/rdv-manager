# Secret Manager — mot de passe MongoDB
resource "google_secret_manager_secret" "mongo_password" {
  secret_id = "mongo-password"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "mongo_password" {
  secret      = google_secret_manager_secret.mongo_password.id
  secret_data = var.mongo_password
}

# Compte de service pour Cloud Run
resource "google_service_account" "cloudrun_sa" {
  account_id   = "rdv-cloudrun"
  display_name = "Cloud Run RDV Manager"
}

# Autoriser Cloud Run à lire le secret
resource "google_secret_manager_secret_iam_member" "cloudrun_secret_access" {
  secret_id = google_secret_manager_secret.mongo_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}
