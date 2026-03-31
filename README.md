# RDV Manager

Application web PWA de gestion de rendez-vous. Fonctionne en mode hors ligne et s'installe sur mobile (Android, iOS, Chrome OS).

## Fonctionnalités

- **Tableau de bord** — vue du jour avec compteurs et liste des RDV
- **Gestion des RDV** — création rapide via popup, filtres, changement de statut en un clic
- **Gestion des clients** — recherche, fiche client avec historique
- **Adresses** — autocomplétion via l'API Adresse du gouvernement français
- **Mode hors ligne** — stockage local PouchDB + synchronisation automatique à la reconnexion
- **PWA** — installable sur l'écran d'accueil mobile, fonctionne sans connexion

## Démarrage rapide

### Avec Docker (recommandé)

```bash
git clone <url>
cd rdv-manager

# Démarrer (images pré-configurées)
./deploy.sh build
./deploy.sh start

# Ouvrir http://localhost:4200
```

### En développement local

```bash
# Terminal 1 — Backend
cd backend && npm install && npm run dev

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

> Le frontend en dev proxifie `/api` vers `localhost:4201`. MongoDB doit tourner localement.

## Commandes deploy.sh

```bash
./deploy.sh build      # Construire les images
./deploy.sh start      # Démarrer
./deploy.sh stop       # Arrêter
./deploy.sh restart    # Redémarrer
./deploy.sh logs       # Voir les logs
./deploy.sh status     # État des services
./deploy.sh clean      # Tout supprimer (⚠ données perdues)
```

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Offline | PouchDB (IndexedDB), Service Worker |
| Backend | Node.js, Express 4 |
| Base de données | MongoDB 7 (Mongoose) |
| Déploiement | Docker, Docker Compose, nginx |

## Documentation

- [Architecture frontend](documentation/frontend.md)
- [API backend](documentation/backend.md)
- [Déploiement](documentation/deployment.md)
