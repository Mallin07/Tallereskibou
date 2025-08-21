// ------------ Usuario con Firebase / UI / Talleres  ------------ //
import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, setDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Espera a que el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  // ---- Referencias UI header ----
  const box           = document.getElementById("usuario-activo");
  const nombre        = document.getElementById("nombre-usuario");
  const correo        = document.getElementById("correo-usuario");
  const cerrar        = document.getElementById("cerrar-sesion");
  const menuUsuario   = document.getElementById("menu-usuario");
  const botonesAuth   = document.querySelector(".auth-buttons");
  const btnHamburger  = document.querySelector(".hamburger");
  const menuHeader    = document.getElementById("menu");

  // ---- Menú hamburguesa ----
  btnHamburger?.addEventListener("click", () => {
    menuHeader?.classList.toggle("abierto");
    const expanded = btnHamburger.getAttribute("aria-expanded") === "true";
    btnHamburger.setAttribute("aria-expanded", String(!expanded));
  });
  // Cerrar menú al pulsar un enlace en móvil
  menuHeader?.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      if (window.innerWidth < 768) {
        menuHeader.classList.remove("abierto");
        btnHamburger?.setAttribute("aria-expanded", "false");
      }
    });
  });

  // ---- Carruseles / sliders ----
  initCarruseles();
  document.querySelectorAll(".hero-slider").forEach(setupSlider);

  // ---- Autenticación y arranque de talleres ----
  onAuthStateChanged(auth, async (user) => {
    try {
      if (user) {
        box?.classList.add("visible");
        if (botonesAuth) botonesAuth.style.display = "none";

        // Cargar perfil (opcional)
        try {
          const ref  = doc(db, "usuarios", user.uid);
          const snap = await getDoc(ref);
          nombre.textContent = snap.exists()
            ? `👤 ${snap.data().nombre}`
            : `👤 ${user.email}`;
          if (correo) correo.textContent = user.email;
        } catch {
          nombre.textContent = `👤 ${user.email}`;
          if (correo) correo.textContent = user.email;
        }
      } else {
        box?.classList.remove("visible");
        if (botonesAuth) botonesAuth.style.display = "flex";
      }

      // Inicializa/actualiza UI de talleres
      initTalleres(user);
    } catch (e) {
      console.error(e);
    }
  });

  // ---- Eventos UI dependientes del usuario ----
  cerrar?.addEventListener("click", async () => {
    await signOut(auth);
    alert("Has cerrado sesión.");
    window.location.reload();
  });

  nombre?.addEventListener("click", () => {
    menuUsuario?.classList.toggle("mostrar");
  });
});

// ========================= Helper nombre de usuario =========================
async function resolveUserName() {
  const u = auth.currentUser;
  if (!u) return "";

  // 1) displayName directo
  if (u.displayName && u.displayName.trim()) return u.displayName.trim();

  // 2) Firestore: usuarios/{uid}
  try {
    const snap = await getDoc(doc(db, "usuarios", u.uid));
    const nombreFS = snap.exists() ? (snap.data().nombre || "").trim() : "";
    if (nombreFS) return nombreFS;
  } catch (_) {}

  // 3) UI ya pintada (quita el emoji 👤 si existe)
  const ui = document.getElementById("nombre-usuario")?.textContent || "";
  const limpio = ui.replace(/^👤\s*/, "").trim();
  if (limpio) return limpio;

  // 4) local-part del email
  return (u.email || "").split("@")[0];
}

// ========================= Carrusel =========================
function initCarruseles() {
  const carruseles = document.querySelectorAll(".carrusel");
  if (!carruseles.length) return;

  carruseles.forEach(carrusel => {
    const imagenes = carrusel.querySelectorAll(".carrusel-item");
    if (!imagenes.length) return;

    let indice = 0;
    const mostrar = (i) => {
      imagenes.forEach((img, idx) => img.classList.toggle("activo", idx === i));
    };

    carrusel.querySelector(".anterior")?.addEventListener("click", () => {
      indice = (indice - 1 + imagenes.length) % imagenes.length;
      mostrar(indice);
    });
    carrusel.querySelector(".siguiente")?.addEventListener("click", () => {
      indice = (indice + 1) % imagenes.length;
      mostrar(indice);
    });

    // Swipe móvil
    let startX = 0;
    carrusel.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; });
    carrusel.addEventListener("touchend", (e) => {
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      if (Math.abs(diff) > 30) {
        indice = diff > 0 ? (indice + 1) % imagenes.length : (indice - 1 + imagenes.length) % imagenes.length;
        mostrar(indice);
      }
    });

    mostrar(indice);
  });
}

