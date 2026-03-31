#!/bin/bash
set -e

# Usage: ./deploy-gcp.sh <PROJECT_ID> <MONGO_PASSWORD>
PROJECT_ID=${1:?"Usage: $0 <PROJECT_ID> <MONGO_PASSWORD>"}
MONGO_PASSWORD=${2:?"Usage: $0 <PROJECT_ID> <MONGO_PASSWORD>"}
REGION="europe-west1"
REGISTRY="$REGION-docker.pkg.dev/$PROJECT_ID/rdv-manager"
TF_DIR="$(dirname "$0")/terraform"

echo "→ Projet GCP : $PROJECT_ID"
echo "→ Région     : $REGION"
echo "→ Registre   : $REGISTRY"
echo ""

# 1. Authentification Docker vers Artifact Registry
echo "[1/5] Authentification Artifact Registry..."
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet

# 2. Terraform init + déploiement infrastructure (sans les images Cloud Run)
echo "[2/5] Déploiement infrastructure (VPC, MongoDB, Artifact Registry)..."
cd "$TF_DIR"
terraform init -upgrade

# Premier apply : uniquement l'infra sans Cloud Run (images pas encore poussées)
terraform apply \
  -var="project_id=$PROJECT_ID" \
  -var="mongo_password=$MONGO_PASSWORD" \
  -var="backend_image=gcr.io/cloudrun/placeholder" \
  -var="frontend_image=gcr.io/cloudrun/placeholder" \
  -target=google_project_service.apis \
  -target=google_artifact_registry_repository.repo \
  -target=google_compute_network.vpc \
  -target=google_compute_subnetwork.subnet \
  -target=google_compute_subnetwork.connector_subnet \
  -target=google_compute_router.router \
  -target=google_compute_router_nat.nat \
  -target=google_compute_disk.mongodb_data \
  -target=google_compute_instance.mongodb \
  -target=google_vpc_access_connector.connector \
  -target=google_service_account.cloudrun_sa \
  -auto-approve

# 3. Build et push backend
echo "[3/5] Build et push backend..."
cd "$(dirname "$0")"
docker build -t "$REGISTRY/backend:latest" ./backend
docker push "$REGISTRY/backend:latest"

# 4. Déployer le backend Cloud Run pour obtenir son URL
echo "[4/5] Déploiement backend Cloud Run..."
cd "$TF_DIR"
terraform apply \
  -var="project_id=$PROJECT_ID" \
  -var="mongo_password=$MONGO_PASSWORD" \
  -var="backend_image=$REGISTRY/backend:latest" \
  -var="frontend_image=gcr.io/cloudrun/placeholder" \
  -target=google_cloud_run_v2_service.backend \
  -target=google_cloud_run_v2_service_iam_member.backend_public \
  -auto-approve

BACKEND_URL=$(terraform output -raw backend_url)
echo "→ Backend URL : $BACKEND_URL"

# 5. Build frontend avec l'URL backend, puis déployer
echo "[5/5] Build et push frontend, déploiement..."
cd "$(dirname "$0")"
docker build \
  --build-arg VITE_API_URL="$BACKEND_URL/api" \
  -t "$REGISTRY/frontend:latest" \
  ./frontend
docker push "$REGISTRY/frontend:latest"

cd "$TF_DIR"
terraform apply \
  -var="project_id=$PROJECT_ID" \
  -var="mongo_password=$MONGO_PASSWORD" \
  -var="backend_image=$REGISTRY/backend:latest" \
  -var="frontend_image=$REGISTRY/frontend:latest" \
  -auto-approve

echo ""
echo "✓ Déploiement terminé !"
echo "→ Frontend : $(terraform output -raw frontend_url)"
echo "→ Backend  : $(terraform output -raw backend_url)"
