Scripts helper

set-admin-claim.cjs
- Purpose: set custom claims (admin/role) on a user using Firebase Admin SDK and a service account JSON.
- Usage: node scripts/set-admin-claim.cjs <USER_UID> [role]
  - Example: node scripts/set-admin-claim.cjs hM9okHWTl4aKnCDSvP0sySK8XK62 admin

Notes:
- Place your service account JSON at scripts/serviceAccountKey.json (do NOT commit this file to git).
- After running the script, the affected user must refresh their ID token for the client to see updated claims.
  - They can log out/in, or run `firebase.auth().currentUser.getIdToken(true)` in the browser console.

add-user-to-mission.cjs
- Purpose: add a user to the `users` array of a mission document using the Admin SDK (bypasses client rules).
- Usage: node scripts/add-user-to-mission.cjs <MISSION_ID> <USER_UID> <EMAIL> [displayName] [role]
  - Example: node scripts/add-user-to-mission.cjs QJu46n4TssecYSjGypXx hM9okHWTl4aKnCDSvP0sySK8XK62 user@example.com "John Doe" supervisor

Note: This script should only be run by a trusted operator with the service account. It's an admin workaround for environments where client writes are blocked by Firestore rules.
