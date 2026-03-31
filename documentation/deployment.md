# Déploiement

## Prérequis

- Docker ≥ 24
- Docker Compose v2 (`docker compose`)
- Ports disponibles : 4200 (ou configurer `FRONTEND_PORT`)

## Démarrage rapide

```bash
# 1. Cloner et entrer dans le projet
git clone <url>
cd rdv-manager

# 2. Configurer les variables d'environnement
cp .env.example .env      # puis éditer .env

# 3. Construire les images
./deploy.sh build

# 4. Démarrer
./deploy.sh start
```

L'application est disponible sur `http://localhost:4200`.

## Variables d'environnement (`.env`)

```bash
MONGO_USER=rdvadmin          # Utilisateur MongoDB
MONGO_PASSWORD=changeme      # Mot de passe MongoDB — CHANGER EN PRODUCTION
FRONTEND_PORT=4200           # Port d'exposition du frontend
```

## Commandes `deploy.sh`

| Commande | Description |
|----------|-------------|
| `./deploy.sh build` | Construit les images Docker |
| `./deploy.sh start` | Démarre tous les services en arrière-plan |
| `./deploy.sh stop` | Arrête les services |
| `./deploy.sh restart` | Arrête puis redémarre |
| `./deploy.sh logs [service]` | Affiche les logs en temps réel |
| `./deploy.sh status` | Affiche l'état des conteneurs |
| `./deploy.sh clean` | Supprime conteneurs, volumes et images (⚠ données perdues) |

## Développement local (sans Docker)

### Backend
```bash
cd backend
npm install
# Créer backend/.env avec : MONGO_URI=mongodb://localhost:27017/rdvmanager
npm run dev          # nodemon — port 4201
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # Vite — port 5173 avec proxy → localhost:4201
```

## Architecture Docker

```
                  ┌─────────────┐
                  │   Browser   │
                  └──────┬──────┘
                         │ :4200
                  ┌──────▼──────┐
                  │   frontend  │  nginx
                  │  (static)   │  /api/* → backend:4201
                  └──────┬──────┘
                         │ :4201
                  ┌──────▼──────┐
                  │   backend   │  Node.js + Express
                  └──────┬──────┘
                         │ :27017
                  ┌──────▼──────┐
                  │   mongodb   │  Volume persistant
                  └─────────────┘
```

## Sauvegarde MongoDB

```bash
# Dump
docker exec $(docker compose ps -q mongodb) \
  mongodump --uri "mongodb://rdvadmin:changeme@localhost/rdvmanager?authSource=admin" \
  --out /tmp/dump

docker cp $(docker compose ps -q mongodb):/tmp/dump ./backup

# Restauration
docker cp ./backup $(docker compose ps -q mongodb):/tmp/dump
docker exec $(docker compose ps -q mongodb) \
  mongorestore --uri "mongodb://rdvadmin:changeme@localhost/rdvmanager?authSource=admin" \
  /tmp/dump
```

## Mise en production

1. Remplacer `MONGO_PASSWORD` par un mot de passe fort.
2. Configurer `CORS_ORIGIN` dans `backend/.env` avec le domaine réel.
3. Ajouter un reverse proxy (nginx/traefik) avec TLS devant le conteneur `frontend`.
4. Activer les sauvegardes automatiques MongoDB.
