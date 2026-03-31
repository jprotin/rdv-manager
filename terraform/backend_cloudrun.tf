locals {
  mongo_uri = "mongodb://rdvadmin:${var.mongo_password}@${google_compute_instance.mongodb.network_interface[0].network_ip}:27017/rdvmanager?authSource=admin"
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "rdv-backend"
  location = var.region

  template {
    service_account = google_service_account.cloudrun_sa.email

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.backend_image

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = "4201"
      }
      env {
        name  = "CORS_ORIGIN"
        value = "*"
      }
      env {
        name = "MONGO_URI"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.mongo_uri.id
            version = "latest"
          }
        }
      }

      ports {
        container_port = 4201
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 4201
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 10
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }

  depends_on = [
    google_vpc_access_connector.connector,
    google_secret_manager_secret_version.mongo_uri,
  ]
}

# Secret séparé pour l'URI complète MongoDB
resource "google_secret_manager_secret" "mongo_uri" {
  secret_id = "mongo-uri"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "mongo_uri" {
  secret      = google_secret_manager_secret.mongo_uri.id
  secret_data = local.mongo_uri
}

resource "google_secret_manager_secret_iam_member" "cloudrun_mongo_uri" {
  secret_id = google_secret_manager_secret.mongo_uri.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# Accès public au backend
resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
