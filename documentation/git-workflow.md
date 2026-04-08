# Workflow Git — RDV Manager

> Du développement au delivery — procédure complète avec commandes.

---

## Vue d'ensemble

```
feature/* ──┐
fix/*    ──┤──► develop ──► release/x.y.z ──► main ──► tag v*
hotfix/* ──┘                                    │
                                                └──► production (via GitHub Actions)
```

| Branche | Rôle | Déploiement |
|---------|------|-------------|
| `main` | Code en production | Manuel via tag `v*` |
| `develop` | Intégration continue | Auto → staging |
| `feature/*` | Nouvelle fonctionnalité | Aucun |
| `fix/*` | Correction de bug | Aucun |
| `hotfix/*` | Correction urgente production | Via tag après merge main |
| `release/x.y.z` | Préparation release | Aucun |

---

## Conventions de commits

Format : **Conventional Commits** (`type(scope): description`)

| Type | Usage | Exemple |
|------|-------|---------|
| `feat` | Nouvelle fonctionnalité | `feat(appointments): add recurring RDV support` |
| `fix` | Correction de bug | `fix(calendar): prevent slot overlap on same day` |
| `refactor` | Refactoring sans changement fonctionnel | `refactor(firestore): extract pagination helper` |
| `perf` | Amélioration de performance | `perf(clients): replace client-side search with cursor` |
| `docs` | Documentation uniquement | `docs: update git workflow procedure` |
| `chore` | Tâche technique (deps, config) | `chore: upgrade firebase to 10.14.0` |
| `ci` | CI/CD | `ci: add eslint step to workflow` |
| `test` | Tests | `test: add unit tests for firestore pagination` |

**Règles :**
- Description en minuscule, sans point final
- Impératif présent ("add" pas "added")
- Corps optionnel pour expliquer le "pourquoi"

---

## 1. Démarrer une nouvelle fonctionnalité

```bash
# 1. Se placer sur develop à jour
git checkout develop
git pull origin develop

# 2. Créer la branche feature
git checkout -b feature/nom-de-la-fonctionnalite

# Exemples :
# git checkout -b feature/recurring-appointments
# git checkout -b feature/export-csv-clients
```

---

## 2. Développer

```bash
# Démarrer l'environnement local
./deploy.sh dev

# Travailler... puis commiter régulièrement
git add frontend/src/components/Appointments/RecurringModal.jsx
git commit -m "feat(appointments): add recurring appointment modal UI"

git add frontend/src/services/firestore.js
git commit -m "feat(appointments): add createRecurring service method"

# Vérifier le build avant de pousser
cd frontend && npm run build && cd ..
```

---

## 3. Pousser et ouvrir une Pull Request

```bash
# Pousser la branche
git push origin feature/nom-de-la-fonctionnalite

# Sur GitHub : New Pull Request
# Base : develop  ←  Compare : feature/nom-de-la-fonctionnalite
```

**Checklist PR :**
- [ ] Build Vite passe (`npm run build`)
- [ ] Pas de `console.log` de debug
- [ ] Commits avec messages conventionnels
- [ ] Description PR explique le "pourquoi"

Le workflow CI (`ci.yml`) se déclenche automatiquement sur la PR et vérifie le build.

---

## 4. Merge dans develop → déploiement staging automatique

```bash
# Après approbation et CI vert : merger sur GitHub (bouton "Merge pull request")
# OU en ligne de commande :

git checkout develop
git merge --no-ff feature/nom-de-la-fonctionnalite
git push origin develop

# Supprimer la branche locale et distante
git branch -d feature/nom-de-la-fonctionnalite
git push origin --delete feature/nom-de-la-fonctionnalite
```

**Résultat :** GitHub Actions `Deploy — Staging` se déclenche automatiquement.
Vérifier dans l'onglet **Actions** → job doit être vert.

---

## 5. Préparer une release

Quand `develop` est stable et prêt pour la production :

```bash
# Créer la branche release depuis develop
git checkout develop
git pull origin develop
git checkout -b release/1.2.0

# Mettre à jour la version dans package.json
cd frontend
npm version minor   # ou patch / major selon les changements
# → modifie package.json : "version": "1.2.0"
cd ..

git add frontend/package.json
git commit -m "chore: bump version to 1.2.0"

git push origin release/1.2.0
```

