// firebase.js (CORRECTO para entorno navegador local)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBooBadNJI1fkfJ4elIGX4-hgZlcdU7Gd0",
  authDomain: "talleres-kibou.firebaseapp.com",
  projectId: "talleres-kibou",
  storageBucket: "talleres-kibou.appspot.com", // ⚠️ Corregido: tenía .firebasestorage.app (incorrecto)
  messagingSenderId: "419529783308",
  appId: "1:419529783308:web:e40c656d0fa9545cb3d629",
  measurementId: "G-JVFF9HH6KL"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// ...............Función para guardar usuario en Firestore............

export async function guardarUsuario(nombre, email) {
  try {
    const docRef = await addDoc(collection(db, "usuarios"), {
      nombre,
      email,
      cursos: []
    });
    console.log("✅ Usuario guardado con ID:", docRef.id);
  } catch (e) {
    console.error("❌ Error al guardar usuario:", e);
  }
}

