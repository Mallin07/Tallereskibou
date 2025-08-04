// ------------------ Firebase imports ------------------ //
import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, addDoc, collection, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ------------------ Subtaller desde URL ------------------ //
const params = new URLSearchParams(window.location.search);
const subtaller = params.get('subtaller');
const tipo = params.get('tipo') || 'taller'; // para distinguir gastrotaller

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

  // Mostrar nombre del taller
  const titulo = document.getElementById('titulo-subtaller');
  if (subtaller && titulo) {
    const nombreMostrar = {
      'terracota': 'Taller de pendientes terracota o marmolado',
      'flores': 'Taller de pendientes de flores'
    }[subtaller] || subtaller;

    titulo.textContent = tipo === 'gastrotaller'
      ? `Gastrotaller: ${nombreMostrar}`
      : `Taller: ${nombreMostrar}`;
  }

  // Envío de solicitud
  const form = document.getElementById("form-solicitud");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("Debes iniciar sesión para enviar tu solicitud.");
      return;
    }

    const nombre = document.getElementById("nombre")?.value.trim();
    const telefono = document.getElementById("telefono")?.value.trim();
    const fecha = document.getElementById("fecha")?.value;
    const personas = document.getElementById("num-personas")?.value;
    const bloqueo = document.getElementById("bloquear-acceso")?.checked;
    const mensaje = document.getElementById("mensaje")?.value.trim();

    const bebidas = Array.from(document.querySelectorAll('#lista-bebidas input[type="checkbox"]:checked'))
      .map(cb => cb.dataset.nombre);

    try {
      await addDoc(collection(db, "reservas"), {
        uid: user.uid,
        subtaller,
        tipo,
        nombre,
        telefono,
        fecha,
        personas,
        bloqueo,
        bebidas,
        mensaje,
        enviadoEn: Timestamp.now()
      });

      alert("✅ Tu solicitud ha sido enviada con éxito.");
      window.location.href = "index.html";
    } catch (err) {
      console.error("Error al enviar solicitud:", err);
      alert("❌ Error al enviar la solicitud.");
    }
  });
});
