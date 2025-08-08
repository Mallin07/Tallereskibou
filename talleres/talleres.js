// ............ IMPORTES FIREBASE ............ //
import { auth, db } from "../firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Helper para ejecutar cuando el DOM esté listo (o al instante si ya lo está)
const onReady = (fn) => {
  if (document.readyState !== "loading") fn();
  else document.addEventListener("DOMContentLoaded", fn, { once: true });
};

// ............ AUTENTICACIÓN Y CARGA DE USUARIO ............ //
onAuthStateChanged(auth, async (user) => {
  const box = document.getElementById("usuario-activo");
  const nombre = document.getElementById("nombre-usuario");
  const correo = document.getElementById("correo-usuario");
  const cerrar = document.getElementById("cerrar-sesion");
  const menu = document.getElementById("menu-usuario");
  const botonesAuth = document.querySelector(".auth-buttons");

  if (user) {
    if (box) box.classList.remove("oculto");
    if (botonesAuth) botonesAuth.classList.add("oculto");

    try {
      const docRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(docRef);
      nombre.textContent = docSnap.exists()
        ? `👤 ${docSnap.data().nombre}`
        : `👤 ${user.email}`;
      if (correo) correo.textContent = user.email;
    } catch (err) {
      console.error("Error al obtener datos del usuario:", err);
    }
  } else {
    if (box) box.classList.add("oculto");
    if (botonesAuth) botonesAuth.classList.remove("oculto");
  }

  // ............ Manejo de talleres e inscripciones ............ //
  document.querySelectorAll(".taller-box").forEach(async (taller) => {
    const tallerId = taller.dataset.tallerId;
    const contadorSpan = taller.querySelector(".contador");
    const inscribirBtn = taller.querySelector(".boton-inscribirse");
    const selectorPlazas = taller.querySelector(".selector-plazas");

    if (!tallerId || !contadorSpan || !inscribirBtn) return;

    const docSnap = await getDoc(doc(db, "inscripciones", tallerId));
    let usuarios = docSnap.exists() ? docSnap.data().usuarios || [] : [];

    const totalPlazas = parseInt(taller.dataset.capacidad || "6", 10);
    const plazasOcupadas = usuarios.reduce((sum, u) => sum + (u.plazas || 1), 0);
    const plazasRestantes = Math.max(totalPlazas - plazasOcupadas, 0);
    contadorSpan.textContent = plazasRestantes;

    if (selectorPlazas) {
      selectorPlazas.setAttribute("max", plazasRestantes);
      // Evita que el value supere el nuevo máximo
      if (parseInt(selectorPlazas.value || "1", 10) > plazasRestantes) {
        selectorPlazas.value = plazasRestantes > 0 ? "1" : "0";
      }
    }

    const inscrito = user?.email && usuarios.some(u => u.email === user.email);

    if (user) {
      if (inscrito) {
        inscribirBtn.textContent = "Cancelar inscripción";
        inscribirBtn.classList.add("inscrito");
      }
      if (plazasRestantes <= 0 && !inscrito) {
        inscribirBtn.disabled = true;
      }
    }

    // Evitar listeners duplicados
    if (inscribirBtn.dataset.listenerAdded) return;
    inscribirBtn.dataset.listenerAdded = "true";

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

      // Releer por si alguien se inscribió justo antes
      const latestSnap = await getDoc(doc(db, "inscripciones", tallerId));
      let latestUsuarios = latestSnap.exists() ? latestSnap.data().usuarios || [] : [];

      const yaInscrito = latestUsuarios.some(u => u.email === userEmail);

      if (yaInscrito) {
        if (confirm("¿Cancelar tu inscripción?")) {
          await cancelarInscripcion(userEmail, tallerId);
          alert("Inscripción cancelada.");
          location.reload();
        }
        return;
      }

      const ocupadas = latestUsuarios.reduce((sum, u) => sum + (u.plazas || 1), 0);
      const restantes = Math.max(totalPlazas - ocupadas, 0);

      if (plazasSolicitadas > restantes) {
        alert(`Solo quedan ${restantes} plaza(s).`);
        return;
      }

      await guardarInscripcion(userEmail, tallerId, plazasSolicitadas);
      alert(`Inscripción realizada para ${plazasSolicitadas} plaza(s).`);
      location.reload();
    });
  });

  // Listeners UI dependientes del usuario
  cerrar?.addEventListener("click", async () => {
    await signOut(auth);
    alert("Has cerrado sesión.");
    window.location.reload();
  });

  nombre?.addEventListener("click", () => {
    menu?.classList.toggle("mostrar");
  });
}); // <-- cierra onAuthStateChanged

// ............ CLIC EN TARJETAS (redirección) ............ //
onReady(() => {
  const activarClicEnTarjetas = (selector) => {
    document.querySelectorAll(selector).forEach((box) => {
      const link = box.querySelector(".taller-link");
      if (!link) return;
      box.addEventListener("click", (e) => {
        const isButton = e.target.closest("button");
        if (!isButton) {
          window.location.href = link.href;
        }
      });
    });
  };

  activarClicEnTarjetas(".taller-box");
  activarClicEnTarjetas(".tarjeta-taller");
});

