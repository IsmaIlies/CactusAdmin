// Simple script to set custom claims for a user using Firebase Admin SDK
// Usage: node scripts/set-admin-claim.cjs <USER_UID> [role]
// Example: node scripts/set-admin-claim.cjs hM9okHWTl4aKnCDSvP0sySK8XK62 admin

const admin = require('firebase-admin');
const path = require('path');

// Load service account JSON placed at scripts/serviceAccountKey.json
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
  if (args.length < 1) {
    console.error('Usage: node scripts/set-admin-claim.cjs <USER_UID> [role]');
    process.exit(1);
  }
  const uid = args[0];
  const role = args[1] || null;

  const claims = {};
  // Set the boolean admin flag (used by firestore.rules hasAdminRole check)
  claims.admin = true;
  // Also set a role string if provided (rules also look at request.auth.token.role)
  if (role) claims.role = role;

  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    console.log('Custom claims set for', uid, claims);
    console.log('Important: the user must refresh their ID token (logout/login or getIdToken(true)) to see the change in the client.');
  } catch (err) {
    console.error('Failed to set custom claims:', err);
    process.exit(1);
  }
}

main();
