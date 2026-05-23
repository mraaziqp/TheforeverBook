import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const rawApiKey = (import.meta.env.VITE_FIREBASE_API_KEY?.trim() !== '' && import.meta.env.VITE_FIREBASE_API_KEY) || firebaseConfig.apiKey;
const rawAuthDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() !== '' && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || firebaseConfig.authDomain;
const rawProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() !== '' && import.meta.env.VITE_FIREBASE_PROJECT_ID) || firebaseConfig.projectId;
const rawStorageBucket = (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() !== '' && import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || firebaseConfig.storageBucket;
const rawMessagingSenderId = (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() !== '' && import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || firebaseConfig.messagingSenderId;
const rawAppId = (import.meta.env.VITE_FIREBASE_APP_ID?.trim() !== '' && import.meta.env.VITE_FIREBASE_APP_ID) || firebaseConfig.appId;
const rawFirestoreDatabaseId = (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID?.trim() !== '' && import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID) || firebaseConfig.firestoreDatabaseId;

// Auto-correction for swapped or malformed values (e.g. if the user swapped projectId and authDomain in their env file)
let projectId = rawProjectId;
let authDomain = rawAuthDomain;

if (projectId && projectId.includes('.firebaseapp.com')) {
  projectId = projectId.replace('.firebaseapp.com', '').trim();
}
if (authDomain && !authDomain.includes('.') && authDomain.trim() !== '') {
  authDomain = `${authDomain.trim()}.firebaseapp.com`;
}

const config = {
  apiKey: rawApiKey,
  authDomain,
  projectId,
  storageBucket: rawStorageBucket,
  messagingSenderId: rawMessagingSenderId,
  appId: rawAppId,
};

const app = initializeApp(config);

const isStudioProject = projectId === 'studio-9165894196-8cf76';
const dbId = (rawFirestoreDatabaseId && 
              rawFirestoreDatabaseId.trim() !== '' && 
              !rawFirestoreDatabaseId.startsWith('G-') && 
              (isStudioProject || rawFirestoreDatabaseId !== 'ai-studio-380b314f-b246-4bad-bb8d-fd7ee3fba5e8'))
              ? rawFirestoreDatabaseId 
              : undefined;

export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export { ref, uploadBytesResumable, getDownloadURL };
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
async function testConnection() {
  try {
    // Only test if we have a way to point to a document we might have access to
    // or just try to get a random non-existent doc to see if firestore is online
    await getDocFromServer(doc(db, '_connection_test_', 'test'));
  } catch (error) {
    // Quietly ignore or log minimally - connection was likely tested elsewhere too
  }
}

testConnection();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
