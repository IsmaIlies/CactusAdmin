/**
 * create-mission-local.js
 *
 * Script utilitaire à lancer localement pour créer la mission "Canal + CIV"
 * et initialiser ses collections, puis propager les claims aux superviseurs.
 *
 * Usage: node scripts/create-mission-local.js
 * Requirements: place serviceAccountKey.json (Firebase service account) dans scripts/
 */

const fs = require('fs');
const admin = require('firebase-admin');

const keyPath = './scripts/serviceAccountKey.json';
if (!fs.existsSync(keyPath)) {
  console.error('serviceAccountKey.json not found in scripts/. Please download from Firebase Console → Project Settings → Service accounts');
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function findExistingCanalCIV() {
  const snapshot = await db.collection('missions').get();
  for (const doc of snapshot.docs) {
    const d = doc.data();
    const name = (d.name || '').toString().toLowerCase();
    if (name.includes('canal + civ') || name.includes('canal+civ') || name.includes('canal civ')) {
      return { id: doc.id, data: d };
    }
  }
  return null;
}

async function createMission() {
  const existing = await findExistingCanalCIV();
  if (existing) {
    console.log('Mission Canal + CIV déjà existante:', existing.id);
    return existing.id;
  }

  const now = admin.firestore.Timestamp.now();
  const mission = {
    name: 'Canal + CIV',
    description: 'Mission pour Canal + CIV (ventes et gestion)',
    users: [],
    isActive: true,
    createdBy: 'system-local',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    allowSelfRegistration: false,
    maxUsers: 50,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('missions').add(mission);
  console.log('Mission créée, id =', docRef.id);
  return docRef.id;
}

async function initCollections(missionId) {
  const temp = { temporary: true, createdAt: admin.firestore.Timestamp.now(), note: 'Temp init doc' };
  try {
    await db.collection('missions').doc(missionId).collection('sales').add({ ...temp, type: 'sales' });
    console.log('sales initialisée');
  } catch (e) { console.warn('sales init failed', e.message); }
  try {
    await db.collection('missions').doc(missionId).collection('contactsArgues').add({ ...temp, type: 'contactsArgues' });
    console.log('contactsArgues initialisée');
  } catch (e) { console.warn('contactsArgues init failed', e.message); }
  try {
    await db.collection('missions').doc(missionId).collection('objectives').add({ ...temp, type: 'objectives' });
    console.log('objectives initialisée');
  } catch (e) { console.warn('objectives init failed', e.message); }
}

async function assignSupervisorsToMission(missionId) {
  // Parcourir tous les users et assigner ceux qui sont superviseurs
  console.log('Recherche des superviseurs dans auth...');
  const list = await admin.auth().listUsers(1000);
  const superviseurs = list.users.filter(u => {
    const c = u.customClaims || {};
    const role = (c.role || '').toString().toLowerCase();
    return c.superviseur === true || role === 'superviseur' || role === 'supervisor';
  });

  console.log('Superviseurs trouvés:', superviseurs.length);
  const results = [];
  for (const u of superviseurs) {
    try {
      const userRecord = await admin.auth().getUser(u.uid);
      const currentClaims = userRecord.customClaims || {};
      const missionClaims = currentClaims.missions || {};
      missionClaims[missionId] = { role: 'supervisor', assignedAt: admin.firestore.Timestamp.now() };
      const newClaims = { ...currentClaims, missions: missionClaims };
      await admin.auth().setCustomUserClaims(u.uid, newClaims);
      results.push({ uid: u.uid, success: true });
      console.log('Claim ajouté pour', u.uid);
    } catch (err) {
      console.warn('Erreur claim pour', u.uid, err.message);
      results.push({ uid: u.uid, success: false, error: err.message });
    }
  }
  return results;
}

async function main() {
  try {
    const missionId = await createMission();
    await initCollections(missionId);
    const claimResults = await assignSupervisorsToMission(missionId);
    console.log('Fini. missionId =', missionId);
    console.log('claimResults sample:', claimResults.slice(0,5));
    console.log('Si vous voulez que les superviseurs voient leurs nouveaux claims, ils doivent se reconnecter ou rafraîchir leur token (getIdToken(true)).');
    process.exit(0);
  } catch (err) {
    console.error('Erreur:', err);
    process.exit(1);
  }
}

main();
