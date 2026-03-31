# Backend — API REST

Stack : **Node.js 20 + Express 4 + Mongoose 8 + MongoDB 7**

## Endpoints

### Clients `/api/clients`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/clients` | Liste paginée (params: `search`, `page`, `limit`) |
| GET | `/api/clients/sync?since=<ISO>` | Docs modifiés depuis une date (pour sync offline) |
| GET | `/api/clients/:id` | Détail + compteur de RDV |
| POST | `/api/clients` | Créer un client |
| PUT | `/api/clients/:id` | Modifier un client |
| DELETE | `/api/clients/:id` | Suppression logique (`deletedAt`) |

### Rendez-vous `/api/appointments`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/appointments` | Liste paginée (params: `status`, `clientId`, `from`, `to`, `page`, `limit`) |
| GET | `/api/appointments/today` | RDV d'aujourd'hui triés par heure |
| GET | `/api/appointments/week` | RDV de la semaine courante |
| GET | `/api/appointments/sync?since=<ISO>` | Docs modifiés depuis une date |
| GET | `/api/appointments/:id` | Détail avec client peuplé |
| POST | `/api/appointments` | Créer (valide `endAt > startAt`) |
| PUT | `/api/appointments/:id` | Modifier complètement |
| PATCH | `/api/appointments/:id/status` | Changer le statut uniquement |
| DELETE | `/api/appointments/:id` | Suppression logique |

### Statistiques `/api/stats`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/stats/overview` | Totaux globaux + répartition statuts |
| GET | `/api/stats/monthly?year=<YYYY>` | Tableau de 12 mois avec comptage |
| GET | `/api/stats/upcoming` | 5 prochains RDV confirmés/en attente |

### Santé

`GET /health` → `{ status: "ok", timestamp }` — utilisé par Docker healthcheck, sans authentification.

## Schéma MongoDB

### Client
```json
{
  "_id": "ObjectId",
  "firstName": "string (requis)",
  "lastName": "string (requis)",
  "phone": "string (chiffres uniquement)",
  "email": "string",
  "address": {
    "label": "string",
    "housenumber": "string",
    "street": "string",
    "postcode": "string",
    "city": "string",
    "coordinates": [lon, lat]
  },
  "notes": "string",
  "deletedAt": "Date|null",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Appointment
```json
{
  "_id": "ObjectId",
  "client": "ObjectId (ref Client, requis)",
  "title": "string (requis)",
  "description": "string",
  "startAt": "Date (requis)",
  "endAt": "Date (requis, > startAt)",
  "status": "pending|confirmed|cancelled|completed",
  "address": { "...same as Client.address" },
  "notes": "string",
  "deletedAt": "Date|null",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## Codes d'erreur

| Code HTTP | `error.code` | Cause |
|-----------|-------------|-------|
| 400 | `VALIDATION_ERROR` | Champ invalide ou `endAt <= startAt` |
| 404 | `NOT_FOUND` | Ressource inexistante ou soft-deleted |
| 409 | `DUPLICATE` | Contrainte d'unicité MongoDB |
| 500 | `SERVER_ERROR` | Erreur serveur générique |

## Variables d'environnement

```
MONGO_URI    URI de connexion MongoDB complète
PORT         Port d'écoute (défaut: 4201)
CORS_ORIGIN  Origine autorisée (défaut: *)
NODE_ENV     development|production
```
