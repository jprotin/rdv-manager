# Déploiement GCP avec Terraform

## Architecture

```
Internet (HTTPS)
  │
  ├── Cloud Run — frontend  (nginx, static files)
  │     │  VITE_API_URL → backend URL
  │     └── Cloud Run — backend  (Node.js / Express)
  │           │  VPC Access Connector
  │           └── VM Compute Engine e2-micro — MongoDB 7
  │                 └── Disque persistant 20 Go (pd-standard)
  │
  └── Artifact Registry  (images Docker privées)
      Secret Manager     (MONGO_URI)
      Cloud NAT          (accès internet sortant VM uniquement)
```

Toutes les ressources sont déployées en **europe-west1**. MongoDB n'est jamais exposé sur internet : il n'a pas d'IP publique et n'est accessible qu'en SSH via Cloud IAP ou depuis Cloud Run via le VPC connector.

---

## Prérequis

| Outil | Version minimale | Installation |
|-------|-----------------|--------------|
| Terraform | 1.5+ | [terraform.io/downloads](https://developer.hashicorp.com/terraform/downloads) |
| gcloud CLI | récente | [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install) |
| Docker | 24+ | [docs.docker.com](https://docs.docker.com/get-docker/) |

### Compte GCP

1. Créer un projet sur [console.cloud.google.com](https://console.cloud.google.com)
2. **Activer la facturation** sur ce projet (obligatoire pour Compute Engine et Cloud Run)
3. Noter le **Project ID** (pas le nom, le slug `mon-projet-123`)

### Authentification locale

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project <PROJECT_ID>
```

---

## Structure Terraform

```
terraform/
├── main.tf                  # Provider Google, activation des APIs
├── variables.tf             # Variables d'entrée
├── outputs.tf               # URLs et IP en sortie
├── network.tf               # VPC, subnets, VPC connector, Cloud NAT, firewall
├── secrets.tf               # Secret Manager + compte de service Cloud Run
├── registry.tf              # Artifact Registry (dépôt Docker)
├── mongodb.tf               # VM Compute Engine + disque persistant
├── backend_cloudrun.tf      # Cloud Run backend + secret MONGO_URI
├── frontend_cloudrun.tf     # Cloud Run frontend
└── scripts/
    └── mongodb-startup.sh   # Script d'initialisation de la VM
```

### Variables (`variables.tf`)

| Variable | Type | Description |
|----------|------|-------------|
| `project_id` | string | Project ID GCP |
| `region` | string | Région (défaut : `europe-west1`) |
| `zone` | string | Zone (défaut : `europe-west1-b`) |
| `mongo_password` | string (sensitive) | Mot de passe admin MongoDB |
| `backend_image` | string | Image Docker backend (Artifact Registry) |
| `frontend_image` | string | Image Docker frontend (Artifact Registry) |

### Outputs (`outputs.tf`)

| Output | Description |
|--------|-------------|
| `frontend_url` | URL HTTPS publique du frontend |
| `backend_url` | URL HTTPS publique du backend |
| `mongodb_private_ip` | IP privée de la VM MongoDB |
| `artifact_registry` | URL de base du registre Docker |

---

## Ressources créées

### APIs GCP activées (`main.tf`)

- `run.googleapis.com` — Cloud Run
- `compute.googleapis.com` — Compute Engine (VM MongoDB)
- `secretmanager.googleapis.com` — Secret Manager
- `artifactregistry.googleapis.com` — Artifact Registry
- `vpcaccess.googleapis.com` — VPC Access Connector
- `cloudresourcemanager.googleapis.com` — gestion du projet

### Réseau (`network.tf`)

| Ressource | Nom | CIDR | Rôle |
|-----------|-----|------|------|
| VPC | `rdv-manager-vpc` | — | Réseau privé principal |
| Subnet | `rdv-manager-subnet` | `10.10.0.0/24` | VM MongoDB |
| Subnet | `rdv-manager-connector` | `10.10.1.0/28` | VPC Access Connector (taille imposée par GCP) |
| VPC Connector | `rdv-connector` | — | Pont Cloud Run → VPC |
| Cloud Router | `rdv-router` | — | Support NAT |
| Cloud NAT | `rdv-nat` | — | Internet sortant pour la VM (installation des packages) |

**Règles firewall :**
- Port 27017 (MongoDB) autorisé uniquement depuis `10.10.0.0/24` et `10.10.1.0/28`
- Port 22 (SSH) autorisé uniquement depuis `35.235.240.0/20` (plage Cloud IAP)
- Aucune IP publique sur la VM MongoDB

### VM MongoDB (`mongodb.tf`)

- **Machine** : `e2-micro` (~7 €/mois en europe-west1)
- **OS** : Ubuntu 22.04 LTS
- **Disque boot** : 10 Go `pd-standard`
- **Disque données** : 20 Go `pd-standard` monté sur `/data/mongodb`
- **Réseau** : IP privée uniquement, pas d'IP publique

Le script `scripts/mongodb-startup.sh` s'exécute au premier démarrage et :
1. Formate et monte le disque de données (`/data/mongodb`)
2. Installe MongoDB 7 Community Edition
3. Configure MongoDB pour écouter sur toutes les interfaces (port 27017)
4. Crée l'utilisateur admin `rdvadmin` avec le mot de passe fourni
5. Active l'authentification et redémarre MongoDB

> **Idempotence** : le script vérifie si l'utilisateur existe déjà avant de le créer. Il peut être ré-exécuté sans effet secondaire.

### Secret Manager (`secrets.tf`)

Deux secrets sont créés :

| Secret | Contenu |
|--------|---------|
| `mongo-password` | Mot de passe MongoDB brut |
| `mongo-uri` | URI complète `mongodb://rdvadmin:<password>@<ip>:27017/rdvmanager?authSource=admin` |

Un **compte de service** `rdv-cloudrun` est créé et dispose du rôle `roles/secretmanager.secretAccessor` sur ces deux secrets. Ce compte est utilisé par les deux services Cloud Run.

### Artifact Registry (`registry.tf`)

Dépôt Docker privé `rdv-manager` en `europe-west1`. Le compte de service `rdv-cloudrun` dispose du rôle `roles/artifactregistry.reader` pour que Cloud Run puisse puller les images.

### Backend Cloud Run (`backend_cloudrun.tf`)

| Paramètre | Valeur |
|-----------|--------|
| Nom | `rdv-backend` |
| Port | 4201 |
| CPU | 1 vCPU |
| Mémoire | 512 Mi |
| Min instances | 0 (scale to zero) |
| Max instances | 10 |
| VPC egress | `PRIVATE_RANGES_ONLY` (trafic vers MongoDB via VPC) |

Variables d'environnement injectées :
- `NODE_ENV=production`
- `PORT=4201`
- `CORS_ORIGIN=*`
- `MONGO_URI` → lu depuis Secret Manager (jamais en clair dans la config)

Un health check sur `GET /health` est configuré avec un délai initial de 5 secondes.

### Frontend Cloud Run (`frontend_cloudrun.tf`)

| Paramètre | Valeur |
|-----------|--------|
| Nom | `rdv-frontend` |
| Port | 80 |
| CPU | 1 vCPU |
| Mémoire | 256 Mi |
| Min instances | 0 |
| Max instances | 5 |

L'URL du backend (`BACKEND_URL`) est passée comme variable d'environnement. L'image Docker est buildée avec `VITE_API_URL` baked-in au moment du build Vite (voir section Déploiement).

---

## Déploiement

### Premier déploiement

```bash
./deploy-gcp.sh <PROJECT_ID> <MONGO_PASSWORD>
```

Le script effectue 5 étapes dans l'ordre :

```
[1/5] Authentification Artifact Registry
[2/5] Infrastructure : VPC, MongoDB, Artifact Registry, VPC Connector
       └── terraform apply -target=... (infra uniquement)
[3/5] Build + push image backend
       └── docker build ./backend → push vers Artifact Registry
[4/5] Déploiement backend Cloud Run → récupération de l'URL
[5/5] Build frontend avec VITE_API_URL=<backend_url>/api
       └── docker build --build-arg VITE_API_URL=... ./frontend
       └── terraform apply (apply complet)
```

> L'ordre en 5 étapes est nécessaire à cause d'une dépendance circulaire : le frontend doit être buildé avec l'URL du backend, qui n'est connue qu'après le déploiement Cloud Run du backend.

### Mise à jour du code

```bash
# Mettre à jour uniquement le backend
REGISTRY="europe-west1-docker.pkg.dev/<PROJECT_ID>/rdv-manager"
docker build -t $REGISTRY/backend:latest ./backend
docker push $REGISTRY/backend:latest
gcloud run deploy rdv-backend --image $REGISTRY/backend:latest --region europe-west1

# Mettre à jour uniquement le frontend
BACKEND_URL=$(gcloud run services describe rdv-backend --region europe-west1 --format='value(status.url)')
docker build --build-arg VITE_API_URL="$BACKEND_URL/api" -t $REGISTRY/frontend:latest ./frontend
docker push $REGISTRY/frontend:latest
gcloud run deploy rdv-frontend --image $REGISTRY/frontend:latest --region europe-west1
```

### Destruction complète

```bash
cd terraform
terraform destroy \
  -var="project_id=<PROJECT_ID>" \
  -var="mongo_password=<MONGO_PASSWORD>" \
  -var="backend_image=placeholder" \
  -var="frontend_image=placeholder"
```

> ⚠️ Cela supprime la VM MongoDB et son disque de données. Faites une sauvegarde avant.

---

## Accès SSH à la VM MongoDB

La VM n'a pas d'IP publique. L'accès se fait via **Cloud IAP** :

```bash
gcloud compute ssh mongodb \
  --zone europe-west1-b \
  --tunnel-through-iap \
  --project <PROJECT_ID>
```

Une fois connecté :
```bash
# Vérifier le statut MongoDB
sudo systemctl status mongod

# Se connecter au shell MongoDB
mongosh "mongodb://rdvadmin:<password>@localhost:27017/rdvmanager?authSource=admin"

# Consulter les logs de démarrage
sudo cat /var/log/startup-script.log
```

---

## Sauvegarde MongoDB

```bash
# Depuis la VM (via SSH IAP)
mongodump \
  --uri "mongodb://rdvadmin:<password>@localhost:27017/rdvmanager?authSource=admin" \
  --out /tmp/backup-$(date +%Y%m%d)

# Télécharger le dump localement
gcloud compute scp --recurse \
  --zone europe-west1-b \
  --tunnel-through-iap \
  mongodb:/tmp/backup-$(date +%Y%m%d) \
  ./backups/
```

---

## Coûts estimés (europe-west1)

| Ressource | Coût mensuel estimé |
|-----------|-------------------|
| VM e2-micro (MongoDB) | ~7 € |
| Disque pd-standard 20 Go | ~1 € |
| Disque pd-standard boot 10 Go | ~0,50 € |
| Cloud Run backend (faible trafic) | < 1 € |
| Cloud Run frontend (faible trafic) | < 1 € |
| VPC Access Connector (2x e2-micro) | ~14 € |
| Artifact Registry (< 1 Go) | ~0,10 € |
| Secret Manager | < 0,10 € |
| **Total estimé** | **~24 €/mois** |

> Le VPC Access Connector représente le poste principal. Pour réduire les coûts en production, envisager un Cloud Run avec `--vpc-egress=all-traffic` et une IP statique pour MongoDB.

---

## Sécurité

- **MongoDB** sans IP publique — accessible uniquement depuis le VPC privé
- **SSH** uniquement via Cloud IAP (pas de bastion, pas d'IP publique)
- **MONGO_URI** stocké dans Secret Manager, jamais en variable d'environnement en clair
- **Images Docker** dans Artifact Registry privé (pas Docker Hub)
- **Cloud Run** avec compte de service dédié (`rdv-cloudrun`) au principe du moindre privilège
