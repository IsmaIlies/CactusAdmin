Créer la mission "Canal + CIV" localement (script)

Ce script `create-mission-local.js` permet de créer la mission "Canal + CIV" depuis ta machine (exécute le avec une clé de service Firebase). Il :
- crée la doc `missions/{id}`
- initialise les sous-collections `sales`, `contactsArgues`, `objectives` (avec un document temporaire)
- parcourt les users dans Firebase Auth et ajoute la mission aux custom claims des utilisateurs marqués superviseur

Prérequis
- Node.js installé
- Déposer la clé de service `serviceAccountKey.json` dans `scripts/`
- installer firebase-admin si besoin :

```powershell
npm install firebase-admin
```

Exécution (PowerShell) :

```powershell
node scripts/create-mission-local.js
```

Après exécution :
- Le script affiche l'ID de la mission créée.
- Les superviseurs auront leurs claims mis à jour côté serveur. Ils doivent se reconnecter pour que l'app client récupère leur nouveau token.

Si tu veux, je peux exécuter ce script pour toi (si tu fournis le fichier `serviceAccountKey.json`), ou te guider pas-à-pas pour le lancer localement.
