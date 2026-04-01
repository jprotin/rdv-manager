# Code Review — RDV Manager Frontend

> Revue réalisée le 2026-04-01 sur la base du code `frontend/src/`.

---

## Résumé exécutif

| Catégorie | Nombre de points |
|-----------|-----------------|
| Bugs critiques | 3 |
| Performance / Architecture React | 3 |
| Duplications | 4 |
| Gestion des erreurs silencieuses | 3 |
| Accessibilité | 4 |
| Qualité / mauvaises pratiques | 5 |
| Responsive / UX | 2 |

**Priorité recommandée :** corriger d'abord les points 4 (boucle infinie), 2 (pagination), 7-9 (utils partagés), puis le reste selon l'importance fonctionnelle.

---

## 1. Bugs critiques

### 1.1 Import hors position — `CreateAppointmentModal.jsx:14`

```js
// ❌ Import useApp placé APRÈS une déclaration de variable
const STATUS_OPTIONS = [...];
import { useApp } from '../../context/AppContext.jsx';
```

Les imports ESM doivent toujours précéder tout code exécutable. Ce pattern peut provoquer des erreurs selon le bundler.

**Correction :** déplacer tous les imports en tête de fichier.

---

### 1.2 Pagination côté client — `firestore.js`

```js
// ❌ Tous les documents sont chargés, puis slicés en mémoire
const snap = await getDocs(q);
const all  = snap.docs.map(...);
return { data: all.slice(offset, offset + limit), total: all.length };
```

Au-delà de quelques centaines de documents, Firestore charge tout en mémoire avant de paginer.

**Correction :** utiliser `startAfter()` + `limit()` côté Firestore pour une vraie pagination par curseur.

---

### 1.3 Retour incohérent de `clientsService.create()` — `firestore.js`

```js
// ❌ createdAt / updatedAt / deletedAt absents du retour
return { _id: ref.id, ...data };
// data = { firstName, lastName, phone, address } seulement
```

Le reste du code s'attend à des champs Firestore complets sur l'objet retourné.

**Correction :** inclure les champs de métadonnées dans l'objet retourné, ou relire le document après création.

---

## 2. Performance / Architecture React

### 2.1 Boucle infinie dans `useEffect` — `Dashboard.jsx`, `AppointmentList.jsx`

```js
// ❌ fetchAppointments est recréée à chaque render → useEffect se relance indéfiniment
const fetchAppointments = async () => { ... };
useEffect(() => { fetchAppointments(); }, [fetchAppointments]);
```

**Correction :** entourer `fetchAppointments` avec `useCallback` en listant ses vraies dépendances (`page`, `filters`), ou passer les dépendances directement dans le tableau de l'effet.

---

### 2.2 Appel Firestore sans cache ni annulation — `DateTimePicker.jsx`

```js
// ❌ Requête déclenchée à chaque clic sur un jour du calendrier, sans annulation du précédent
useEffect(() => {
  appointmentsService.getAll({ from, to, limit: 200 }).then(...);
}, [selDate]);
```

**Correction :** utiliser un flag d'annulation (`let cancelled = false`) dans le cleanup du `useEffect`, et envisager un cache local par date pour éviter les requêtes répétées sur la même journée.

---

### 2.3 Fuite mémoire sur recherche client — `CreateAppointmentModal.jsx:52`

```js
// ❌ Pas d'annulation si le composant est unmounté pendant le timeout
const t = setTimeout(async () => {
  const results = await clientsService.getAll(clientSearch);
  setClientResults(results); // setState sur composant mort
}, 300);
return () => clearTimeout(t); // clearTimeout ok, mais l'appel async peut encore aboutir
```

**Correction :** ajouter un flag `let active = true` dans le cleanup de l'effet, et vérifier `if (active)` avant le `setState`.

---

## 3. Duplications et code partageable

### 3.1 `pad()` et `generateSlots()` dupliqués

Présents dans `TimePicker.jsx` et `DateTimePicker.jsx` avec un code identique.

**Correction :** extraire dans `src/utils/time.js`.

---

### 3.2 Fonctions de formatage dupliquées

`formatDT()` et `formatPhone()` sont redéfinies dans `AppointmentCard.jsx` et `ClientCard.jsx`.

**Correction :** centraliser dans `src/utils/format.js`.

---

### 3.3 `STATUS_OPTIONS` défini 3 fois

Valeurs identiques dans `AppointmentList.jsx`, `CreateAppointmentModal.jsx` et `AppointmentCard.jsx`.

**Correction :** extraire dans `src/constants/appointments.js` et importer partout.

---

### 3.4 Calcul début/fin de journée répété

```js
// Répété plusieurs fois dans firestore.js et DateTimePicker.jsx
new Date(y, m, d, 0, 0, 0).toISOString()
new Date(y, m, d, 23, 59, 59).toISOString()
```

**Correction :** fonction utilitaire `dayRange(y, m, d)` retournant `{ from, to }`.

---

## 4. Gestion des erreurs silencieuses

### 4.1 Créneaux non chargés sans feedback — `DateTimePicker.jsx:97`

```js
.catch(console.error) // ❌ L'utilisateur voit une liste vide sans explication
```

