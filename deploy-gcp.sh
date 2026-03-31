#!/bin/bash
set -e

# Usage: ./deploy-gcp.sh <PROJECT_ID>
# Variables Firebase à définir dans l'environnement ou en arguments
PROJECT_ID=${1:?"Usage: $0 <PROJECT_ID>"}
REGION="europe-west1"
REGISTRY="$REGION-docker.pkg.dev/$PROJECT_ID/rdv-manager"
TF_DIR="$(dirname "$0")/terraform"

: "${VITE_FIREBASE_API_KEY:?Variable VITE_FIREBASE_API_KEY requise}"
: "${VITE_FIREBASE_AUTH_DOMAIN:?Variable VITE_FIREBASE_AUTH_DOMAIN requise}"
: "${VITE_FIREBASE_PROJECT_ID:?Variable VITE_FIREBASE_PROJECT_ID requise}"
: "${VITE_FIREBASE_STORAGE_BUCKET:?Variable VITE_FIREBASE_STORAGE_BUCKET requise}"
: "${VITE_FIREBASE_MESSAGING_SENDER_ID:?Variable VITE_FIREBASE_MESSAGING_SENDER_ID requise}"
: "${VITE_FIREBASE_APP_ID:?Variable VITE_FIREBASE_APP_ID requise}"

echo "→ Projet GCP : $PROJECT_ID"
echo "→ Région     : $REGION"
echo "→ Registre   : $REGISTRY"
echo ""

# 1. Authentification Docker vers Artifact Registry
echo "[1/3] Authentification Artifact Registry..."
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet

# 2. Terraform : infrastructure (Artifact Registry + Firestore + Cloud Run placeholder)
echo "[2/3] Déploiement infrastructure..."
cd "$TF_DIR"
terraform init -upgrade
terraform apply \
  -var="project_id=$PROJECT_ID" \
  -var="frontend_image=gcr.io/cloudrun/placeholder" \
  -var="firebase_api_key=$VITE_FIREBASE_API_KEY" \
  -var="firebase_auth_domain=$VITE_FIREBASE_AUTH_DOMAIN" \
  -var="firebase_storage_bucket=$VITE_FIREBASE_STORAGE_BUCKET" \
  -var="firebase_messaging_sender_id=$VITE_FIREBASE_MESSAGING_SENDER_ID" \
  -var="firebase_app_id=$VITE_FIREBASE_APP_ID" \
  -target=google_project_service.apis \
  -target=google_artifact_registry_repository.repo \
  -target=google_firestore_database.default \
  -target=google_service_account.cloudrun_sa \
  -auto-approve

# 3. Build + push frontend, déploiement Cloud Run
echo "[3/3] Build, push et déploiement frontend..."
cd "$(dirname "$0")"
docker build \
  --build-arg VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY" \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="$VITE_FIREBASE_AUTH_DOMAIN" \
  --build-arg VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID" \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="$VITE_FIREBASE_STORAGE_BUCKET" \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="$VITE_FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg VITE_FIREBASE_APP_ID="$VITE_FIREBASE_APP_ID" \
  -t "$REGISTRY/frontend:latest" \
  ./frontend
docker push "$REGISTRY/frontend:latest"

cd "$TF_DIR"
terraform apply \
  -var="project_id=$PROJECT_ID" \
  -var="frontend_image=$REGISTRY/frontend:latest" \
  -var="firebase_api_key=$VITE_FIREBASE_API_KEY" \
  -var="firebase_auth_domain=$VITE_FIREBASE_AUTH_DOMAIN" \
  -var="firebase_storage_bucket=$VITE_FIREBASE_STORAGE_BUCKET" \
  -var="firebase_messaging_sender_id=$VITE_FIREBASE_MESSAGING_SENDER_ID" \
  -var="firebase_app_id=$VITE_FIREBASE_APP_ID" \
  -auto-approve

echo ""
echo "✓ Déploiement terminé !"
echo "→ Frontend : $(terraform output -raw frontend_url)"
