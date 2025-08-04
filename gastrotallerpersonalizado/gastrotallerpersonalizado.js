// ------------------ Firebase imports ------------------ //
import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ------------------ Mostrar u ocultar usuario ------------------ //
onAuthStateChanged(auth, async (user) => {
  const box = document.getElementById("usuario-activo");
  const nombre = document.getElementById("nombre-usuario");
  const correo = document.getElementById("correo-usuario");
  const cerrar = document.getElementById("cerrar-sesion");
  const menu = document.getElementById("menu-usuario");

  if (user) {
    box?.classList.remove("oculto");

    const docSnap = await getDoc(doc(db, "usuarios", user.uid));
    nombre.textContent = docSnap.exists() ? `👤 ${docSnap.data().nombre}` : `👤 ${user.email}`;
    correo.textContent = `📧 ${user.email}`;

    nombre?.addEventListener("click", () => {
      menu?.classList.toggle("mostrar");
    });

    cerrar?.addEventListener("click", async () => {
      await signOut(auth);
      alert("Has cerrado sesión.");
      window.location.reload();
    });

  } else {
    box?.classList.add("oculto");
  }
});

// ------------------ Lógica del DOM ------------------ //
document.addEventListener("DOMContentLoaded", () => {
  // Selección de taller
  document.querySelectorAll('.escojer-clase-taller-box').forEach(box => {
    box.addEventListener('click', () => {
      const selected = box.dataset.taller;

      document.querySelectorAll('.subtalleres').forEach(div => div.classList.remove('active'));
      document.querySelectorAll('.escojer-clase-taller-box').forEach(b => b.classList.remove('active'));

      box.classList.add('active');

      const target = document.getElementById(`${selected}-subtalleres`);
      if (target) target.classList.add('active');
    });
  });

  // Selección de subtaller
  document.querySelectorAll('.escojer-clase-subtaller-box').forEach(box => {
    box.addEventListener('click', () => {
      document.querySelectorAll('.escojer-clase-subtaller-box').forEach(b => b.classList.remove('active'));
      box.classList.add('active');

      // Redirección a solicitud con subtaller
      const subtallerSeleccionado = box.dataset.subtaller;
      if (subtallerSeleccionado) {
        window.location.href = `../tpsolicitud.html?subtaller=${encodeURIComponent(subtallerSeleccionado)}&tipo=gastrotaller`;
      }
    });
  });
});
