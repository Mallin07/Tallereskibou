// firebase.js (ACTUALIZADO)
// Uso en navegador con módulos ES

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBooBadNJI1fkfJ4elIGX4-hgZlcdU7Gd0",
  authDomain: "talleres-kibou.firebaseapp.com",
  projectId: "talleres-kibou",
  storageBucket: "talleres-kibou.appspot.com",
  messagingSenderId: "419529783308",
  appId: "1:419529783308:web:e40c656d0fa9545cb3d629",
  measurementId: "G-JVFF9HH6KL"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Guarda/actualiza el documento del usuario en /usuarios/{uid}
 * Se usa en el registro para crear el doc por primera vez.
 *
 * @param {string} uid
 * @param {string} nombre
 * @param {string} email
 * @param {{pendientes?: boolean, talleres?: boolean}} preferencias
 */
export async function guardarUsuario(uid, nombre, email, preferencias = {}) {
  const ref = doc(db, "usuarios", uid);

  const payload = {
    nombre: nombre ?? "",
    email: email ?? "",
    emailLower: (email || "").toLowerCase(),
    preferencias: {
      pendientes: Boolean(preferencias.pendientes),
      talleres: Boolean(preferencias.talleres),
    },
    cursos: [],                 // inicializa el array en el alta
    createdAt: serverTimestamp()
  };

  try {
    // merge:true evita sobreescribir campos existentes si el doc ya existiera
    await setDoc(ref, payload, { merge: true });
    console.log("✅ Usuario guardado con UID:", uid);
  } catch (e) {
    console.error("❌ Error al guardar usuario:", e);
    throw e;
  }
}
