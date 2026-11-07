
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  [key: string]: unknown;
};

// Firestore Database ID
const FIRESTORE_DATABASE_ID =
  'ai-studio-android-authprof-95d53195-67cb-4384-a107-e7f603d884df';

// Read Firebase Service Account
function readServiceAccount(): ServiceAccount {
  const raw =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error(
      'Missing GOOGLE_SERVICE_ACCOUNT_JSON environment variable.'
    );
  }

  const parsed = JSON.parse(raw) as ServiceAccount;

  if (parsed.private_key) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }

  return parsed;
}

// Initialize Firebase Admin App
function getFirebaseAdminApp() {
  const existingApp = getApps().find(
    (app) => app.name === '[DEFAULT]'
  );

  if (existingApp) {
    return existingApp;
  }

  const account = readServiceAccount();

  return initializeApp({
    credential: cert(account as any),
    projectId:
      process.env.FIREBASE_PROJECT_ID || account.project_id,
  });
}

// Firebase Admin Authentication
export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

// Firestore Database Connection
export function getAdminFirestore() {
  return getFirestore(
    getFirebaseAdminApp(),
    FIRESTORE_DATABASE_ID
  );
}

// Verify Firebase ID Token
export async function verifyFirebaseIdToken(idToken: string) {
  return getAdminAuth().verifyIdToken(idToken, true);
}

// Google Sheets Authentication
let googleAuthClient: GoogleAuth | null = null;

export async function getGoogleServiceAccessToken(): Promise<string> {
  if (!googleAuthClient) {
    const credentials = readServiceAccount();

    googleAuthClient = new GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });
  }

  const client = await googleAuthClient.getClient();

  const result = await client.getAccessToken();

  const token =
    typeof result === 'string' ? result : result.token;

  if (!token) {
    throw new Error(
      'Could not obtain Google service account access token.'
    );
  }

  return token;
}
