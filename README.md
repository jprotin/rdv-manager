# RDV Manager

Application web PWA de gestion de rendez-vous. Fonctionne en mode hors ligne et s'installe sur mobile (Android, iOS).

## Fonctionnalités

- **Tableau de bord** — vue du jour et du lendemain avec compteurs et liste des RDV
- **Gestion des RDV** — création rapide via modal, filtres par statut et date, changement de statut en un clic
- **Gestion des clients** — recherche, fiche client accordéon
- **Adresses** — autocomplétion via l'API Adresse du gouvernement français
- **Mode hors ligne** — cache Firestore natif (IndexedDB) + synchronisation automatique à la reconnexion
- **PWA** — installable sur l'écran d'accueil mobile, fonctionne sans connexion

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Base de données | Firestore (GCP) — offline-first natif |
| Offline | Firestore persistentLocalCache (IndexedDB) |
| Déploiement local | Docker Compose, nginx |
| Déploiement cloud | Cloud Run (GCP), Terraform |

Pas de backend Node.js — le frontend communique directement avec Firestore via le SDK Firebase.

---

## Développement local

### Prérequis

- Docker + Docker Compose

### Démarrage

```bash
# 1. Configurer les variables Firebase
cp frontend/.env.example frontend/.env
# Éditer frontend/.env — des valeurs fictives suffisent pour l'émulateur
# (ex: VITE_FIREBASE_PROJECT_ID=rdv-dev)

# 2. Démarrer l'émulateur Firestore + le frontend
./deploy.sh dev
```

| Service | URL |
|---------|-----|
| Application | http://localhost:5173 |
| Emulator UI (données) | http://localhost:4000 |

Le frontend se connecte automatiquement à l'émulateur Firestore local en mode dev — aucun appel ne part vers GCP.

### Commandes dev

```bash
./deploy.sh dev        # démarrer
./deploy.sh dev-stop   # arrêter (données sauvegardées dans ./emulator-data/)
./deploy.sh dev-logs   # logs en temps réel
```

### Tester le mode hors ligne

```bash
# Simuler une coupure Firestore
docker compose -f docker-compose.dev.yml stop emulator
# → l'app continue de fonctionner depuis le cache IndexedDB
# → les écritures sont mises en file d'attente

# Rétablir la connexion
docker compose -f docker-compose.dev.yml start emulator
# → synchronisation automatique des écritures en attente
```

Pour tester l'indicateur hors ligne dans l'UI : F12 → Network → Offline dans le navigateur.

---

## Production (Docker local)

```bash
# Créer .env à la racine avec les variables Firebase de production
cp frontend/.env.example .env

./deploy.sh build    # construit l'image Docker (Firebase config compilée dans le bundle)
./deploy.sh start    # démarre sur http://localhost:4200
./deploy.sh stop
./deploy.sh logs
./deploy.sh clean    # supprime conteneurs et volumes
```

---

## Déploiement GCP (Cloud Run)

```bash
export VITE_FIREBASE_API_KEY="..."
export VITE_FIREBASE_PROJECT_ID="mon-projet"
# ... autres variables Firebase

./deploy-gcp.sh <PROJECT_ID>
```

Le script déploie en 3 étapes : infrastructure Terraform (Artifact Registry + Firestore + Cloud Run) → build Docker → déploiement de l'image.

Voir [documentation/terraform-gcp.md](documentation/terraform-gcp.md) pour le détail complet.
