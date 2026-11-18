// Prints the admin address that works right now, for when the email never arrived.
// The address is not stored anywhere: it is computed from ADMIN_PATH (Vercel > Settings > Environment Variables, it is a
// plain Config value), the current ISO week and the "epoch" kept in Firestore (adminSecurity/state).
//
//   ADMIN_PATH=<value from Vercel> GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run admin:link
//
// Optional: SITE_URL (default https://www.ampera.ge), ADMIN_PATH_ROTATE=off if it is switched off in Vercel.
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { rotates, validAdminSegments } from '../src/server/admin-path.ts';

const base = process.env.ADMIN_PATH;
if (!base) {
  console.error('Set ADMIN_PATH to the value of the ADMIN_PATH variable in Vercel.');
  process.exit(2);
}
const site = (process.env.SITE_URL ?? 'https://www.ampera.ge').replace(/\/+$/, '');

let epoch = 0;
if (rotates(process.env)) {
  initializeApp({ credential: applicationDefault() });
  const snap = await getFirestore().collection('adminSecurity').doc('state').get();
  epoch = Number(snap.data()?.epoch ?? 0);
}
const [current, previous] = validAdminSegments(process.env, new Date(), epoch);
console.log(`epoch ${epoch}`);
console.log(`current:  ${site}/m/${current}/`);
if (previous && previous !== current) console.log(`previous: ${site}/m/${previous}/   (last week's address, still accepted until next Monday)`);
