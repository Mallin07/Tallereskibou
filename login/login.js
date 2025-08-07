import { auth, db } from "../firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-login");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const credenciales = await signInWithEmailAndPassword(auth, email, password);
      const uid = credenciales.user.uid;

      // 🔍 Obtener los datos del usuario desde Firestore
      const userDocRef = doc(db, "usuarios", uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const datos = userSnap.data();

        // 💾 Guardar en localStorage para usar en otras páginas
        localStorage.setItem("usuarioActivo", JSON.stringify({
          uid,
          nombre: datos.nombre,
          email: datos.email
        }));

        alert(`✅ Bienvenido/a, ${datos.nombre}`);
        const rutaPrevia = localStorage.getItem("ruta-previa");
if (rutaPrevia) {
  localStorage.removeItem("ruta-previa"); // limpia después de usar
  window.location.href = rutaPrevia;
} else {
  window.location.href = "../index.html"; // fallback
}
      } else {
        alert("⚠️ Usuario autenticado, pero no se encontraron datos en Firestore.");
      }

    } catch (error) {
      console.error("❌ Error al iniciar sesión:", error);
      alert("Error: " + error.message);
    }
  });
});
