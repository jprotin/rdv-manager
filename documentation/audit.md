# Audit de code — RDV Manager

> Généré le 2026-04-03 — Basé sur l'analyse exhaustive de l'ensemble du dépôt.

---

## Résumé exécutif

**RDV Manager** est une PWA de gestion de rendez-vous avec une architecture **frontend-only** (React 18 + Firestore) déployée sur Cloud Run via un pipeline GitOps Terraform + GitHub Actions.

| Domaine | État | Note |
|---------|------|------|
| Architecture générale | ✅ Solide | Modulaire, bien séparée |
| Infrastructure Terraform | 🟠 Bon avec réserves | Hardcoding, doublons legacy |
| Application frontend | 🟠 Fonctionnel avec bugs | Pagination, fuites mémoire |
| Sécurité Firestore | 🔴 Critique | Rules `if true` en production |
| Documentation | 🔴 Incohérente | 3 documents obsolètes |
| CI/CD | ✅ Bien structuré | WIF, gated production |
| Tests | 🔴 Absent | Aucune couverture |

---

## 1. Infrastructure as Code (Terraform)

### 1.1 Architecture des layers

La structure en 4 phases est une bonne pratique (landing zone pattern) :

```
0-bootstrap → 1-org → 2-projects → 3-infra
```

Chaque layer a son propre état GCS, ce qui permet des cycles de vie indépendants.

---

### 1.2 Layer 0 — Bootstrap (`terraform/0-bootstrap/main.tf`)

**Points positifs**
- Bucket GCS avec versioning activé et rotation (5 versions max)
- Uniform bucket access forcé
- SA `terraform-admin` avec rôles granulaires org-level

**Problèmes**

| Sévérité | Problème | Ligne |
|----------|----------|-------|
| 🔴 | Billing account ID hardcodé (`0197BD-386347-ADCA30`) | 26 |
| 🔴 | Org ID hardcodé (`475592048777`) | 30 |
| 🟠 | Pas de `lifecycle { prevent_destroy = true }` sur le bucket d'état | 17 |
| 🟡 | `num_newer_versions = 5` trop permissif — suggérer 3 | 47 |

---

### 1.3 Layer 1 — Org (`terraform/1-org/`)

**Points positifs**
- Hiérarchie de dossiers claire (nantares / staging / production)
- Org policy `disableServiceAccountKeyCreation` force le Workload Identity

**Problèmes**

| Sévérité | Problème | Fichier | Ligne |
|----------|----------|---------|-------|
| 🔴 | Org ID et SA email hardcodés | versions.tf | 16 |
| 🟡 | Duplication policies staging/production — à refactoriser avec `for_each` | org_policies.tf | 14-34 |

---

### 1.4 Layer 2 — Projects (`terraform/2-projects/modules/project/main.tf`)

**Points positifs**
- Module réutilisable staging/production ✓
- WIF GitHub correctement configuré (pas de clés SA) ✓
- Firestore créé avec dépendance Firebase project ✓
- Outputs structurés (wif_provider, sa_email) ✓

**Problèmes**

| Sévérité | Problème | Ligne |
|----------|----------|-------|
| 🟠 | `roles/editor` trop permissif pour le project owner — préférer rôles fins | 123 |
| 🟠 | Condition WIF hardcodée à un seul repo — pas extensible | 110 |
| 🟡 | Rôles GitHub Actions inline — suggérer variable `github_actions_roles` | 73-84 |

---

### 1.5 Layer 3 — Infra (`terraform/3-infra/modules/app/main.tf`)

**Points positifs**
- `iam_binding` autoritatif (remplace `allUsers`) ✓
- `lifecycle.ignore_changes` pour laisser le CI gérer l'image ✓
- SA Cloud Run dédié avec accès Firestore minimal ✓

**Problèmes**

| Sévérité | Problème | Ligne |
|----------|----------|-------|
| 🟠 | `ignore_changes` sur image/env crée un drift Terraform silencieux | 62-66 |
| 🟠 | Pas de `max_instance_count` — risque de scaling non contrôlé (coûts) | 40-68 |
| 🟡 | Pas de healthcheck Cloud Run | – |

---

### 1.6 Fichiers legacy (`terraform/*.tf`)

Ces fichiers à la racine du dossier `terraform/` sont des **survivants de l'architecture initiale** et sont désormais en doublon avec les layers 2 et 3.

| Fichier | Statut | Action recommandée |
|---------|--------|--------------------|
| `main.tf` | Doublon | Supprimer |
| `firestore.tf` | Doublon (couvert par 2-projects) | Supprimer |
| `frontend_cloudrun.tf` | Doublon (couvert par 3-infra) | Supprimer |
| `registry.tf` | Doublon (couvert par 3-infra) | Supprimer |
| `outputs.tf` | Doublon | Supprimer |
| `variables.tf` | Variables Firebase — garder si déploiement legacy encore utilisé | À évaluer |

