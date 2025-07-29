//------------------ Selección taller --------------------//

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

// ------------ Selección subtaller ------------ //

document.querySelectorAll('.escojer-clase-subtaller-box').forEach(box => {
  box.addEventListener('click', () => {
    document.querySelectorAll('.escojer-clase-subtaller-box').forEach(b => b.classList.remove('active'));
    box.classList.add('active');
    console.log('Subtaller seleccionado:', box.dataset.subtaller);
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

// ------------ Usuario con Firebase ------------ //

import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("usuario-activo");
  const nombre = document.getElementById("nombre-usuario");
  const cerrar = document.getElementById("cerrar-sesion");
  const menu = document.getElementById("menu-usuario");
  const botonesAuth = document.querySelector(".auth-buttons");

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (box) box.style.display = "inline-block";
      if (botonesAuth) botonesAuth.style.display = "none";

      const docRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(docRef);
      nombre.textContent = docSnap.exists() ? `👤 ${docSnap.data().nombre}` : `👤 ${user.email}`;
    } else {
      if (box) box.style.display = "none";
      if (botonesAuth) botonesAuth.style.display = "flex";
    }
  });

  if (cerrar) {
    cerrar.addEventListener("click", async () => {
      await signOut(auth);
      alert("Has cerrado sesión.");
      window.location.reload();
    });
  }

  nombre?.addEventListener("click", () => {
    menu?.classList.toggle("mostrar");
  });
});

// ------------ Inscripción taller ------------ //

onAuthStateChanged(auth, async (user) => {
  let usuario = null;
  if (user) usuario = { email: user.email, uid: user.uid };

  document.querySelectorAll('.taller-box').forEach(taller => {
    const tallerId = taller.dataset.tallerId;
    const contadorSpan = taller.querySelector('.contador');
    const inscribirBtn = taller.querySelector('.boton-inscribirse');
    if (!contadorSpan || !inscribirBtn || !tallerId) return;

    const plazasIniciales = parseInt(contadorSpan.textContent);
    let plazas = parseInt(localStorage.getItem(`plazas_${tallerId}`)) || plazasIniciales;
    localStorage.setItem(`plazas_${tallerId}`, plazas);
    contadorSpan.textContent = plazas;

    if (usuario && estaInscrito(usuario.email, tallerId)) {
      inscribirBtn.textContent = "Cancelar inscripción";
      inscribirBtn.classList.add("inscrito");
    }

    if (plazas <= 0 && !estaInscrito(usuario?.email, tallerId)) {
      inscribirBtn.disabled = true;
    }

    inscribirBtn.addEventListener("click", () => {
      if (!usuario) return alert("Debes iniciar sesión para inscribirte.");

      if (estaInscrito(usuario.email, tallerId)) {
        if (confirm("¿Quieres cancelar tu inscripción?")) {
          cancelarInscripcion(usuario.email, tallerId);
          plazas++;
          localStorage.setItem(`plazas_${tallerId}`, plazas);
          contadorSpan.textContent = plazas;
          inscribirBtn.textContent = "Inscribirse";
          inscribirBtn.classList.remove("inscrito");
          inscribirBtn.disabled = false;
        }
        return;
      }

      if (plazas <= 0) return alert("No quedan plazas disponibles.");

      guardarInscripcion(usuario.email, tallerId);
      plazas--;
      localStorage.setItem(`plazas_${tallerId}`, plazas);
      contadorSpan.textContent = plazas;
      inscribirBtn.textContent = "Cancelar inscripción";
      inscribirBtn.classList.add("inscrito");
      alert("Inscripción realizada con éxito.");
    });
  });
});

function estaInscrito(email, tallerId) {
  const inscripciones = JSON.parse(localStorage.getItem("inscripcionesKibou")) || [];
  return inscripciones.some(i => i.email === email && i.tallerId === tallerId);
}

function guardarInscripcion(email, tallerId) {
  const inscripciones = JSON.parse(localStorage.getItem("inscripcionesKibou")) || [];
  inscripciones.push({ email, tallerId });
  localStorage.setItem("inscripcionesKibou", JSON.stringify(inscripciones));
}

function cancelarInscripcion(email, tallerId) {
  let inscripciones = JSON.parse(localStorage.getItem("inscripcionesKibou")) || [];
  inscripciones = inscripciones.filter(i => !(i.email === email && i.tallerId === tallerId));
  localStorage.setItem("inscripcionesKibou", JSON.stringify(inscripciones));
}