**Sur la branche release, seules les corrections de bugs sont autorisées.**
Pas de nouvelles fonctionnalités.

---

## 6. Merger la release dans main et develop

```bash
# Merger dans main
git checkout main
git merge --no-ff release/1.2.0
git push origin main

# Merger en retour dans develop (pour récupérer les corrections de bugs)
git checkout develop
git merge --no-ff release/1.2.0
git push origin develop

# Supprimer la branche release
git branch -d release/1.2.0
git push origin --delete release/1.2.0
```

---

## 7. Tagger et déclencher le déploiement production

```bash
# Créer le tag sémantique depuis main
git checkout main
git tag -a v1.2.0 -m "Release 1.2.0 — recurring appointments, CSV export"
git push origin v1.2.0
```

**Résultat :**
1. GitHub Actions `Deploy — Production` se déclenche sur le tag `v*`
2. Build + push de l'image Docker (job automatique)
3. Le job `deploy` attend l'approbation manuelle de `jprotin` (environnement `production`)
4. Après approbation → déploiement sur Cloud Run production

**Approuver sur GitHub :** Actions → workflow → "Review deployments" → Approve

---

## 8. Hotfix (correction urgente en production)

Quand un bug critique est découvert en production et ne peut pas attendre une release normale :

```bash
# Créer hotfix depuis main (pas develop)
git checkout main
git pull origin main
git checkout -b hotfix/fix-appointment-double-booking

# Corriger le bug
git add ...
git commit -m "fix(appointments): prevent double booking on concurrent saves"

# Merger dans main
git checkout main
git merge --no-ff hotfix/fix-appointment-double-booking

# Tagger immédiatement (patch version)
git tag -a v1.2.1 -m "Hotfix 1.2.1 — fix double booking"
git push origin main
git push origin v1.2.1

# Merger aussi dans develop pour ne pas perdre le fix
git checkout develop
git merge --no-ff hotfix/fix-appointment-double-booking
git push origin develop

# Supprimer la branche
git branch -d hotfix/fix-appointment-double-booking
git push origin --delete hotfix/fix-appointment-double-booking
```

---

## 9. Versioning sémantique

Format : `vMAJEUR.MINEUR.PATCH`

| Incrément | Quand | Exemple |
|-----------|-------|---------|
| `PATCH` (x.x.**1**) | Bug fix rétrocompatible | `v1.2.0 → v1.2.1` |
| `MINOR` (x.**1**.0) | Nouvelle fonctionnalité rétrocompatible | `v1.2.0 → v1.3.0` |
| `MAJOR` (**1**.0.0) | Changement cassant (migration données, refonte UI) | `v1.2.0 → v2.0.0` |

---

## 10. Récapitulatif des commandes fréquentes

```bash
# Voir l'état de la branche courante
git status
git log --oneline -10

# Voir toutes les branches
git branch -a

# Mettre à jour develop depuis origin
git checkout develop && git pull origin develop

# Annuler les modifications non commitées sur un fichier
git restore frontend/src/services/firestore.js

# Annuler le dernier commit (garder les changements)
git reset --soft HEAD~1

# Voir les tags existants
git tag -l | sort -V

# Supprimer un tag local et distant (si erreur)
git tag -d v1.2.0
git push origin --delete v1.2.0
```

---

## 11. Schéma du flux complet

```
┌─────────────────────────────────────────────────────────────┐
│                     DÉVELOPPEMENT                            │
│                                                             │
│  feature/xyz  →  PR  →  CI build check  →  merge develop   │
│                                                ↓            │
│                                    Deploy — Staging (auto)  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      RELEASE                                │
│                                                             │
│  develop  →  release/x.y.z  →  tests manuels staging       │
│                     ↓                                       │
│              merge main  +  merge develop                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION                              │
│                                                             │
│  git tag vx.y.z  →  Deploy — Production (build auto)       │
│                              ↓                              │
│                   ⏸ Approbation manuelle (jprotin)          │
│                              ↓                              │
│                   ✅ Déploiement Cloud Run production        │
└─────────────────────────────────────────────────────────────┘
```