// ............ CARRUSEL ............ //
onReady(() => {
  const carruseles = document.querySelectorAll(".carrusel");

  carruseles.forEach(carrusel => {
    const imagenes = carrusel.querySelectorAll(".carrusel-item");
    let indice = 0;

    const mostrarImagen = (i) => {
      imagenes.forEach((img, idx) => {
        img.classList.toggle("activo", idx === i);
      });
    };

    carrusel.querySelector(".anterior")?.addEventListener("click", () => {
      indice = (indice - 1 + imagenes.length) % imagenes.length;
      mostrarImagen(indice);
    });

    carrusel.querySelector(".siguiente")?.addEventListener("click", () => {
      indice = (indice + 1) % imagenes.length;
      mostrarImagen(indice);
    });

    let startX = 0;

    carrusel.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
    });

    carrusel.addEventListener("touchend", (e) => {
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;

      if (Math.abs(diff) > 30) {
        indice = diff > 0 ? (indice + 1) % imagenes.length : (indice - 1 + imagenes.length) % imagenes.length;
        mostrarImagen(indice);
      }
    });

    mostrarImagen(indice);
  });
});

// ............ MODAL INFO TALLER (solo para .taller-box) ............ //
onReady(() => {
  document.querySelectorAll(".taller-box").forEach(taller => {
    const infoBtn = taller.querySelector(".boton-info");
    const modal = taller.querySelector(".info-modal");

    infoBtn?.addEventListener("click", () => {
      modal.classList.toggle("oculto");
      infoBtn.textContent = modal.classList.contains("oculto") ? "Ver información" : "Cerrar";
    });
  });
});

// ............ BOTONES PERSONALIZAR ............ //
onReady(() => {
  const botonTaller = document.querySelector(".boton-personalizar-taller");
  if (botonTaller) {
    botonTaller.addEventListener("click", () => {
      window.location.href = "../tallerpersonalizado/tallerpersonalizado.html";
    });
  }

  const botonGastro = document.querySelector(".boton-personalizar-gastrotaller");
  if (botonGastro) {
    botonGastro.addEventListener("click", () => {
      window.location.href = "../gastrotallerpersonalizado/gastrotallerpersonalizado.html";
    });
  }
});

// ............ FORMULARIO SOLICITAR FECHA ............ //
onReady(() => {
  const botonMostrar = document.getElementById("mostrar-formulario");
  const formulario = document.getElementById("formulario-fecha");
  const botonEnviar = document.getElementById("enviar-solicitud");

  if (botonMostrar && formulario) {
    botonMostrar.addEventListener("click", () => {
      formulario.classList.toggle("oculto");
      botonMostrar.textContent = formulario.classList.contains("oculto")
        ? "Solicitar fecha"
        : "Ocultar formulario";

      if (!formulario.classList.contains("oculto")) {
        formulario.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  if (botonEnviar && formulario) {
    botonEnviar.addEventListener("click", async () => {
      const fecha = formulario.querySelector("input[name='fecha']").value;
      const personas = formulario.querySelector("select[name='personas']").value;
      const telefono = formulario.querySelector("input[name='telefono']").value || null;
      const user = auth.currentUser;

      if (!user) {
        alert("Debes iniciar sesión para enviar la solicitud.");
        return;
      }

      const tarjeta = botonEnviar.closest(".tarjeta-taller, .taller-box");
      const tallerId = tarjeta?.dataset?.tallerId;

      // Validaciones
      if (!tallerId || typeof tallerId !== "string" || tallerId.trim() === "") {
        console.warn("ID del taller no válido:", tallerId);
        alert("No se pudo determinar el ID del taller.");
        return;
      }

      if (!user.uid || typeof user.uid !== "string") {
        console.warn("ID de usuario no válido:", user.uid);
        alert("Usuario no válido.");
        return;
      }

      try {
        const solicitudRef = doc(db, "solicitudes", `${tallerId}_${user.uid}`);
        await setDoc(solicitudRef, {
          tallerId,
          usuario: user.uid,
          correo: user.email,
          fecha,
          personas: parseInt(personas, 10),
          telefono,
          timestamp: new Date()
        });

        // Aviso por email
        await addDoc(collection(db, "mail"), {
          to: ["tallereskibou@gmail.com"],
          message: {
            subject: "Aviso: Nueva solicitud recibida",
            text: "Se ha registrado una nueva solicitud en Firebase."
          }
        });

        alert("✅ Solicitud enviada correctamente.");
        formulario.classList.add("oculto");
        botonMostrar.textContent = "Solicitar fecha";
      } catch (error) {
        console.error("Error al enviar solicitud:", error);
        alert("❌ Ocurrió un error al enviar la solicitud.");
      }
    });
  }
});

// ............ FUNCIONES DE INSCRIPCIÓN ............ //
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
