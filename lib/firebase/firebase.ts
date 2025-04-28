import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA1hKkEKTW0kcVADfIql8tJ2jpDoYWwki8",
  authDomain: "trackingmanagement-6e813.firebaseapp.com",
  databaseURL: "https://trackingmanagement-6e813-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "trackingmanagement-6e813",
  storageBucket: "trackingmanagement-6e813.firebasestorage.app",
  messagingSenderId: "166871417428",
  appId: "1:166871417428:web:bc17897430b3eca701a3c1",
  measurementId: "G-E98P109RDX"
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const database = getDatabase(app);

export { app, auth, database };
