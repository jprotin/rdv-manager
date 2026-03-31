# Déploiement GCP avec Terraform

## Architecture

```
Internet (HTTPS)
  │
  └── Cloud Run — frontend  (nginx, fichiers statiques React)
        │  Firebase SDK (embarqué dans le bundle JS)
        └── Firestore  (base de données managée GCP, offline-first)

Artifact Registry  (image Docker frontend)
```

Le frontend est une **application statique** : il n'y a pas de backend Node.js. Toute la logique de données passe par le SDK Firebase directement depuis le navigateur. La configuration Firestore (API key, project ID, etc.) est compilée dans le bundle au moment du `docker build`.

---

## Développement local

### Prérequis

| Outil | Rôle |
|-------|------|
| Docker + Docker Compose | Émulateur Firestore + frontend dev |

### Démarrage

```bash
# 1. Créer le fichier de configuration
cp frontend/.env.example frontend/.env
# Éditer frontend/.env — le project ID peut être fictif (ex: rdv-dev)
# Les autres valeurs Firebase peuvent aussi être fictives pour l'émulateur

# 2. Tout démarrer (premier lancement : ~2 min pour builder l'image émulateur)
./deploy.sh dev
```

L'environnement complet démarre en séquence :
1. **Émulateur Firestore** (Docker) — attend le healthcheck avant de continuer
2. **Frontend Vite** (Docker) — `npm install` puis `npm run dev`

| Service | URL |
|---------|-----|
| Application | http://localhost:5173 |
| Emulator UI | http://localhost:4000 |

Le SDK Firebase détecte automatiquement `import.meta.env.DEV === true` et redirige toutes les requêtes vers l'émulateur local (`127.0.0.1:8080`) — aucun appel ne part vers GCP.

### Commandes dev

```bash
./deploy.sh dev        # démarrer (build si nécessaire)
./deploy.sh dev-stop   # arrêter (données exportées dans ./emulator-data/)
./deploy.sh dev-logs   # logs en temps réel
```

Les données Firestore sont persistées entre les redémarrages dans `./emulator-data/` (ignoré par git).

### Structure de l'émulateur

```
emulator/
├── Dockerfile   # node:20-alpine + OpenJDK 17 + firebase-tools
└── start.sh     # importe ./emulator-data/ si présent, sinon base vide
firebase.json          # config ports émulateur (host: 0.0.0.0 pour Docker)
firestore.rules        # règles de sécurité (appliquées par l'émulateur)
firestore.indexes.json # index composites
```

---

## Déploiement GCP

### Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Terraform | 1.5+ |
| gcloud CLI | récente |
| Docker | 24+ |

### Compte GCP et Firebase