// ========================= Slider automático =========================
function setupSlider(slider) {
  const slides = slider.querySelectorAll("img");
  if (!slides.length) return;

  let slideIndex = 0;
  const show = (i) => slides.forEach((img, idx) => img.classList.toggle("active", idx === i));
  show(0);
  setInterval(() => {
    slideIndex = (slideIndex + 1) % slides.length;
    show(slideIndex);
  }, 4000);
}

// ========================= Talleres e inscripciones =========================
async function initTalleres(user) {
  document.querySelectorAll(".taller-box").forEach(async (taller) => {
    const tallerId        = taller.dataset.tallerId;
    const contadorSpan    = taller.querySelector(".contador");
    const inscribirBtn    = taller.querySelector(".boton-inscribirse");
    const selectorPlazas  = taller.querySelector(".selector-plazas");

    if (!tallerId || !contadorSpan || !inscribirBtn) return;

    // --- Lectura de inscripciones ---
    let usuarios = [];
    try {
      const snap = await getDoc(doc(db, "inscripciones", tallerId));
      usuarios = snap.exists() ? (snap.data().usuarios || []) : [];
    } catch (e) {
      console.warn("No se pudo leer inscripciones (reglas Firestore):", e);
      usuarios = [];
    }

    const totalPlazas      = parseInt(taller.dataset.capacidad || "6", 10);
    const plazasOcupadas   = usuarios.reduce((s, u) => s + (u.plazas || 1), 0);
    const plazasRestantes  = Math.max(totalPlazas - plazasOcupadas, 0);

    contadorSpan.textContent = plazasRestantes;

    if (selectorPlazas) {
      selectorPlazas.setAttribute("max", String(plazasRestantes));
      if (parseInt(selectorPlazas.value || "1", 10) > plazasRestantes) {
        selectorPlazas.value = plazasRestantes > 0 ? "1" : "0";
      }
    }

    const inscrito = !!(user?.email && usuarios.some(u => u.email === user.email));

    // Estado del botón
    if (user) {
      if (inscrito) {
        inscribirBtn.textContent = "Cancelar inscripción";
        inscribirBtn.classList.add("inscrito");
        inscribirBtn.disabled = false;
      } else {
        inscribirBtn.disabled = plazasRestantes <= 0;
      }
    } else {
      inscribirBtn.disabled = false; // permite click para avisar login
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

      const userEmail         = currentUser.email;
      const userName          = await resolveUserName(); // 👈 ahora resolvemos el nombre
      const plazasSolicitadas = parseInt(selectorPlazas?.value || "1", 10);
      if (isNaN(plazasSolicitadas) || plazasSolicitadas < 1) {
        alert("Introduce un número válido de plazas.");
        return;
      }

      // Releer estado actual por si cambió
      let latestUsuarios = [];
      try {
        const latestSnap = await getDoc(doc(db, "inscripciones", tallerId));
        latestUsuarios = latestSnap.exists() ? (latestSnap.data().usuarios || []) : [];
      } catch (e) {
        alert("No tienes permisos para leer las inscripciones.");
        return;
      }

      const ocupadas   = latestUsuarios.reduce((s, u) => s + (u.plazas || 1), 0);
      const restantes  = Math.max(totalPlazas - ocupadas, 0);
      const yaInscrito = latestUsuarios.some(u => u.email === userEmail);

      if (yaInscrito) {
        if (confirm("¿Cancelar tu inscripción?")) {
          try {
            await cancelarInscripcion(userEmail, tallerId);
            await enviarAvisoInscripcion({
              tipo: "cancelacion",
              tallerId,
              plazas: 0,
              userEmail,
              userName
            });
            alert("Inscripción cancelada.");
            location.reload();
          } catch (e) {
            console.error(e);
            alert("No tienes permisos para cancelar.");
          }
        }
        return;
      }

      if (plazasSolicitadas > restantes) {
        alert(`Solo quedan ${restantes} plaza(s).`);
        return;
      }

      try {
        await guardarInscripcion(userEmail, tallerId, plazasSolicitadas);
        await enviarAvisoInscripcion({
          tipo: "nueva",
          tallerId,
          plazas: plazasSolicitadas,
          userEmail,
          userName
        });
        alert(`Inscripción realizada para ${plazasSolicitadas} plaza(s).`);
        location.reload();
      } catch (e) {
        console.error("Error al inscribirse:", e);
        alert("No tienes permisos para inscribirte.");
      }
    });
  });
}

