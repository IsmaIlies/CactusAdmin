Utilitaire : set-claim.js

Ce petit script permet de définir des `custom claims` (rôle et flags) pour un utilisateur Firebase à partir d'une clé de service (service account). Utile pour donner rapidement le rôle `admin` ou `superviseur` à un compte pour les tests locaux.

Important : ce script doit être exécuté sur une machine de confiance (local ou serveur d'administration). Ne publiez pas la clé `serviceAccountKey.json`.

Pré-requis
- Node.js installé
- Un fichier `serviceAccountKey.json` téléchargé depuis la console Firebase → Paramètres du projet → Comptes de service → Générer une clé privée. Placer ce fichier dans `scripts/` à côté de `set-claim.js`.

Étapes (PowerShell Windows)

1. Ouvrez PowerShell dans le dossier du projet (par exemple `C:\Users\ilies\OneDrive\Documents\MarsMarketing\AdminCactus`).
2. Installez la dépendance `firebase-admin` si ce n'est pas déjà fait :

```
npm install firebase-admin
```

3. Lancez le script pour définir le rôle (remplacez `<UID>` par l'UID de l'utilisateur cible) :

```
# donner le rôle admin
node scripts/set-claim.js <UID> admin

# ou donner le rôle superviseur
node scripts/set-claim.js <UID> superviseur
```

4. Dans l'application, demandez à l'utilisateur de se déconnecter puis se reconnecter, ou appelez la méthode `refreshUserClaims()` exposée par le contexte `AuthContext` pour forcer la récupération des nouveaux claims.

Remarque
- Le script définit à la fois `role` (string) et un boolean correspondant (`admin`, `direction`, `superviseur`) pour faciliter la compatibilité avec vos règles Firestore.
- Si vous préférez une méthode plus contrôlée, je peux ajouter une Cloud Function admin qui créera la mission côté serveur (et définira les claims) pour éviter d'exposer des privilèges côté client.
