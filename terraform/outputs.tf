output "frontend_url" {
  description = "URL publique du frontend"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "backend_url" {
  description = "URL publique du backend"
  value       = google_cloud_run_v2_service.backend.uri
}

output "mongodb_private_ip" {
  description = "IP privée de la VM MongoDB"
  value       = google_compute_instance.mongodb.network_interface[0].network_ip
}

output "artifact_registry" {
  description = "URL du registre Docker"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/rdv-manager"
}
