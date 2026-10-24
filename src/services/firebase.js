import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get, update, remove, child } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCox64uojVyV0njGjtlYitJnT5Nsg_dVyY",
  authDomain: "sahra-f4ec6.firebaseapp.com",
  databaseURL: "https://sahra-f4ec6-default-rtdb.firebaseio.com",
  projectId: "sahra-f4ec6",
  storageBucket: "sahra-f4ec6.firebasestorage.app",
  messagingSenderId: "455923436884",
  appId: "1:455923436884:android:ed4fdacd9fb4f427310cc1"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Services
export const database = getDatabase(app);
export const auth = getAuth(app);
export { ref, onValue, set, get, update, remove, child };

// Connection Status Monitor
export const watchConnectionStatus = (callback) => {
  try {
    const connectedRef = ref(database, '.info/connected');
    return onValue(connectedRef, (snap) => {
      const isConnected = snap.val() === true;
      if (callback) callback(isConnected);
    }, (err) => {
      console.warn('Firebase connection watcher notice:', err);
      if (callback) callback(false);
    });
  } catch (err) {
    console.warn('Firebase connection watcher error:', err);
    if (callback) callback(false);
    return () => {};
  }
};

export default app;
