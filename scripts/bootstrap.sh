#!/usr/bin/env bash
# =============================================================================
# bootstrap.sh — Initialisation unique de la landing zone
#
# Ce script est le SEUL point d'entrée manuel. Il crée le bucket GCS pour
# l'état Terraform, le SA terraform-admin, et migre l'état local vers GCS.
#
# Prérequis :
#   - gcloud CLI installé et authentifié (gcloud auth login + application-default login)
#   - terraform >= 1.7 installé
#   - Être Organization Admin sur 475592048777
# =============================================================================
set -euo pipefail

BOOTSTRAP_PROJECT="bootstrap-nantares"
BILLING_ACCOUNT="0197BD-386347-ADCA30"
STATE_BUCKET="tf-state-${BOOTSTRAP_PROJECT}"
REGION="europe-west1"
TF_DIR="$(cd "$(dirname "$0")/../terraform/0-bootstrap" && pwd)"

echo "=========================================="
echo " RDV Manager — Bootstrap Landing Zone"
echo "=========================================="
echo "Projet bootstrap : $BOOTSTRAP_PROJECT"
echo "Bucket état TF   : $STATE_BUCKET"
echo ""

# ── Vérifications
command -v gcloud    >/dev/null 2>&1 || { echo "ERREUR : gcloud non installé"; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "ERREUR : terraform non installé"; exit 1; }

echo "[1/5] Association du compte de facturation au projet bootstrap..."
gcloud billing projects link "$BOOTSTRAP_PROJECT" \
  --billing-account="$BILLING_ACCOUNT" \
  --quiet

echo "[2/5] Activation des APIs de base dans le projet bootstrap..."
gcloud services enable \
  cloudresourcemanager.googleapis.com \
  cloudbilling.googleapis.com \
  iam.googleapis.com \
  storage.googleapis.com \
  orgpolicy.googleapis.com \
  firebase.googleapis.com \
  iamcredentials.googleapis.com \
  --project="$BOOTSTRAP_PROJECT" \
  --quiet

echo "[3/5] Terraform init (backend local)..."
cd "$TF_DIR"
terraform init -reconfigure

echo "[4/5] Terraform apply — création du bucket + SA terraform-admin..."
terraform apply -auto-approve

# ── Droit d'impersonation : le compte courant peut utiliser terraform-admin
CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null)
if [ -z "$CURRENT_ACCOUNT" ]; then
  echo "ERREUR : aucun compte gcloud actif. Lance : gcloud auth login"
  exit 1
fi
echo "  → Ajout de serviceAccountTokenCreator pour ${CURRENT_ACCOUNT}..."
gcloud iam service-accounts add-iam-policy-binding \
  "terraform-admin@${BOOTSTRAP_PROJECT}.iam.gserviceaccount.com" \
  --member="user:${CURRENT_ACCOUNT}" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --project="$BOOTSTRAP_PROJECT"

echo "[5/5] Migration de l'état local vers GCS..."
cat > backend_override.tf << EOF
terraform {
  backend "gcs" {
    bucket = "${STATE_BUCKET}"
    prefix = "0-bootstrap"
  }
}
EOF

terraform init -migrate-state -force-copy
rm backend_override.tf

echo ""
echo "=========================================="
echo " Bootstrap terminé avec succès !"
echo "=========================================="
echo ""
echo "Prochaines étapes :"
echo "  1. Renseigner billing_account_id + github_owner dans :"
echo "     terraform/2-projects/staging/terraform.tfvars"
echo "     terraform/2-projects/production/terraform.tfvars"
echo ""
echo "  2. Appliquer les couches dans l'ordre :"
echo "     cd terraform/1-org      && terraform init && terraform apply"
echo "     cd terraform/2-projects/staging     && terraform init && terraform apply"
echo "     cd terraform/2-projects/production  && terraform init && terraform apply"
echo "     cd terraform/3-infra/staging        && terraform init && terraform apply"
echo "     cd terraform/3-infra/production     && terraform init && terraform apply"
echo ""
echo "  3. Récupérer les outputs WIF + SA emails :"
echo "     cd terraform/2-projects/staging    && terraform output"
echo "     cd terraform/2-projects/production && terraform output"
echo ""
echo "  4. Renseigner les secrets GitHub (Settings → Secrets → Actions)"
echo "  5. Créer l'environnement GitHub 'production' avec reviewer"
