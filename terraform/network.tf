# VPC
resource "google_compute_network" "vpc" {
  name                    = "rdv-manager-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

# Subnet principal
resource "google_compute_subnetwork" "subnet" {
  name          = "rdv-manager-subnet"
  ip_cidr_range = "10.10.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# Subnet dédié VPC Access Connector (/28 obligatoire)
resource "google_compute_subnetwork" "connector_subnet" {
  name          = "rdv-manager-connector"
  ip_cidr_range = "10.10.1.0/28"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# VPC Access Connector — permet à Cloud Run d'atteindre le VPC privé
resource "google_vpc_access_connector" "connector" {
  name          = "rdv-connector"
  region        = var.region
  subnet {
    name = google_compute_subnetwork.connector_subnet.name
  }
  machine_type  = "e2-micro"
  min_instances = 2
  max_instances = 3
  depends_on    = [google_project_service.apis]
}

# Cloud NAT — accès internet sortant pour la VM MongoDB (installation des packages)
resource "google_compute_router" "router" {
  name    = "rdv-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "rdv-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# Firewall — MongoDB accessible uniquement depuis le VPC interne
resource "google_compute_firewall" "allow_mongo_internal" {
  name    = "allow-mongo-internal"
  network = google_compute_network.vpc.id

  allow {
    protocol = "tcp"
    ports    = ["27017"]
  }

  source_ranges = ["10.10.0.0/24", "10.10.1.0/28"]
  target_tags   = ["mongodb"]
}

# Firewall — SSH depuis Cloud IAP uniquement (pas d'exposition publique)
resource "google_compute_firewall" "allow_ssh_iap" {
  name    = "allow-ssh-iap"
  network = google_compute_network.vpc.id

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"] # Plage IP de Cloud IAP
  target_tags   = ["mongodb"]
}
