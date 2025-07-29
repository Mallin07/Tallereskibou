// login.js
import { auth, db } from "../firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-login");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;

    if (!email || !password) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    try {
      // 1. Autenticación
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log("✅ Usuario autenticado:", user.email);

      // 2. Intentar obtener nombre desde Firestore
      let nombre = "Usuario";
      try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.email.toLowerCase() === email.toLowerCase()) {
            nombre = data.nombre;
          }
        });
      } catch (firestoreError) {
        console.warn("⚠️ No se pudo obtener nombre desde Firestore:", firestoreError.message);
      }

      // 3. Guardar en localStorage
      localStorage.setItem("usuarioActivo", JSON.stringify({
        uid: user.uid,
        email: user.email,
        nombre
      }));

      alert(`Bienvenid@ ${nombre}`);
      window.location.href = "../index.html";

    } catch (error) {
      console.error("❌ Error de login:", error.code, error.message);
      console.log("Código de error:", error.code);
      console.log("Mensaje de error:", error.message);

      alert("Correo o contraseña incorrectos o usuario no registrado.");
    }
  });
});
