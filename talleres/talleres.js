//......importes firebase.......//

import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// identificación usuario //

onAuthStateChanged(auth, async (user) => {
  const box = document.getElementById("usuario-activo");
  const nombre = document.getElementById("nombre-usuario");
  const cerrar = document.getElementById("cerrar-sesion");
  const menu = document.getElementById("menu-usuario");
  const botonesAuth = document.querySelector(".auth-buttons");

  if (user) {
    // Mostrar datos de usuario
    if (box) box.style.display = "inline-block";
    if (botonesAuth) botonesAuth.style.display = "none";

    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);
    nombre.textContent = docSnap.exists()
      ? `👤 ${docSnap.data().nombre}`
      : `👤 ${user.email}`;

    // Lógica de talleres
    const email = user.email;

    document.querySelectorAll(".taller-box").forEach(async (taller) => {
      const tallerId = taller.dataset.tallerId;
      const contadorSpan = taller.querySelector(".contador");
      const inscribirBtn = taller.querySelector(".boton-inscribirse");

      if (!tallerId || !contadorSpan || !inscribirBtn) return;

      const docSnap = await getDoc(doc(db, "inscripciones", tallerId));
      let usuarios = docSnap.exists() ? docSnap.data().usuarios || [] : [];

      const totalPlazas = 6;
      const plazasRestantes = totalPlazas - usuarios.length;
      contadorSpan.textContent = plazasRestantes;

      const inscrito = usuarios.includes(email);

      if (inscrito) {
        inscribirBtn.textContent = "Cancelar inscripción";
        inscribirBtn.classList.add("inscrito");
      }

      if (plazasRestantes <= 0 && !inscrito) {
        inscribirBtn.disabled = true;
      }

      inscribirBtn.addEventListener("click", async () => {
        if (inscrito) {
          if (confirm("¿Cancelar tu inscripción?")) {
            await cancelarInscripcion(email, tallerId);
            alert("Inscripción cancelada.");
            location.reload();
          }
        } else {
          if (plazasRestantes <= 0) {
            alert("No quedan plazas disponibles.");
            return;
          }
          await guardarInscripcion(email, tallerId);
          alert("Inscripción realizada con éxito.");
          location.reload();
        }
      });
    });

  } else {
    // Ocultar datos de usuario si no hay sesión
    if (box) box.style.display = "none";
    if (botonesAuth) botonesAuth.style.display = "flex";
  }

  // Cierre de sesión
  cerrar?.addEventListener("click", async () => {
    await signOut(auth);
    alert("Has cerrado sesión.");
    window.location.reload();
  });

  nombre?.addEventListener("click", () => {
    menu?.classList.toggle("mostrar");
  });
});


// ------------ Modal info taller ------------ //

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.taller-box').forEach(taller => {
    const infoBtn = taller.querySelector('.boton-info');
    const modal = taller.querySelector('.info-modal');

    infoBtn?.addEventListener('click', () => {
      modal.classList.toggle('oculto');
      infoBtn.textContent = modal.classList.contains('oculto') ? 'Ver información' : 'Cerrar';
    });
  });
});

// ------------ boton persoanlizar-gastrotaller ------------ //

document.addEventListener('DOMContentLoaded', () => {
  const boton = document.querySelector('.boton-personalizar-gastrotaller');
  if (boton) {
    boton.addEventListener('click', () => {
      window.location.href = '../gastrotallerpersonalizado/gastrotallerpersonalizado.html';
    });
  }
});

// ------------ boton personalizar-taller ------------ //

document.addEventListener('DOMContentLoaded', () => {
  const boton = document.querySelector('.boton-personalizar-taller');
  if (boton) {
    boton.addEventListener('click', function () {
      window.location.href = '../tallerpersonalizado/tallerpersonalizado.html';
    });
  }
});

// .........inscripción al taller...........

// Guardar inscripción
async function guardarInscripcion(email, tallerId) {
  try {
    const tallerRef = doc(db, "inscripciones", tallerId);
    const docSnap = await getDoc(tallerRef);

    if (docSnap.exists()) {
      await updateDoc(tallerRef, {
        usuarios: arrayUnion(email)
      });
    } else {
      await setDoc(tallerRef, {
        usuarios: [email]
      });
    }
  } catch (error) {
    console.error("Error al guardar inscripción:", error);
  }
}

// Cancelar inscripción
async function cancelarInscripcion(email, tallerId) {
  try {
    const tallerRef = doc(db, "inscripciones", tallerId);
    await updateDoc(tallerRef, {
      usuarios: arrayRemove(email)
    });
  } catch (error) {
    console.error("Error al cancelar inscripción:", error);
  }
}