1. Créer un projet sur [console.cloud.google.com](https://console.cloud.google.com)
2. **Activer la facturation** sur ce projet
3. Ouvrir [console.firebase.google.com](https://console.firebase.google.com), ajouter le projet GCP existant
4. Dans Firebase Console → Project Settings → General → *Your apps* → ajouter une app Web
5. Copier le bloc de configuration Firebase (API key, project ID, etc.)
6. Dans Firebase Console → Build → Firestore Database → créer la base en mode **natif** (région `europe-west1`)

### Authentification locale

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project <PROJECT_ID>
```

### Variables d'environnement

Exporter les variables Firebase avant de lancer le déploiement :

```bash
export VITE_FIREBASE_API_KEY="AIzaSy..."
export VITE_FIREBASE_AUTH_DOMAIN="mon-projet.firebaseapp.com"
export VITE_FIREBASE_PROJECT_ID="mon-projet-123"
export VITE_FIREBASE_STORAGE_BUCKET="mon-projet-123.appspot.com"
export VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
export VITE_FIREBASE_APP_ID="1:123456789:web:abc123"
```

### Premier déploiement

```bash
./deploy-gcp.sh <PROJECT_ID>
```

Le script effectue 3 étapes :

```
[1/3] Authentification Artifact Registry
[2/3] Infrastructure : APIs GCP + Artifact Registry + Firestore + Cloud Run (placeholder)
       └── terraform apply -target=...
[3/3] Build Docker frontend (Firebase config compilée dans le bundle)
       └── docker build --build-arg VITE_FIREBASE_* ...
       └── docker push
       └── terraform apply (image finale)
```

### Mise à jour du frontend

```bash
REGISTRY="europe-west1-docker.pkg.dev/<PROJECT_ID>/rdv-manager"

docker build \
  --build-arg VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY" \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="$VITE_FIREBASE_AUTH_DOMAIN" \
  --build-arg VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID" \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="$VITE_FIREBASE_STORAGE_BUCKET" \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="$VITE_FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg VITE_FIREBASE_APP_ID="$VITE_FIREBASE_APP_ID" \
  -t $REGISTRY/frontend:latest ./frontend

docker push $REGISTRY/frontend:latest
gcloud run deploy rdv-frontend --image $REGISTRY/frontend:latest --region europe-west1
```

### Destruction complète

```bash
cd terraform
terraform destroy \
  -var="project_id=<PROJECT_ID>" \
  -var="frontend_image=placeholder" \
  -var="firebase_api_key=x" \
  -var="firebase_auth_domain=x" \
  -var="firebase_storage_bucket=x" \
  -var="firebase_messaging_sender_id=x" \
  -var="firebase_app_id=x"
```

> La base Firestore et ses données **ne sont pas supprimées** par Terraform destroy (protection GCP). La supprimer manuellement depuis la console Firebase si nécessaire.

---

## Structure Terraform

```
terraform/
├── main.tf               # Provider Google, APIs activées, compte de service Cloud Run
├── variables.tf          # Variables d'entrée
├── outputs.tf            # URLs en sortie
├── registry.tf           # Artifact Registry (dépôt Docker privé)
├── firestore.tf          # Base de données Firestore native
└── frontend_cloudrun.tf  # Cloud Run frontend + accès public
```

### Variables (`variables.tf`)

| Variable | Description |
|----------|-------------|
| `project_id` | Project ID GCP |
| `region` | Région (défaut : `europe-west1`) |
| `frontend_image` | Image Docker frontend (Artifact Registry) |
| `firebase_api_key` | Firebase Web API Key (sensitive) |
| `firebase_auth_domain` | Firebase Auth Domain |
| `firebase_storage_bucket` | Firebase Storage Bucket |
| `firebase_messaging_sender_id` | Firebase Messaging Sender ID |
| `firebase_app_id` | Firebase App ID (sensitive) |

### Outputs (`outputs.tf`)

| Output | Description |
|--------|-------------|
| `frontend_url` | URL HTTPS publique du frontend |
| `artifact_registry` | URL de base du registre Docker |

---

## Ressources créées

### APIs GCP activées

- `run.googleapis.com` — Cloud Run
- `firestore.googleapis.com` — Firestore
- `artifactregistry.googleapis.com` — Artifact Registry
- `cloudresourcemanager.googleapis.com` — gestion du projet

### Firestore (`firestore.tf`)

Base de données en mode **natif** (`FIRESTORE_NATIVE`) en `europe-west1`. La structure des collections est gérée au niveau applicatif :

| Collection | Champs principaux |
|------------|------------------|
| `clients` | `firstName`, `lastName`, `phone`, `address`, `deletedAt`, `createdAt` |
| `appointments` | `title`, `clientId`, `client` (snapshot), `startAt`, `endAt`, `status`, `deletedAt` |

Toutes les suppressions sont des **soft deletes** (`deletedAt: Timestamp \| null`). Les requêtes filtrent systématiquement sur `where('deletedAt', '==', null)`.

### Index composites (`firestore.indexes.json`)

| Collection | Champs indexés |
|------------|---------------|
| `appointments` | `deletedAt` ASC + `startAt` ASC |
| `appointments` | `deletedAt` ASC + `startAt` DESC |
| `appointments` | `deletedAt` ASC + `status` ASC + `startAt` ASC |
| `clients` | `deletedAt` ASC + `lastName` ASC |

Déployer les index manuellement si nécessaire :
```bash
firebase deploy --only firestore:indexes --project <PROJECT_ID>
```

### Artifact Registry (`registry.tf`)

Dépôt Docker privé `rdv-manager` en `europe-west1`. Le compte de service `rdv-cloudrun` dispose du rôle `roles/artifactregistry.reader`.

### Cloud Run frontend (`frontend_cloudrun.tf`)

| Paramètre | Valeur |
|-----------|--------|
| Nom | `rdv-frontend` |
| Port | 80 (nginx) |
| CPU | 1 vCPU |
| Mémoire | 256 Mi |
| Min instances | 0 (scale to zero) |
| Max instances | 5 |
| Accès | public (`allUsers`) |

Le conteneur sert les fichiers statiques via nginx. La configuration Firebase est compilée dans le bundle JS au `docker build` — aucune variable d'environnement runtime n'est nécessaire.

---

## Sécurité Firestore

Les règles dans `firestore.rules` contrôlent l'accès aux données depuis le navigateur. En l'absence de Firebase Authentication, elles sont actuellement ouvertes (`allow read, write: if true`).

Pour restreindre l'accès à des utilisateurs authentifiés :

```js
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Déployer les règles :
```bash
firebase deploy --only firestore:rules --project <PROJECT_ID>
```

---

## Coûts estimés (europe-west1)

| Ressource | Coût mensuel estimé |
|-----------|-------------------|
| Cloud Run frontend (faible trafic) | < 1 € |
| Firestore (< 50k lectures/jour) | gratuit (free tier) |
| Firestore (au-delà) | ~0,06 €/100k lectures |
| Artifact Registry (< 1 Go) | ~0,10 € |
| **Total estimé** | **< 2 €/mois** |

> Le free tier Firestore couvre 50 000 lectures, 20 000 écritures et 20 000 suppressions par jour — largement suffisant pour un usage personnel ou une petite équipe.
