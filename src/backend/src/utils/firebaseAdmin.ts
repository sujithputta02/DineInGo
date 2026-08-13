import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) return admin.app();

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!clientEmail || !privateKey || !projectId) {
    console.warn('[FirebaseAdmin] Missing credentials. Firebase Admin features will be disabled.');
    return null;
  }

  try {
    // Handle the private key newline formatting correctly
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
  } catch (error) {
    console.error('[FirebaseAdmin] Initialization error:', error);
    return null;
  }
};

const firebaseAdmin = initializeFirebaseAdmin();

export default firebaseAdmin;
export const auth = firebaseAdmin ? firebaseAdmin.auth() : null;
