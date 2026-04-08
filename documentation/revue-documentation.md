# Revue de documentation — RDV Manager

> Généré le 2026-04-03

---

## Résumé

| Document | État | Action |
|----------|------|--------|
| `README.md` | 🟠 Incomplet | Mettre à jour |
| `CLAUDE.md` | 🟠 Partiellement obsolète | Mettre à jour |
| `documentation/terraform-gcp.md` | 🟠 Incomplet | Compléter |
| `documentation/deployment.md` | 🔴 Obsolète (MongoDB) | Réécrire ou supprimer |
| `documentation/frontend.md` | 🔴 Obsolète (PouchDB) | Réécrire ou supprimer |
| `documentation/backend.md` | 🔴 Hors-sujet (backend inexistant) | Supprimer |
| `documentation/code-review.md` | ✅ Bonne base | Archiver ou fusionner avec audit |

---

## 1. README.md

### État actuel
Donne une vue d'ensemble correcte du projet avec la stack technique, les commandes de base et les prérequis. C'est le point d'entrée principal.

### Problèmes identifiés

**Manquements :**
- Pas de schéma d'architecture (texte seul, pas de diagramme)
- Pas de section "premier démarrage" claire pour un nouveau développeur
- Pas de mention de l'infrastructure GCP (Cloud Run, Firestore)
- Pas de statut des environnements (staging URL, etc.)
- Pas de section contribution / branching model

### Recommandation
Compléter avec les sections manquantes. Voir modèle proposé ci-dessous.

---

## 2. CLAUDE.md

### État actuel
Contient les commandes de développement local, une description de l'architecture et les variables d'environnement. Utilisé par Claude Code comme contexte.

### Problèmes identifiés
- Mentionne "pas de backend Node.js" correctement ✓
- Section architecture à jour ✓
- Manque la description du workflow Git (branches, tags)
- Manque la section Infrastructure (comment appliquer Terraform)
- Manque la mention des scripts (`scripts/bootstrap.sh`)

### Recommandation
Ajouter les sections Terraform et Git workflow.

---

## 3. documentation/terraform-gcp.md

### État actuel
Documente l'architecture GCP, les composants créés et les coûts estimés.

### Problèmes identifiés
- Pas d'instructions pour le bootstrap initial
- Pas de section troubleshooting (les erreurs 409 sont fréquentes)
- Pas de description des outputs à récupérer pour GitHub Secrets
- Architecture diagram présent mais pas à jour avec la structure 4-layers

### Recommandation
Compléter avec les sections bootstrap, troubleshooting et secrets GitHub.

---

## 4. documentation/deployment.md — OBSOLÈTE

### État actuel
**Ce document décrit une architecture MongoDB + Backend Node.js qui n'existe pas dans le code.**

Contenu actuel (obsolète) :
- Déploiement backend Node.js
- Configuration MongoDB Atlas
- Commandes de sauvegarde MongoDB
- Variables d'environnement backend

### Recommandation
**Supprimer** ce fichier et le remplacer par une documentation de déploiement actuelle (Cloud Run + GitHub Actions).

---

## 5. documentation/frontend.md — OBSOLÈTE

### État actuel
**Ce document décrit une architecture PouchDB + BackgroundSync qui n'est pas celle implémentée.**

Contenu actuel (obsolète) :
- Service `db.js` (PouchDB) — n'existe pas
- `BackgroundSync` pour offline — remplacé par Firestore native cache
- Service Worker personnalisé — remplacé par Vite PWA plugin
- Structure de services différente du code réel

### Recommandation
**Réécrire** pour décrire l'architecture Firestore offline actuelle, ou supprimer si `CLAUDE.md` couvre le sujet.

---

## 6. documentation/backend.md — À SUPPRIMER

### État actuel
**Ce document décrit une API REST Node.js/Express qui n'existe pas.**

Contenu actuel (hors-sujet) :
- Endpoints `/api/clients`, `/api/appointments`
- Middleware Express
- Authentification JWT
- Documentation Swagger

**L'application est frontend-only.** Il n'y a pas de backend.

### Recommandation
**Supprimer** ce fichier.

---

## 7. documentation/code-review.md

### État actuel
Document d'audit détaillé rédigé lors d'une session de développement précédente. Identifie correctement de nombreux bugs avec exemples de code.

### Problèmes identifiés
- Certains bugs listés ont peut-être été partiellement corrigés depuis
- Format proche de l'audit actuel (doublon)

### Recommandation
**Archiver** ou fusionner avec `documentation/audit.md` (ce dépôt). Conserver comme historique.

---

## Modèle README.md proposé

Voici la structure recommandée pour un README complet et à jour :

```markdown
# RDV Manager

Application PWA de gestion de rendez-vous pour professionnels indépendants.
Frontend React communiquant directement avec Firestore, déployée sur Cloud Run.

## Stack

- **Frontend** : React 18 + Vite 5 + Tailwind CSS
- **Base de données** : Firestore (Firebase) — offline-first avec IndexedDB
- **Hébergement** : Google Cloud Run (europe-west1)
- **Infrastructure** : Terraform (landing zone GCP)
- **CI/CD** : GitHub Actions + Workload Identity Federation

## Démarrage rapide

### Prérequis
- Docker + Docker Compose
- Node.js 20+ (pour développement hors Docker)
- Fichier `frontend/.env` (copier depuis `frontend/.env.example`)

### Développement local

cp frontend/.env.example frontend/.env
# Éditer frontend/.env avec un project_id fictif (ex: rdv-dev)
./deploy.sh dev

# Accès :
# → Application : http://localhost:5173
# → Émulateur Firestore UI : http://localhost:4000

### Arrêt

./deploy.sh dev-stop   # Arrête et exporte les données emulateur

## Environnements

| Environnement | Déclencheur | URL |
|---------------|-------------|-----|
| Staging | Push sur `develop` | Cloud Run staging |
| Production | Tag `v*` + approbation | Cloud Run production |

## Infrastructure

Voir `documentation/terraform-gcp.md` pour le détail.

## Workflow Git

Voir `documentation/git-workflow.md`.
```

---

## Plan d'action

### Actions immédiates

1. **Supprimer** `documentation/backend.md`
2. **Supprimer** `documentation/deployment.md`
3. **Supprimer** `documentation/frontend.md`
4. **Mettre à jour** `README.md` avec le modèle proposé
5. **Compléter** `CLAUDE.md` avec section Terraform et Git workflow

### Actions court terme

6. **Mettre à jour** `documentation/terraform-gcp.md` avec bootstrap + troubleshooting
7. **Archiver** `documentation/code-review.md` (remplacé par `audit.md`)
