import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const databaseId = (firebaseConfig as any).firestoreDatabaseId;

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({})
  }, databaseId || undefined);
} catch (e) {
  firestoreDb = databaseId 
    ? getFirestore(app, databaseId)
    : getFirestore(app);
}

export const db = firestoreDb;

// Validate Connection to Firestore on boot as per Firebase Skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or internet connection.");
    }
  }
}
testConnection();