---

## 2. Application Frontend

### 2.1 Architecture

L'application est **frontend-only** : React → Firebase SDK → Firestore. Il n'y a pas de backend.

```
frontend/src/
├── config/firebase.js       # Init SDK, offline cache, emulator
├── services/firestore.js    # Toute la logique Firestore (client + appointments + stats)
├── services/addressApi.js   # API adresse.data.gouv.fr
├── context/AppContext.jsx   # isOnline, notify()
└── components/              # UI par domaine
```

---

### 2.2 Services Firestore (`frontend/src/services/firestore.js`)

#### Bug critique — Pagination côté client (ligne 95-102)

```js
// ❌ Charge TOUS les documents, puis slice en JS
const snap = await getDocs(query(col('appointments'), ...));
const all = fromDocs(snap).map(...);
return { data: all.slice((page-1)*lim, page*lim), total: all.length };
```

**Impact :** Chaque changement de page recharge l'intégralité de Firestore. Avec 500+ RDV, c'est un freeze UI et un surcoût de lectures.

**Correction :** Pagination curseur avec `startAfter()` + `limit()`.

---

#### Bug critique — Recherche clients côté client (ligne 32-43)

```js
// ❌ Charge TOUS les clients, filtre en JavaScript
const snap = await getDocs(q);
clients = clients.filter(c => c.firstName.includes(s) || ...);
```

**Impact :** Non scalable au-delà de quelques centaines de clients.

**Correction :** Algolia / Typesense, ou champ `searchIndex` normalisé côté Firestore.

---

#### Problème — Retour incomplet de `clientsService.create()` (ligne 55-56)

```js
// ❌ createdAt/updatedAt absents du retour
return { _id: ref.id, ...data };
```

---

### 2.3 Context (`frontend/src/context/AppContext.jsx`)

**Points positifs**
- Cleanup event listeners correct ✓
- Détection online/offline fiable ✓

**Problèmes**

| Sévérité | Problème | Ligne |
|----------|----------|-------|
| 🟡 | `notify()` sans queue — deux notifications rapides s'écrasent | 21 |
| 🟡 | Toast défini dans le contexte (mélange responsabilités) | 30 |
| 🟡 | Pas d'état `isSyncing` pour indiquer sync Firestore en cours | – |

---

### 2.4 Composants

#### `CreateAppointmentModal.jsx` (340 lignes)

| Sévérité | Problème | Ligne |
|----------|----------|-------|
| 🔴 | Import ESM après déclaration de variable | 14 |
| 🔴 | Fuite mémoire sur recherche client async (setState après unmount) | 50-59 |

**Correction fuite mémoire :**
```js
useEffect(() => {
  let active = true;
  const t = setTimeout(async () => {
    const results = await clientsService.getAll(clientSearch);
    if (active) setClientResults(results.slice(0, 5));
  }, 300);
  return () => { active = false; clearTimeout(t); };
}, [clientSearch]);
```

---

#### `DateTimePicker.jsx` (316 lignes)

| Sévérité | Problème | Ligne |
|----------|----------|-------|
| 🟠 | Requête Firestore à chaque clic de jour sans annulation | 75-98 |
| 🟠 | Pas de gestion d'erreur — créneaux vides sans message | 97 |
| 🟡 | `pad()`, `generateSlots()`, `localToISO()` dupliqués depuis `TimePicker` | – |

---

#### `AppointmentCard.jsx` / `ClientCard.jsx`

| Sévérité | Problème | Ligne |
|----------|----------|-------|
| 🟡 | `confirm()` natif pour suppression — UX incohérente | 76 |
| 🟡 | `formatDT()`, `formatDuration()` dupliqués depuis Dashboard | 6-12 |

---

#### `AddressSearch.jsx` (108 lignes)

| Sévérité | Problème | Ligne |
|----------|----------|-------|
| 🟡 | Délai `setTimeout 150ms` pour fermer dropdown fragile sur mobile | 69 |
| 🟡 | Pas de navigation clavier (accessibilité) | – |
| 🟡 | Pas de timeout sur `fetch` (requête peut bloquer indéfiniment) | – |

---

#### `BurgerMenu.jsx`

| Sévérité | Problème | Ligne |
|----------|----------|-------|
| 🟡 | `document.body.style.overflow = 'hidden'` — pas React-idiomatic | 13-16 |
| 🟡 | Bouton "Déconnexion" sans handler (Firebase Auth non implémentée) | 65-68 |

