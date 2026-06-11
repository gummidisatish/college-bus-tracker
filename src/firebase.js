import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCMpNKl-xnNvtnU6sFXMTXqfonDCTzhCYM",
  authDomain: "college-bus-tracker-d769f.firebaseapp.com",
  databaseURL: "https://college-bus-tracker-d769f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "college-bus-tracker-d769f",
  storageBucket: "college-bus-tracker-d769f.firebasestorage.app",
  messagingSenderId: "94479883957",
  appId: "1:94479883957:web:7f9815fd951e85fb1828fc"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);