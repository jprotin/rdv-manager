# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development (without Docker)

```bash
# Backend — port 4201, requires MongoDB on localhost:27017
cd backend && npm install && npm run dev

# Frontend — port 5173, proxies /api to localhost:4201
cd frontend && npm install && npm run dev
```

### Docker deployment

```bash
./deploy.sh build      # Build Docker images
./deploy.sh start      # Start all services (app on :4200)
./deploy.sh stop       # Stop services
./deploy.sh logs       # Tail logs
./deploy.sh clean      # Remove everything including volumes
```

### Frontend build check
```bash
cd frontend && npm run build    # produces dist/
cd frontend && npm run preview  # preview the production build
```

## Architecture

### Overview

Monorepo with two independent Node.js projects (`backend/`, `frontend/`) orchestrated by `docker-compose.yml`. In production, nginx serves the built React app and proxies `/api/*` to the backend — no CORS issues. In dev, Vite's proxy does the same.

### Backend (`backend/src/`)

- **Express REST API** on port 4201. Uses CommonJS (`require`/`module.exports`).
- **Two Mongoose models**: `Client` (contact + embedded address) and `Appointment` (refs Client via `client` field, not `clientId`).
- **Soft deletes**: both models use `deletedAt: Date|null`. All queries filter `{ deletedAt: null }`. Sync endpoints return records with any `updatedAt`, including deleted ones.
- **Sync endpoints**: `GET /api/clients/sync?since=<ISO>` and `GET /api/appointments/sync?since=<ISO>` — return all documents modified after `since`, used by the frontend offline sync.
- **Status flow** for appointments: `pending → confirmed → completed` or `pending → cancelled`. `PATCH /:id/status` is the fast-path; `PUT /:id` is full update.
- Route order matters: `/today`, `/week`, `/sync` must be defined before `/:id` in `routes/appointments.js` to avoid being consumed as an id parameter.

### Frontend (`frontend/src/`)

- **React Router v6** with a single nested layout: `Layout` wraps all pages via `<Outlet />`.
- **ESM** (`"type": "module"` in package.json). All imports use `.jsx` extensions.
- **AppContext** (`context/AppContext.jsx`) provides `isOnline`, `isSyncing`, `notify()`, `triggerSync()` via `useApp()` hook.

#### Offline data flow

1. **Online reads**: fetch from API, results are displayed directly (not stored in PouchDB on read).
2. **Online writes**: call API; if it fails, fall back to local PouchDB with `_synced: false`.
3. **Offline reads**: `getLocalAppointments()` / `getLocalClients()` from PouchDB.
4. **Offline writes**: save to PouchDB with `_synced: false`, call `registerBackgroundSync()`.
5. **Reconnect**: `AppContext` listens to `window.online` → calls `triggerSync()` → `syncAll()` in `services/db.js`.

#### PouchDB document IDs

- For server-synced docs: use MongoDB `_id.toString()` as PouchDB `_id`.
- For locally-created offline docs: `local_<timestamp>_<random>` prefix.
- `remoteId` field stores the MongoDB `_id` once synced.

#### Key component details

- **`AddressSearch`**: uses `onMouseDown` (not `onClick`) on list items — prevents `onBlur` from closing the dropdown before selection fires. Calls `api-adresse.data.gouv.fr` with 300ms debounce.
- **`PhoneInput`**: formats digits as `XX XX XX XX XX` in the UI. The raw digits should be stripped (`replace(/\s/g, '')`) before sending to the API.
- **`CreateAppointmentModal`**: creates Client first (if not selected from search), then creates Appointment referencing `client._id`.
- **`AppointmentCard` / `ClientCard`**: accordion pattern — clicking the card toggles expanded detail view inline, no separate route.

### Docker Compose services

| Service | Image | Port |
|---------|-------|------|
| `mongodb` | mongo:7 | internal only |
| `backend` | node:20-alpine | internal :4201 |
| `frontend` | nginx:alpine | host :4200 (configurable via `FRONTEND_PORT`) |

Backend depends on MongoDB health check. Frontend depends on backend health check.

### Environment variables

Root `.env` is loaded by `deploy.sh` and `docker-compose.yml`:
- `MONGO_USER`, `MONGO_PASSWORD` — MongoDB credentials
- `FRONTEND_PORT` — host port for the frontend (default: 4200)

Backend reads from its own env (injected by compose):
- `MONGO_URI` — full MongoDB connection string
- `PORT` — defaults to 4201
- `CORS_ORIGIN` — defaults to `*`
