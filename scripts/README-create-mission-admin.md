Créer une mission via la Cloud Function `createMissionAdmin`

Cette fonction callable (region europe-west9) permet de créer une mission côté serveur et de propager les claims des utilisateurs assignés. Elle est protégée : seuls les utilisateurs ayant le claim `admin` (ou `direction`) peuvent l'appeler, ou bien un appel peut être autorisé en fournissant une clé serveur (ADMIN_FUNCTION_KEY) stockée dans la config des functions.

1) Déployer la function

Dans le dossier `functions/` :

```powershell
# Assurez-vous d'être connecté au bon projet Firebase
firebase deploy --only functions:createMissionAdmin
```

2) (Optionnel) Définir une clé secrète pour appels serveurs

```powershell
# Remplacer <KEY> par une valeur secrète
firebase functions:config:set admin.key="<KEY>"
# puis déployer
firebase deploy --only functions:createMissionAdmin
```

3) Appeler la function depuis le client (exemple JS)

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

const functions = getFunctions(app, 'europe-west9');
const createMissionAdmin = httpsCallable(functions, 'createMissionAdmin');

const payload = {
  missionData: { name: 'Canal + CIV', description: '...' },
  users: [ { uid: 'uid1', email: 'a@b.com', displayName: 'A', role: 'supervisor' } ],
  // serverKey: 'optional when calling from server'
};

createMissionAdmin(payload)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

Remarque : si tu appelles depuis le client, l'appel n'aboutira que si l'utilisateur connecté est admin (custom claim). Si tu veux appeler depuis un serveur, fournis `serverKey` et configure la même clé dans `functions.config().admin.key`.