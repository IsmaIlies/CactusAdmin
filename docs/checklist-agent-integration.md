# Intégration Checklist Heures — Application Agent (Option A)

Ce guide explique comment l'application Agent doit soumettre une journée d'heures directement dans Firestore pour qu'elle apparaisse automatiquement dans l'Admin (onglet "À valider").

## Prérequis

- L'app Agent utilise le même projet Firebase que l'Admin (même configuration Firebase).
- L'Agent est authentifié via Firebase Auth au moment de la soumission.
- Les règles Firestore du projet autorisent la création par le propriétaire (elles sont déjà en place côté Admin):
  - `create` autorisé si `request.resource.data.userId == request.auth.uid`
  - `update/delete` autorisé au propriétaire OU aux rôles admin/direction/superviseur
  - `read` autorisé aux utilisateurs authentifiés

## Collection et Doc ID

- Collection: `hoursEntries`
- Doc ID: `${uid}_${day}` (ex: `abc123_2025-09-23`)
  - Un document par Agent et par jour.

## Schéma attendu (document Firestore)

Champs requis:
- `id` (string) — identique au jour, ex: `2025-09-23`
- `period` (string) — `yyyy-MM`, ex: `2025-09`
- `day` (string) — `yyyy-MM-dd`
- `includeMorning` (boolean)
- `includeAfternoon` (boolean)
- `morningStart` (string) — `HH:mm`
- `morningEnd` (string) — `HH:mm`
- `afternoonStart` (string) — `HH:mm`
- `afternoonEnd` (string) — `HH:mm`
- `project` (string)
- `status` (string) — valeur: `submitted`
- `reviewStatus` (string) — valeur: `Pending`
- `userId` (string) — `auth.uid` de l'Agent
- `createdAt` — `serverTimestamp()`

Champs optionnels utiles:
- `notes` (string)
- `hasDispute` (boolean)
- `userDisplayName` (string|null)
- `userEmail` (string|null)
- `rejectionNote` (string|null) — laissé à `null` côté Agent, géré par l'Admin

Exemple JSON minimal:
```json
{
  "id": "2025-09-23",
  "period": "2025-09",
  "day": "2025-09-23",
  "includeMorning": true,
  "includeAfternoon": true,
  "morningStart": "09:00",
  "morningEnd": "12:00",
  "afternoonStart": "14:00",
  "afternoonEnd": "18:00",
  "project": "Production",
  "status": "submitted",
  "reviewStatus": "Pending",
  "userId": "<UID_AGENT>",
  "createdAt": "<serverTimestamp>",
  "notes": "Optionnel",
  "hasDispute": false
}
```

## Snippet TypeScript (Firebase v9+/v11)

A utiliser côté Agent au clic sur "Soumettre".

```ts
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

type AgentHoursEntry = {
  day: string;                 // 'yyyy-MM-dd'
  includeMorning: boolean;
  includeAfternoon: boolean;
  morningStart: string;        // 'HH:mm'
  morningEnd: string;          // 'HH:mm'
  afternoonStart: string;      // 'HH:mm'
  afternoonEnd: string;        // 'HH:mm'
  project: string;
  notes?: string;
  hasDispute?: boolean;
  userDisplayName?: string | null;
  userEmail?: string | null;
};

export async function submitAgentHours(entry: AgentHoursEntry) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  // Validation minimale
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.day)) {
    throw new Error('Format day attendu: yyyy-MM-dd');
  }

  const period = entry.day.slice(0, 7);      // yyyy-MM
  const docId = `${user.uid}_${entry.day}`;  // doc unique par jour/agent

  const payload = {
    id: entry.day,
    period,
    day: entry.day,
    includeMorning: !!entry.includeMorning,
    includeAfternoon: !!entry.includeAfternoon,
    morningStart: entry.morningStart || '',
    morningEnd: entry.morningEnd || '',
    afternoonStart: entry.afternoonStart || '',
    afternoonEnd: entry.afternoonEnd || '',
    project: entry.project || 'Autre',
    notes: entry.notes || undefined,
    status: 'submitted',
    reviewStatus: 'Pending',
    hasDispute: !!entry.hasDispute,
    userId: user.uid,
    userDisplayName: entry.userDisplayName ?? user.displayName ?? null,
    userEmail: entry.userEmail ?? user.email ?? null,
    createdAt: serverTimestamp(),
  };

  const db = getFirestore();
  await setDoc(doc(db, 'hoursEntries', docId), payload, { merge: true });
}
```

Notes:
- `merge: true` écrase/complète l'entrée de la journée (idempotent par jour).
- Gérer l'heure locale côté Agent (ex: `Intl.DateTimeFormat`), et toujours envoyer le format `HH:mm`.
- Si l'Agent désélectionne un demi‑jour (matin/aprem), laisser les champs d'heure vides ou cohérents; l'Admin voit `includeMorning/includeAfternoon`.

## Erreurs fréquentes
- `permission-denied` — utilisateur non authentifié ou `userId` != `auth.uid` à la création.
- `invalid-argument` — format `day` invalide, champs vides.

## Test rapide
1. Se connecter en Agent.
2. Appeler `submitAgentHours(...)` avec un jour du mois courant.
3. Dans l'Admin, page "Checklist Heures (Admin)", onglet "À valider": l'entrée apparaît automatiquement pour la période.

## Bonnes pratiques
- Un jour = un document (docId déterministe). La ressoumission corrige l'existant.
- Inclure `userDisplayName` et `userEmail` pour aider l'Admin à identifier l'Agent.
- Centraliser la construction de `period` (toujours `day.slice(0,7)`).

---
En cas de projet Agent différent (autre instance Firebase), privilégier une fonction callable côté Admin (déjà prête: `submitAgentHours`) et passer par l'API Functions plutôt qu'un accès cross‑projet.
