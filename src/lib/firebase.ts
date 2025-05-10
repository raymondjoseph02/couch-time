// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBeDHFYJzVUtKNV0gVs3m3o8YK4LXHvvMM",
  authDomain: "couchtime-96deb.firebaseapp.com",
  projectId: "couchtime-96deb",
  storageBucket: "couchtime-96deb.firebasestorage.app",
  messagingSenderId: "78534046845",
  appId: "1:78534046845:web:dd1360a1a957a4e4e32d14",
  measurementId: "G-04YJQN9S8T",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// const analytics = getAnalytics(app);
