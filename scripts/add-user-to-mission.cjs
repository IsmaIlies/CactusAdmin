// add-user-to-mission.cjs
// Usage: node scripts/add-user-to-mission.cjs <MISSION_ID> <USER_UID> <EMAIL> [displayName] [role]
// Example:
// node scripts/add-user-to-mission.cjs QJu46n4TssecYSjGypXx hM9okHWTl4aKnCDSvP0sySK8XK62 user@example.com "John Doe" supervisor

const admin = require('firebase-admin');
const path = require('path');

const keyPath = path.resolve(__dirname, 'serviceAccountKey.json');
try {
  const svc = require(keyPath);
  admin.initializeApp({ credential: admin.credential.cert(svc) });
} catch (err) {
  console.error('Could not load service account key from', keyPath);
  console.error('Create one at scripts/serviceAccountKey.json or update the path.');
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: node scripts/add-user-to-mission.cjs <MISSION_ID> <USER_UID> <EMAIL> [displayName] [role]');
    process.exit(1);
  }
  const [missionId, uid, email, displayName = null, role = 'ta'] = args;

  const missionRef = admin.firestore().doc(`missions/${missionId}`);
  try {
    await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(missionRef);
      if (!snap.exists) throw new Error('Mission not found: ' + missionId);
      const mission = snap.data() || {};
      const users = Array.isArray(mission.users) ? [...mission.users] : [];
      if (users.some(u => u.uid === uid)) {
        console.log('User already assigned to mission');
        return;
      }
      const now = admin.firestore.Timestamp.now();
      users.push({ uid, email, displayName: displayName || null, role, assignedAt: now });
      tx.update(missionRef, { users, updatedAt: now });
    });
    console.log('User added to mission', missionId, uid);
  } catch (err) {
    console.error('Failed to add user to mission:', err);
    process.exit(1);
  }
}

main();
