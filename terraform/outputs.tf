output "frontend_url" {
  description = "URL publique du frontend"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "artifact_registry" {
  description = "URL du registre Docker"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/rdv-manager"
}
