//......importes firebase.......//

import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// identificación usuario //

onAuthStateChanged(auth, async (user) => {
  const box = document.getElementById("usuario-activo");
  const nombre = document.getElementById("nombre-usuario");
  const correo = document.getElementById("correo-usuario");  
  const cerrar = document.getElementById("cerrar-sesion");
  const menu = document.getElementById("menu-usuario");
  const botonesAuth = document.querySelector(".auth-buttons");

  const email = user?.email || null;

  if (user) {
    if (box) box.classList.remove("oculto");
    if (botonesAuth) botonesAuth.style.display = "none";

    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);
    nombre.textContent = docSnap.exists()
      ? `👤 ${docSnap.data().nombre}`
      : `👤 ${user.email}`;
    if (correo) correo.textContent = user.email;
  } else {
    if (box) box.classList.add("oculto");
    if (botonesAuth) botonesAuth.style.display = "flex";
  }

  // ✅ Esto se ejecuta siempre, haya o no sesión iniciada
  document.querySelectorAll(".taller-box").forEach(async (taller) => {
    const tallerId = taller.dataset.tallerId;
    const contadorSpan = taller.querySelector(".contador");
    const inscribirBtn = taller.querySelector(".boton-inscribirse");
    const selectorPlazas = taller.querySelector(".selector-plazas");

    if (!tallerId || !contadorSpan || !inscribirBtn) return;

    const docSnap = await getDoc(doc(db, "inscripciones", tallerId));
    let usuarios = docSnap.exists() ? docSnap.data().usuarios || [] : [];

    const totalPlazas = 6;
    const plazasOcupadas = usuarios.reduce((sum, u) => sum + (u.plazas || 1), 0);
    const plazasRestantes = totalPlazas - plazasOcupadas;
    contadorSpan.textContent = plazasRestantes;

    if (selectorPlazas) {
      selectorPlazas.setAttribute("max", plazasRestantes);
    }

    const inscrito = email && usuarios.some(u => u.email === email);

    if (user) {
      if (inscrito) {
        inscribirBtn.textContent = "Cancelar inscripción";
        inscribirBtn.classList.add("inscrito");
      }

      if (plazasRestantes <= 0 && !inscrito) {
        inscribirBtn.disabled = true;
      }
    }

    inscribirBtn.addEventListener("click", async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("Debes iniciar sesión para inscribirte.");
        return;
      }

      const userEmail = currentUser.email;
      const inputPlazas = taller.querySelector(".selector-plazas");
      const plazasSolicitadas = parseInt(inputPlazas?.value || "1", 10);

      if (isNaN(plazasSolicitadas) || plazasSolicitadas < 1) {
        alert("Introduce un número válido de plazas.");
        return;
      }

      const latestSnap = await getDoc(doc(db, "inscripciones", tallerId));
      let latestUsuarios = latestSnap.exists() ? latestSnap.data().usuarios || [] : [];

      const yaInscrito = latestUsuarios.some(u => u.email === userEmail);

      if (yaInscrito) {
        if (confirm("¿Cancelar tu inscripción?")) {
          await cancelarInscripcion(userEmail, tallerId);
          alert("Inscripción cancelada.");
          location.reload();
        }
      } else {
        const plazasOcupadas = latestUsuarios.reduce((sum, u) => sum + (u.plazas || 1), 0);
        const plazasRestantes = totalPlazas - plazasOcupadas;

        if (plazasSolicitadas > plazasRestantes) {
          alert(`Solo quedan ${plazasRestantes} plaza(s).`);
          return;
        }

        await guardarInscripcion(userEmail, tallerId, plazasSolicitadas);
        alert(`Inscripción realizada para ${plazasSolicitadas} plaza(s).`);
        location.reload();
      }
    });
  });

  cerrar?.addEventListener("click", async () => {
    await signOut(auth);
    alert("Has cerrado sesión.");
    window.location.reload();
  });

  nombre?.addEventListener("click", () => {
    menu?.classList.toggle("mostrar");
  });
});

// Guardar inscripción
async function guardarInscripcion(email, tallerId, plazas) {
  try {
    const tallerRef = doc(db, "inscripciones", tallerId);
    const docSnap = await getDoc(tallerRef);

    let usuarios = docSnap.exists() ? docSnap.data().usuarios || [] : [];
    usuarios = usuarios.filter(u => u.email !== email);
    usuarios.push({ email, plazas });
    await setDoc(tallerRef, { usuarios });
  } catch (error) {
    console.error("Error al guardar inscripción:", error);
  }
}

// Cancelar inscripción
async function cancelarInscripcion(email, tallerId) {
  try {
    const tallerRef = doc(db, "inscripciones", tallerId);
    const docSnap = await getDoc(tallerRef);
    if (!docSnap.exists()) return;
    let usuarios = docSnap.data().usuarios || [];
    usuarios = usuarios.filter(u => u.email !== email);
    await setDoc(tallerRef, { usuarios });
  } catch (error) {
    console.error("Error al cancelar inscripción:", error);
  }
}

// .........link al clicar........... //

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".taller-box").forEach((box) => {
    const link = box.querySelector(".taller-link");
    if (!link) return;

    box.addEventListener("click", (e) => {
      const isButton = e.target.closest("button");
      if (!isButton) {
        window.location.href = link.href;
      }
    });
  });
});

// ........................carrusel........................ //

document.addEventListener('DOMContentLoaded', () => {
  const carruseles = document.querySelectorAll('.carrusel');

  carruseles.forEach(carrusel => {
    const imagenes = carrusel.querySelectorAll('.carrusel-item');
    let indice = 0;

    const mostrarImagen = (i) => {
      imagenes.forEach((img, idx) => {
        img.classList.toggle('activo', idx === i);
      });
    };

    carrusel.querySelector('.anterior').addEventListener('click', () => {
      indice = (indice - 1 + imagenes.length) % imagenes.length;
      mostrarImagen(indice);
    });

    carrusel.querySelector('.siguiente').addEventListener('click', () => {
      indice = (indice + 1) % imagenes.length;
      mostrarImagen(indice);
    });

    let startX = 0;
    let endX = 0;

    carrusel.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    });

    carrusel.addEventListener('touchend', (e) => {
      endX = e.changedTouches[0].clientX;
      let diff = startX - endX;

      if (Math.abs(diff) > 30) {
        if (diff > 0) {
          indice = (indice + 1) % imagenes.length;
        } else {
          indice = (indice - 1 + imagenes.length) % imagenes.length;
        }
        mostrarImagen(indice);
      }
    });

    mostrarImagen(indice);
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

// ------------ botón personalizar-taller ------------ //

document.addEventListener('DOMContentLoaded', () => {
  const boton = document.querySelector('.boton-personalizar-taller');
  if (boton) {
    boton.addEventListener('click', function () {
      window.location.href = '../tallerpersonalizado/tallerpersonalizado.html';
    });
  }
});

// ------------ botón personalizar-gastrotaller ------------ //

document.addEventListener('DOMContentLoaded', () => {
  const boton = document.querySelector('.boton-personalizar-gastrotaller');
  if (boton) {
    boton.addEventListener('click', () => {
      window.location.href = '../gastrotallerpersonalizado/gastrotallerpersonalizado.html';
    });
  }
});
