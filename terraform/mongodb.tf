# Disque persistant pour les données MongoDB
resource "google_compute_disk" "mongodb_data" {
  name  = "mongodb-data"
  type  = "pd-standard"
  zone  = var.zone
  size  = 20 # Go
}

# VM Compute Engine — MongoDB
resource "google_compute_instance" "mongodb" {
  name         = "mongodb"
  machine_type = "e2-micro"
  zone         = var.zone
  tags         = ["mongodb"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 10
      type  = "pd-standard"
    }
  }

  # Disque de données MongoDB monté séparément
  attached_disk {
    source      = google_compute_disk.mongodb_data.id
    device_name = "mongodb-data"
    mode        = "READ_WRITE"
  }

  network_interface {
    network    = google_compute_network.vpc.id
    subnetwork = google_compute_subnetwork.subnet.id
    # Pas d'IP publique — accès via Cloud IAP uniquement
  }

  metadata = {
    startup-script = templatefile("${path.module}/scripts/mongodb-startup.sh", {
      mongo_password = var.mongo_password
    })
  }

  service_account {
    scopes = ["cloud-platform"]
  }

  depends_on = [google_compute_router_nat.nat]
}
