// login.js //
import { auth } from "../firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-login");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      // Autenticación con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log("✅ Usuario autenticado:", user.email);

      // Buscar nombre del usuario en Firestore
      const querySnapshot = await getDocs(collection(db, "usuarios"));
      let nombre = "";

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.email.toLowerCase() === email.toLowerCase()) {
          nombre = data.nombre;
        }
      });

      // Guardar datos en localStorage
      localStorage.setItem("usuarioActivo", JSON.stringify({
        uid: user.uid,
        email: user.email,
        nombre: nombre || "Usuario"
      }));

      alert(`Bienvenid@ ${nombre || "usuario"}`);
      window.location.href = "../index.html";
    } catch (error) {
      console.error("❌ Error de login:", error.code, error.message);
      alert("Correo o contraseña incorrectos.");
    }
  });
});

