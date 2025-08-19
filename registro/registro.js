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

    // ✅ nuevas preferencias
    const notifPendientes = document.getElementById("notif-pendientes").checked;
    const notifTalleres   = document.getElementById("notif-talleres").checked;

    if (password !== confirmar) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    try {
      const credenciales = await createUserWithEmailAndPassword(auth, email, password);
      const uid = credenciales.user.uid;

      // Pasamos preferencias a Firestore junto al usuario
      await guardarUsuario(uid, nombre, email, {
        pendientes: notifPendientes,
        talleres: notifTalleres,
      });

      alert("✅ Registro exitoso. Sesión iniciada.");
      window.location.href = "../index.html";
    } catch (error) {
      console.error("❌ Error al crear usuario:", error);
      alert("Error: " + error.message);
    }
  });
});