// ========================= Funciones Firestore =========================
async function guardarInscripcion(email, tallerId, plazas) {
  const tallerRef = doc(db, "inscripciones", tallerId);
  const snap = await getDoc(tallerRef).catch(() => null);
  let usuarios = snap && snap.exists() ? (snap.data().usuarios || []) : [];
  usuarios = usuarios.filter(u => u.email !== email);
  usuarios.push({ email, plazas });
  await setDoc(tallerRef, { usuarios });
}

async function cancelarInscripcion(email, tallerId) {
  const tallerRef = doc(db, "inscripciones", tallerId);
  const snap = await getDoc(tallerRef).catch(() => null);
  if (!snap || !snap.exists()) return;
  let usuarios = snap.data().usuarios || [];
  usuarios = usuarios.filter(u => u.email !== email);
  await setDoc(tallerRef, { usuarios });
}

// ========================= Aviso por correo (Trigger Email) =========================
async function enviarAvisoInscripcion({ tipo, tallerId, plazas, userEmail, userName }) {
  try {
    // Refuerzo: si aún no tenemos nombre, intenta sacarlo de Firestore
    if (!userName || !userName.trim()) {
      try {
        const u = auth.currentUser;
        if (u) {
          const s = await getDoc(doc(db, "usuarios", u.uid));
          const n = s.exists() ? (s.data().nombre || "").trim() : "";
          if (n) userName = n;
        }
      } catch (_) {}
    }

    const tituloTaller = document.querySelector(".titulo-taller")?.textContent?.trim() || tallerId;

    const asunto = (tipo === "nueva")
      ? `Nueva inscripción — ${tituloTaller}`
      : `Cancelación de inscripción — ${tituloTaller}`;

    const fechaISO = new Date().toISOString().replace('T',' ').slice(0,19);

    const texto =
`${tipo === "nueva" ? "Hay una NUEVA inscripción" : "Se ha CANCELADO una inscripción"}.

[Taller]
- ID: ${tallerId}
- Título: ${tituloTaller}

[Usuario]
- Nombre: ${userName || "-"}
- Email: ${userEmail}

[Detalle]
- Plazas: ${plazas}
- Fecha: ${fechaISO}`;

    const html =
`<h2>${tipo === "nueva" ? "Nueva inscripción" : "Cancelación de inscripción"}</h2>
<h3>Taller</h3>
<ul>
  <li><b>ID:</b> ${tallerId}</li>
  <li><b>Título:</b> ${tituloTaller}</li>
</ul>
<h3>Usuario</h3>
<ul>
  <li><b>Nombre:</b> ${userName || "-"}</li>
  <li><b>Email:</b> ${userEmail}</li>
</ul>
<h3>Detalle</h3>
<ul>
  <li><b>Plazas:</b> ${plazas}</li>
  <li><b>Fecha:</b> ${fechaISO}</li>
</ul>`;

    await addDoc(collection(db, "mail"), {
      to: "tallereskibou@gmail.com",
      replyTo: (userEmail ? `${userName || userEmail} <${userEmail}>` : undefined),
      message: { subject: asunto, text: texto, html }
    });
  } catch (e) {
    console.warn("No se pudo crear el email de aviso:", e);
  }
}