**Correction :** stocker une erreur en state et afficher un message dans la grille de créneaux.

---

### 4.2 Chargements échoués sans notification — `AppointmentList.jsx`, `ClientList.jsx`, `Statistics.jsx`

Les erreurs de fetch sont uniquement loguées en console. L'utilisateur voit une liste vide et ne sait pas pourquoi.

**Correction :** appeler `notify('error', ...)` dans les blocs `catch`, ou afficher un état d'erreur inline.

---

### 4.3 Recherche client silencieuse — `CreateAppointmentModal.jsx:56`

```js
catch { /* ignore */ } // ❌ Pas de distinction entre "aucun résultat" et "erreur réseau"
```

**Correction :** distinguer les deux cas et afficher un message approprié.

---

## 5. Accessibilité

### 5.1 Navigation clavier impossible sur les listes — `AddressSearch.jsx`, `CreateAppointmentModal.jsx`

```jsx
// ❌ onMouseDown empêche la navigation clavier
<li onMouseDown={() => handleClientSelect(c)}>
```

L'utilisation de `onMouseDown` (au lieu de `onClick`) a pour objectif d'éviter que le `onBlur` du champ ferme le dropdown, mais casse la navigation au clavier.

**Correction :** utiliser `onClick` + `preventDefault` sur `onMouseDown`, ou gérer l'état de focus manuellement.

---

### 5.2 Calendrier sans labels ARIA — `DateTimePicker.jsx`

Les boutons de jours n'ont pas d'`aria-label` descriptif ("5 avril, aujourd'hui", "3 mars, passé, indisponible").

**Correction :** ajouter `aria-label` et `aria-pressed` / `aria-disabled` sur chaque cellule de jour.

---

### 5.3 Boutons d'expansion sans état ARIA — `AppointmentCard.jsx`, `ClientCard.jsx`

Les boutons de pliage/dépliage des cartes n'ont pas `aria-expanded`.

**Correction :** `<button aria-expanded={isOpen}>`.

---

### 5.4 Indicateur de connectivité non annoncé — `Header.jsx`

La pastille en ligne/hors ligne est une `<span>` visuelle, non annoncée aux lecteurs d'écran lors des changements d'état.

**Correction :** ajouter `role="status"` et `aria-live="polite"` sur le conteneur.

---

## 6. Qualité / mauvaises pratiques

### 6.1 `confirm()` natif pour les suppressions — `AppointmentCard.jsx`, `ClientCard.jsx`

```js
// ❌ Impossible d'afficher une erreur après confirmation, pas de style cohérent
if (!confirm('Supprimer ce rendez-vous ?')) return;
```

**Correction :** utiliser une modale de confirmation thémée (réutiliser `SelectPicker` ou créer un `ConfirmDialog`).

---

### 6.2 Manipulation directe du DOM — `BurgerMenu.jsx`

```js
// ❌ Side-effect non React, pose problème si plusieurs overlays s'empilent
document.body.style.overflow = 'hidden';
```

**Correction :** gérer via un compteur de modales ouvertes dans `AppContext`, ou une lib dédiée.

---

### 6.3 `Toast` défini dans le fichier contexte — `AppContext.jsx`

Le composant visuel `Toast` est dans le même fichier que le contexte React, mélangeant deux responsabilités.

**Correction :** extraire `Toast` dans `src/components/common/Toast.jsx`.

---

### 6.4 Absence de validation des variables d'environnement — `firebase.js`

```js
// ❌ Si une variable est undefined, Firebase initialise silencieusement avec une config invalide
apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
```

**Correction :** valider au démarrage que toutes les variables obligatoires sont définies et lever une erreur explicite sinon.

---

### 6.5 Alias inutile — `firestore.js:8`

```js
const col = (name) => collection(db, name); // Alias qui nuit à la lisibilité
```

**Correction :** utiliser directement `collection(db, 'appointments')` ou nommer la constante de façon explicite.

---

## 7. Responsive / UX

### 7.1 Grilles 2 colonnes sans fallback mobile étroit

`grid-cols-2` dans `Dashboard.jsx` et `Statistics.jsx` sans `grid-cols-1` pour les écrans < 360px (certains Android anciens).

**Correction :** `grid-cols-1 sm:grid-cols-2`.

---

### 7.2 Surface tactile trop petite sur les chevrons de navigation — `DateTimePicker.jsx`

Les boutons `‹` et `›` ont une surface de 32×32px, en dessous du minimum recommandé de 44×44px sur mobile (guidelines Apple / Google).

**Correction :** passer à `w-11 h-11` (`44px`).

---

## Fichiers concernés par priorité

| Priorité | Fichiers |
|----------|----------|
| **Immédiate** | `firestore.js`, `Dashboard.jsx`, `AppointmentList.jsx` |
| **Court terme** | `CreateAppointmentModal.jsx`, `DateTimePicker.jsx`, `AppointmentCard.jsx`, `ClientCard.jsx` |
| **Moyen terme** | `AppContext.jsx`, `firebase.js`, `BurgerMenu.jsx`, `AddressSearch.jsx` |
| **Refactoring** | Création de `src/utils/time.js`, `src/utils/format.js`, `src/constants/appointments.js` |
