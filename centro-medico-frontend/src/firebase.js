import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onIdTokenChanged } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize provider for Google Login
export const googleProvider = new GoogleAuthProvider();

// Listener para mantener el token actualizado en localStorage
onIdTokenChanged(auth, async (user) => {
    if (user) {
        const token = await user.getIdToken();
        localStorage.setItem('token', token);
    } else {
        localStorage.removeItem('token');
    }
});
