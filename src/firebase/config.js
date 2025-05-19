// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration - using direct values to avoid env variable issues
const firebaseConfig = {
  apiKey: "AIzaSyBuJu_nK7M8Rh9vUJxotNusRJtUiI-6Jo4",
  authDomain: "wheredunno.firebaseapp.com",
  projectId: "wheredunno",
  storageBucket: "wheredunno.firebasestorage.app",
  messagingSenderId: "759083357491",
  appId: "1:759083357491:web:90d2c696ae7b6194ae1a46",
  measurementId: "G-E6DZKBMSYT"
};

console.log("Firebase config:", firebaseConfig);

// Initialize Firebase
let app;
let analytics = null;
let db = null;
let auth = null;

try {
  // Initialize the Firebase app
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase services
  analytics = getAnalytics(app);
  db = getFirestore(app);
  auth = getAuth(app);
  
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { db, auth, analytics };
