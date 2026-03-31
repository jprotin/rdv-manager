# Frontend — Application React PWA

Stack : **React 18 + Vite 5 + Tailwind CSS 3 + PouchDB 8 + React Router 6**

## Arborescence des composants

```
App
└── AppProvider (contexte global)
    └── BrowserRouter
        └── Layout
            ├── Header (statut en ligne, indicateur sync, bouton burger)
            ├── BurgerMenu (drawer latéral, liens de navigation)
            └── Outlet
                ├── Dashboard (tableau de bord)
                │   ├── AppointmentBlock (liste du jour)
                │   └── CreateAppointmentModal (popup création)
                ├── AppointmentList
                │   ├── AppointmentCard (accordéon, actions inline)
                │   └── CreateAppointmentModal
                ├── ClientList
                │   └── ClientCard (accordéon, actions inline)
                ├── Statistics (overview + graphique barres CSS)
                └── Settings (préférences, sync, installation PWA)
```

## Services

### `services/api.js`
Client HTTP natif (`fetch`). Expose `clientsApi`, `appointmentsApi`, `statsApi`.
Base URL : `/api` (proxié par Vite en dev, nginx en prod).

### `services/addressApi.js`
Appel direct à `api-adresse.data.gouv.fr/search/`. Retourne un tableau d'objets `{ label, housenumber, street, postcode, city, coordinates }`.

### `services/db.js`
Persistance locale avec PouchDB (IndexedDB). Deux bases : `rdv_clients` et `rdv_appointments`.

Fonctions clés :
- `getLocalClients()` / `getLocalAppointments(filter)` — lecture locale
- `saveLocalClient(doc)` / `saveLocalAppointment(doc)` — upsert avec `_synced: false`
- `syncClients()` / `syncAppointments()` — tire les changements serveur depuis `since`, pousse les docs non synchronisés
- `syncAll()` — appelle les deux en parallèle
- `registerBackgroundSync()` — enregistre un tag `sync-rdv` dans le Service Worker

### `context/AppContext.jsx`
Fournit via `useApp()` :
- `isOnline` — statut réseau en temps réel
- `isSyncing` — indicateur de synchronisation en cours
- `notify(type, message)` — toast éphémère (`success`|`error`)
- `triggerSync()` — déclenche `syncAll()` manuellement

## Stratégie offline

| Opération | En ligne | Hors ligne |
|-----------|----------|------------|
| Lecture | API → mise à jour PouchDB | PouchDB direct |
| Création | API + PouchDB | PouchDB (`_synced: false`) + BackgroundSync |
| Mise à jour statut | API | Non disponible (notification à l'utilisateur) |
| Suppression | API | Non disponible |

## Composants communs

### `AddressSearch`
- Debounce 300 ms, minimum 3 caractères
- Utilise `onMouseDown` (pas `onClick`) pour la sélection afin d'éviter le conflit avec `onBlur`
- Affiche une confirmation visuelle après sélection

### `PhoneInput`
- Formate en temps réel au format `XX XX XX XX XX`
- Stockage en DB avec les espaces (`client.phone`), strippé au besoin côté API

### `StatusBadge`
Statuts : `pending` (amber), `confirmed` (green), `cancelled` (red), `completed` (gray)

## PWA

- **Service Worker** (`/public/sw.js`) : cache-first pour le shell, network-first pour `/api`
- **Manifest** (`/public/manifest.json`) : `display: standalone`, thème indigo
- **Enregistrement** dans `main.jsx` on `window.load`
- **Invite d'installation** gérée dans `Settings.jsx` via `beforeinstallprompt`
