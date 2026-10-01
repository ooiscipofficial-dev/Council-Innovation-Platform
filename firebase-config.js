import { initializeApp } from https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js;
import { getFirestore } from https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js;
import { getAuth } from https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js;

const firebaseConfig = {
  apiKey: AIzaSyAtc5IAwW19sJMQRN4BGkpLeBULFJfx4po,
  authDomain: gic-form.firebaseapp.com,
  projectId: gic-form,
  storageBucket: gic-form.firebasestorage.app,
  messagingSenderId: 850042025080,
  appId: 1:850042025080:web:40886e1c5172c03278698d,
  measurementId: G-SV5RCR6MRD
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
