/**
 * set-claim.js
 * Usage: node set-claim.js <UID> <role>
 * Example: node set-claim.js u12345 admin
 *
 * This script sets custom claims (role + boolean flags) for a given user UID
 * using a Firebase service account key stored in serviceAccountKey.json.
 */
const admin = require('firebase-admin');
const fs = require('fs');

const keyPath = './serviceAccountKey.json';
if (!fs.existsSync(keyPath)) {
  console.error('Missing serviceAccountKey.json. Download it from Firebase Console → Project Settings → Service accounts');
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function main() {
  const uid = process.argv[2];
  const role = process.argv[3] || 'admin';

  if (!uid) {
    console.error('Usage: node set-claim.js <UID> [role]');
    process.exit(1);
  }

  const claims = { role };
  if (role === 'admin') claims.admin = true;
  if (role === 'direction') claims.direction = true;
  if (role === 'superviseur' || role === 'supervisor') claims.superviseur = true;

  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    console.log(`Custom claims set for ${uid}:`, claims);
    process.exit(0);
  } catch (err) {
    console.error('Error setting claims:', err);
    process.exit(1);
  }
}

main();
