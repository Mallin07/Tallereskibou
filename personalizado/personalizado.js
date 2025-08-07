import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, addDoc, collection, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const subtaller = params.get('subtaller');
  const tipo = params.get('tipo') || 'taller';
  const comida = params.get('comida');  // Nuevo


// ------------------ Botón usuario ------------------ //
  const box = document.getElementById("usuario-activo");
  const nombre = document.getElementById("nombre-usuario");
  const correo = document.getElementById("correo-usuario");
  const cerrar = document.getElementById("cerrar-sesion");
  const menu = document.getElementById("menu-usuario");
  const botonesAuth = document.querySelector(".auth-buttons");

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (box) box.classList.add("visible");
      if (botonesAuth) botonesAuth.style.display = "none";

      const docRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(docRef);
      nombre.textContent = docSnap.exists()
        ? `👤 ${docSnap.data().nombre}`
        : `👤 ${user.email}`;
        if (correo) correo.textContent = user.email;  
    } else {
      if (box) box.classList.remove("visible");
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


  // ------------------ Título dinámico ------------------ //
const titulo = document.getElementById('titulo-subtaller');
if (subtaller && titulo) {
  const nombreMostrar = {
    'terracota': 'pendientes terracota o marmolado',
    'flores': 'pendientes de flores'
  }[subtaller] || subtaller;

  const comidaMostrar = {
    'carne': 'con carne, pescado y vegetales',
    'pescado': 'con pescado y vegetales',
    'vegetariano': 'solo vegetales'
  }[comida] || '';

  titulo.textContent = tipo === 'gastrotaller'
    ? `Gastrotaller: ${nombreMostrar} ${comidaMostrar ? `(${comidaMostrar})` : ''}`
    : `Taller: ${nombreMostrar}`;
}


// ------------------ Suma de precios ------------------ //
const numPersonasInput = document.getElementById('num-personas');
const tipoTallerSelect = document.getElementById('tipo-taller');
const menuSelect = document.getElementById('menu');
const bloquearCheckbox = document.getElementById('bloquear-acceso');
const detalleFactura = document.getElementById('detalle-factura');
const totalEuros = document.getElementById('total-euros');

// Precios por taller
const preciosTaller = {
  'pendientes-iniciacion': 40,
  'pendientes-intermedio': 50,
  'pendientes-avanzado': 60
};

// Precio menú (todos iguales)
const precioMenu = 18;

function calcularTotal() {
  const numPersonas = parseInt(numPersonasInput?.value || 0);
  const tipoTaller = tipoTallerSelect?.value;
  const menuSeleccionado = menuSelect?.value;
  const bloquear = bloquearCheckbox?.checked;

  if (!tipoTaller || !preciosTaller[tipoTaller]) return;

  const precioTaller = preciosTaller[tipoTaller];
  const totalTaller = numPersonas * precioTaller;

  const incluyeMenu = menuSeleccionado !== 'sin-menu';
  const totalMenu = incluyeMenu ? numPersonas * precioMenu : 0;

  // 💡 Bebidas
  const bebidasSeleccionadas = Array.from(document.querySelectorAll('#lista-bebidas input[type="checkbox"]:checked'));
  const totalBebidas = bebidasSeleccionadas.reduce((suma, opt) => suma + parseFloat(opt.value), 0);

  // Bloqueo de acceso (por ahora no hay coste asignado)
  let totalBloqueo = 0;
if (bloquear && numPersonas < 6) {
  const personasFaltantes = 6 - numPersonas;
  totalBloqueo = (precioTaller / 2) * personasFaltantes;
}

  const totalFinal = totalTaller + totalMenu + totalBebidas + totalBloqueo;

  if (detalleFactura && totalEuros) {
    detalleFactura.innerHTML = `
      - Taller (${tipoTaller.replace('pendientes-', '')}): ${numPersonas} x ${precioTaller}€ = ${totalTaller}€<br>
      - Menú: ${incluyeMenu ? `${numPersonas} x 18€ = ${totalMenu}€` : 'No'}<br>
      - Bebidas: ${bebidasSeleccionadas.length > 0
        ? bebidasSeleccionadas.map(opt => opt.dataset.nombre).join(', ')
        : 'Ninguna'}<br>
      - Bloqueo de acceso: ${bloquear ? `${totalBloqueo}€` : 'No'}<br>
    `;
    totalEuros.textContent = totalFinal.toFixed(2);
  }
}

// Listeners
[numPersonasInput, tipoTallerSelect, menuSelect, bloquearCheckbox].forEach(el => {
  el?.addEventListener('change', calcularTotal);
});
document.querySelectorAll('#lista-bebidas input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', calcularTotal);
});

// Ejecutar al cargar
calcularTotal();


  // ------------------ Mostrar/Ocultar bebidas ------------------ //
  const toggleBebidas = document.getElementById('toggle-bebidas');
  const listaBebidas = document.getElementById('lista-bebidas');
  if (toggleBebidas && listaBebidas) {
    toggleBebidas.addEventListener('click', () => {
      listaBebidas.classList.toggle('oculto');
      toggleBebidas.textContent = listaBebidas.classList.contains('oculto')
        ? 'Seleccionar bebidas ▼'
        : 'Ocultar bebidas ▲';
    });
  }

  // ------------------ Envío de solicitud ------------------ //
  const form = document.getElementById("formulario-taller");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("Debes iniciar sesión para enviar tu solicitud.");
    return;
    }

    // Obtener datos del usuario desde Firestore
    const docSnap = await getDoc(doc(db, "usuarios", user.uid));
    const nombreUsuario = docSnap.exists() ? docSnap.data().nombre : '';
    const correoUsuario = user.email;
    const tipoTaller = document.getElementById("tipo-taller")?.value;
    const fecha = document.getElementById("fecha-propuesta")?.value;
    const personas = document.getElementById("num-personas")?.value;
    const bloqueo = document.getElementById("bloquear-acceso")?.checked;
    const menuSeleccionado = document.getElementById("menu")?.value;
    const bebidas = Array.from(document.querySelectorAll('#lista-bebidas input[type="checkbox"]:checked'))
      .map(cb => cb.dataset.nombre);

    try {
      
await addDoc(collection(db, "reservas"), {
  uid: user.uid,
  nombre: nombreUsuario,
  correo: correoUsuario,
  taller: tipoTaller,          // en vez de tipoTaller
  menu: menuSeleccionado,      // en vez de comida
  fecha,
  personas,
  bloqueo,
  bebidas,
  enviadoEn: Timestamp.now()
});

      alert("✅ Tu solicitud ha sido enviada con éxito.");
      window.location.href = "/Tallereskibou/";
    } catch (err) {
      console.error("Error al enviar solicitud:", err);
      alert("❌ Error al enviar la solicitud.");
    }
  });
});

// Guardar ruta actual justo antes de salir a login.html
document.querySelectorAll("a[href*='login.html'], button[onclick*='login.html']").forEach(el => {
  el.addEventListener("click", () => {
    localStorage.setItem("ruta-previa", window.location.pathname);
  });
});