---

### 2.5 Configuration et build

#### `frontend/Dockerfile`

| Sévérité | Problème | Ligne |
|----------|----------|-------|
| 🟡 | `npm install` au lieu de `npm ci` — peut introduire des versions mineures différentes | 5 |
| 🟡 | Pas de healthcheck | – |
| 🟡 | ARG sans valeurs par défaut — erreur silencieuse si omis | 7-12 |

#### `frontend/nginx.conf`

**Points positifs :** Cache assets 1 an (immutable), gzip activé, SPA router ✓

**Manquement :** Pas de headers sécurité (`X-Content-Type-Options`, `Content-Security-Policy`, `X-Frame-Options`).

---

## 3. Sécurité Firestore

### 3.1 Règles actuelles (`firestore.rules`) — CRITIQUE

```js
// ❌ Accès lecture/écriture ouvert à tous
match /clients/{id}   { allow read, write: if true; }
match /appointments/{id} { allow read, write: if true; }
```

**Impact :** N'importe qui peut lire, modifier ou supprimer toutes les données depuis le navigateur ou un script.

**Correction :** Implémenter Firebase Auth et restreindre aux utilisateurs authentifiés :

```js
match /clients/{id} {
  allow read, write: if request.auth != null;
}
match /appointments/{id} {
  allow read, write: if request.auth != null;
}
```

---

## 4. CI/CD (GitHub Actions)

### 4.1 Points positifs

- Workload Identity Federation — pas de clés SA JSON ✓
- Permissions minimales (`contents: read`, `id-token: write`) ✓
- Séparation build/deploy en production (retry sans rebuild) ✓
- Environnement `production` avec approbation obligatoire ✓

### 4.2 Problèmes

| Sévérité | Problème | Fichier | Ligne |
|----------|----------|---------|-------|
| 🟠 | Aucun lint ou test dans le workflow CI | ci.yml | – |
| 🟠 | Pas de validation format tag (`v\d+\.\d+\.\d+`) | deploy-production.yml | 34 |
| 🟡 | `firebase deploy` et `gcloud run deploy` en séquence sans wait entre les deux | deploy-staging.yml | 54-70 |

---

## 5. Documentation

Voir le document `documentation/revue-documentation.md` pour l'analyse complète et les actions recommandées.

---

## 6. Synthèse des priorités

### Phase 1 — Avant toute mise en production réelle

| # | Action | Fichier | Impact |
|---|--------|---------|--------|
| 1 | **Implémenter Firebase Auth + Firestore rules** | firestore.rules | Sécurité critique |
| 2 | **Pagination Firestore cursor-based** | services/firestore.js | Performance |
| 3 | **Corriger fuite mémoire client search** | CreateAppointmentModal.jsx | Stabilité |
| 4 | **Ajouter `max_instance_count` Cloud Run** | 3-infra/modules/app/main.tf | Coûts |
| 5 | **Supprimer fichiers Terraform legacy** | terraform/*.tf | Maintenance |

### Phase 2 — Court terme

| # | Action | Impact |
|---|--------|--------|
| 6 | Centraliser utilitaires (`pad`, `formatDate`, `STATUS_OPTIONS`) dans `utils/` | Maintenabilité |
| 7 | Headers sécurité nginx (`CSP`, `X-Frame-Options`) | Sécurité |
| 8 | ESLint + Prettier dans CI | Qualité code |
| 9 | Corriger hardcoding IDs dans Terraform | Réutilisabilité |

### Phase 3 — Moyen terme

| # | Action | Impact |
|---|--------|--------|
| 10 | Tests (Vitest) avec couverture > 50% | Fiabilité |
| 11 | Recherche clients full-text (Algolia ou index Firestore) | UX scalabilité |
| 12 | Migration TypeScript progressive | Maintenabilité long terme |
| 13 | Error boundaries React | UX erreurs |

---

## 7. Ce qui est bien fait

1. Architecture offline-first (Firestore persistent cache + IndexedDB)
2. Workload Identity Federation — aucune clé SA en clair
3. Terraform modulaire avec états GCS indépendants par layer
4. Soft delete pattern cohérent (`deletedAt: null`)
5. Snapshot client embarqué dans les rendez-vous (évite les jointures)
6. Multi-stage Dockerfile optimisé (nginx alpine)
7. Dev environment Docker Compose avec émulateur Firestore
8. Palette Tailwind cohérente et personnalisée
9. Séparation build/deploy en production avec approbation manuelle
10. PWA avec Service Worker et install prompt

---

*Audit réalisé sur la branche `develop` — commit `8aa6c53`*
