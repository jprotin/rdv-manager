# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Local development (Docker)

```bash
cp frontend/.env.example frontend/.env   # renseigner les variables Firebase (project ID fictif ok)
./deploy.sh dev       # démarre émulateur Firestore + frontend Vite (http://localhost:5173)
./deploy.sh dev-stop  # arrêt propre (données exportées dans ./emulator-data/)
./deploy.sh dev-logs  # logs en temps réel
```

### Production (Docker)

```bash
./deploy.sh build      # build l'image Docker frontend
./deploy.sh start      # démarre le frontend (http://localhost:4200)
./deploy.sh stop       # arrête les services
./deploy.sh logs       # tail des logs
./deploy.sh clean      # supprime conteneurs, volumes, images
```

### Frontend checks

```bash
cd frontend && npm run build    # vérifier le build Vite (produit dist/)
cd frontend && npm run preview  # prévisualiser le build de production
```

### Firestore indexes et rules (GCP)

```bash
firebase deploy --only firestore:indexes --project <PROJECT_ID>
firebase deploy --only firestore:rules   --project <PROJECT_ID>
```

## Architecture

### Overview

Application **frontend-only** : pas de backend Node.js. Le frontend React communique directement avec **Firestore** via le SDK Firebase (modular v10). La persistence offline est native — Firestore met en cache les données dans IndexedDB et synchronise automatiquement à la reconnexion.

```
frontend/src/
├── config/firebase.js          # initialisation Firebase + offline persistence
├── services/firestore.js       # clientsService, appointmentsService, statsService
├── context/AppContext.jsx      # isOnline, notify()
└── components/
    ├── Dashboard/
    ├── Appointments/
    ├── Clients/
    ├── Stats/
    ├── Settings/
    ├── Layout/
    └── common/
```

### Frontend (`frontend/src/`)

- **React Router v6** avec layout unique : `Layout` enveloppe toutes les pages via `<Outlet />`.
- **ESM** (`"type": "module"`). Tous les imports utilisent l'extension `.jsx`.
- **AppContext** (`context/AppContext.jsx`) fournit `isOnline` et `notify()` via `useApp()`.

### Données (Firestore)

Deux collections : `clients` et `appointments`. Toutes les suppressions sont des **soft deletes** (`deletedAt: Timestamp | null`). Toutes les requêtes filtrent sur `where('deletedAt', '==', null)`.

Les appointments embarquent un **snapshot client** (champ `client`) au moment de la création — les données client sont copiées dans le document rendez-vous pour éviter des lectures supplémentaires.

**Status flow** : `pending → confirmed → completed` ou `pending → cancelled`. Les statuts `cancelled` et `completed` peuvent repasser à `pending` (réouverture).

### Offline

`firebase.js` initialise Firestore avec `persistentLocalCache` + `persistentMultipleTabManager` : le SDK gère automatiquement le cache IndexedDB et la synchronisation au retour en ligne. Aucune logique de sync manuelle dans le code applicatif.

En `import.meta.env.DEV`, `connectFirestoreEmulator(db, '127.0.0.1', 8080)` redirige tout le trafic vers l'émulateur local.

### Key component details

- **`AddressSearch`** : utilise `onMouseDown` (pas `onClick`) sur les items de liste — empêche `onBlur` de fermer le dropdown avant que la sélection se déclenche. Appelle `api-adresse.data.gouv.fr` avec 300ms debounce.
- **`PhoneInput`** : formate les chiffres en `XX XX XX XX XX` dans l'UI. Les espaces doivent être retirés (`replace(/\s/g, '')`) avant envoi à Firestore.
- **`CreateAppointmentModal`** : crée le client en premier si aucun n'est sélectionné, puis crée le rendez-vous avec `clientId` et snapshot client embarqué.
- **`AppointmentCard` / `ClientCard`** : pattern accordéon — clic sur la carte bascule la vue détail inline, pas de route séparée.

### Docker Compose

**Production** (`docker-compose.yml`) :

| Service | Image | Port |
|---------|-------|------|
| `frontend` | nginx:alpine (multi-stage build) | host :4200 |

La config Firebase est compilée dans le bundle au `docker build` via `ARG` / `ENV` Vite.

**Développement** (`docker-compose.dev.yml`) :

| Service | Image | Port |
|---------|-------|------|
| `emulator` | node:20-alpine + OpenJDK 17 | 8080 (Firestore), 4000 (UI) |
| `frontend` | node:20-alpine | 5173 (Vite dev server) |

Le frontend attend le healthcheck de l'émulateur avant de démarrer. Le volume `frontend_modules` isole les `node_modules` du conteneur de ceux de l'hôte.

### Environment variables

`frontend/.env` (lu par Vite et par `docker-compose.dev.yml` via `env_file`) :

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
FRONTEND_PORT   # port hôte production (défaut: 4200)
```

Pour l'émulateur, le `VITE_FIREBASE_PROJECT_ID` peut être fictif (ex: `rdv-dev`).
