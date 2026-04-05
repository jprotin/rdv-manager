#!/bin/sh
set -e

cd /app

# Importer les données persistées si elles existent
if [ -d "/app/emulator-data/firestore_export" ]; then
  echo "→ Import des données depuis /app/emulator-data"
  IMPORT_FLAG="--import=/app/emulator-data"
else
  echo "→ Démarrage avec une base vide"
  IMPORT_FLAG=""
fi

exec firebase emulators:start \
  --only firestore,auth \
  --project "${FIREBASE_PROJECT_ID:-rdv-dev}" \
  --export-on-exit=/app/emulator-data \
  $IMPORT_FLAG
