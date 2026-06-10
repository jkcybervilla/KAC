import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// আপনার লেটেস্ট কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyCHe7MIUeyiaCTLQM7AN7uG8Q2DUt9XO4o",
  authDomain: "kac-official-e65e8.firebaseapp.com",
  projectId: "kac-official-e65e8",
  storageBucket: "kac-official-e65e8.firebasestorage.app",
  messagingSenderId: "1004426533035",
  appId: "1:1004426533035:web:cb227cf09817560cd2ffee",
  measurementId: "G-0HTSL2PG0R"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Set persistence to LOCAL so the user stays logged in after closing/reopening the app
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Firebase auth persistence error:", error);
  });