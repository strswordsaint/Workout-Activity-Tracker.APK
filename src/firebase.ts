import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAuMFX9cj-r4mp1CF-QfNtxMfcVtMWSkIY",
  authDomain: "workout-tracker-3724d.firebaseapp.com",
  databaseURL: "https://workout-tracker-3724d-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "workout-tracker-3724d",
  storageBucket: "workout-tracker-3724d.firebasestorage.app",
  messagingSenderId: "828906618384",
  appId: "1:828906618384:web:95a73eb78bf37b0ddb5495"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const rtdb = getDatabase(app);