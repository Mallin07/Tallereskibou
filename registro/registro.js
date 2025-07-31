// registro.js
import { auth, guardarUsuario } from "../firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-registro");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmar = document.getElementById("confirmar-password").value;

    if (password !== confirmar) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    try {
      const credenciales = await createUserWithEmailAndPassword(auth, email, password);
      const uid = credenciales.user.uid;

      // ✅ Ahora pasamos UID junto con nombre y email
      await guardarUsuario(uid, nombre, email);

      alert("✅ Registro exitoso. Sesión iniciada.");
      window.location.href = "../index.html";
    } catch (error) {
      console.error("❌ Error al crear usuario:", error);
      alert("Error: " + error.message);
    }
  });
});
