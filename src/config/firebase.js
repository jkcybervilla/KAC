import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

// ফায়ারবেস ইনিশিয়ালাইজ করা
const app = initializeApp(firebaseConfig);

// সার্ভিসগুলো এক্সপোর্ট করা (Login.jsx-এ ব্যবহারের জন্য)
export const auth = getAuth(app);
export const db = getFirestore(app);